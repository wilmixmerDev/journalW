"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RDistributionBucket } from "@/lib/metrics";

interface RDistributionChartProps {
  data: RDistributionBucket[];
}

export function RDistributionChart({ data }: RDistributionChartProps) {
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
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--ink-3)" }} axisLine={false} tickLine={false} width={28} />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((bucket) => (
            <Cell key={bucket.label} fill={bucket.label.includes("-") ? "var(--neg)" : "var(--pos)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
