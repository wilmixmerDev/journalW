"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl()}/auth/callback` },
  });

  if (error || !data?.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "No se pudo iniciar sesión con Google")}`);
  }

  redirect(data.url);
}
