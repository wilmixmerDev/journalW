"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useJournalTrades } from "@/hooks/use-journal-trades";
import { useUIStore } from "@/store/ui-store";
import { formatDate, formatR, formatSignedPercent } from "@/lib/format";
import type { Trade } from "@/types/trade";

interface TradesClientProps {
  live: Trade[];
  backtest: Trade[];
}

type Filter = "all" | "wins" | "losses" | "a-plus";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "wins", label: "Ganadoras" },
  { value: "losses", label: "Perdedoras" },
  { value: "a-plus", label: "A+ Setups" },
];

export function TradesClient({ live, backtest }: TradesClientProps) {
  const trades = useJournalTrades(live, backtest);
  const [filter, setFilter] = useState<Filter>("all");
  const openTrade = useUIStore((s) => s.openTrade);

  const filtered = useMemo(() => {
    switch (filter) {
      case "wins":
        return trades.filter((t) => (t.pnl ?? 0) > 0);
      case "losses":
        return trades.filter((t) => (t.pnl ?? 0) < 0);
      case "a-plus":
        return trades.filter((t) => t.importance === "a_plus");
      default:
        return trades;
    }
  }, [trades, filter]);

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="font-serif text-3xl text-ink">Operaciones</h1>
        <p className="text-sm text-ink-2">{trades.length} operaciones registradas.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              filter === f.value
                ? "border-ink bg-ink text-bg"
                : "border-line text-ink-2 hover:border-line-2 hover:text-ink"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Instrumento</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estrategia</TableHead>
              <TableHead className="text-right">R</TableHead>
              <TableHead className="text-right">P&amp;L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-ink-3">
                  No hay operaciones para este filtro.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((trade) => {
                const win = (trade.pnl ?? 0) > 0;
                return (
                  <TableRow
                    key={trade.id}
                    className="cursor-pointer"
                    onClick={() => openTrade(trade)}
                  >
                    <TableCell className="font-medium text-ink">
                      <div className="flex items-center gap-2">
                        {trade.instrument}
                        {trade.importance === "a_plus" ? (
                          <Badge variant="outline" className="text-gold">
                            A+
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={trade.direction === "long" ? "default" : "secondary"}>
                        {trade.direction === "long" ? "Long" : "Short"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-ink-2">{formatDate(trade.enteredAt)}</TableCell>
                    <TableCell className="text-ink-2">{trade.strategy ?? "—"}</TableCell>
                    <TableCell className={cn("text-right font-mono", win ? "text-pos" : "text-neg")}>
                      {formatR(trade.rMultiple ?? 0)}
                    </TableCell>
                    <TableCell className={cn("text-right font-mono", win ? "text-pos" : "text-neg")}>
                      {formatSignedPercent(trade.pnl ?? 0)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
