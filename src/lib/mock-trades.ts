import type { Direction, JournalType, Trade } from "@/types/trade";

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

const TAG_POOL = ["A+ Setup", "Revenge trade", "Sobre-apalancado", "Plan seguido", "Noticias", "Scalp", "Swing"];

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function pickTags(rng: () => number): string[] {
  const count = 1 + Math.floor(rng() * 3);
  const shuffled = [...TAG_POOL].sort(() => rng() - 0.5);
  return shuffled.slice(0, count);
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
    const rMultiple = win ? 0.3 + rng() * 3.2 : -(0.3 + rng() * 1.4);
    const riskUnit = 40 + rng() * 160;
    const pnl = Math.round(rMultiple * riskUnit * 100) / 100;

    const entryPrice = Math.round((50 + rng() * 200) * 100) / 100;
    const stopDistance = entryPrice * (0.003 + rng() * 0.01);
    const stopPrice =
      direction === "long" ? entryPrice - stopDistance : entryPrice + stopDistance;
    const exitPrice =
      direction === "long"
        ? entryPrice + stopDistance * rMultiple
        : entryPrice - stopDistance * rMultiple;

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
      exitPrice: Math.round(exitPrice * 100) / 100,
      size: Math.round((0.5 + rng() * 4.5) * 100) / 100,
      enteredAt: enteredAt.toISOString(),
      exitedAt: exitedAt.toISOString(),
      strategy: pick(rng, STRATEGIES),
      session: pick(rng, SESSIONS),
      tags: pickTags(rng),
      screenshots: [],
      pnl,
      rMultiple: Math.round(rMultiple * 100) / 100,
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
