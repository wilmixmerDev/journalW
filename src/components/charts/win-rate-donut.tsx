"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatPercent } from "@/lib/format";

interface WinRateDonutProps {
  winRate: number;
}

export function WinRateDonut({ winRate }: WinRateDonutProps) {
  const data = [
    { name: "Ganadoras", value: winRate },
    { name: "Perdedoras", value: 100 - winRate },
  ];

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={56}
            outerRadius={78}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            <Cell fill="var(--pos)" />
            <Cell fill="var(--line)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl text-ink">{formatPercent(winRate)}</span>
        <span className="text-xs text-ink-3">Win rate</span>
      </div>
    </div>
  );
}
