"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EquityPoint } from "@/lib/metrics";
import { formatCurrencyCompact, formatDate, formatSignedCurrency } from "@/lib/format";

interface EquityCurveChartProps {
  data: EquityPoint[];
}

export function EquityCurveChart({ data }: EquityCurveChartProps) {
  const positive = (data.at(-1)?.cumulative ?? 0) >= 0;
  const color = positive ? "var(--pos)" : "var(--neg)";

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-ink-3">
        Aún no hay operaciones para mostrar la curva de capital.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={(v) => formatDate(v)}
          tick={{ fontSize: 11, fill: "var(--ink-3)" }}
          axisLine={{ stroke: "var(--line)" }}
          tickLine={false}
          minTickGap={32}
        />
        <YAxis
          tickFormatter={(v) => formatCurrencyCompact(v)}
          tick={{ fontSize: 11, fill: "var(--ink-3)" }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={(v) => formatDate(v as string)}
          formatter={(value) => [formatSignedCurrency(Number(value)), "Capital acumulado"]}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke={color}
          strokeWidth={2}
          fill="url(#equityFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
