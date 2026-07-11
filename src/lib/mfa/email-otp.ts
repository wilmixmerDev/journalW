import { randomInt, randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/brevo";
import { siteUrl } from "@/lib/site-url";

export type EmailOtpPurpose = "enroll" | "login" | "security";

const CODE_LENGTH = 6;
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export const EMAIL_MFA_SESSION_COOKIE = "journalw-email-mfa";

const PURPOSE_COPY: Record<EmailOtpPurpose, { subject: string; heading: string; intro: string }> = {
  enroll: {
    subject: "Verifica tu correo — Journal W",
    heading: "Verifica tu correo",
    intro: "Usa este código para activar la verificación en dos pasos de tu cuenta.",
  },
  login: {
    subject: "Tu código de inicio de sesión — Journal W",
    heading: "Inicia sesión",
    intro: "Usa este código para completar tu inicio de sesión.",
  },
  security: {
    subject: "Confirma este cambio de seguridad — Journal W",
    heading: "Confirma este cambio",
    intro: "Usa este código para confirmar un cambio de seguridad en tu cuenta.",
  },
};

/** El enlace mágico solo tiene sentido para flujos de "verificar y seguir" — security va siempre con código manual. */
const MAGIC_LINK_PURPOSES = new Set<EmailOtpPurpose>(["enroll", "login"]);

function hashHex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

function buildEmailHtml(purpose: EmailOtpPurpose, code: string): string {
  const { heading, intro } = PURPOSE_COPY[purpose];
  const verifyUrl = MAGIC_LINK_PURPOSES.has(purpose)
    ? `${siteUrl()}/auth/verify-email-otp?code=${code}&purpose=${purpose}`
    : null;

  return `
<div style="background:#F4F1EA;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:420px;margin:0 auto;background:#FBFAF6;border-radius:16px;overflow:hidden;border:1px solid #E5E0D5;">
    <div style="padding:28px 32px 0;">
      <img src="${siteUrl()}/brand/icon-light-96.png" width="40" height="40" alt="Journal W" style="display:block;border-radius:11px;" />
    </div>
    <div style="padding:20px 32px 32px;">
      <h1 style="margin:0 0 8px;font-size:22px;line-height:1.3;color:#1C1A16;">${heading}</h1>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#57534A;">${intro}</p>

      <div style="background:#EEEAE0;border-radius:12px;padding:18px;text-align:center;margin-bottom:24px;">
        <span style="font-family:'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#1C1A16;">${code}</span>
      </div>

      ${
        verifyUrl
          ? `<a href="${verifyUrl}" style="display:block;text-align:center;background:#1C1A16;color:#F4F1EA;text-decoration:none;font-size:14px;font-weight:600;padding:13px 20px;border-radius:10px;margin-bottom:20px;">Verificar automáticamente →</a>
      <p style="margin:0 0 20px;font-size:12px;line-height:1.6;color:#928C80;text-align:center;">Ábrelo desde el mismo dispositivo donde iniciaste el proceso. Si no funciona, escribe el código de arriba a mano.</p>`
          : ""
      }

      <p style="margin:0;font-size:12px;line-height:1.6;color:#928C80;">Este código vence en 10 minutos. Si no fuiste tú, ignora este correo.</p>
    </div>
  </div>
</div>`.trim();
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

  const { error: emailError } = await sendEmail({
    to: email,
    subject: PURPOSE_COPY[purpose].subject,
    html: buildEmailHtml(purpose, code),
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

/** Para que la pestaña que espera el código detecte que ya se verificó desde el enlace mágico en otra pestaña/dispositivo. */
export async function hasConsumedLatestCode(userId: string, purpose: EmailOtpPurpose): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("mfa_email_codes")
    .select("consumed_at")
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return Boolean(data?.consumed_at);
}

/** Verifica el código y, si aplica, deja la sesión lista (marca el correo obligatorio, crea la sesión de correo). */
export async function completeEmailOtpVerification(
  userId: string,
  code: string,
  purpose: EmailOtpPurpose
): Promise<{ error: string | null; session: { token: string; expiresAt: Date } | null }> {
  const { error } = await verifyEmailOtp(userId, code, purpose);
  if (error) return { error, session: null };

  if (purpose === "enroll") {
    const admin = createAdminClient();
    const { error: profileError } = await admin
      .from("profiles")
      .update({ email_mfa_verified_at: new Date().toISOString() })
      .eq("id", userId);
    if (profileError) return { error: profileError.message, session: null };
  }

  const session = await createEmailMfaSession(userId);
  return { error: null, session };
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
