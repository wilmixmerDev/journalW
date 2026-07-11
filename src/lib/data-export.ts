import { computeMetrics } from "@/lib/metrics";
import type { Trade } from "@/types/trade";
import type { Profile } from "@/types/profile";

export interface DataExportInput {
  profile: Profile;
  email: string | null;
  live: Trade[];
  backtest: Trade[];
}

export function buildDataExport({ profile, email, live, backtest }: DataExportInput) {
  return {
    exportedAt: new Date().toISOString(),
    perfil: {
      correo: email,
      nombre: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || null,
      pais: profile.country,
      experiencia: profile.experienceLevel,
      mercados: profile.markets,
      capitalInicial: profile.initialCapital,
      zonaHoraria: profile.timezone,
      miembroDesde: profile.onboardingCompletedAt,
    },
    live: { resumen: computeMetrics(live), operaciones: live },
    backtest: { resumen: computeMetrics(backtest), operaciones: backtest },
  };
}

function formatTradeLine(t: Trade): string {
  const date = t.enteredAt?.slice(0, 10) ?? "?";
  const r = t.rMultiple !== null ? `${t.rMultiple >= 0 ? "+" : ""}${t.rMultiple.toFixed(2)}R` : "—";
  const pnl = t.pnl !== null ? `${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}%` : "—";
  const direction = t.direction === "long" ? "Long" : "Short";
  return `${date} | ${t.instrument} | ${direction} | ${t.resultType ?? t.status} | ${r} | ${pnl}`;
}

export function buildAiPrompt({ profile, live, backtest }: DataExportInput): string {
  const summary = computeMetrics(live);
  const lines: string[] = [];

  lines.push(
    "Estas son mis estadísticas y operaciones de trading registradas en Journal W. Analiza mi desempeño, identifica patrones (buenos y malos) y dame recomendaciones concretas para mejorar."
  );
  lines.push("");
  lines.push("## Perfil");
  lines.push(`- Experiencia: ${profile.experienceLevel ?? "sin especificar"}`);
  lines.push(`- Mercados que opero: ${profile.markets.length ? profile.markets.join(", ") : "sin especificar"}`);
  if (profile.initialCapital) lines.push(`- Capital inicial: ${profile.initialCapital}`);
  lines.push("");
  lines.push("## Resumen (journal en vivo)");
  lines.push(`- Total de operaciones cerradas: ${summary.totalTrades}`);
  lines.push(`- Ganadas / Perdidas / Break-even: ${summary.wins} / ${summary.losses} / ${summary.breakeven}`);
  lines.push(`- Win rate: ${summary.winRate.toFixed(1)}%`);
  lines.push(`- PnL neto: ${summary.netPnl.toFixed(2)}%`);
  lines.push(`- Expectancy: ${summary.expectancy.toFixed(2)}`);
  lines.push(`- Profit factor: ${summary.profitFactor !== null ? summary.profitFactor.toFixed(2) : "—"}`);
  lines.push(`- Total R: ${summary.totalR.toFixed(2)}R`);
  lines.push(`- R promedio: ${summary.avgR.toFixed(2)}R`);
  lines.push(`- R promedio en ganadoras: ${summary.avgWinR.toFixed(2)}R`);
  lines.push(`- R promedio en perdedoras: ${summary.avgLossR.toFixed(2)}R`);
  lines.push(`- Risk/Reward: ${summary.riskReward !== null ? summary.riskReward.toFixed(2) : "—"}`);
  lines.push(`- Máximo drawdown: ${summary.maxDrawdown.toFixed(2)}%`);
  lines.push(`- Disciplina promedio: ${summary.disciplineScore.toFixed(1)}%`);
  lines.push(
    `- Racha actual: ${summary.currentStreak === 0 ? "—" : `${summary.currentStreak > 0 ? "+" : ""}${summary.currentStreak}`}`
  );
  lines.push(`- Mejor racha ganadora: ${summary.bestWinStreak}`);
  lines.push(`- Peor racha perdedora: ${summary.worstLossStreak}`);
  lines.push("");

  if (live.length > 0) {
    lines.push("## Operaciones — journal en vivo (fecha | instrumento | dirección | resultado | R | PnL%)");
    live
      .slice()
      .sort((a, b) => (a.enteredAt < b.enteredAt ? -1 : 1))
      .forEach((t) => lines.push(formatTradeLine(t)));
    lines.push("");
  }

  if (backtest.length > 0) {
    const backtestSummary = computeMetrics(backtest);
    lines.push(
      `## Backtesting: ${backtestSummary.totalTrades} operaciones, win rate ${backtestSummary.winRate.toFixed(1)}%, total ${backtestSummary.totalR.toFixed(2)}R`
    );
  }

  return lines.join("\n");
}
