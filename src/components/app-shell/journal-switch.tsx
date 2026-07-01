"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useJournalStore } from "@/store/journal-store";

const OPTIONS: { value: "live" | "backtest"; label: string }[] = [
  { value: "live", label: "Live" },
  { value: "backtest", label: "Backtest" },
];

export function JournalSwitch() {
  const journalType = useJournalStore((s) => s.journalType);
  const setJournalType = useJournalStore((s) => s.setJournalType);
  const pillId = useId();

  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
      {OPTIONS.map((option) => {
        const active = journalType === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setJournalType(option.value)}
            className={cn(
              "relative rounded-md py-1.5 text-xs font-medium transition-colors",
              active ? "text-ink" : "text-ink-2 hover:text-ink"
            )}
          >
            {active ? (
              <motion.span
                layoutId={`journal-switch-pill-${pillId}`}
                className="absolute inset-0 rounded-md bg-raise shadow-sm"
                transition={{ type: "spring", duration: 0.35, bounce: 0.2 }}
              />
            ) : null}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
