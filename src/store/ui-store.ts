"use client";

import { create } from "zustand";
import type { Trade } from "@/types/trade";

interface UIState {
  isNewTradeOpen: boolean;
  editingTrade: Trade | null;
  openNewTrade: () => void;
  openEditTrade: (trade: Trade) => void;
  closeNewTrade: () => void;

  selectedTrade: Trade | null;
  openTrade: (trade: Trade) => void;
  closeTrade: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isNewTradeOpen: false,
  editingTrade: null,
  openNewTrade: () => set({ isNewTradeOpen: true, editingTrade: null }),
  openEditTrade: (trade) => set({ isNewTradeOpen: true, editingTrade: trade }),
  closeNewTrade: () => set({ isNewTradeOpen: false, editingTrade: null }),

  selectedTrade: null,
  openTrade: (trade) => set({ selectedTrade: trade }),
  closeTrade: () => set({ selectedTrade: null }),
}));
