"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/shared/metric-card";
import { PerformanceTable } from "@/components/shared/performance-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EquityCurveChart } from "@/components/charts/equity-curve-chart";
import { DisciplineCurveChart } from "@/components/charts/discipline-curve-chart";
import { WinRateDonut } from "@/components/charts/win-rate-donut";
import { RDistributionChart } from "@/components/charts/r-distribution-chart";
import { useJournalTrades } from "@/hooks/use-journal-trades";
import {
  buildDisciplineCurve,
  buildEquityCurve,
  buildRDistribution,
  computeMetrics,
  performanceByEmotionAfter,
  performanceByEmotionBefore,
  performanceByQuality,
  performanceBySession,
  performanceBySetup,
  performanceByStrategy,
  performanceByTag,
  performanceByTimeframe,
  performanceByWeekday,
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
  { value: "strategy", label: "Estrategia", build: performanceByStrategy },
  { value: "setup", label: "Setup", build: performanceBySetup },
  { value: "timeframe", label: "Timeframe", build: performanceByTimeframe },
  { value: "session", label: "Sesión", build: performanceBySession },
  { value: "weekday", label: "Día de la semana", build: performanceByWeekday },
  { value: "quality", label: "Calidad de ejecución", build: performanceByQuality },
  { value: "emotionBefore", label: "Estado emocional antes", build: performanceByEmotionBefore },
  { value: "emotionAfter", label: "Estado emocional después", build: performanceByEmotionAfter },
  { value: "tag", label: "Etiquetas", build: performanceByTag },
] as const satisfies { value: string; label: string; build: (trades: Trade[]) => GroupedPerformance[] }[];

type CategoryValue = (typeof CATEGORIES)[number]["value"];

export function AnalyticsClient({ live, backtest, profile, email }: AnalyticsClientProps) {
  const trades = useJournalTrades(live, backtest);
  const metrics = computeMetrics(trades);
  const equityCurve = buildEquityCurve(trades);
  const disciplineCurve = buildDisciplineCurve(trades);
  const rDistribution = buildRDistribution(trades);

  const [category, setCategory] = useState<CategoryValue>("strategy");
  const activeCategory = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];
  const categoryData = useMemo(() => activeCategory.build(trades), [activeCategory, trades]);
  const [isExporting, setIsExporting] = useState(false);

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

      <Card className="border-line bg-surface">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>Rendimiento por categoría</CardTitle>
          <Select value={category} onValueChange={(v) => v && setCategory(v as CategoryValue)}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <PerformanceTable data={categoryData} />
        </CardContent>
      </Card>
    </div>
  );
}
