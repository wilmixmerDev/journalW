import type { Metadata } from "next";
import { getAllJournals } from "@/lib/trades-data";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard — Journal W",
};

export default async function DashboardPage() {
  const { live, backtest } = await getAllJournals();
  return <DashboardClient live={live} backtest={backtest} />;
}
