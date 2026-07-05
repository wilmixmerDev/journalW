import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listUsersForAdmin } from "./actions";
import { AdminClient } from "./admin-client";

export const metadata: Metadata = {
  title: "Administración",
};

export default async function AdminPage() {
  if (!isSupabaseConfigured()) redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  const { users, error } = await listUsersForAdmin();

  return <AdminClient initialUsers={users} initialError={error} />;
}
