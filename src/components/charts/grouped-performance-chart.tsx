"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GroupedPerformance } from "@/lib/metrics";
import { formatR } from "@/lib/format";

interface GroupedPerformanceChartProps {
  data: GroupedPerformance[];
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
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
        <Bar dataKey="totalR" radius={[4, 4, 4, 4]} maxBarSize={64}>
          {data.map((row) => (
            <Cell key={row.label} fill={row.totalR >= 0 ? "var(--pos)" : "var(--neg)"} />
          ))}
          <LabelList
            dataKey="totalR"
            position="top"
            formatter={(v) => formatR(Number(v))}
            style={{ fill: "var(--ink-2)", fontSize: 10 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
