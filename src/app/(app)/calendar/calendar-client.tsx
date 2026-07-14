"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MetricCard } from "@/components/shared/metric-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useJournalTrades } from "@/hooks/use-journal-trades";
import { useJournalStore } from "@/store/journal-store";
import { computeMetrics } from "@/lib/metrics";
import { formatPercent, formatSignedPercent } from "@/lib/format";
import type { Trade } from "@/types/trade";

interface CalendarClientProps {
  live: Trade[];
  backtest: Trade[];
}

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i),
  label: format(new Date(2000, i, 1), "MMMM", { locale: es }),
}));

export function CalendarClient({ live, backtest }: CalendarClientProps) {
  const trades = useJournalTrades(live, backtest);
  const journalType = useJournalStore((s) => s.journalType);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const dayMap = useMemo(() => {
    const map = new Map<string, Trade[]>();
    for (const trade of trades) {
      if (trade.status !== "closed") continue;
      const key = format(new Date(trade.enteredAt), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(trade);
    }
    return map;
  }, [trades]);

  const monthTrades = useMemo(
    () => trades.filter((t) => isSameMonth(new Date(t.enteredAt), month)),
    [trades, month]
  );
  const monthMetrics = computeMetrics(monthTrades);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const maxAbsPnl = useMemo(() => {
    let max = 0;
    for (const dayTrades of dayMap.values()) {
      const pnl = Math.abs(dayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0));
      max = Math.max(max, pnl);
    }
    return max || 1;
  }, [dayMap]);

  // Seguimiento de práctica: días REALES en los que se registraron operaciones de backtesting
  // (createdAt), independiente de la fecha histórica de la operación (enteredAt).
  const practiceDays = useMemo(() => {
    const set = new Set<string>();
    if (journalType !== "backtest") return set;
    for (const trade of trades) {
      set.add(format(new Date(trade.createdAt), "yyyy-MM-dd"));
    }
    return set;
  }, [trades, journalType]);

  const monthPracticeDays = useMemo(() => {
    const prefix = format(month, "yyyy-MM");
    let count = 0;
    for (const key of practiceDays) if (key.startsWith(prefix)) count++;
    return count;
  }, [practiceDays, month]);

  // El rango de años se arma desde la operación más antigua (histórica) hasta hoy.
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    let minYear = currentYear;
    for (const trade of trades) {
      const y = new Date(trade.enteredAt).getFullYear();
      if (y < minYear) minYear = y;
    }
    minYear = Math.min(minYear, currentYear - 5);
    return Array.from({ length: currentYear - minYear + 1 }, (_, i) => String(currentYear - i));
  }, [trades]);

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-ink">Calendario</h1>
          <p className="text-sm text-ink-2 capitalize">{format(month, "MMMM yyyy", { locale: es })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Salto directo a cualquier mes/año, sin tener que ir flecha por flecha. */}
          <Select
            items={MONTH_OPTIONS}
            value={String(month.getMonth())}
            onValueChange={(v) => v && setMonth(new Date(month.getFullYear(), Number(v), 1))}
          >
            <SelectTrigger className="w-32 capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value} className="capitalize">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(month.getFullYear())}
            onValueChange={(v) => v && setMonth(new Date(Number(v), month.getMonth(), 1))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => setMonth(startOfMonth(new Date()))}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="P&L del mes"
          value={formatSignedPercent(monthMetrics.netPnl)}
          tone={monthMetrics.netPnl >= 0 ? "pos" : "neg"}
        />
        <MetricCard label="Operaciones" value={String(monthMetrics.totalTrades)} />
        <MetricCard label="Win Rate" value={formatPercent(monthMetrics.winRate)} />
        {journalType === "backtest" ? (
          <MetricCard
            label="Días de práctica"
            value={String(monthPracticeDays)}
            tone="gold"
            hint="días con backtesting este mes"
          />
        ) : (
          <MetricCard label="Mejor racha" value={String(monthMetrics.bestWinStreak)} tone="gold" />
        )}
      </div>

      <Card className="border-line bg-surface">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-ink-3">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="py-1">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayTrades = dayMap.get(key) ?? [];
              const pnl = dayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
              const inMonth = isSameMonth(day, month);
              const intensity = dayTrades.length ? 0.15 + 0.55 * Math.min(Math.abs(pnl) / maxAbsPnl, 1) : 0;

              return (
                <div
                  key={key}
                  className={cn(
                    "flex aspect-square flex-col justify-between rounded-lg border p-1.5 text-xs",
                    inMonth ? "border-line" : "border-transparent opacity-30",
                    isToday(day) && "ring-1 ring-ink"
                  )}
                  style={
                    dayTrades.length
                      ? {
                          backgroundColor: pnl >= 0
                            ? `rgba(47, 125, 84, ${intensity})`
                            : `rgba(176, 57, 46, ${intensity})`,
                        }
                      : undefined
                  }
                >
                  <span className="flex items-start justify-between gap-1">
                    <span className={cn("font-mono", inMonth ? "text-ink-2" : "text-ink-3")}>
                      {format(day, "d")}
                    </span>
                    {practiceDays.has(key) ? (
                      <span
                        className="mt-0.5 size-1.5 shrink-0 rounded-full bg-gold"
                        title="Ese día registraste backtesting"
                      />
                    ) : null}
                  </span>
                  {dayTrades.length > 0 ? (
                    <div className="text-right">
                      <p
                        className={cn(
                          "font-mono text-[11px] font-medium",
                          pnl >= 0 ? "text-pos" : "text-neg"
                        )}
                      >
                        {formatSignedPercent(pnl)}
                      </p>
                      <p className="text-[10px] text-ink-3">{dayTrades.length} op.</p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {journalType === "backtest" ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-ink-3">
              <span className="size-1.5 shrink-0 rounded-full bg-gold" />
              Día en que hiciste backtesting. Las casillas coloreadas muestran las operaciones en su fecha
              histórica.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
