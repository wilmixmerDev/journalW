import { Resend } from "resend";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

function getFromAddress() {
  return process.env.RESEND_FROM_EMAIL || "Journal W <onboarding@resend.dev>";
}

/** Sin RESEND_API_KEY (dev local sin cuenta de Resend) el correo solo se imprime en la consola del servidor. */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<{ error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[email:dev] Para: ${to} · Asunto: ${subject}\n${html.replace(/<[^>]+>/g, " ").trim()}`);
    return { error: null };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from: getFromAddress(), to, subject, html });

  return { error: error?.message ?? null };
}
