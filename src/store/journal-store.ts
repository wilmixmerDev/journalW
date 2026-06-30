"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { JournalType } from "@/types/trade";

interface JournalState {
  journalType: JournalType;
  setJournalType: (type: JournalType) => void;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set) => ({
      journalType: "live",
      setJournalType: (journalType) => set({ journalType }),
    }),
    { name: "journal-w:journal-type" }
  )
);
