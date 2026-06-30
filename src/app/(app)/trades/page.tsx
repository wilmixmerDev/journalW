import type { Metadata } from "next";
import { getAllJournals } from "@/lib/trades-data";
import { TradesClient } from "./trades-client";

export const metadata: Metadata = {
  title: "Operaciones — Journal W",
};

export default async function TradesPage() {
  const { live, backtest } = await getAllJournals();
  return <TradesClient live={live} backtest={backtest} />;
}
