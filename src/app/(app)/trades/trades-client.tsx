"use client";

import { useMemo, useState, useTransition } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useJournalTrades } from "@/hooks/use-journal-trades";
import { useUIStore } from "@/store/ui-store";
import { deleteTrade } from "@/app/(app)/actions";
import { formatDate, formatR, formatSignedPercent } from "@/lib/format";
import type { Trade } from "@/types/trade";

interface TradesClientProps {
  live: Trade[];
  backtest: Trade[];
}

type Filter = "all" | "wins" | "losses" | "a-plus";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "wins", label: "Ganadoras" },
  { value: "losses", label: "Perdedoras" },
  { value: "a-plus", label: "A+ Setups" },
];

export function TradesClient({ live, backtest }: TradesClientProps) {
  const trades = useJournalTrades(live, backtest);
  const [filter, setFilter] = useState<Filter>("all");
  const openTrade = useUIStore((s) => s.openTrade);
  const openEditTrade = useUIStore((s) => s.openEditTrade);
  const [deletingTrade, setDeletingTrade] = useState<Trade | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function confirmDelete() {
    if (!deletingTrade) return;
    const trade = deletingTrade;
    startDeleteTransition(async () => {
      const result = await deleteTrade(trade.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Operación eliminada");
      setDeletingTrade(null);
    });
  }

  const filtered = useMemo(() => {
    switch (filter) {
      case "wins":
        return trades.filter((t) => (t.pnl ?? 0) > 0);
      case "losses":
        return trades.filter((t) => (t.pnl ?? 0) < 0);
      case "a-plus":
        return trades.filter((t) => t.quality === "a_plus");
      default:
        return trades;
    }
  }, [trades, filter]);

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="font-serif text-3xl text-ink">Operaciones</h1>
        <p className="text-sm text-ink-2">{trades.length} operaciones registradas.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              filter === f.value
                ? "border-ink bg-ink text-bg"
                : "border-line text-ink-2 hover:border-line-2 hover:text-ink"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Instrumento</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estrategia</TableHead>
              <TableHead className="text-right">R</TableHead>
              <TableHead className="text-right">P&amp;L</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-ink-3">
                  No hay operaciones para este filtro.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((trade) => {
                const win = (trade.pnl ?? 0) > 0;
                return (
                  <TableRow
                    key={trade.id}
                    className="cursor-pointer"
                    onClick={() => openTrade(trade)}
                  >
                    <TableCell className="font-medium text-ink">
                      <div className="flex items-center gap-2">
                        {trade.instrument}
                        {trade.quality === "a_plus" ? (
                          <Badge variant="outline" className="text-gold">
                            A+
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={trade.direction === "long" ? "default" : "secondary"}>
                        {trade.direction === "long" ? "Long" : "Short"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-ink-2">{formatDate(trade.enteredAt)}</TableCell>
                    <TableCell className="text-ink-2">{trade.strategy ?? "—"}</TableCell>
                    <TableCell className={cn("text-right font-mono", win ? "text-pos" : "text-neg")}>
                      {formatR(trade.rMultiple ?? 0)}
                    </TableCell>
                    <TableCell className={cn("text-right font-mono", win ? "text-pos" : "text-neg")}>
                      {formatSignedPercent(trade.pnl ?? 0)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm">
                              <MoreVertical />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditTrade(trade)}>
                            <Pencil />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeletingTrade(trade)}>
                            <Trash2 />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deletingTrade} onOpenChange={(open) => !open && setDeletingTrade(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar operación</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la operación en {deletingTrade?.instrument} de forma permanente. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
