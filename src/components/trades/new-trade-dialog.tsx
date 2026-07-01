"use client";

import { useEffect, useState, useTransition } from "react";
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
import { CreatableSelect, CreatableMultiSelect } from "@/components/ui/creatable-select";
import { ScreenshotUploader } from "@/components/trades/screenshot-uploader";
import { useUIStore } from "@/store/ui-store";
import { useJournalStore } from "@/store/journal-store";
import { createTrade, createTradeOption, getTradeOptions } from "@/app/(app)/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { DISCIPLINE_ITEMS, computeDisciplineScore } from "@/lib/discipline";
import type { TradeScreenshot } from "@/types/trade";

const MARKETS = ["Forex", "Cripto", "Índices", "Acciones", "Materias primas", "Futuros"];
const SESSIONS = ["Asia", "Londres", "Nueva York", "Solapamiento Londres-NY"];
const QUALITY_LEVELS = [
  { value: "a_plus", label: "A+ (Ejecución perfecta)" },
  { value: "a", label: "A (Muy buena)" },
  { value: "b", label: "B (Buena)" },
  { value: "c", label: "C (Regular)" },
  { value: "d", label: "D (Mala)" },
] as const;
const TIMEFRAMES = ["1m", "3m", "5m", "15m", "1H", "4H", "Diario"];
const EXIT_REASONS = [
  "Take Profit",
  "Stop Loss",
  "Break Even",
  "Trailing Stop",
  "Cierre manual",
  "Parcial + Break Even",
  "Salida anticipada",
];
const EMOTIONS_BEFORE = ["Tranquilo", "Seguro", "Ansioso", "FOMO", "Impaciente", "Cansado"];
const EMOTIONS_AFTER = ["Feliz", "Neutral", "Frustrado", "Molesto", "Decepcionado"];
const TAG_SUGGESTIONS = [
  "FOMO",
  "Revenge",
  "Entrada tardía",
  "Excelente gestión",
  "Alta probabilidad",
  "Noticias",
  "Liquidez",
  "Mala gestión",
  "Error psicológico",
];

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

const screenshotSchema = z.object({
  url: z.string(),
  category: z.enum(["before", "during", "after"]),
});

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
  quality: z.enum(["a_plus", "a", "b", "c", "d"]).optional(),
  setup: z.string().optional(),
  timeframe: z.string().optional(),
  exitReason: z.string().optional(),
  emotionBefore: z.string().optional(),
  emotionAfter: z.string().optional(),
  tags: z.array(z.string()),
  enteredAt: z.string().min(1, "Requerido"),
  exitedAt: z.string().min(1, "Requerido"),
  strategy: z.string().optional(),
  session: z.string().optional(),
  screenshots: z.array(screenshotSchema),
  disciplineChecklist: z.array(z.string()),
  notes: z.string().optional(),
});

type FormValues = z.input<typeof schema>;

function computeOutcome(values: z.output<typeof schema>) {
  return { pnl: Math.round(values.riskPercent * values.rMultiple * 100) / 100 };
}

interface OptionLists {
  setup: string[];
  strategy: string[];
  tag: string[];
}

const EMPTY_OPTIONS: OptionLists = { setup: [], strategy: [], tag: [] };

