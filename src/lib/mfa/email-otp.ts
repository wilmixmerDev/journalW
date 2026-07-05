import { randomInt, randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";

export type EmailOtpPurpose = "enroll" | "login" | "security";

const CODE_LENGTH = 6;
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export const EMAIL_MFA_SESSION_COOKIE = "journalw-email-mfa";

const PURPOSE_COPY: Record<EmailOtpPurpose, { subject: string; intro: string }> = {
  enroll: {
    subject: "Verifica tu correo — Journal W",
    intro: "Usa este código para activar la verificación en dos pasos de tu cuenta:",
  },
  login: {
    subject: "Tu código de inicio de sesión — Journal W",
    intro: "Usa este código para completar tu inicio de sesión:",
  },
  security: {
    subject: "Confirma este cambio de seguridad — Journal W",
    intro: "Usa este código para confirmar este cambio en tu cuenta:",
  },
};

function hashHex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

export async function sendEmailOtp(
  userId: string,
  email: string,
  purpose: EmailOtpPurpose
): Promise<{ error: string | null }> {
  const admin = createAdminClient();

  const { data: recent } = await admin
    .from("mfa_email_codes")
    .select("created_at")
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent && Date.now() - new Date(recent.created_at).getTime() < RESEND_COOLDOWN_MS) {
    return { error: "Espera unos segundos antes de pedir otro código." };
  }

  const code = generateCode();
  const { error: insertError } = await admin.from("mfa_email_codes").insert({
    user_id: userId,
    code_hash: hashHex(code),
    purpose,
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });

  if (insertError) return { error: insertError.message };

  const { subject, intro } = PURPOSE_COPY[purpose];
  const { error: emailError } = await sendEmail({
    to: email,
    subject,
    html: `<p>${intro}</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p><p>Vence en 10 minutos. Si no fuiste tú, ignora este correo.</p>`,
  });

  return { error: emailError };
}

export async function verifyEmailOtp(
  userId: string,
  code: string,
  purpose: EmailOtpPurpose
): Promise<{ error: string | null }> {
  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("mfa_email_codes")
    .select("id, code_hash, attempts, expires_at")
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!row) return { error: "No hay un código pendiente. Solicita uno nuevo." };
  if (new Date(row.expires_at).getTime() < Date.now()) return { error: "El código expiró. Solicita uno nuevo." };
  if (row.attempts >= MAX_ATTEMPTS) return { error: "Demasiados intentos. Solicita un código nuevo." };

  const expected = Buffer.from(hashHex(code));
  const actual = Buffer.from(row.code_hash);
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!matches) {
    await admin.from("mfa_email_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    return { error: "Código incorrecto." };
  }

  await admin.from("mfa_email_codes").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
  return { error: null };
}

export async function createEmailMfaSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const admin = createAdminClient();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await admin.from("mfa_email_sessions").insert({
    user_id: userId,
    token_hash: hashHex(token),
    expires_at: expiresAt.toISOString(),
  });

  return { token, expiresAt };
}

export async function verifyEmailMfaToken(userId: string, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const admin = createAdminClient();

  const { data } = await admin
    .from("mfa_email_sessions")
    .select("expires_at")
    .eq("user_id", userId)
    .eq("token_hash", hashHex(token))
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

export async function revokeEmailMfaSessions(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("mfa_email_sessions").delete().eq("user_id", userId);
}
