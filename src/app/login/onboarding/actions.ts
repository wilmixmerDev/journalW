"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email/welcome";

export interface OnboardingInput {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  birthDate: string;
  experienceLevel: "principiante" | "intermedio" | "avanzado" | "profesional";
  markets: string[];
  initialCapital: number | null;
  timezone: string;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

/** Usa el cliente de service-role porque los usuarios normales no tienen política de update en `profiles`. */
export async function completeOnboarding(input: OnboardingInput): Promise<{ error: string | null }> {
  const user = await requireUser();

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

  if (!error && user.email) {
    await sendWelcomeEmail(user.email, input.firstName);
  }

  return { error: error?.message ?? null };
}
