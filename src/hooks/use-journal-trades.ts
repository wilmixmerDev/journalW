"use client";

import { useJournalStore } from "@/store/journal-store";
import type { Trade } from "@/types/trade";

export function useJournalTrades(live: Trade[], backtest: Trade[]): Trade[] {
  const journalType = useJournalStore((s) => s.journalType);
  return journalType === "backtest" ? backtest : live;
}
