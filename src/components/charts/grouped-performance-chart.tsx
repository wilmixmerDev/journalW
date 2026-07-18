"use client";

import { Bar, BarChart, LabelList, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GroupedPerformance } from "@/lib/metrics";
import { formatR } from "@/lib/format";

interface GroupedPerformanceChartProps {
  data: GroupedPerformance[];
}

interface BarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: GroupedPerformance;
}

/** Redondea solo la punta del dato (arriba si es positivo, abajo si es negativo) para que la barra quede anclada a la línea de 0. */
function BarShape({ x = 0, y = 0, width = 0, height = 0, payload }: BarShapeProps) {
  const isPositive = (payload?.totalR ?? 0) >= 0;
  // Si la barra es más delgada que el radio, un radio fijo la hace ver como una gota flotando en vez de una barra plana.
  const r = Math.min(4, Math.abs(height));
  const radius: [number, number, number, number] = isPositive ? [r, r, 0, 0] : [0, 0, r, r];
  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      radius={radius}
      fill={isPositive ? "var(--pos)" : "var(--neg)"}
    />
  );
}

interface BarLabelProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
}

function BarLabel({ x = 0, y = 0, width = 0, height = 0, value = 0 }: BarLabelProps) {
  const isPositive = value >= 0;
  const labelY = isPositive ? y - 6 : y + height + 14;
  return (
    <text x={x + width / 2} y={labelY} textAnchor="middle" fontSize={10} fill="var(--ink-2)">
      {formatR(value)}
    </text>
  );
}

export function GroupedPerformanceChart({ data }: GroupedPerformanceChartProps) {
  if (data.every((row) => row.trades === 0)) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-ink-3">
        Aún no hay operaciones para este análisis.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 24, right: 8, bottom: 16, left: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--ink-3)" }}
          axisLine={{ stroke: "var(--line)" }}
          tickLine={false}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={48}
        />
        <YAxis
          tickFormatter={(v) => formatR(Number(v))}
          tick={{ fontSize: 11, fill: "var(--ink-3)" }}
          axisLine={false}
          tickLine={false}
          width={48}
          domain={[(min: number) => (min < 0 ? min * 1.2 : 0), (max: number) => (max > 0 ? max * 1.2 : 0)]}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [formatR(Number(value)), "Total R"]}
        />
        <Bar dataKey="totalR" shape={BarShape} maxBarSize={64}>
          <LabelList dataKey="totalR" content={BarLabel} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