export function NewTradeDialog() {
  const isOpen = useUIStore((s) => s.isNewTradeOpen);
  const close = useUIStore((s) => s.closeNewTrade);
  const journalType = useJournalStore((s) => s.journalType);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [options, setOptions] = useState<OptionLists>(EMPTY_OPTIONS);

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
      tags: [],
      screenshots: [],
      disciplineChecklist: [],
      enteredAt: new Date().toISOString().slice(0, 16),
      exitedAt: new Date().toISOString().slice(0, 16),
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    getTradeOptions(journalType).then(setOptions);
  }, [isOpen, journalType]);

  const direction = watch("direction");
  const market = watch("market");
  const instrument = watch("instrument");
  const session = watch("session");
  const resultType = watch("resultType");
  const quality = watch("quality");
  const setup = watch("setup");
  const strategy = watch("strategy");
  const timeframe = watch("timeframe");
  const exitReason = watch("exitReason");
  const emotionBefore = watch("emotionBefore");
  const emotionAfter = watch("emotionAfter");
  const tags = watch("tags");
  const screenshots = watch("screenshots");
  const disciplineChecklist = watch("disciplineChecklist");

  const instrumentOptions = market ? INSTRUMENTS_BY_MARKET[market] ?? [] : ALL_INSTRUMENTS;
  const tagOptions = Array.from(new Set([...TAG_SUGGESTIONS, ...options.tag]));
  const disciplineScore = computeDisciplineScore(disciplineChecklist ?? []);

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

  function persistOption(kind: "setup" | "strategy" | "tag", name: string) {
    setOptions((prev) => ({
      ...prev,
      [kind]: prev[kind].includes(name) ? prev[kind] : [...prev[kind], name],
    }));
    void createTradeOption(journalType, kind, name);
  }

  function toggleDisciplineItem(id: string, checked: boolean) {
    const current = disciplineChecklist ?? [];
    setValue(
      "disciplineChecklist",
      checked ? [...current, id] : current.filter((i) => i !== id)
    );
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
        quality: values.quality ?? null,
        setup: values.setup || null,
        timeframe: values.timeframe || null,
        exitReason: values.exitReason || null,
        emotionBefore: values.emotionBefore || null,
        emotionAfter: values.emotionAfter || null,
        tags: values.tags,
        enteredAt: new Date(values.enteredAt).toISOString(),
        exitedAt: new Date(values.exitedAt).toISOString(),
        strategy: values.strategy || null,
        session: values.session || null,
        screenshots: values.screenshots as TradeScreenshot[],
        pnl,
        rMultiple: values.rMultiple,
        disciplineChecklist: values.disciplineChecklist,
        disciplineScore: computeDisciplineScore(values.disciplineChecklist),
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
              <Label>Calidad de la ejecución</Label>
              <Select
                value={quality ?? ""}
                onValueChange={(v) => setValue("quality", v as FormValues["quality"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {QUALITY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Setup</Label>
              <CreatableSelect
                value={setup ?? ""}
                onValueChange={(v) => setValue("setup", v)}
                options={options.setup}
                onCreate={(name) => persistOption("setup", name)}
                placeholder="Liquidity Sweep"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estrategia</Label>
              <CreatableSelect
                value={strategy ?? ""}
                onValueChange={(v) => setValue("strategy", v)}
                options={options.strategy}
                onCreate={(name) => persistOption("strategy", name)}
                placeholder="ICT, SMC, Wyckoff..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Timeframe</Label>
              <Select value={timeframe ?? ""} onValueChange={(v) => setValue("timeframe", v ?? undefined)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map((tf) => (
                    <SelectItem key={tf} value={tf}>
                      {tf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Motivo de salida</Label>
              <Select value={exitReason ?? ""} onValueChange={(v) => setValue("exitReason", v ?? undefined)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {EXIT_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Estado emocional antes</Label>
              <Select value={emotionBefore ?? ""} onValueChange={(v) => setValue("emotionBefore", v ?? undefined)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {EMOTIONS_BEFORE.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Estado emocional después</Label>
            <Select value={emotionAfter ?? ""} onValueChange={(v) => setValue("emotionAfter", v ?? undefined)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {EMOTIONS_AFTER.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Etiquetas</Label>
            <CreatableMultiSelect
              value={tags ?? []}
              onValueChange={(v) => setValue("tags", v)}
              options={tagOptions}
              onCreate={(name) => persistOption("tag", name)}
              placeholder="FOMO, Revenge, Liquidez..."
            />
          </div>

          <ScreenshotUploader
            value={screenshots ?? []}
            onChange={(shots) => setValue("screenshots", shots)}
          />

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" rows={3} placeholder="¿Qué funcionó? ¿Qué mejorarías?" {...register("notes")} />
          </div>

          <div className="space-y-2 rounded-lg border border-line px-3 py-2.5">
            <div className="flex items-center justify-between">
              <Label>Checklist de disciplina</Label>
              <span className="font-mono text-xs text-gold">{disciplineScore}%</span>
            </div>
            <div className="space-y-1.5">
              {DISCIPLINE_ITEMS.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm text-ink-2">
                  <Checkbox
                    checked={(disciplineChecklist ?? []).includes(item.id)}
                    onCheckedChange={(checked) => toggleDisciplineItem(item.id, checked === true)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

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
