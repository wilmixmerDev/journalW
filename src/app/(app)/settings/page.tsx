import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { profileFromRow } from "@/types/profile";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = {
  title: "Configuración",
};

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!row) redirect("/dashboard");

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const hasTotp = Boolean(factorsData && factorsData.totp.length > 0);

  return <SettingsClient profile={profileFromRow(row)} email={user.email ?? null} hasTotp={hasTotp} />;
}
