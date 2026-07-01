"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUIStore } from "@/store/ui-store";
import { useJournalStore } from "@/store/journal-store";
import { createTrade } from "@/app/(app)/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const MARKETS = ["Forex", "Cripto", "Índices", "Acciones", "Materias primas", "Futuros"];
const SESSIONS = ["Asia", "Londres", "Nueva York", "Solapamiento Londres-NY"];
const IMPORTANCE_LEVELS = [
  { value: "a_plus", label: "A+" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
] as const;

const INSTRUMENTS_BY_MARKET: Record<string, string[]> = {
  Forex: ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD", "EUR/GBP", "EUR/JPY", "GBP/JPY"],
  Cripto: ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "BNB/USD", "ADA/USD", "DOGE/USD"],
  Índices: ["NAS100", "US30", "SPX500", "GER40", "UK100", "JPN225"],
  Acciones: ["AAPL", "TSLA", "MSFT", "NVDA", "AMZN", "GOOGL", "META"],
  "Materias primas": ["XAU/USD", "XAG/USD", "WTI", "NATGAS"],
  Futuros: ["ES", "NQ", "CL", "GC", "ZB"],
};
const ALL_INSTRUMENTS = Object.values(INSTRUMENTS_BY_MARKET).flat();

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
  z.number().optional()
);

const schema = z.object({
  instrument: z.string().min(1, "Requerido"),
  market: z.string().min(1, "Requerido"),
  direction: z.enum(["long", "short"]),
  entryPrice: optionalNumber,
  stopPrice: optionalNumber,
  takeProfitPrice: optionalNumber,
  riskPercent: z.coerce.number().positive("Debe ser mayor a 0"),
  resultType: z.enum(["tp", "sl"], { message: "Requerido" }),
  rMultiple: z.coerce.number({ message: "Requerido" }),
  enteredAt: z.string().min(1, "Requerido"),
  exitedAt: z.string().min(1, "Requerido"),
  strategy: z.string().optional(),
  session: z.string().optional(),
  importance: z.enum(["a_plus", "media", "baja"]).optional(),
  followedPlan: z.boolean(),
  notes: z.string().optional(),
});

type FormValues = z.input<typeof schema>;

function computeOutcome(values: z.output<typeof schema>) {
  return { pnl: Math.round(values.riskPercent * values.rMultiple * 100) / 100 };
}

