export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes("placeholder") && !key.includes("placeholder"));
}

/** URL de Supabase para el servidor — usa SUPABASE_INTERNAL_URL cuando la app corre en Docker. */
export function getServerSupabaseUrl(): string {
  return process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

// Fijo para que navegador y servidor coincidan en el nombre de cookie aunque usen URLs distintas.
export const SUPABASE_AUTH_COOKIE_NAME = "sb-journalw-auth-token";
