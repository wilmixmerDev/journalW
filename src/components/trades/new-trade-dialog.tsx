"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreatableSelect, CreatableMultiSelect } from "@/components/ui/creatable-select";
import { ScreenshotUploader } from "@/components/trades/screenshot-uploader";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { useUIStore } from "@/store/ui-store";
import { useJournalStore } from "@/store/journal-store";
import { createTrade, createTradeOption, getTradeOptions, type TradeOptionLists } from "@/app/(app)/actions";
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
const TIMEFRAME_SUGGESTIONS = ["1m", "3m", "5m", "15m", "1H", "4H", "Diario"];
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
  category: z.enum(["before", "after"]),
});

const schema = z
  .object({
    instrument: z.string().min(1, "Requerido"),
    market: z.string().min(1, "Requerido"),
    direction: z.enum(["long", "short"]),
    entryPrice: optionalNumber,
    stopPrice: optionalNumber,
    takeProfitPrice: optionalNumber,
    riskPercent: z.coerce.number({ message: "Requerido" }).positive("Debe ser mayor a 0"),
    resultType: z.enum(["tp", "sl", "be"], { message: "Requerido" }),
    rMultiple: z.coerce.number({ message: "Requerido" }),
    quality: z.enum(["a_plus", "a", "b", "c", "d"], { message: "Requerido" }),
    setup: z.string().optional(),
    timeframe: z.string().min(1, "Requerido"),
    emotionBefore: z.string().optional(),
    emotionAfter: z.string().optional(),
    tags: z.array(z.string()),
    enteredAt: z.string().min(1, "Requerido"),
    exitedAt: z.string().min(1, "Requerido"),
    strategy: z.string().optional(),
    session: z.string().min(1, "Requerido"),
    screenshots: z.array(screenshotSchema).min(1, "Sube al menos una captura"),
    disciplineChecklist: z.array(z.string()).min(1, "Marca al menos un ítem del checklist"),
    notes: z.string().min(1, "Requerido"),
  })
  .superRefine((v, ctx) => {
    if (v.resultType === "tp" && !(v.rMultiple > 0)) {
      ctx.addIssue({ code: "custom", path: ["rMultiple"], message: "Con Take Profit el R debe ser positivo" });
    }
    if (v.resultType === "sl" && !(v.rMultiple < 0)) {
      ctx.addIssue({ code: "custom", path: ["rMultiple"], message: "Con Stop Loss el R debe ser negativo" });
    }
    if (v.resultType === "be" && v.rMultiple !== 0) {
      ctx.addIssue({ code: "custom", path: ["rMultiple"], message: "Con Break Even el R es 0" });
    }
    if (v.enteredAt && v.exitedAt && new Date(v.exitedAt) <= new Date(v.enteredAt)) {
      ctx.addIssue({ code: "custom", path: ["exitedAt"], message: "La salida debe ser posterior a la entrada" });
    }
  });

type FormValues = z.input<typeof schema>;

function computeOutcome(values: z.output<typeof schema>) {
  return { pnl: Math.round(values.riskPercent * values.rMultiple * 100) / 100 };
}

const EMPTY_OPTIONS: TradeOptionLists = { strategy: [], setupsByStrategy: {}, timeframe: [], tag: [] };

/**
 * Distances between the plan prices, expressed in pips for Forex (0.0001,
 * or 0.01 for JPY pairs) and raw points for every other market.
 */
function computePriceStats(
  market: string | undefined,
  instrument: string | undefined,
  entry: number | undefined,
  stop: number | undefined,
  takeProfit: number | undefined
) {
  if (!entry || !stop || !Number.isFinite(entry) || !Number.isFinite(stop)) return null;
  const isForex = market === "Forex";
  const pipSize = isForex ? (instrument?.includes("JPY") ? 0.01 : 0.0001) : 1;
  const unit = isForex ? "pips" : "puntos";
  const slDistance = Math.abs(entry - stop) / pipSize;
  if (slDistance === 0) return null;
  const tpDistance =
    takeProfit && Number.isFinite(takeProfit) ? Math.abs(takeProfit - entry) / pipSize : null;
  const plannedRR = tpDistance !== null ? tpDistance / slDistance : null;
  return { unit, slDistance, tpDistance, plannedRR };
}

