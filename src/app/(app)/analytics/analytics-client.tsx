"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/shared/metric-card";
import { EquityCurveChart } from "@/components/charts/equity-curve-chart";
import { WinRateDonut } from "@/components/charts/win-rate-donut";
import { RDistributionChart } from "@/components/charts/r-distribution-chart";
import { GroupedPerformanceChart } from "@/components/charts/grouped-performance-chart";
import { useJournalTrades } from "@/hooks/use-journal-trades";
import {
  buildEquityCurve,
  buildRDistribution,
  computeMetrics,
  performanceBySession,
  performanceByStrategy,
  performanceByWeekday,
} from "@/lib/metrics";
import type { Trade } from "@/types/trade";

interface AnalyticsClientProps {
  live: Trade[];
  backtest: Trade[];
}

export function AnalyticsClient({ live, backtest }: AnalyticsClientProps) {
  const trades = useJournalTrades(live, backtest);
  const metrics = computeMetrics(trades);
  const equityCurve = buildEquityCurve(trades);
  const rDistribution = buildRDistribution(trades);
  const bySession = performanceBySession(trades);
  const byStrategy = performanceByStrategy(trades);
  const byWeekday = performanceByWeekday(trades);

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="font-serif text-3xl text-ink">Analíticas</h1>
        <p className="text-sm text-ink-2">Profundiza en el porqué de tus resultados.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Expectancy" value={metrics.expectancy.toFixed(2)} tone="gold" />
        <MetricCard
          label="Profit Factor"
          value={metrics.profitFactor !== null ? metrics.profitFactor.toFixed(2) : "—"}
        />
        <MetricCard
          label="Total R"
          value={`${metrics.totalR >= 0 ? "+" : ""}${metrics.totalR.toFixed(1)}R`}
          tone={metrics.totalR >= 0 ? "pos" : "neg"}
        />
        <MetricCard
          label="Risk / Reward"
          value={metrics.riskReward !== null ? metrics.riskReward.toFixed(2) : "—"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-line bg-surface lg:col-span-2">
          <CardHeader>
            <CardTitle>Curva de capital</CardTitle>
          </CardHeader>
          <CardContent>
            <EquityCurveChart data={equityCurve} />
          </CardContent>
        </Card>

        <Card className="border-line bg-surface">
          <CardHeader>
            <CardTitle>Win rate</CardTitle>
          </CardHeader>
          <CardContent>
            <WinRateDonut winRate={metrics.winRate} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-line bg-surface">
        <CardHeader>
          <CardTitle>Distribución de R-Multiple</CardTitle>
        </CardHeader>
        <CardContent>
          <RDistributionChart data={rDistribution} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-line bg-surface">
          <CardHeader>
            <CardTitle>Por sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupedPerformanceChart data={bySession} />
          </CardContent>
        </Card>
        <Card className="border-line bg-surface">
          <CardHeader>
            <CardTitle>Por estrategia</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupedPerformanceChart data={byStrategy} />
          </CardContent>
        </Card>
        <Card className="border-line bg-surface">
          <CardHeader>
            <CardTitle>Por día de la semana</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupedPerformanceChart data={byWeekday} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
