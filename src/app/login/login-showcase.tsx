"use client";

import { useEffect, useMemo, useState } from "react";

const PANEL_COUNT = 3;
const PANEL_INTERVAL_MS = 3800;

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function LoginShowcase() {
  const [panel, setPanel] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPanel((p) => (p + 1) % PANEL_COUNT);
    }, PANEL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative order-2 hidden flex-col justify-between overflow-hidden bg-[#141210] px-14 py-12 text-[#EDE8DE] lg:flex">
      <div
        className="pointer-events-none absolute -top-32 -right-32 size-[420px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(201,165,95,.16), transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative flex items-center gap-2.5">
        <div className="flex size-[30px] items-center justify-center rounded-lg bg-[#C9A55F]">
          <div className="size-[11px] rotate-[-45deg] rounded-[50%_50%_50%_0] border-2 border-[#141210]" />
        </div>
        <span className="font-serif text-[23px] tracking-tight">Journal W</span>
      </div>

      <div className="relative max-w-[460px]">
        <div className="mb-5 font-mono text-[11px] tracking-[.18em] text-[#C9A55F] uppercase">Trading Journal</div>
        <h1 className="mb-7 font-serif text-[50px] leading-[1.05] font-normal tracking-tight">
          No registres trades.
          <br />
          <span className="text-[#A39C8F] italic">Conviértete</span> en mejor trader.
        </h1>

        <div
          className="animate-float-card rounded-[18px] border border-white/10 p-5 backdrop-blur-md"
          style={{
            background: "linear-gradient(160deg, rgba(255,255,255,.07), rgba(255,255,255,.02))",
            boxShadow: "0 24px 60px rgba(0,0,0,.4)",
          }}
        >
          <div className="h-[186px] overflow-hidden">
            {panel === 1 ? <CalendarPanel /> : panel === 2 ? <FeedPanel /> : <EquityPanel />}
          </div>
          <div className="mt-3.5 flex justify-center gap-1.5">
            {Array.from({ length: PANEL_COUNT }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Panel ${i + 1}`}
                onClick={() => setPanel(i)}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === panel ? 18 : 6,
                  background: i === panel ? "#C9A55F" : "rgba(255,255,255,.22)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2.5 text-[12.5px] text-[#A39C8F]">
          <span className="animate-pulse-dot size-[7px] rounded-full bg-[#62C18C]" />
          +8,200 traders registran aquí
        </div>
        <div className="flex gap-5 font-mono text-[11px] tracking-[.06em] text-[#6B6458]">
          <span>WIN RATE</span>
          <span>PROFIT FACTOR</span>
          <span>EXPECTANCY</span>
        </div>
      </div>
    </div>
  );
}

function EquityPanel() {
  return (
    <div className="animate-fade-in">
      <div className="mb-3.5 flex items-center justify-between">
        <div>
          <div className="mb-1.5 font-mono text-[10px] tracking-[.14em] text-[#8C8577] uppercase">
            Curva de capital · 90d
          </div>
          <div className="font-serif text-[26px] leading-none text-[#62C18C]">+$12,480</div>
        </div>
        <div className="flex items-center gap-2.5">
          <WinRateRing pct={68} />
          <div className="text-[10.5px] leading-tight text-[#8C8577]">
            Win
            <br />
            rate
          </div>
        </div>
      </div>
      <div className="h-[112px]">
        <MiniEquityChart />
      </div>
    </div>
  );
}

function CalendarPanel() {
  const cells = useMemo(() => {
    const rng = mulberry32(915);
    return Array.from({ length: 35 }).map(() => {
      const roll = rng();
      if (roll > 0.72) return `rgba(98,193,140,${(0.18 + rng() * 0.5).toFixed(2)})`;
      if (roll > 0.5) return `rgba(224,131,116,${(0.14 + rng() * 0.32).toFixed(2)})`;
      return "rgba(255,255,255,.05)";
    });
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="mb-1.5 font-mono text-[10px] tracking-[.14em] text-[#8C8577] uppercase">
            Calendario de P&L · Jun
          </div>
          <div className="font-serif text-[26px] leading-none text-[#62C18C]">+$4,120</div>
        </div>
        <div className="text-right text-[11px] leading-relaxed text-[#8C8577]">
          18 días
          <br />
          operados
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((bg, i) => (
          <div
            key={i}
            className="h-5 animate-scale-in rounded-[5px]"
            style={{ background: bg, animationDelay: `${i * 0.012}s` }}
          />
        ))}
      </div>
    </div>
  );
}

const FEED_ROWS: Array<[string, string, string, string, string]> = [
  ["EUR/USD", "Long", "+2.4R", "+$480", "#62C18C"],
  ["BTC/USD", "Short", "+1.8R", "+$360", "#62C18C"],
  ["NQ", "Long", "-1.0R", "-$200", "#E08374"],
  ["XAU/USD", "Long", "+3.1R", "+$620", "#62C18C"],
];

function FeedPanel() {
  return (
    <div className="animate-fade-in">
      <div className="mb-2.5 font-mono text-[10px] tracking-[.14em] text-[#8C8577] uppercase">
        Operaciones recientes
      </div>
      <div>
        {FEED_ROWS.map(([symbol, dir, r, pnl, color], i) => (
          <div
            key={symbol}
            className="grid animate-auth-up grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-2"
            style={{
              borderBottom: i < FEED_ROWS.length - 1 ? "1px solid rgba(255,255,255,.07)" : "none",
              animationDelay: `${i * 0.07}s`,
            }}
          >
            <span className="size-[7px] rounded-full" style={{ background: color }} />
            <span className="flex flex-col gap-0.5">
              <span className="font-mono text-[13px] font-semibold text-[#EDE8DE]">{symbol}</span>
              <span className="text-[10.5px] tracking-[.04em] text-[#8C8577] uppercase">{dir}</span>
            </span>
            <span className="font-mono text-xs" style={{ color }}>
              {r}
            </span>
            <span className="min-w-[62px] text-right font-mono text-[13px] font-semibold" style={{ color }}>
              {pnl}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WinRateRing({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 64 64" className="size-14 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={6} />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="#62C18C"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="animate-draw-line"
          style={{ "--len": c } as React.CSSProperties}
        />
      </svg>
      <span className="absolute font-mono text-xs font-semibold text-[#EDE8DE]">{pct}%</span>
    </div>
  );
}

const EQUITY_POINTS = [0, 8, 4, 18, 14, 30, 26, 44, 38, 58, 52, 74, 66, 90, 102];

function MiniEquityChart() {
  const W = 520;
  const H = 170;
  const pad = 6;
  const min = Math.min(...EQUITY_POINTS);
  const max = Math.max(...EQUITY_POINTS);
  const range = max - min || 1;
  const x = (i: number) => pad + (i * (W - pad * 2)) / (EQUITY_POINTS.length - 1);
  const y = (v: number) => H - 14 - ((v - min) / range) * (H - 40);

  const line = EQUITY_POINTS.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `M${pad} ${H} ${EQUITY_POINTS.map((v, i) => `L${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ")} L${x(
    EQUITY_POINTS.length - 1
  ).toFixed(1)} ${H} Z`;
  const lastX = x(EQUITY_POINTS.length - 1);
  const lastY = y(EQUITY_POINTS[EQUITY_POINTS.length - 1]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block size-full overflow-visible">
      <defs>
        <linearGradient id="loginEquityFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C9A55F" stopOpacity={0.28} />
          <stop offset="1" stopColor="#C9A55F" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#loginEquityFill)" />
      <path
        d={line}
        fill="none"
        stroke="#C9A55F"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="animate-draw-line"
        style={{ "--len": 1400, strokeDasharray: 1400 } as React.CSSProperties}
      />
      <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r={4.5} fill="#C9A55F" />
    </svg>
  );
}
