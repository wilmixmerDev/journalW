"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EMAIL_MFA_SESSION_COOKIE,
  createEmailMfaSession,
  sendEmailOtp,
  verifyEmailOtp,
} from "@/lib/mfa/email-otp";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

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

  const { error } = await verifyEmailOtp(user.id, code, purpose);
  if (error) return { error };

  if (purpose === "enroll") {
    const admin = createAdminClient();
    const { error: profileError } = await admin
      .from("profiles")
      .update({ email_mfa_verified_at: new Date().toISOString() })
      .eq("id", user.id);
    if (profileError) return { error: profileError.message };
  }

  const { token, expiresAt } = await createEmailMfaSession(user.id);
  (await cookies()).set(EMAIL_MFA_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return { error: null };
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
