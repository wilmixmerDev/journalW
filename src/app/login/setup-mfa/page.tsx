import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendEmailOtp } from "@/lib/mfa/email-otp";
import { SetupMfaForm } from "./setup-mfa-form";

export const metadata: Metadata = {
  title: "Activa la verificación en dos pasos",
};

export default async function SetupMfaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email_mfa_verified_at")
    .eq("id", user.id)
    .single();

  // Si ya se verificó (p. ej. desde el enlace mágico del correo, abierto en esta misma pestaña),
  // se salta el paso del código y se ofrece directo el autenticador — sin reenviar nada.
  const alreadyVerified = Boolean(profile?.email_mfa_verified_at);

  if (!alreadyVerified) {
    await sendEmailOtp(user.id, user.email, "enroll");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <SetupMfaForm email={user.email} initialStage={alreadyVerified ? "totp-offer" : "email-otp"} />
    </div>
  );
}
