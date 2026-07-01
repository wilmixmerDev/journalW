// Hand-written to match supabase/schema.sql.
// Once a real Supabase project exists, replace with the generated types:
//   npx supabase gen types typescript --project-id <id> > src/types/supabase.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      trades: {
        Row: {
          id: string;
          user_id: string;
          journal_type: "live" | "backtest";
          status: "open" | "closed";
          instrument: string;
          market: string;
          direction: "long" | "short";
          entry_price: number | null;
          stop_price: number | null;
          take_profit_price: number | null;
          risk_percent: number;
          result_type: "tp" | "sl" | null;
          quality: "a_plus" | "a" | "b" | "c" | "d" | null;
          setup: string | null;
          timeframe: string | null;
          emotion_before: string | null;
          emotion_after: string | null;
          tags: string[];
          entered_at: string;
          exited_at: string | null;
          strategy: string | null;
          session: string | null;
          screenshots: Json;
          pnl: number | null;
          r_multiple: number | null;
          discipline_checklist: string[];
          discipline_score: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          journal_type?: "live" | "backtest";
          status?: "open" | "closed";
          instrument: string;
          market: string;
          direction: "long" | "short";
          entry_price?: number | null;
          stop_price?: number | null;
          take_profit_price?: number | null;
          risk_percent: number;
          result_type?: "tp" | "sl" | null;
          quality?: "a_plus" | "a" | "b" | "c" | "d" | null;
          setup?: string | null;
          timeframe?: string | null;
          emotion_before?: string | null;
          emotion_after?: string | null;
          tags?: string[];
          entered_at?: string;
          exited_at?: string | null;
          strategy?: string | null;
          session?: string | null;
          screenshots?: Json;
          pnl?: number | null;
          r_multiple?: number | null;
          discipline_checklist?: string[];
          discipline_score?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trades"]["Insert"]>;
        Relationships: [];
      };
      trade_options: {
        Row: {
          id: string;
          user_id: string;
          journal_type: "live" | "backtest";
          kind: "setup" | "strategy" | "tag" | "timeframe";
          parent: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          journal_type: "live" | "backtest";
          kind: "setup" | "strategy" | "tag" | "timeframe";
          parent?: string;
          name: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trade_options"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