function formatDistance(value: number) {
  // Sub-1 distances (e.g. index points or a forex-style price entered under a
  // non-forex market) would round to "0" with a fixed decimal count.
  if (value > 0 && value < 1) {
    return value.toLocaleString("es", { maximumSignificantDigits: 3 });
  }
  return value.toLocaleString("es", { maximumFractionDigits: 1 });
}

const STEPS: { label: string; fields: FieldPath<FormValues>[] }[] = [
  { label: "Instrumento", fields: ["market", "instrument"] },
  {
    label: "Resultado",
    fields: ["entryPrice", "stopPrice", "takeProfitPrice", "riskPercent", "resultType", "rMultiple", "quality"],
  },
  { label: "Contexto", fields: ["timeframe", "session", "enteredAt", "exitedAt"] },
  { label: "Psicología", fields: [] },
  { label: "Capturas", fields: ["screenshots"] },
  { label: "Disciplina y notas", fields: ["notes", "disciplineChecklist"] },
];

export function NewTradeDialog() {
  const isOpen = useUIStore((s) => s.isNewTradeOpen);
  const close = useUIStore((s) => s.closeNewTrade);
  const journalType = useJournalStore((s) => s.journalType);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [options, setOptions] = useState<TradeOptionLists>(EMPTY_OPTIONS);
  const [step, setStep] = useState(0);
  const [justAdvanced, setJustAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    watch,
    setValue,
    getValues,
    setError,
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
  const emotionBefore = watch("emotionBefore");
  const emotionAfter = watch("emotionAfter");
  const tags = watch("tags");
  const screenshots = watch("screenshots");
  const disciplineChecklist = watch("disciplineChecklist");
  const entryPriceRaw = watch("entryPrice");
  const stopPriceRaw = watch("stopPrice");
  const takeProfitPriceRaw = watch("takeProfitPrice");
  const enteredAt = watch("enteredAt");

  const priceStats = computePriceStats(
    market,
    instrument,
    Number(entryPriceRaw),
    Number(stopPriceRaw),
    Number(takeProfitPriceRaw)
  );

  const instrumentOptions = market ? INSTRUMENTS_BY_MARKET[market] ?? [] : ALL_INSTRUMENTS;
  const setupOptions = strategy
    ? options.setupsByStrategy[strategy] ?? []
    : Array.from(new Set(Object.values(options.setupsByStrategy).flat()));
  const timeframeOptions = Array.from(new Set([...TIMEFRAME_SUGGESTIONS, ...options.timeframe]));
  const tagOptions = Array.from(new Set([...TAG_SUGGESTIONS, ...options.tag]));
  const disciplineScore = computeDisciplineScore(disciplineChecklist ?? []);
  const animatedDisciplineScore = useAnimatedNumber(disciplineScore);

  const isLastStep = step === STEPS.length - 1;

  function onOpenChange(open: boolean) {
    if (!open) {
      close();
      reset();
      setServerError(null);
      setStep(0);
      setJustAdvanced(false);
    }
  }

  function cooldownAfterStepChange() {
    // Guards against a rapid double-click landing on whichever button re-renders
    // in the same spot (e.g. "Siguiente" turning into "Guardar operación").
    setJustAdvanced(true);
    setTimeout(() => setJustAdvanced(false), 400);
  }

  // Cross-field rules live in the schema's superRefine, but zod skips
  // refinements while later-step required fields are still empty — so the
  // same rules are enforced imperatively when advancing past their step.
  function validateStepCrossFields(): boolean {
    if (step === 1) {
      const r = Number(getValues("rMultiple"));
      const result = getValues("resultType");
      if (result === "tp" && !(r > 0)) {
        setError("rMultiple", { type: "custom", message: "Con Take Profit el R debe ser positivo" });
        return false;
      }
      if (result === "sl" && !(r < 0)) {
        setError("rMultiple", { type: "custom", message: "Con Stop Loss el R debe ser negativo" });
        return false;
      }
    }
    if (step === 2) {
      const entered = getValues("enteredAt");
      const exited = getValues("exitedAt");
      if (entered && exited && new Date(exited) <= new Date(entered)) {
        setError("exitedAt", { type: "custom", message: "La salida debe ser posterior a la entrada" });
        return false;
      }
    }
    return true;
  }

  async function goNext() {
    if (justAdvanced) return;
    const valid = await trigger(STEPS[step].fields);
    if (valid && validateStepCrossFields()) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
      cooldownAfterStepChange();
    }
  }

  function goBack() {
    if (justAdvanced) return;
    setStep((s) => Math.max(s - 1, 0));
    cooldownAfterStepChange();
  }

  function onMarketChange(value: string) {
    setValue("market", value, { shouldValidate: true });
    setValue("instrument", "", { shouldValidate: true });
  }

  function onStrategyChange(value: string) {
    setValue("strategy", value, { shouldValidate: true });
    setValue("setup", "", { shouldValidate: true });
  }

  function onResultTypeChange(value: "tp" | "sl" | "be") {
    setValue("resultType", value, { shouldValidate: true });
    const current = Number(getValues("rMultiple"));
    if (value === "be") {
      setValue("rMultiple", 0, { shouldValidate: true });
    } else if (Number.isFinite(current) && current !== 0) {
      // Keep the magnitude the user already typed, flip the sign to match.
      const coerced = value === "sl" ? -Math.abs(current) : Math.abs(current);
      setValue("rMultiple", coerced, { shouldValidate: true });
    }
  }

  function coerceRMultipleSign(event: React.ChangeEvent<HTMLInputElement>) {
    const result = getValues("resultType");
    const value = Number(event.target.value);
    if (!Number.isFinite(value) || value === 0) return;
    if (result === "sl" && value > 0) {
      setValue("rMultiple", -value, { shouldValidate: true });
    } else if (result === "tp" && value < 0) {
      setValue("rMultiple", Math.abs(value), { shouldValidate: true });
    }
  }

  function persistOption(kind: "strategy" | "timeframe" | "tag", name: string) {
    setOptions((prev: TradeOptionLists) => ({
      ...prev,
      [kind]: prev[kind].includes(name) ? prev[kind] : [...prev[kind], name],
    }));
    void createTradeOption(journalType, kind, name);
  }

  function persistSetupOption(name: string) {
    const parent = strategy ?? "";
    setOptions((prev: TradeOptionLists) => {
      const bucket = prev.setupsByStrategy[parent] ?? [];
      return {
        ...prev,
        setupsByStrategy: {
          ...prev.setupsByStrategy,
          [parent]: bucket.includes(name) ? bucket : [...bucket, name],
        },
      };
    });
    void createTradeOption(journalType, "setup", name, parent);
  }

  function toggleDisciplineItem(id: string, checked: boolean) {
    const current = disciplineChecklist ?? [];
    setValue("disciplineChecklist", checked ? [...current, id] : current.filter((i) => i !== id), {
      shouldValidate: true,
    });
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
    <Dialog open={isOpen} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva operación</DialogTitle>
          <DialogDescription>Registra los detalles de tu operación cerrada.</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-ink-2">
            <span>
              Paso {step + 1} de {STEPS.length}: {STEPS[step].label}
            </span>
            <span className="font-mono">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
          <Progress value={((step + 1) / STEPS.length) * 100} />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError ? (
            <p className="rounded-md border border-neg/30 bg-neg-soft px-3 py-2 text-xs text-neg">
              {serverError}
            </p>
          ) : null}

          {step === 0 ? (
            <>
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
                    <SelectTrigger className="w-full" disabled={!market}>
                      <SelectValue placeholder={market ? "Selecciona" : "Elige un mercado primero"} />
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
            </>
          ) : null}

          {step === 1 ? (
            <>
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

              {priceStats ? (
                <div className="animate-fade-in grid grid-cols-3 gap-2 rounded-lg border border-line bg-surface-2/60 px-3 py-2.5">
                  <div>
                    <p className="text-[10px] tracking-wide text-ink-3 uppercase">Distancia SL</p>
                    <p className="font-mono text-sm text-neg">
                      {formatDistance(priceStats.slDistance)} {priceStats.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-wide text-ink-3 uppercase">Distancia TP</p>
                    <p className="font-mono text-sm text-pos">
                      {priceStats.tpDistance !== null
                        ? `${formatDistance(priceStats.tpDistance)} ${priceStats.unit}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-wide text-ink-3 uppercase">R:R del plan</p>
                    <p className="font-mono text-sm text-ink">
                      {priceStats.plannedRR !== null ? `1 : ${priceStats.plannedRR.toFixed(2)}` : "—"}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label>Resultado</Label>
                <div className="grid grid-cols-3 gap-2">
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
                  <Button
                    type="button"
                    variant={resultType === "be" ? "default" : "outline"}
                    onClick={() => onResultTypeChange("be")}
                  >
                    Break Even
                  </Button>
                </div>
                {errors.resultType ? <FieldError message={errors.resultType.message} /> : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rMultiple">RR conseguido</Label>
                  <Input
                    id="rMultiple"
                    type="number"
                    step="any"
                    placeholder={resultType === "sl" ? "-1" : resultType === "be" ? "0" : "3"}
                    disabled={resultType === "be"}
                    {...register("rMultiple", { onChange: coerceRMultipleSign })}
                  />
                  {errors.rMultiple ? <FieldError message={errors.rMultiple.message} /> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="riskPercent">% de la cuenta arriesgado</Label>
                  <Input id="riskPercent" type="number" step="any" min="0" placeholder="0.5" {...register("riskPercent")} />
                  {errors.riskPercent ? <FieldError message={errors.riskPercent.message} /> : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Calidad de la ejecución</Label>
                <Select
                  value={quality ?? ""}
                  onValueChange={(v) => v && setValue("quality", v as FormValues["quality"], { shouldValidate: true })}
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
                {errors.quality ? <FieldError message={errors.quality.message} /> : null}
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Estrategia</Label>
                  <CreatableSelect
                    value={strategy ?? ""}
                    onValueChange={(v) => onStrategyChange(v)}
                    options={options.strategy}
                    onCreate={(name) => persistOption("strategy", name)}
                    placeholder="ICT, Wyckoff, Price Action..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Setup</Label>
                  <CreatableSelect
                    value={setup ?? ""}
                    onValueChange={(v) => setValue("setup", v)}
                    options={setupOptions}
                    onCreate={(name) => persistSetupOption(name)}
                    disabled={!strategy}
                    placeholder={strategy ? "Liquidity Sweep" : "Elige una estrategia primero"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Timeframe</Label>
                  <CreatableSelect
                    value={timeframe ?? ""}
                    onValueChange={(v) => setValue("timeframe", v, { shouldValidate: true })}
                    options={timeframeOptions}
                    onCreate={(name) => persistOption("timeframe", name)}
                    placeholder="15m"
                  />
                  {errors.timeframe ? <FieldError message={errors.timeframe.message} /> : null}
                </div>
                <div className="space-y-1.5">
                  <Label>Sesión</Label>
                  <Select
                    value={session ?? ""}
                    onValueChange={(v) => v && setValue("session", v, { shouldValidate: true })}
                  >
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
                  {errors.session ? <FieldError message={errors.session.message} /> : null}
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
                  <Input id="exitedAt" type="datetime-local" min={enteredAt || undefined} {...register("exitedAt")} />
                  {errors.exitedAt ? <FieldError message={errors.exitedAt.message} /> : null}
                </div>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-1.5">
                  <Label>Estado emocional después</Label>
                  <Select value={emotionAfter ?? ""} onValueChange={(v) => setValue("emotionAfter", v ?? undefined)}>
                    <SelectTrigger className="w-full" disabled={!emotionBefore}>
                      <SelectValue placeholder={emotionBefore ? "Selecciona" : "Elige primero el de antes"} />
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
            </>
          ) : null}

          {step === 4 ? (
            <>
              <ScreenshotUploader
                value={screenshots ?? []}
                onChange={(shots) => setValue("screenshots", shots, { shouldValidate: true })}
              />
              {errors.screenshots ? <FieldError message={errors.screenshots.message} /> : null}
            </>
          ) : null}

          {step === 5 ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notas</Label>
                <Textarea id="notes" rows={3} placeholder="¿Qué funcionó? ¿Qué mejorarías?" {...register("notes")} />
                {errors.notes ? <FieldError message={errors.notes.message} /> : null}
              </div>

              <div className="space-y-2 rounded-lg border border-line px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <Label>Checklist de disciplina</Label>
                  <span className="font-mono text-xs text-gold">{Math.round(animatedDisciplineScore)}%</span>
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
                {errors.disciplineChecklist ? <FieldError message={errors.disciplineChecklist.message} /> : null}
              </div>
            </>
          ) : null}

          <div className="flex justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={step === 0 ? () => onOpenChange(false) : goBack}
            >
              {step === 0 ? "Cancelar" : "Atrás"}
            </Button>
            {isLastStep ? (
              <Button type="submit" disabled={isPending || justAdvanced}>
                {isPending ? "Guardando..." : "Guardar operación"}
              </Button>
            ) : (
              <Button type="button" onClick={goNext} disabled={justAdvanced}>
                Siguiente
              </Button>
            )}
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
