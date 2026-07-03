"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface AdminUserRow {
  id: string;
  email: string | null;
  role: "user" | "admin";
  mfaExempt: boolean;
  createdAt: string;
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
    .select("id, role, mfa_exempt");
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
    };
  });

  return { users, error: null };
}

/** Removes a user's 2FA factors and exempts them from the requirement until an admin re-requires it. */
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

  const { error: exemptError } = await admin
    .from("profiles")
    .update({ mfa_exempt: true })
    .eq("id", userId);
  if (exemptError) return { error: exemptError.message };

  return { error: null };
}

/** Clears a user's exemption, forcing them through 2FA setup again on their next request. */
export async function requireUserMfa(userId: string): Promise<{ error: string | null }> {
  const caller = await requireAdmin();
  if (!caller) return { error: "No autorizado." };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ mfa_exempt: false }).eq("id", userId);
  if (error) return { error: error.message };

  return { error: null };
}
