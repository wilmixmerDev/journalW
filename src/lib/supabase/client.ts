import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_AUTH_COOKIE_NAME } from "@/lib/supabase/config";
import type { Database } from "@/types/supabase";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: { name: SUPABASE_AUTH_COOKIE_NAME } }
  );
}
