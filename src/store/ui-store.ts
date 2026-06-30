"use client";

import { create } from "zustand";
import type { Trade } from "@/types/trade";

interface UIState {
  isNewTradeOpen: boolean;
  openNewTrade: () => void;
  closeNewTrade: () => void;

  selectedTrade: Trade | null;
  openTrade: (trade: Trade) => void;
  closeTrade: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isNewTradeOpen: false,
  openNewTrade: () => set({ isNewTradeOpen: true }),
  closeNewTrade: () => set({ isNewTradeOpen: false }),

  selectedTrade: null,
  openTrade: (trade) => set({ selectedTrade: trade }),
  closeTrade: () => set({ selectedTrade: null }),
}));
