import type { Quality, Trade } from "@/types/trade";

export interface TradeMetrics {
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number | null;
  expectancy: number;
  totalR: number;
  avgR: number;
  avgWinR: number;
  avgLossR: number;
  riskReward: number | null;
  disciplineScore: number;
  maxDrawdown: number;
  currentStreak: number;
  bestWinStreak: number;
  worstLossStreak: number;
}

const closedTrades = (trades: Trade[]) =>
  trades.filter((t) => t.status === "closed" && t.pnl !== null);

/**
 * R realmente conseguido en la operación, con signo.
 * `rMultiple` se guarda siempre positivo (es "R objetivo/conseguido" que carga el usuario),
 * así que el signo real hay que derivarlo del P&L contra el riesgo arriesgado.
 */
export const realizedR = (t: Trade) => (t.riskPercent ? (t.pnl ?? 0) / t.riskPercent : 0);

export function computeMetrics(trades: Trade[]): TradeMetrics {
  const closed = closedTrades(trades);
  const totalTrades = closed.length;

  const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
  const losses = closed.filter((t) => (t.pnl ?? 0) < 0).length;
  const breakeven = totalTrades - wins - losses;

  const grossProfit = closed.reduce((sum, t) => sum + Math.max(t.pnl ?? 0, 0), 0);
  const grossLoss = Math.abs(closed.reduce((sum, t) => sum + Math.min(t.pnl ?? 0, 0), 0));
  const netPnl = grossProfit - grossLoss;

  const winRate = totalTrades ? (wins / totalTrades) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;

  const rValues = closed.map(realizedR);
  const totalR = rValues.reduce((sum, r) => sum + r, 0);
  const avgR = totalTrades ? totalR / totalTrades : 0;

  const winRs = closed.filter((t) => (t.pnl ?? 0) > 0).map(realizedR);
  const lossRs = closed.filter((t) => (t.pnl ?? 0) < 0).map(realizedR);
  const avgWinR = winRs.length ? winRs.reduce((s, r) => s + r, 0) / winRs.length : 0;
  const avgLossR = lossRs.length ? lossRs.reduce((s, r) => s + r, 0) / lossRs.length : 0;
  const riskReward = avgLossR !== 0 ? Math.abs(avgWinR / avgLossR) : null;

  const lossRate = totalTrades ? losses / totalTrades : 0;
  const expectancy = (winRate / 100) * avgWinR - lossRate * Math.abs(avgLossR);

  const disciplineScore = totalTrades
    ? closed.reduce((sum, t) => sum + t.disciplineScore, 0) / totalTrades
    : 0;

  const ordered = [...closed].sort(
    (a, b) => new Date(a.enteredAt).getTime() - new Date(b.enteredAt).getTime()
  );

  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let currentStreak = 0;
  let bestWinStreak = 0;
  let worstLossStreak = 0;
  let runningWinStreak = 0;
  let runningLossStreak = 0;

  for (const trade of ordered) {
    cumulative += trade.pnl ?? 0;
    peak = Math.max(peak, cumulative);
    maxDrawdown = Math.max(maxDrawdown, peak - cumulative);

    if ((trade.pnl ?? 0) > 0) {
      runningWinStreak += 1;
      runningLossStreak = 0;
      currentStreak = runningWinStreak;
    } else if ((trade.pnl ?? 0) < 0) {
      runningLossStreak += 1;
      runningWinStreak = 0;
      currentStreak = -runningLossStreak;
    } else {
      runningWinStreak = 0;
      runningLossStreak = 0;
      currentStreak = 0;
    }
    bestWinStreak = Math.max(bestWinStreak, runningWinStreak);
    worstLossStreak = Math.max(worstLossStreak, runningLossStreak);
  }

  return {
    totalTrades,
    wins,
    losses,
    breakeven,
    winRate,
    netPnl,
    grossProfit,
    grossLoss,
    profitFactor,
    expectancy,
    totalR,
    avgR,
    avgWinR,
    avgLossR,
    riskReward,
    disciplineScore,
    maxDrawdown,
    currentStreak,
    bestWinStreak,
    worstLossStreak,
  };
}

export interface EquityPoint {
  date: string;
  cumulative: number;
  pnl: number;
}

export function buildEquityCurve(trades: Trade[]): EquityPoint[] {
  const ordered = [...closedTrades(trades)].sort(
    (a, b) => new Date(a.enteredAt).getTime() - new Date(b.enteredAt).getTime()
  );

  let cumulative = 0;
  return ordered.map((trade) => {
    cumulative += trade.pnl ?? 0;
    return { date: trade.enteredAt, cumulative, pnl: trade.pnl ?? 0 };
  });
}

export interface DisciplinePoint {
  date: string;
  score: number;
}

export function buildDisciplineCurve(trades: Trade[]): DisciplinePoint[] {
  const ordered = [...closedTrades(trades)].sort(
    (a, b) => new Date(a.enteredAt).getTime() - new Date(b.enteredAt).getTime()
  );

  return ordered.map((trade) => ({ date: trade.enteredAt, score: trade.disciplineScore }));
}

export interface RDistributionBucket {
  label: string;
  count: number;
}

