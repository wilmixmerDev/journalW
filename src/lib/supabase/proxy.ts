import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, getServerSupabaseUrl, SUPABASE_AUTH_COOKIE_NAME } from "@/lib/supabase/config";
import { EMAIL_MFA_SESSION_COOKIE, verifyEmailMfaToken } from "@/lib/mfa/email-otp";

export async function updateSession(request: NextRequest) {
  // Modo demo: no hay Supabase configurado, así que se salta toda la validación de auth.
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getServerSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: SUPABASE_AUTH_COOKIE_NAME },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isSetupMfaRoute = pathname === "/login/setup-mfa";
  const isMfaRoute = pathname === "/login/mfa";
  const isOnboardingRoute = pathname === "/login/onboarding";
  const isAuthRoute =
    pathname.startsWith("/login") && !isMfaRoute && !isSetupMfaRoute && !isOnboardingRoute;
  const isAuthCallback = pathname.startsWith("/auth");
  const isPublicAsset = pathname.startsWith("/_next");

  function redirectTo(target: string) {
    const url = request.nextUrl.clone();
    url.pathname = target;
    return NextResponse.redirect(url);
  }

  if (!user) {
    if (!isAuthRoute && !isAuthCallback && !isPublicAsset) {
      return redirectTo("/login");
    }
    return supabaseResponse;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("mfa_exempt, onboarding_completed_at, email_mfa_verified_at")
    .eq("id", user.id)
    .single();

  // El correo verificado es el factor obligatorio (baseline); el TOTP es un extra opcional.
  const isExempt = profile?.mfa_exempt === true;
  const mustSetUpMfa = !profile?.email_mfa_verified_at && !isExempt;

  if (mustSetUpMfa) {
    // isAuthRoute (/login) queda exento porque el registro verifica el correo obligatorio ahí mismo,
    // con varias idas y vueltas de server actions mientras mustSetUpMfa sigue siendo true.
    if (!isSetupMfaRoute && !isAuthRoute && !isAuthCallback && !isPublicAsset) {
      return redirectTo("/login/setup-mfa");
    }
    return supabaseResponse;
  }

  if (isSetupMfaRoute) {
    // El 2FA obligatorio ya está configurado (o el usuario está exento) — nada que hacer aquí.
    return redirectTo("/dashboard");
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  // "Tiene algún factor" = TOTP activado (Supabase exige aal2) o ya pasó por el correo obligatorio.
  const hasAnyFactor = Boolean(aal && aal.nextLevel === "aal2") || Boolean(profile?.email_mfa_verified_at);
  const satisfiedViaTotp = Boolean(aal && aal.currentLevel === "aal2");
  let needsChallenge = hasAnyFactor && !satisfiedViaTotp;
  if (needsChallenge) {
    // El TOTP no se verificó esta sesión (o no está activado) — el correo es la otra vía posible.
    const emailToken = request.cookies.get(EMAIL_MFA_SESSION_COOKIE)?.value;
    const satisfiedViaEmail = await verifyEmailMfaToken(user.id, emailToken);
    needsChallenge = !satisfiedViaEmail;
  }

  if (needsChallenge) {
    if (!isMfaRoute && !isAuthCallback && !isPublicAsset) {
      return redirectTo("/login/mfa");
    }
    return supabaseResponse;
  }

  const needsOnboarding = !profile?.onboarding_completed_at;

  if (needsOnboarding) {
    if (!isOnboardingRoute && !isAuthCallback && !isPublicAsset) {
      return redirectTo("/login/onboarding");
    }
    return supabaseResponse;
  }

  if (isAuthRoute || isMfaRoute || isOnboardingRoute) {
    return redirectTo("/dashboard");
  }

  return supabaseResponse;
}
