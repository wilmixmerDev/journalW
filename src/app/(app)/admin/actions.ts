"use server";

import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { revokeEmailMfaSessions } from "@/lib/mfa/email-otp";
import type { ExperienceLevel } from "@/types/profile";

export interface AdminUserRow {
  id: string;
  email: string | null;
  role: "user" | "admin";
  mfaExempt: boolean;
  createdAt: string;
  isSuspended: boolean;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  country: string | null;
  birthDate: string | null;
  experienceLevel: ExperienceLevel | null;
  markets: string[];
  initialCapital: number | null;
  timezone: string | null;
}

export interface AdminProfileInput {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  country: string | null;
  birthDate: string | null;
  experienceLevel: ExperienceLevel | null;
  markets: string[];
  initialCapital: number | null;
  timezone: string | null;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return user;
}

export async function listUsersForAdmin(): Promise<{ users: AdminUserRow[]; error: string | null }> {
  if (!isSupabaseConfigured()) return { users: [], error: null };

  const caller = await requireAdmin();
  if (!caller) return { users: [], error: "No autorizado." };

  const admin = createAdminClient();
  const { data: usersData, error: usersError } = await admin.auth.admin.listUsers();
  if (usersError) return { users: [], error: usersError.message };

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select(
      "id, role, mfa_exempt, first_name, last_name, phone, country, birth_date, experience_level, markets, initial_capital, timezone"
    );
  if (profilesError) return { users: [], error: profilesError.message };

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const users: AdminUserRow[] = usersData.users.map((u) => {
    const profile = profileById.get(u.id);
    return {
      id: u.id,
      email: u.email ?? null,
      role: profile?.role ?? "user",
      mfaExempt: profile?.mfa_exempt ?? false,
      createdAt: u.created_at,
      isSuspended: Boolean(u.banned_until),
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      phone: profile?.phone ?? null,
      country: profile?.country ?? null,
      birthDate: profile?.birth_date ?? null,
      experienceLevel: profile?.experience_level ?? null,
      markets: profile?.markets ?? [],
      initialCapital: profile?.initial_capital ?? null,
      timezone: profile?.timezone ?? null,
    };
  });

  return { users, error: null };
}

/** Elimina los factores de 2FA del usuario y lo exime hasta que un admin lo vuelva a requerir. */
export async function disableUserMfa(userId: string): Promise<{ error: string | null }> {
  const caller = await requireAdmin();
  if (!caller) return { error: "No autorizado." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId });
  if (error) return { error: error.message };

  for (const factor of data.factors) {
    const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
    if (deleteError) return { error: deleteError.message };
  }

  await revokeEmailMfaSessions(userId);
  const { error: exemptError } = await admin
    .from("profiles")
    .update({ mfa_exempt: true, email_mfa_verified_at: null })
    .eq("id", userId);
  if (exemptError) return { error: exemptError.message };

  return { error: null };
}

/** Quita la exención del usuario, obligándolo a configurar el 2FA de nuevo. */
export async function requireUserMfa(userId: string): Promise<{ error: string | null }> {
  const caller = await requireAdmin();
  if (!caller) return { error: "No autorizado." };

  const admin = createAdminClient();
  await revokeEmailMfaSessions(userId);
  const { error } = await admin
    .from("profiles")
    .update({ mfa_exempt: false, email_mfa_verified_at: null })
    .eq("id", userId);
  if (error) return { error: error.message };

  return { error: null };
}

/** Genera una contraseña temporal y la asigna directamente — se muestra una sola vez al admin. */
export async function resetUserPassword(
  userId: string
): Promise<{ error: string | null; password: string | null }> {
  const caller = await requireAdmin();
  if (!caller) return { error: "No autorizado.", password: null };

  const password = randomBytes(12).toString("base64url");
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message, password: null };

  return { error: null, password };
}

/** Edita los datos de perfil de un usuario (los mismos campos del onboarding). */
export async function updateUserProfileAsAdmin(
  userId: string,
  input: AdminProfileInput
): Promise<{ error: string | null }> {
  const caller = await requireAdmin();
  if (!caller) return { error: "No autorizado." };

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
    })
    .eq("id", userId);

  return { error: error?.message ?? null };
}

/** Bloquea o restaura el login de un usuario, sin borrar sus datos. */
export async function setUserSuspended(userId: string, suspended: boolean): Promise<{ error: string | null }> {
  const caller = await requireAdmin();
  if (!caller) return { error: "No autorizado." };
  if (caller.id === userId) return { error: "No puedes suspender tu propia cuenta." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: suspended ? "876000h" : "none",
  });

  return { error: error?.message ?? null };
}

/** Sube o baja el rol de un usuario entre "user" y "admin". */
export async function setUserRole(userId: string, role: "user" | "admin"): Promise<{ error: string | null }> {
  const caller = await requireAdmin();
  if (!caller) return { error: "No autorizado." };
  if (caller.id === userId) return { error: "No puedes cambiar tu propio rol." };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);

  return { error: error?.message ?? null };
}
