"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GroupedPerformance } from "@/lib/metrics";
import { formatSignedPercent } from "@/lib/format";

interface GroupedPerformanceChartProps {
  data: GroupedPerformance[];
}

export function GroupedPerformanceChart({ data }: GroupedPerformanceChartProps) {
  if (data.length === 0) {
    return <div className="flex h-48 items-center justify-center text-sm text-ink-3">Sin datos.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--ink-3)" }}
          axisLine={{ stroke: "var(--line)" }}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tickFormatter={(v) => formatSignedPercent(v)}
          tick={{ fontSize: 11, fill: "var(--ink-3)" }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [formatSignedPercent(Number(value)), "P&L"]}
        />
        <Bar dataKey="netPnl" radius={[4, 4, 0, 0]}>
          {data.map((group) => (
            <Cell key={group.label} fill={group.netPnl >= 0 ? "var(--pos)" : "var(--neg)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
