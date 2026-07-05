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

  // El correo obligatorio ya está verificado (no debería llegar aquí salvo carrera rara) — nada que hacer.
  if (profile?.email_mfa_verified_at) redirect("/dashboard");

  // Manda el primer código del correo obligatorio de una vez; el autenticador queda como paso opcional después.
  await sendEmailOtp(user.id, user.email, "enroll");

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <SetupMfaForm email={user.email} />
    </div>
  );
}
