"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { tradeToInsert, type Trade } from "@/types/trade";

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
