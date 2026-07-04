import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function updateSession(request: NextRequest) {
  // Demo mode: no Supabase configured, so skip auth enforcement entirely.
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  const [{ data: factorsData }, { data: profile }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.from("profiles").select("mfa_exempt, onboarding_completed_at").eq("id", user.id).single(),
  ]);

  const hasVerifiedFactor = Boolean(factorsData && factorsData.totp.length > 0);
  const isExempt = profile?.mfa_exempt === true;
  const mustSetUpMfa = !hasVerifiedFactor && !isExempt;

  if (mustSetUpMfa) {
    if (!isSetupMfaRoute && !isAuthCallback && !isPublicAsset) {
      return redirectTo("/login/setup-mfa");
    }
    return supabaseResponse;
  }

  if (isSetupMfaRoute) {
    // 2FA is already set up (or the user is exempt) — nothing to do here.
    return redirectTo("/dashboard");
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const needsChallenge = Boolean(aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2");

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
