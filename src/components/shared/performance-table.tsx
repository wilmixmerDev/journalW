import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatPercent, formatR, formatSignedPercent } from "@/lib/format";
import type { GroupedPerformance } from "@/lib/metrics";

interface PerformanceTableProps {
  data: GroupedPerformance[];
}

export function PerformanceTable({ data }: PerformanceTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-ink-3">
        Aún no hay operaciones para este análisis.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Categoría</TableHead>
          <TableHead className="text-right">Operaciones</TableHead>
          <TableHead className="text-right">Win Rate</TableHead>
          <TableHead className="text-right">P&amp;L neto</TableHead>
          <TableHead className="text-right">Profit Factor</TableHead>
          <TableHead className="text-right">Total R</TableHead>
          <TableHead className="text-right">R prom.</TableHead>
          <TableHead className="text-right">Expectancy</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => {
          const win = row.netPnl >= 0;
          return (
            <TableRow key={row.label}>
              <TableCell className="font-medium text-ink">{row.label}</TableCell>
              <TableCell className="text-right text-ink-2">{row.trades}</TableCell>
              <TableCell className="text-right font-mono text-ink-2">{formatPercent(row.winRate)}</TableCell>
              <TableCell className={cn("text-right font-mono", win ? "text-pos" : "text-neg")}>
                {formatSignedPercent(row.netPnl)}
              </TableCell>
              <TableCell className="text-right font-mono text-ink-2">
                {row.profitFactor !== null ? row.profitFactor.toFixed(2) : "—"}
              </TableCell>
              <TableCell className="text-right font-mono text-ink-2">
                {row.totalR >= 0 ? "+" : ""}
                {row.totalR.toFixed(1)}R
              </TableCell>
              <TableCell className="text-right font-mono text-ink-2">{formatR(row.avgR)}</TableCell>
              <TableCell className="text-right font-mono text-ink-2">{row.expectancy.toFixed(2)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
