"use client";

import { cn } from "@/lib/utils";
import { useJournalStore } from "@/store/journal-store";

const OPTIONS: { value: "live" | "backtest"; label: string }[] = [
  { value: "live", label: "Live" },
  { value: "backtest", label: "Backtest" },
];

export function JournalSwitch() {
  const journalType = useJournalStore((s) => s.journalType);
  const setJournalType = useJournalStore((s) => s.setJournalType);

  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setJournalType(option.value)}
          className={cn(
            "rounded-md py-1.5 text-xs font-medium transition-colors",
            journalType === option.value
              ? "bg-raise text-ink shadow-sm"
              : "text-ink-2 hover:text-ink"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
