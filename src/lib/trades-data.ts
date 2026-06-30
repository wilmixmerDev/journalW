import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { generateMockTrades } from "@/lib/mock-trades";
import { tradeFromRow, type JournalType, type Trade } from "@/types/trade";

export interface TradesResult {
  trades: Trade[];
  isDemo: boolean;
}

export async function getTrades(journalType: JournalType): Promise<TradesResult> {
  if (!isSupabaseConfigured()) {
    return { trades: generateMockTrades({ journalType }), isDemo: true };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("journal_type", journalType)
    .order("entered_at", { ascending: false });

  if (error || !data) {
    return { trades: generateMockTrades({ journalType }), isDemo: true };
  }

  return { trades: data.map(tradeFromRow), isDemo: false };
}

export interface AllJournalsResult {
  live: Trade[];
  backtest: Trade[];
  isDemo: boolean;
}

export async function getAllJournals(): Promise<AllJournalsResult> {
  const [live, backtest] = await Promise.all([getTrades("live"), getTrades("backtest")]);
  return { live: live.trades, backtest: backtest.trades, isDemo: live.isDemo || backtest.isDemo };
}
