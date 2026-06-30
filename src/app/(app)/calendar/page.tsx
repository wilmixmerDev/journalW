import type { Metadata } from "next";
import { getAllJournals } from "@/lib/trades-data";
import { CalendarClient } from "./calendar-client";

export const metadata: Metadata = {
  title: "Calendario — Journal W",
};

export default async function CalendarPage() {
  const { live, backtest } = await getAllJournals();
  return <CalendarClient live={live} backtest={backtest} />;
}
