"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site-url";
import {
  EMAIL_MFA_SESSION_COOKIE,
  completeEmailOtpVerification,
  hasConsumedLatestCode,
  sendEmailOtp,
} from "@/lib/mfa/email-otp";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Usado tanto para el correo obligatorio del registro ("enroll") como para el reto de cada login ("login"). */
export async function sendAuthEmailOtp(purpose: "enroll" | "login"): Promise<{ error: string | null }> {
  const user = await requireUser();
  if (!user?.email) return { error: "Debes iniciar sesión." };
  return sendEmailOtp(user.id, user.email, purpose);
}

export async function verifyAuthEmailOtp(
  code: string,
  purpose: "enroll" | "login"
): Promise<{ error: string | null }> {
  const user = await requireUser();
  if (!user?.email) return { error: "Debes iniciar sesión." };

  const { error, session } = await completeEmailOtpVerification(user.id, code, purpose);
  if (error || !session) return { error };

  (await cookies()).set(EMAIL_MFA_SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });

  return { error: null };
}

/** La pantalla de "esperando código" la usa para detectar que ya se verificó vía el enlace mágico en otra pestaña. */
export async function checkAuthEmailOtpVerified(purpose: "enroll" | "login"): Promise<boolean> {
  const user = await requireUser();
  if (!user) return false;
  return hasConsumedLatestCode(user.id, purpose);
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl()}/auth/callback` },
  });

  if (error || !data?.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "No se pudo iniciar sesión con Google")}`);
  }

  redirect(data.url);
}
