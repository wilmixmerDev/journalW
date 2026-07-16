"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { EMAIL_MFA_SESSION_COOKIE, revokeEmailMfaSessions } from "@/lib/mfa/email-otp";
import {
  tradeToInsert,
  tradePresetFromRow,
  type JournalType,
  type Trade,
  type TradeOptionKind,
  type TradePreset,
} from "@/types/trade";

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await revokeEmailMfaSessions(user.id);
    await supabase.auth.signOut();
  }
  (await cookies()).delete(EMAIL_MFA_SESSION_COOKIE);
  redirect("/login");
}

export async function createTrade(input: Omit<Trade, "id" | "userId" | "createdAt" | "updatedAt">) {
  if (!isSupabaseConfigured()) {
    return { error: "Conecta Supabase para guardar operaciones reales. Por ahora estás en modo demo." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Debes iniciar sesión para registrar una operación." };
  }

  const { error } = await supabase.from("trades").insert(tradeToInsert({ ...input, userId: user.id }));

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/trades");
  revalidatePath("/analytics");
  revalidatePath("/calendar");
  return { error: null };
}

export async function updateTrade(
  id: string,
  input: Omit<Trade, "id" | "userId" | "createdAt" | "updatedAt">
) {
  if (!isSupabaseConfigured()) {
    return { error: "Conecta Supabase para guardar operaciones reales. Por ahora estás en modo demo." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Debes iniciar sesión para editar una operación." };
  }

  const { error } = await supabase
    .from("trades")
    .update(tradeToInsert({ ...input, userId: user.id }))
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/trades");
  revalidatePath("/analytics");
  revalidatePath("/calendar");
  return { error: null };
}

export async function deleteTrade(id: string) {
  if (!isSupabaseConfigured()) {
    return { error: "Conecta Supabase para eliminar operaciones reales. Por ahora estás en modo demo." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Debes iniciar sesión para eliminar una operación." };
  }

  const { error } = await supabase.from("trades").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/trades");
  revalidatePath("/analytics");
  revalidatePath("/calendar");
  return { error: null };
}

export interface TradeOptionLists {
  strategy: string[];
  setupsByStrategy: Record<string, string[]>;
  timeframe: string[];
  tag: string[];
}

const EMPTY_OPTION_LISTS: TradeOptionLists = {
  strategy: [],
  setupsByStrategy: {},
  timeframe: [],
  tag: [],
};

export async function getTradeOptions(journalType: JournalType): Promise<TradeOptionLists> {
  if (!isSupabaseConfigured()) return EMPTY_OPTION_LISTS;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY_OPTION_LISTS;

  const { data, error } = await supabase
    .from("trade_options")
    .select("kind, name, parent")
    .eq("user_id", user.id)
    .eq("journal_type", journalType)
    .order("name", { ascending: true });

  if (error || !data) return EMPTY_OPTION_LISTS;

  const result: TradeOptionLists = { strategy: [], setupsByStrategy: {}, timeframe: [], tag: [] };
  for (const row of data) {
    if (row.kind === "setup") {
      const bucket = result.setupsByStrategy[row.parent] ?? [];
      result.setupsByStrategy[row.parent] = [...bucket, row.name];
    } else if (row.kind === "strategy" || row.kind === "timeframe" || row.kind === "tag") {
      result[row.kind].push(row.name);
    }
  }
  return result;
}

export interface TradePresetInput {
  name: string;
  market: string | null;
  instrument: string | null;
  strategy: string | null;
  setup: string | null;
  timeframe: string | null;
  session: string | null;
  disciplineChecklist: string[];
}

export async function getTradePresets(journalType: JournalType): Promise<TradePreset[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("trade_presets")
    .select("*")
    .eq("user_id", user.id)
    .eq("journal_type", journalType)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map(tradePresetFromRow);
}

const PRESET_NAME_MAX_LENGTH = 24;

export async function createTradePreset(
  journalType: JournalType,
  input: TradePresetInput
): Promise<{ error: string | null }> {
  const name = input.name.trim().slice(0, PRESET_NAME_MAX_LENGTH);
  if (!name) return { error: "Ponle un nombre al favorito." };
  if (!isSupabaseConfigured()) return { error: "Conecta Supabase para guardar favoritos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión." };

  const { error } = await supabase.from("trade_presets").insert({
    user_id: user.id,
    journal_type: journalType,
    name,
    market: input.market,
    instrument: input.instrument,
    strategy: input.strategy,
    setup: input.setup,
    timeframe: input.timeframe,
    session: input.session,
    discipline_checklist: input.disciplineChecklist,
  });

  if (error) {
    if (error.code === "23505") return { error: "Ya tienes un favorito con ese nombre." };
    return { error: error.message };
  }
  return { error: null };
}

export async function updateTradePreset(
  id: string,
  input: TradePresetInput
): Promise<{ error: string | null }> {
  const name = input.name.trim().slice(0, PRESET_NAME_MAX_LENGTH);
  if (!name) return { error: "Ponle un nombre al favorito." };
  if (!isSupabaseConfigured()) return { error: "Conecta Supabase para guardar favoritos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión." };

  const { error } = await supabase
    .from("trade_presets")
    .update({
      name,
      market: input.market,
      instrument: input.instrument,
      strategy: input.strategy,
      setup: input.setup,
      timeframe: input.timeframe,
      session: input.session,
      discipline_checklist: input.disciplineChecklist,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "Ya tienes un favorito con ese nombre." };
    return { error: error.message };
  }
  return { error: null };
}

export async function deleteTradePreset(id: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión." };

  const { error } = await supabase.from("trade_presets").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function createTradeOption(
  journalType: JournalType,
  kind: TradeOptionKind,
  name: string,
  parent = ""
): Promise<{ error: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "El nombre no puede estar vacío." };
  if (!isSupabaseConfigured()) return { error: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión." };

  const { error } = await supabase
    .from("trade_options")
    .upsert(
      { user_id: user.id, journal_type: journalType, kind, parent, name: trimmed },
      { onConflict: "user_id,journal_type,kind,parent,name", ignoreDuplicates: true }
    );

  if (error) return { error: error.message };
  return { error: null };
}
