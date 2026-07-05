"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { tradeToInsert, type JournalType, type Trade, type TradeOptionKind } from "@/types/trade";

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
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
