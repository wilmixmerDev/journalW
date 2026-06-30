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
          exit_price: number | null;
          size: number | null;
          entered_at: string;
          exited_at: string | null;
          strategy: string | null;
          session: string | null;
          tags: string[];
          screenshots: string[];
          pnl: number | null;
          r_multiple: number | null;
          followed_plan: boolean;
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
          exit_price?: number | null;
          size?: number | null;
          entered_at?: string;
          exited_at?: string | null;
          strategy?: string | null;
          session?: string | null;
          tags?: string[];
          screenshots?: string[];
          pnl?: number | null;
          r_multiple?: number | null;
          followed_plan?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trades"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