export function buildRDistribution(trades: Trade[]): RDistributionBucket[] {
  const buckets: RDistributionBucket[] = [
    { label: "< -2R", count: 0 },
    { label: "-2R a -1R", count: 0 },
    { label: "-1R a 0R", count: 0 },
    { label: "0R a 1R", count: 0 },
    { label: "1R a 2R", count: 0 },
    { label: "2R a 3R", count: 0 },
    { label: "> 3R", count: 0 },
  ];

  for (const trade of closedTrades(trades)) {
    const r = realizedR(trade);
    if (r < -2) buckets[0].count++;
    else if (r < -1) buckets[1].count++;
    else if (r < 0) buckets[2].count++;
    else if (r < 1) buckets[3].count++;
    else if (r < 2) buckets[4].count++;
    else if (r < 3) buckets[5].count++;
    else buckets[6].count++;
  }

  return buckets;
}

export interface GroupedPerformance {
  label: string;
  trades: number;
  winRate: number;
  netPnl: number;
  profitFactor: number | null;
  totalR: number;
  avgR: number;
  expectancy: number;
}

function summarizeGroup(group: Trade[]): Omit<GroupedPerformance, "label"> {
  const totalTrades = group.length;
  const wins = group.filter((t) => (t.pnl ?? 0) > 0).length;
  const losses = group.filter((t) => (t.pnl ?? 0) < 0).length;
  const winRate = totalTrades ? (wins / totalTrades) * 100 : 0;

  const grossProfit = group.reduce((sum, t) => sum + Math.max(t.pnl ?? 0, 0), 0);
  const grossLoss = Math.abs(group.reduce((sum, t) => sum + Math.min(t.pnl ?? 0, 0), 0));
  const netPnl = grossProfit - grossLoss;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;

  const rValues = group.map(realizedR);
  const totalR = rValues.reduce((sum, r) => sum + r, 0);
  const avgR = totalTrades ? totalR / totalTrades : 0;

  const winRs = group.filter((t) => (t.pnl ?? 0) > 0).map(realizedR);
  const lossRs = group.filter((t) => (t.pnl ?? 0) < 0).map(realizedR);
  const avgWinR = winRs.length ? winRs.reduce((s, r) => s + r, 0) / winRs.length : 0;
  const avgLossR = lossRs.length ? lossRs.reduce((s, r) => s + r, 0) / lossRs.length : 0;
  const lossRate = totalTrades ? losses / totalTrades : 0;
  const expectancy = (winRate / 100) * avgWinR - lossRate * Math.abs(avgLossR);

  return { trades: totalTrades, winRate, netPnl, profitFactor, totalR, avgR, expectancy };
}

function groupBy(trades: Trade[], keyFn: (t: Trade) => string): GroupedPerformance[] {
  const groups = new Map<string, Trade[]>();
  for (const trade of closedTrades(trades)) {
    const key = keyFn(trade);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(trade);
  }

  return Array.from(groups.entries())
    .map(([label, group]) => ({ label, ...summarizeGroup(group) }))
    .sort((a, b) => b.trades - a.trades);
}

/** Como groupBy, pero una sola operación puede aportar a varios grupos (ej. etiquetas). */
function groupByMulti(trades: Trade[], keysFn: (t: Trade) => string[]): GroupedPerformance[] {
  const groups = new Map<string, Trade[]>();
  for (const trade of closedTrades(trades)) {
    for (const key of keysFn(trade)) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(trade);
    }
  }

  return Array.from(groups.entries())
    .map(([label, group]) => ({ label, ...summarizeGroup(group) }))
    .sort((a, b) => b.trades - a.trades);
}

export function performanceBySession(trades: Trade[]): GroupedPerformance[] {
  return groupBy(trades, (t) => t.session ?? "Sin sesión");
}

export function performanceByStrategy(trades: Trade[]): GroupedPerformance[] {
  return groupBy(trades, (t) => t.strategy ?? "Sin estrategia");
}

export function performanceBySetup(trades: Trade[]): GroupedPerformance[] {
  return groupBy(trades, (t) => t.setup ?? "Sin setup");
}

export function performanceByTimeframe(trades: Trade[]): GroupedPerformance[] {
  return groupBy(trades, (t) => t.timeframe ?? "Sin timeframe");
}

export function performanceByEmotionBefore(trades: Trade[]): GroupedPerformance[] {
  return groupBy(trades, (t) => t.emotionBefore ?? "Sin registrar");
}

export function performanceByEmotionAfter(trades: Trade[]): GroupedPerformance[] {
  return groupBy(trades, (t) => t.emotionAfter ?? "Sin registrar");
}

export function performanceByTag(trades: Trade[]): GroupedPerformance[] {
  return groupByMulti(trades, (t) => (t.tags.length ? t.tags : ["Sin etiquetas"]));
}

const QUALITY_LABELS: Record<Quality, string> = {
  a_plus: "A+",
  a: "A",
  b: "B",
  c: "C",
  d: "D",
};

export function performanceByQuality(trades: Trade[]): GroupedPerformance[] {
  return groupBy(trades, (t) => (t.quality ? QUALITY_LABELS[t.quality] : "Sin calificar"));
}

const WEEKDAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function performanceByWeekday(trades: Trade[]): GroupedPerformance[] {
  const result = groupBy(trades, (t) => WEEKDAYS_ES[new Date(t.enteredAt).getDay()]);
  return WEEKDAYS_ES.slice(1)
    .concat(WEEKDAYS_ES[0])
    .map(
      (day) =>
        result.find((r) => r.label === day) ?? {
          label: day,
          trades: 0,
          winRate: 0,
          netPnl: 0,
          profitFactor: null,
          totalR: 0,
          avgR: 0,
          expectancy: 0,
        }
    );
}
