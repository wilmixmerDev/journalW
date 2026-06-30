import type { Metadata } from "next";
import { getAllJournals } from "@/lib/trades-data";
import { AnalyticsClient } from "./analytics-client";

export const metadata: Metadata = {
  title: "Analíticas — Journal W",
};

export default async function AnalyticsPage() {
  const { live, backtest } = await getAllJournals();
  return <AnalyticsClient live={live} backtest={backtest} />;
}
