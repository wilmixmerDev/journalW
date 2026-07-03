import type { Database } from "@/types/supabase";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type Role = ProfileRow["role"];

export interface Profile {
  id: string;
  role: Role;
  mfaExempt: boolean;
}

export function profileFromRow(row: ProfileRow): Profile {
  return { id: row.id, role: row.role, mfaExempt: row.mfa_exempt };
}
