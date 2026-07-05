import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseUrl } from "@/lib/supabase/config";
import type { Database } from "@/types/supabase";

/** Cliente de service-role — salta RLS. Solo servidor, nunca importar desde un Client Component. */
export function createAdminClient() {
  const url = getServerSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para el cliente admin de Supabase."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
