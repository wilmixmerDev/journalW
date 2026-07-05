import type { Database } from "@/types/supabase";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type Role = ProfileRow["role"];
export type ExperienceLevel = NonNullable<ProfileRow["experience_level"]>;

export interface Profile {
  id: string;
  role: Role;
  mfaExempt: boolean;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  country: string | null;
  birthDate: string | null;
  experienceLevel: ExperienceLevel | null;
  markets: string[];
  initialCapital: number | null;
  timezone: string | null;
  onboardingCompletedAt: string | null;
  emailMfaVerifiedAt: string | null;
}

export function profileFromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    role: row.role,
    mfaExempt: row.mfa_exempt,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    country: row.country,
    birthDate: row.birth_date,
    experienceLevel: row.experience_level,
    markets: row.markets,
    initialCapital: row.initial_capital,
    timezone: row.timezone,
    onboardingCompletedAt: row.onboarding_completed_at,
    emailMfaVerifiedAt: row.email_mfa_verified_at,
  };
}
