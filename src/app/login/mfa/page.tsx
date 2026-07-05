import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendEmailOtp } from "@/lib/mfa/email-otp";
import { MfaForm } from "./mfa-form";

export const metadata: Metadata = {
  title: "Verificación en dos pasos",
};

export default async function MfaPage() {
  const supabase = await createClient();

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!aal) redirect("/login");
  if (aal.currentLevel === "aal2") redirect("/dashboard");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const totpFactorId = factorsData?.totp[0]?.id ?? null;

  if (!totpFactorId) {
    // Sin autenticador activado, el correo es la única vía disponible: manda el primer código de una vez.
    await sendEmailOtp(user.id, user.email, "login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <MfaForm totpFactorId={totpFactorId} email={user.email} />
    </div>
  );
}
