"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSupabaseUrl } from "@/lib/supabase/config";
import { sendEmailOtp, verifyEmailOtp } from "@/lib/mfa/email-otp";
import type { Database } from "@/types/supabase";

/** Verifica la contraseña con un cliente sin sesión persistida, para no pisar la sesión (y su AAL) ya activa. */
async function verifyCurrentPassword(email: string, password: string): Promise<boolean> {
  const stateless = createSupabaseClient<Database>(
    getServerSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error } = await stateless.auth.signInWithPassword({ email, password });
  return !error;
}

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

export interface TwoFactorProof {
  method: "totp" | "email";
  code: string;
}

export async function sendSecurityEmailOtp(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Debes iniciar sesión." };
  return sendEmailOtp(user.id, user.email, "security");
}

async function verifySecurityProof(userId: string, proof: TwoFactorProof): Promise<{ error: string | null }> {
  if (proof.method === "email") {
    return verifyEmailOtp(userId, proof.code, "security");
  }

  const supabase = await createClient();
  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const factorId = factorsData?.totp[0]?.id;
  if (!factorId) return { error: "No tienes un autenticador activado." };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: proof.code });
  return { error: error?.message ?? null };
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  proof: TwoFactorProof;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Debes iniciar sesión." };

  const passwordOk = await verifyCurrentPassword(user.email, input.currentPassword);
  if (!passwordOk) return { error: "La contraseña actual no es correcta." };

  const { error: proofError } = await verifySecurityProof(user.id, input.proof);
  if (proofError) return { error: proofError };

  const { error: updateError } = await supabase.auth.updateUser({ password: input.newPassword });
  return { error: updateError?.message ?? null };
}

/** Requiere reverificar un factor vigente antes de quitar el autenticador. */
export async function disableTotp(proof: TwoFactorProof): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión." };

  const { error: proofError } = await verifySecurityProof(user.id, proof);
  if (proofError) return { error: proofError };

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const factorId = factorsData?.totp[0]?.id;
  if (!factorId) return { error: null };

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null };
}
