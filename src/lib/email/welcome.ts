import { sendEmail } from "@/lib/email/brevo";
import { siteUrl } from "@/lib/site-url";

function buildWelcomeEmailHtml(firstName: string): string {
  return `
<div style="background:#F4F1EA;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:420px;margin:0 auto;background:#FBFAF6;border-radius:16px;overflow:hidden;border:1px solid #E5E0D5;">
    <div style="padding:28px 32px 0;">
      <img src="${siteUrl()}/brand/icon-light-96.png" width="40" height="40" alt="Journal W" style="display:block;border-radius:11px;" />
    </div>
    <div style="padding:20px 32px 32px;">
      <h1 style="margin:0 0 8px;font-size:22px;line-height:1.3;color:#1C1A16;">¡Bienvenido a Journal W, ${firstName}!</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#57534A;">
        Tu cuenta ya está lista. Journal W te ayuda a registrar cada operación, medir tu disciplina y entender de verdad qué te está funcionando como trader — no solo cuánto ganas o pierdes.
      </p>
      <a href="${siteUrl()}/dashboard" style="display:block;text-align:center;background:#1C1A16;color:#F4F1EA;text-decoration:none;font-size:14px;font-weight:600;padding:13px 20px;border-radius:10px;margin-bottom:20px;">Ir a mi dashboard →</a>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#928C80;">Si tienes alguna duda, responde este correo — con gusto te ayudamos.</p>
    </div>
  </div>
</div>`.trim();
}

/** Se envía una sola vez, al completar el onboarding — no bloquea el flujo si falla. */
export async function sendWelcomeEmail(email: string, firstName: string): Promise<void> {
  const { error } = await sendEmail({
    to: email,
    subject: "¡Bienvenido a Journal W!",
    html: buildWelcomeEmailHtml(firstName),
  });
  if (error) console.error("[welcome-email] no se pudo enviar:", error);
}
