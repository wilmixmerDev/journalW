import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetupMfaForm } from "./setup-mfa-form";

export const metadata: Metadata = {
  title: "Activa la verificación en dos pasos",
};

export default async function SetupMfaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase.auth.mfa.listFactors();
  if (existing && existing.totp.length > 0) {
    redirect("/dashboard");
  }

  async function cleanUpUnverified() {
    const { data } = await supabase.auth.mfa.listFactors();
    if (!data) return;
    for (const factor of data.all) {
      if (factor.factor_type === "totp" && factor.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }
  }

  // Limpia intentos no verificados de antes, para inscribir uno nuevo en cada visita.
  await cleanUpUnverified();
  let { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Authenticator",
  });

  if (enrollError?.message.includes("already exists")) {
    // Carrera muy rara con una petición concurrente del mismo usuario — reintenta una vez.
    await cleanUpUnverified();
    ({ data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator",
    }));
  }

  if (enrollError || !enrollData) {
    redirect(
      `/login?error=${encodeURIComponent(enrollError?.message ?? "No se pudo iniciar la activación de 2FA.")}`
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <SetupMfaForm
        factorId={enrollData.id}
        qrCode={enrollData.totp.qr_code}
        secret={enrollData.totp.secret}
      />
    </div>
  );
}
