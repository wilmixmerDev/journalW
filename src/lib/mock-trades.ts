import type { Direction, Importance, JournalType, ResultType, Trade } from "@/types/trade";

// Deterministic PRNG (mulberry32) so mock data is stable across renders/reloads.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const INSTRUMENTS: { symbol: string; market: string }[] = [
  { symbol: "EUR/USD", market: "Forex" },
  { symbol: "GBP/USD", market: "Forex" },
  { symbol: "USD/JPY", market: "Forex" },
  { symbol: "BTC/USD", market: "Cripto" },
  { symbol: "ETH/USD", market: "Cripto" },
  { symbol: "NAS100", market: "Índices" },
  { symbol: "US30", market: "Índices" },
  { symbol: "XAU/USD", market: "Materias primas" },
  { symbol: "AAPL", market: "Acciones" },
  { symbol: "TSLA", market: "Acciones" },
  { symbol: "ES", market: "Futuros" },
  { symbol: "NQ", market: "Futuros" },
];

const STRATEGIES = [
  "Ruptura de rango",
  "Retroceso a media móvil",
  "Order block",
  "Liquidez + FVG",
  "Reversión en soporte",
  "Tendencia + pullback",
];

const SESSIONS = ["Asia", "Londres", "Nueva York", "Solapamiento Londres-NY"];

const IMPORTANCE_LEVELS: Importance[] = ["a_plus", "media", "baja"];

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}

interface GenerateOptions {
  count?: number;
  journalType?: JournalType;
  userId?: string;
  seed?: number;
}

export function generateMockTrades({
  count = 80,
  journalType = "live",
  userId = "mock-user",
  seed = 42,
}: GenerateOptions = {}): Trade[] {
  const rng = mulberry32(seed + (journalType === "backtest" ? 1000 : 0));
  const trades: Trade[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const instrument = pick(rng, INSTRUMENTS);
    const direction: Direction = rng() > 0.5 ? "long" : "short";
    const daysAgo = Math.floor(rng() * 180);
    const enteredAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    enteredAt.setHours(7 + Math.floor(rng() * 14), Math.floor(rng() * 60), 0, 0);
    const exitedAt = new Date(enteredAt.getTime() + (15 + rng() * 240) * 60 * 1000);

    const win = rng() > 0.46;
    const resultType: ResultType = win ? "tp" : "sl";
    const rMultiple = win ? Math.round((0.3 + rng() * 3.2) * 100) / 100 : -1;
    const riskPercent = Math.round((0.25 + rng() * 1.75) * 100) / 100;
    const pnl = Math.round(riskPercent * rMultiple * 100) / 100;

    const entryPrice = Math.round((50 + rng() * 200) * 100) / 100;
    const stopDistance = entryPrice * (0.003 + rng() * 0.01);
    const stopPrice = direction === "long" ? entryPrice - stopDistance : entryPrice + stopDistance;
    const takeProfitPrice =
      direction === "long"
        ? entryPrice + stopDistance * Math.abs(rMultiple)
        : entryPrice - stopDistance * Math.abs(rMultiple);

    trades.push({
      id: `mock-${journalType}-${i}`,
      userId,
      journalType,
      status: "closed",
      instrument: instrument.symbol,
      market: instrument.market,
      direction,
      entryPrice,
      stopPrice: Math.round(stopPrice * 100) / 100,
      takeProfitPrice: Math.round(takeProfitPrice * 100) / 100,
      riskPercent,
      resultType,
      importance: pick(rng, IMPORTANCE_LEVELS),
      enteredAt: enteredAt.toISOString(),
      exitedAt: exitedAt.toISOString(),
      strategy: pick(rng, STRATEGIES),
      session: pick(rng, SESSIONS),
      screenshots: [],
      pnl,
      rMultiple,
      followedPlan: rng() > 0.22,
      notes:
        rng() > 0.5
          ? "Entrada alineada con el plan, gestión de riesgo respetada."
          : "Salida anticipada por dudas, revisar gestión emocional.",
      createdAt: enteredAt.toISOString(),
      updatedAt: exitedAt.toISOString(),
    });
  }

  return trades.sort((a, b) => new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime());
}
