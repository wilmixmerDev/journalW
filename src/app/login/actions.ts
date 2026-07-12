"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site-url";
import { isPasswordStrongEnough } from "@/lib/password-strength";
import {
  EMAIL_MFA_SESSION_COOKIE,
  completeEmailOtpVerification,
  hasConsumedLatestCode,
  revokeEmailMfaSessions,
  sendEmailOtp,
  verifyEmailOtp,
  type EmailOtpCopy,
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

const RESET_COPY: EmailOtpCopy = {
  subject: "Restablece tu contraseña — Journal W",
  heading: "Restablece tu contraseña",
  intro: "Usa este código para crear una contraseña nueva para tu cuenta.",
};

/** Resuelve el usuario por correo sin exponer si existe (generateLink es la vía admin oficial para esto). */
async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  if (error || !data?.user) return null;
  return data.user.id;
}

/** Paso 1 del "olvidé mi contraseña": responde éxito siempre, para no revelar qué correos tienen cuenta. */
export async function requestPasswordReset(email: string): Promise<{ error: string | null }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { error: "Escribe tu correo." };

  const userId = await findUserIdByEmail(trimmed);
  if (userId) {
    await sendEmailOtp(userId, trimmed, "security", RESET_COPY);
  }
  return { error: null };
}

/** Paso 2: código correcto + contraseña fuerte → se cambia la contraseña y se cierran las sesiones MFA. */
export async function resetPasswordWithCode(
  email: string,
  code: string,
  newPassword: string
): Promise<{ error: string | null }> {
  if (!isPasswordStrongEnough(newPassword)) {
    return { error: "La contraseña no es lo suficientemente segura. Revisa los requisitos." };
  }

  const userId = await findUserIdByEmail(email.trim().toLowerCase());
  if (!userId) return { error: "Código incorrecto." };

  const { error: codeError } = await verifyEmailOtp(userId, code, "security");
  if (codeError) return { error: codeError };

  const admin = createAdminClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (updateError) return { error: updateError.message };

  await revokeEmailMfaSessions(userId);
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
