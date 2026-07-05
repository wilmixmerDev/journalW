import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MfaForm } from "./mfa-form";

export const metadata: Metadata = {
  title: "Verificación en dos pasos",
};

export default async function MfaPage() {
  const supabase = await createClient();

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!aal || aal.currentLevel === aal.nextLevel) {
    redirect(aal?.currentLevel === "aal2" ? "/dashboard" : "/login");
  }

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const factorId = factorsData?.totp[0]?.id;
  if (!factorId) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <MfaForm factorId={factorId} />
    </div>
  );
}
