// Escrito a mano para reflejar supabase/schema.sql.
// Cuando exista un proyecto real de Supabase, reemplazar con los tipos generados:
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
          result_type: "tp" | "sl" | "be" | null;
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
          result_type?: "tp" | "sl" | "be" | null;
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
      trade_presets: {
        Row: {
          id: string;
          user_id: string;
          journal_type: "live" | "backtest";
          name: string;
          market: string | null;
          instrument: string | null;
          strategy: string | null;
          setup: string | null;
          timeframe: string | null;
          session: string | null;
          discipline_checklist: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          journal_type: "live" | "backtest";
          name: string;
          market?: string | null;
          instrument?: string | null;
          strategy?: string | null;
          setup?: string | null;
          timeframe?: string | null;
          session?: string | null;
          discipline_checklist?: string[];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trade_presets"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role: "user" | "admin";
          mfa_exempt: boolean;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          country: string | null;
          birth_date: string | null;
          experience_level: "principiante" | "intermedio" | "avanzado" | "profesional" | null;
          markets: string[];
          initial_capital: number | null;
          timezone: string | null;
          onboarding_completed_at: string | null;
          email_mfa_verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: "user" | "admin";
          mfa_exempt?: boolean;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          country?: string | null;
          birth_date?: string | null;
          experience_level?: "principiante" | "intermedio" | "avanzado" | "profesional" | null;
          markets?: string[];
          initial_capital?: number | null;
          timezone?: string | null;
          onboarding_completed_at?: string | null;
          email_mfa_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      mfa_email_codes: {
        Row: {
          id: string;
          user_id: string;
          code_hash: string;
          purpose: "enroll" | "login" | "security";
          attempts: number;
          expires_at: string;
          consumed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          code_hash: string;
          purpose: "enroll" | "login" | "security";
          attempts?: number;
          expires_at: string;
          consumed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mfa_email_codes"]["Insert"]>;
        Relationships: [];
      };
      mfa_email_sessions: {
        Row: {
          id: string;
          user_id: string;
          token_hash: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token_hash: string;
          expires_at: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mfa_email_sessions"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
