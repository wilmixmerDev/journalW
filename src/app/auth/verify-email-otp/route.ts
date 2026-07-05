import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_MFA_SESSION_COOKIE, completeEmailOtpVerification } from "@/lib/mfa/email-otp";

/** Enlace "Verificar automáticamente" del correo — evita tener que copiar/escribir el código a mano. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code") ?? "";
  const purpose = searchParams.get("purpose");

  function loginError(message: string) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
  }

  if (purpose !== "enroll" && purpose !== "login") {
    return loginError("Enlace inválido.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return loginError("Abre este enlace desde el mismo dispositivo donde iniciaste el proceso.");
  }

  const { error, session } = await completeEmailOtpVerification(user.id, code, purpose);
  if (error || !session) {
    return loginError(error ?? "No se pudo verificar el código.");
  }

  // "enroll" va a setup-mfa (no directo a onboarding) para que esta pestaña sea la que ofrezca
  // activar el autenticador y siga el proceso completo — la pestaña vieja solo confirma y se detiene.
  const response = NextResponse.redirect(`${origin}${purpose === "enroll" ? "/login/setup-mfa" : "/dashboard"}`);
  response.cookies.set(EMAIL_MFA_SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });

  return response;
}
