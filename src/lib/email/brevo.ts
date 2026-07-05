import { BrevoClient, BrevoError } from "@getbrevo/brevo";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/** Sin BREVO_API_KEY (dev local sin cuenta de Brevo) el correo solo se imprime en la consola del servidor. */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<{ error: string | null }> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    const plainText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const linkMatch = html.match(/href="([^"]+)"/);
    console.log(
      `[email:dev] Para: ${to} · Asunto: ${subject}\n${plainText}${linkMatch ? `\nEnlace: ${linkMatch[1]}` : ""}`
    );
    return { error: null };
  }

  const fromEmail = process.env.BREVO_FROM_EMAIL;
  if (!fromEmail) {
    return { error: "Falta configurar BREVO_FROM_EMAIL (el remitente verificado en Brevo)." };
  }

  const brevo = new BrevoClient({ apiKey });

  try {
    await brevo.transactionalEmails.sendTransacEmail({
      sender: { name: "Journal W", email: fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });
    return { error: null };
  } catch (error) {
    if (error instanceof BrevoError) return { error: error.message };
    return { error: "No se pudo enviar el correo." };
  }
}
