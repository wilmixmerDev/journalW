"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/shared/metric-card";
import { PerformanceTable } from "@/components/shared/performance-table";
import { EquityCurveChart } from "@/components/charts/equity-curve-chart";
import { DisciplineCurveChart } from "@/components/charts/discipline-curve-chart";
import { WinRateDonut } from "@/components/charts/win-rate-donut";
import { RDistributionChart } from "@/components/charts/r-distribution-chart";
import { GroupedPerformanceChart } from "@/components/charts/grouped-performance-chart";
import { useJournalTrades } from "@/hooks/use-journal-trades";
import {
  buildDisciplineCurve,
  buildEquityCurve,
  buildRDistribution,
  computeMetrics,
  performanceByEmotionAfter,
  performanceByEmotionBefore,
  performanceByMonth,
  performanceByQuality,
  performanceBySession,
  performanceBySetup,
  performanceByStrategy,
  performanceByTag,
  performanceByTimeframe,
  performanceByWeekday,
  performanceByWeekOfMonth,
  type GroupedPerformance,
} from "@/lib/metrics";
import { buildAiPrompt } from "@/lib/data-export";
import { downloadTradingReportPdf } from "@/lib/data-export-pdf";
import { formatPercent } from "@/lib/format";
import type { Trade } from "@/types/trade";
import type { Profile } from "@/types/profile";

interface AnalyticsClientProps {
  live: Trade[];
  backtest: Trade[];
  profile: Profile | null;
  email: string | null;
}

const CATEGORIES = [
  { value: "month", label: "Mes", noun: "mes", build: performanceByMonth },
  { value: "weekOfMonth", label: "Semana del mes", noun: "semana", build: performanceByWeekOfMonth },
  { value: "weekday", label: "Día de la semana", noun: "día", build: performanceByWeekday },
  { value: "strategy", label: "Estrategia", noun: "estrategia", build: performanceByStrategy },
  { value: "setup", label: "Setup", noun: "setup", build: performanceBySetup },
  { value: "timeframe", label: "Timeframe", noun: "timeframe", build: performanceByTimeframe },
  { value: "session", label: "Sesión", noun: "sesión", build: performanceBySession },
  { value: "quality", label: "Calidad de ejecución", noun: "nivel", build: performanceByQuality },
  { value: "emotionBefore", label: "Estado emocional antes", noun: "estado", build: performanceByEmotionBefore },
  { value: "emotionAfter", label: "Estado emocional después", noun: "estado", build: performanceByEmotionAfter },
  { value: "tag", label: "Etiquetas", noun: "etiqueta", build: performanceByTag },
] as const satisfies {
  value: string;
  label: string;
  noun: string;
  build: (trades: Trade[]) => GroupedPerformance[];
}[];

export function AnalyticsClient({ live, backtest, profile, email }: AnalyticsClientProps) {
  const trades = useJournalTrades(live, backtest);
  const metrics = computeMetrics(trades);
  const equityCurve = buildEquityCurve(trades);
  const disciplineCurve = buildDisciplineCurve(trades);
  const rDistribution = buildRDistribution(trades);
  const [isExporting, setIsExporting] = useState(false);

  const categoryBreakdowns = useMemo(
    () =>
      CATEGORIES.map((c) => {
        const data = c.build(trades);
        const withTrades = data.filter((row) => row.trades > 0);
        const insight =
          withTrades.length < 2
            ? null
            : {
                best: withTrades.reduce((a, b) => (b.totalR > a.totalR ? b : a)),
                worst: withTrades.reduce((a, b) => (b.totalR < a.totalR ? b : a)),
              };
        return { ...c, data, insight };
      }),
    [trades]
  );

  async function downloadData() {
    if (!profile) return;
    setIsExporting(true);
    try {
      await downloadTradingReportPdf({ profile, email, live, backtest });
      toast.success("Reporte descargado");
    } finally {
      setIsExporting(false);
    }
  }

  async function copyAiPrompt() {
    if (!profile) return;
    const prompt = buildAiPrompt({ profile, email, live, backtest });
    await navigator.clipboard.writeText(prompt);
    toast.success("Prompt copiado — pégalo en tu IA favorita");
  }

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-ink">Analíticas</h1>
          <p className="text-sm text-ink-2">Profundiza en el porqué de tus resultados.</p>
        </div>
        {profile ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" size="sm" disabled={isExporting} onClick={downloadData}>
              {isExporting ? "Generando..." : "Descargar resumen de estadísticas"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={copyAiPrompt}>
              Copiar prompt para IA
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Expectancy"
          value={metrics.expectancy.toFixed(2)}
          tone="gold"
          hint="R que esperas ganar en promedio por cada operación"
        />
        <MetricCard
          label="Profit Factor"
          value={metrics.profitFactor !== null ? metrics.profitFactor.toFixed(2) : "—"}
          hint={
            metrics.profitFactor !== null
              ? "Ganancia bruta ÷ pérdida bruta"
              : "Sin pérdidas registradas todavía"
          }
        />
        <MetricCard
          label="Total R"
          value={`${metrics.totalR >= 0 ? "+" : ""}${metrics.totalR.toFixed(1)}R`}
          tone={metrics.totalR >= 0 ? "pos" : "neg"}
          hint="Suma de las R ganadas y perdidas en todas tus operaciones"
        />
        <MetricCard
          label="Risk / Reward"
          value={metrics.riskReward !== null ? metrics.riskReward.toFixed(2) : "—"}
          hint={
            metrics.riskReward !== null
              ? "Promedio de R ganado ÷ promedio de R perdido"
              : "Sin pérdidas registradas todavía"
          }
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-line bg-surface lg:col-span-2">
          <CardHeader>
            <CardTitle>Distribución de R-Multiple</CardTitle>
          </CardHeader>
          <CardContent>
            <RDistributionChart data={rDistribution} />
          </CardContent>
        </Card>

        <Card className="border-line bg-surface">
          <CardHeader>
            <CardTitle>Disciplina</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs font-medium text-ink-3">Disciplina promedio</p>
              <p className="font-mono text-2xl tracking-tight text-gold">
                {formatPercent(metrics.disciplineScore)}
              </p>
            </div>
            <DisciplineCurveChart data={disciplineCurve} />
          </CardContent>
        </Card>
      </div>

      {categoryBreakdowns.map((c) => (
        <Card key={c.value} className="border-line bg-surface">
          <CardHeader>
            <CardTitle>Rendimiento por {c.label.toLowerCase()}</CardTitle>
            {c.insight ? (
              <p className="text-xs text-ink-3">
                Tu mejor {c.noun}:{" "}
                <span className="font-medium text-pos">
                  {c.insight.best.label} ({c.insight.best.totalR >= 0 ? "+" : ""}
                  {c.insight.best.totalR.toFixed(1)}R)
                </span>
                {" · "}Tu peor {c.noun}:{" "}
                <span className="font-medium text-neg">
                  {c.insight.worst.label} ({c.insight.worst.totalR >= 0 ? "+" : ""}
                  {c.insight.worst.totalR.toFixed(1)}R)
                </span>
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <GroupedPerformanceChart data={c.data} />
            <PerformanceTable data={c.data} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
