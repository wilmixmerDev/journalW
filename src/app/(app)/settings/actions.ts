"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ProfileUpdateInput {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  birthDate: string;
  experienceLevel: "principiante" | "intermedio" | "avanzado" | "profesional" | null;
  markets: string[];
  initialCapital: number | null;
  timezone: string | null;
}

/** Usa el cliente de service-role porque los usuarios normales no tienen política de update en `profiles`. */
export async function updateOwnProfile(input: ProfileUpdateInput): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      country: input.country,
      birth_date: input.birthDate,
      experience_level: input.experienceLevel,
      markets: input.markets,
      initial_capital: input.initialCapital,
      timezone: input.timezone,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (!error) {
    revalidatePath("/", "layout");
  }

  return { error: error?.message ?? null };
}
