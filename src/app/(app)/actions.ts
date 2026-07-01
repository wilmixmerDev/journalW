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

export interface TradeOptionLists {
  setup: string[];
  strategy: string[];
  tag: string[];
}

export async function getTradeOptions(journalType: JournalType): Promise<TradeOptionLists> {
  const empty: TradeOptionLists = { setup: [], strategy: [], tag: [] };
  if (!isSupabaseConfigured()) return empty;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const { data, error } = await supabase
    .from("trade_options")
    .select("kind, name")
    .eq("user_id", user.id)
    .eq("journal_type", journalType)
    .order("name", { ascending: true });

  if (error || !data) return empty;

  const result: TradeOptionLists = { setup: [], strategy: [], tag: [] };
  for (const row of data) {
    result[row.kind as TradeOptionKind].push(row.name);
  }
  return result;
}

export async function createTradeOption(
  journalType: JournalType,
  kind: TradeOptionKind,
  name: string
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
      { user_id: user.id, journal_type: journalType, kind, name: trimmed },
      { onConflict: "user_id,journal_type,kind,name", ignoreDuplicates: true }
    );

  if (error) return { error: error.message };
  return { error: null };
}
