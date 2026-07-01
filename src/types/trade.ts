import type { Database } from "@/types/supabase";

export type Direction = "long" | "short";
export type JournalType = "live" | "backtest";
export type TradeStatus = "open" | "closed";
export type ResultType = "tp" | "sl";
export type Importance = "a_plus" | "media" | "baja";

export type TradeRow = Database["public"]["Tables"]["trades"]["Row"];
export type TradeInsert = Database["public"]["Tables"]["trades"]["Insert"];

export interface Trade {
  id: string;
  userId: string;
  journalType: JournalType;
  status: TradeStatus;
  instrument: string;
  market: string;
  direction: Direction;
  entryPrice: number | null;
  stopPrice: number | null;
  takeProfitPrice: number | null;
  riskPercent: number;
  resultType: ResultType | null;
  importance: Importance | null;
  enteredAt: string;
  exitedAt: string | null;
  strategy: string | null;
  session: string | null;
  screenshots: string[];
  pnl: number | null;
  rMultiple: number | null;
  followedPlan: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function tradeFromRow(row: TradeRow): Trade {
  return {
    id: row.id,
    userId: row.user_id,
    journalType: row.journal_type,
    status: row.status,
    instrument: row.instrument,
    market: row.market,
    direction: row.direction,
    entryPrice: row.entry_price,
    stopPrice: row.stop_price,
    takeProfitPrice: row.take_profit_price,
    riskPercent: row.risk_percent,
    resultType: row.result_type,
    importance: row.importance,
    enteredAt: row.entered_at,
    exitedAt: row.exited_at,
    strategy: row.strategy,
    session: row.session,
    screenshots: row.screenshots,
    pnl: row.pnl,
    rMultiple: row.r_multiple,
    followedPlan: row.followed_plan,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function tradeToInsert(trade: Partial<Trade> & { userId: string }): TradeInsert {
  return {
    user_id: trade.userId,
    journal_type: trade.journalType,
    status: trade.status,
    instrument: trade.instrument!,
    market: trade.market!,
    direction: trade.direction!,
    entry_price: trade.entryPrice,
    stop_price: trade.stopPrice,
    take_profit_price: trade.takeProfitPrice,
    risk_percent: trade.riskPercent!,
    result_type: trade.resultType,
    importance: trade.importance,
    entered_at: trade.enteredAt,
    exited_at: trade.exitedAt,
    strategy: trade.strategy,
    session: trade.session,
    screenshots: trade.screenshots,
    pnl: trade.pnl,
    r_multiple: trade.rMultiple,
    followed_plan: trade.followedPlan,
    notes: trade.notes,
  };
}
