import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { profileFromRow } from "@/types/profile";
import { getAllJournals } from "@/lib/trades-data";
import { AnalyticsClient } from "./analytics-client";

export const metadata: Metadata = {
  title: "Analíticas",
};

export default async function AnalyticsPage() {
  const { live, backtest } = await getAllJournals();

  if (!isSupabaseConfigured()) {
    return <AnalyticsClient live={live} backtest={backtest} profile={null} email={null} />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: row } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).single()
    : { data: null };

  return (
    <AnalyticsClient
      live={live}
      backtest={backtest}
      profile={row ? profileFromRow(row) : null}
      email={user?.email ?? null}
    />
  );
}