export function NewTradeDialog() {
  const isOpen = useUIStore((s) => s.isNewTradeOpen);
  const close = useUIStore((s) => s.closeNewTrade);
  const journalType = useJournalStore((s) => s.journalType);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      direction: "long",
      followedPlan: true,
      enteredAt: new Date().toISOString().slice(0, 16),
      exitedAt: new Date().toISOString().slice(0, 16),
    },
  });

  const direction = watch("direction");
  const followedPlan = watch("followedPlan");
  const market = watch("market");
  const instrument = watch("instrument");
  const session = watch("session");
  const resultType = watch("resultType");
  const importance = watch("importance");

  const instrumentOptions = market ? INSTRUMENTS_BY_MARKET[market] ?? [] : ALL_INSTRUMENTS;

  function onOpenChange(open: boolean) {
    if (!open) {
      close();
      reset();
      setServerError(null);
    }
  }

  function onMarketChange(value: string) {
    setValue("market", value, { shouldValidate: true });
    setValue("instrument", "", { shouldValidate: true });
  }

  function onResultTypeChange(value: "tp" | "sl") {
    setValue("resultType", value, { shouldValidate: true });
    if (value === "sl") {
      setValue("rMultiple", -1, { shouldValidate: true });
    }
  }

  function onSubmit(raw: FormValues) {
    const values = schema.parse(raw);
    const { pnl } = computeOutcome(values);

    startTransition(async () => {
      const result = await createTrade({
        journalType,
        status: "closed",
        instrument: values.instrument,
        market: values.market,
        direction: values.direction,
        entryPrice: values.entryPrice ?? null,
        stopPrice: values.stopPrice ?? null,
        takeProfitPrice: values.takeProfitPrice ?? null,
        riskPercent: values.riskPercent,
        resultType: values.resultType,
        importance: values.importance ?? null,
        enteredAt: new Date(values.enteredAt).toISOString(),
        exitedAt: new Date(values.exitedAt).toISOString(),
        strategy: values.strategy ?? null,
        session: values.session ?? null,
        screenshots: [],
        pnl,
        rMultiple: values.rMultiple,
        followedPlan: values.followedPlan,
        notes: values.notes ?? null,
      });

      if (result.error) {
        setServerError(result.error);
        if (!isSupabaseConfigured()) {
          toast.warning(result.error);
        }
        return;
      }

      toast.success("Operación registrada");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva operación</DialogTitle>
          <DialogDescription>Registra los detalles de tu operación cerrada.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError ? (
            <p className="rounded-md border border-neg/30 bg-neg-soft px-3 py-2 text-xs text-neg">
              {serverError}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Mercado</Label>
              <Select value={market ?? ""} onValueChange={(v) => v && onMarketChange(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {MARKETS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.market ? <FieldError message={errors.market.message} /> : null}
            </div>

            <div className="space-y-1.5">
              <Label>Instrumento</Label>
              <Select
                value={instrument ?? ""}
                onValueChange={(v) => v && setValue("instrument", v, { shouldValidate: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {instrumentOptions.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.instrument ? <FieldError message={errors.instrument.message} /> : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Dirección</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={direction === "long" ? "default" : "outline"}
                onClick={() => setValue("direction", "long")}
              >
                Long
              </Button>
              <Button
                type="button"
                variant={direction === "short" ? "default" : "outline"}
                onClick={() => setValue("direction", "short")}
              >
                Short
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="entryPrice">Entrada (opcional)</Label>
              <Input id="entryPrice" type="number" step="any" {...register("entryPrice")} />
              {errors.entryPrice ? <FieldError message={errors.entryPrice.message} /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stopPrice">Stop Loss (opcional)</Label>
              <Input id="stopPrice" type="number" step="any" {...register("stopPrice")} />
              {errors.stopPrice ? <FieldError message={errors.stopPrice.message} /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="takeProfitPrice">Take Profit (opcional)</Label>
              <Input id="takeProfitPrice" type="number" step="any" {...register("takeProfitPrice")} />
              {errors.takeProfitPrice ? <FieldError message={errors.takeProfitPrice.message} /> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Resultado</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={resultType === "tp" ? "default" : "outline"}
                  onClick={() => onResultTypeChange("tp")}
                >
                  Take Profit
                </Button>
                <Button
                  type="button"
                  variant={resultType === "sl" ? "default" : "outline"}
                  onClick={() => onResultTypeChange("sl")}
                >
                  Stop Loss
                </Button>
              </div>
              {errors.resultType ? <FieldError message={errors.resultType.message} /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rMultiple">RR conseguido</Label>
              <Input
                id="rMultiple"
                type="number"
                step="any"
                placeholder="3"
                disabled={resultType === "sl"}
                className={
                  resultType === "sl"
                    ? "bg-ink text-bg disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-ink disabled:text-bg disabled:opacity-100"
                    : undefined
                }
                {...register("rMultiple")}
              />
              {errors.rMultiple ? <FieldError message={errors.rMultiple.message} /> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="riskPercent">% de la cuenta arriesgado</Label>
              <Input id="riskPercent" type="number" step="any" placeholder="0.5" {...register("riskPercent")} />
              {errors.riskPercent ? <FieldError message={errors.riskPercent.message} /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="strategy">Estrategia</Label>
              <Input id="strategy" placeholder="Ruptura de rango" {...register("strategy")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="enteredAt">Entrada (fecha y hora)</Label>
              <Input id="enteredAt" type="datetime-local" {...register("enteredAt")} />
              {errors.enteredAt ? <FieldError message={errors.enteredAt.message} /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exitedAt">Salida (fecha y hora)</Label>
              <Input id="exitedAt" type="datetime-local" {...register("exitedAt")} />
              {errors.exitedAt ? <FieldError message={errors.exitedAt.message} /> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Sesión</Label>
              <Select value={session ?? ""} onValueChange={(v) => setValue("session", v ?? undefined)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {SESSIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Importancia</Label>
              <Select
                value={importance ?? ""}
                onValueChange={(v) => setValue("importance", v as "a_plus" | "media" | "baja")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {IMPORTANCE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" rows={3} placeholder="¿Qué funcionó? ¿Qué mejorarías?" {...register("notes")} />
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-2">
            <Checkbox
              checked={followedPlan}
              onCheckedChange={(checked) => setValue("followedPlan", checked === true)}
            />
            Seguí mi plan de trading
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar operación"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-neg">{message}</p>;
}
