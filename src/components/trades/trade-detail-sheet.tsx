"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUIStore } from "@/store/ui-store";
import { formatDateTime, formatR, formatSignedPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Importance } from "@/types/trade";

const IMPORTANCE_LABELS: Record<Importance, string> = {
  a_plus: "A+",
  media: "Media",
  baja: "Baja",
};

export function TradeDetailSheet() {
  const trade = useUIStore((s) => s.selectedTrade);
  const close = useUIStore((s) => s.closeTrade);

  const win = (trade?.pnl ?? 0) > 0;

  return (
    <Sheet open={!!trade} onOpenChange={(open) => !open && close()}>
      <SheetContent side="right" className="w-full">
        {trade ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SheetTitle className="font-serif text-2xl">{trade.instrument}</SheetTitle>
                <Badge variant={trade.direction === "long" ? "default" : "secondary"}>
                  {trade.direction === "long" ? "Long" : "Short"}
                </Badge>
              </div>
              <SheetDescription>
                {trade.market} · {formatDateTime(trade.enteredAt)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="P&L" value={formatSignedPercent(trade.pnl ?? 0)} tone={win ? "pos" : "neg"} />
                <Stat label="R-Multiple" value={formatR(trade.rMultiple ?? 0)} tone={win ? "pos" : "neg"} />
                <Stat label="Riesgo" value={`${trade.riskPercent}%`} />
                <Stat
                  label="Resultado"
                  value={trade.resultType === "tp" ? "Take Profit" : trade.resultType === "sl" ? "Stop Loss" : "—"}
                />
                <Stat label="Entrada" value={trade.entryPrice?.toString() ?? "—"} />
                <Stat label="Stop" value={trade.stopPrice?.toString() ?? "—"} />
                <Stat label="Take Profit" value={trade.takeProfitPrice?.toString() ?? "—"} />
                <Stat
                  label="Importancia"
                  value={trade.importance ? IMPORTANCE_LABELS[trade.importance] : "—"}
                />
              </div>

              <div
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-medium",
                  trade.followedPlan
                    ? "border-pos/30 bg-pos-soft text-pos"
                    : "border-neg/30 bg-neg-soft text-neg"
                )}
              >
                {trade.followedPlan ? "Plan seguido" : "Plan no seguido"}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-ink-3">Estrategia</p>
                  <p className="text-ink">{trade.strategy ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-3">Sesión</p>
                  <p className="text-ink">{trade.session ?? "—"}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-ink-3">Notas</p>
                <p className="mt-1 text-sm text-ink-2">{trade.notes ?? "Sin notas."}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-ink-3">
                <div>
                  <p>Entrada</p>
                  <p className="font-mono text-ink-2">{formatDateTime(trade.enteredAt)}</p>
                </div>
                <div>
                  <p>Salida</p>
                  <p className="font-mono text-ink-2">
                    {trade.exitedAt ? formatDateTime(trade.exitedAt) : "—"}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2">
      <p className="text-xs text-ink-3">{label}</p>
      <p
        className={cn(
          "font-mono text-sm",
          tone === "pos" && "text-pos",
          tone === "neg" && "text-neg",
          !tone && "text-ink"
        )}
      >
        {value}
      </p>
    </div>
  );
}
