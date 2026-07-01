"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useUIStore } from "@/store/ui-store";
import { formatDateTime, formatR, formatSignedPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DISCIPLINE_ITEMS } from "@/lib/discipline";
import type { Quality, ScreenshotCategory } from "@/types/trade";

const QUALITY_LABELS: Record<Quality, string> = {
  a_plus: "A+",
  a: "A",
  b: "B",
  c: "C",
  d: "D",
};

const SCREENSHOT_CATEGORIES: { value: ScreenshotCategory; label: string }[] = [
  { value: "before", label: "Antes de entrar" },
  { value: "during", label: "Durante la operación" },
  { value: "after", label: "Después del cierre" },
];

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
                <Stat label="Calidad de ejecución" value={trade.quality ? QUALITY_LABELS[trade.quality] : "—"} />
              </div>

              <div className="space-y-1.5 rounded-lg border border-line px-3 py-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-2">Disciplina</span>
                  <span className="font-mono text-gold">{trade.disciplineScore}%</span>
                </div>
                <Progress value={trade.disciplineScore} />
                <ul className="mt-1.5 space-y-1">
                  {DISCIPLINE_ITEMS.map((item) => {
                    const checked = trade.disciplineChecklist.includes(item.id);
                    return (
                      <li
                        key={item.id}
                        className={cn("text-xs", checked ? "text-ink-2" : "text-ink-3 line-through")}
                      >
                        {item.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-ink-3">Estrategia</p>
                  <p className="text-ink">{trade.strategy ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-3">Setup</p>
                  <p className="text-ink">{trade.setup ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-3">Sesión</p>
                  <p className="text-ink">{trade.session ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-3">Timeframe</p>
                  <p className="text-ink">{trade.timeframe ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-3">Motivo de salida</p>
                  <p className="text-ink">{trade.exitReason ?? "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-ink-3">Estado emocional antes</p>
                  <p className="text-ink">{trade.emotionBefore ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-3">Estado emocional después</p>
                  <p className="text-ink">{trade.emotionAfter ?? "—"}</p>
                </div>
              </div>

              {trade.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {trade.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}

              {trade.screenshots.length > 0 ? (
                <div className="space-y-3">
                  {SCREENSHOT_CATEGORIES.map((cat) => {
                    const shots = trade.screenshots.filter((s) => s.category === cat.value);
                    if (shots.length === 0) return null;
                    return (
                      <div key={cat.value}>
                        <p className="mb-1.5 text-xs text-ink-3">{cat.label}</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {shots.map((shot) => (
                            <a
                              key={shot.url}
                              href={shot.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block aspect-square overflow-hidden rounded-md border border-line"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={shot.url} alt="" className="size-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

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
