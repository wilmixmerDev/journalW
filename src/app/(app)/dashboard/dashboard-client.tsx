"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MetricCard } from "@/components/shared/metric-card";
import { EquityCurveChart } from "@/components/charts/equity-curve-chart";
import { useJournalTrades } from "@/hooks/use-journal-trades";
import { useUIStore } from "@/store/ui-store";
import { computeMetrics, buildEquityCurve } from "@/lib/metrics";
import { formatDate, formatPercent, formatSignedPercent } from "@/lib/format";
import type { Trade } from "@/types/trade";

interface DashboardClientProps {
  live: Trade[];
  backtest: Trade[];
}

export function DashboardClient({ live, backtest }: DashboardClientProps) {
  const trades = useJournalTrades(live, backtest);
  const metrics = computeMetrics(trades);
  const equityCurve = buildEquityCurve(trades);
  const recent = trades.slice(0, 6);
  const openTrade = useUIStore((s) => s.openTrade);

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="font-serif text-3xl text-ink">Dashboard</h1>
        <p className="text-sm text-ink-2">Resumen general de tu desempeño.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="P&L Neto Total"
          value={formatSignedPercent(metrics.netPnl)}
          tone={metrics.netPnl >= 0 ? "pos" : "neg"}
          hint={`${metrics.totalTrades} operaciones`}
        />
        <MetricCard
          label="Win Rate"
          value={formatPercent(metrics.winRate)}
          hint={`${metrics.wins}G / ${metrics.losses}P`}
        />
        <MetricCard
          label="Profit Factor"
          value={metrics.profitFactor !== null ? metrics.profitFactor.toFixed(2) : "—"}
          tone="gold"
          hint={`Expectancy ${metrics.expectancy.toFixed(2)}`}
        />
      </div>

      <Card className="border-line bg-surface">
        <CardHeader>
          <CardTitle>Curva de capital</CardTitle>
        </CardHeader>
        <CardContent>
          <EquityCurveChart data={equityCurve} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-line bg-surface lg:col-span-2">
          <CardHeader>
            <CardTitle>Operaciones recientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-3">Aún no hay operaciones registradas.</p>
            ) : (
              recent.map((trade) => {
                const win = (trade.pnl ?? 0) > 0;
                return (
                  <button
                    key={trade.id}
                    onClick={() => openTrade(trade)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-surface-2"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={trade.direction === "long" ? "default" : "secondary"}>
                        {trade.direction === "long" ? "Long" : "Short"}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium text-ink">{trade.instrument}</p>
                        <p className="text-xs text-ink-3">{formatDate(trade.enteredAt)}</p>
                      </div>
                    </div>
                    <span className={`font-mono text-sm ${win ? "text-pos" : "text-neg"}`}>
                      {formatSignedPercent(trade.pnl ?? 0)}
                    </span>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-line bg-surface">
          <CardHeader>
            <CardTitle>Disciplina</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-ink-2">Disciplina promedio</span>
                <span className="font-mono text-ink">{formatPercent(metrics.disciplineScore)}</span>
              </div>
              <Progress value={metrics.disciplineScore} />
            </div>

            <dl className="space-y-3 text-sm">
              <Row label="Total R" value={`${metrics.totalR >= 0 ? "+" : ""}${metrics.totalR.toFixed(1)}R`} />
              <Row
                label="Risk / Reward"
                value={metrics.riskReward !== null ? metrics.riskReward.toFixed(2) : "—"}
              />
              <Row label="Máx. drawdown" value={formatPercent(metrics.maxDrawdown)} />
              <Row
                label="Racha actual"
                value={
                  metrics.currentStreak === 0
                    ? "—"
                    : `${metrics.currentStreak > 0 ? "+" : ""}${metrics.currentStreak}`
                }
              />
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-2">{label}</dt>
      <dd className="font-mono text-ink">{value}</dd>
    </div>
  );
}
