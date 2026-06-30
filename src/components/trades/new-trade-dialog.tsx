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

const schema = z.object({
  instrument: z.string().min(1, "Requerido"),
  market: z.string().min(1, "Requerido"),
  direction: z.enum(["long", "short"]),
  entryPrice: z.coerce.number({ message: "Requerido" }),
  stopPrice: z.coerce.number({ message: "Requerido" }),
  exitPrice: z.coerce.number({ message: "Requerido" }),
  size: z.coerce.number().positive("Debe ser mayor a 0"),
  enteredAt: z.string().min(1, "Requerido"),
  exitedAt: z.string().min(1, "Requerido"),
  strategy: z.string().optional(),
  session: z.string().optional(),
  tags: z.string().optional(),
  followedPlan: z.boolean(),
  notes: z.string().optional(),
});

type FormValues = z.input<typeof schema>;

function computeOutcome(values: z.output<typeof schema>) {
  const { direction, entryPrice, stopPrice, exitPrice, size } = values;
  const risk = Math.abs(entryPrice - stopPrice);
  const reward = direction === "long" ? exitPrice - entryPrice : entryPrice - exitPrice;
  const pnl = reward * size;
  const rMultiple = risk > 0 ? reward / risk : 0;
  return { pnl, rMultiple };
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
  const session = watch("session");

  function onOpenChange(open: boolean) {
    if (!open) {
      close();
      reset();
      setServerError(null);
    }
  }

  function onSubmit(raw: FormValues) {
    const values = schema.parse(raw);
    const { pnl, rMultiple } = computeOutcome(values);
    const tags = values.tags
      ? values.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    startTransition(async () => {
      const result = await createTrade({
        journalType,
        status: "closed",
        instrument: values.instrument,
        market: values.market,
        direction: values.direction,
        entryPrice: values.entryPrice,
        stopPrice: values.stopPrice,
        exitPrice: values.exitPrice,
        size: values.size,
        enteredAt: new Date(values.enteredAt).toISOString(),
        exitedAt: new Date(values.exitedAt).toISOString(),
        strategy: values.strategy ?? null,
        session: values.session ?? null,
        tags,
        screenshots: [],
        pnl,
        rMultiple,
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
              <Label htmlFor="instrument">Instrumento</Label>
              <Input id="instrument" placeholder="EUR/USD" {...register("instrument")} />
              {errors.instrument ? <FieldError message={errors.instrument.message} /> : null}
            </div>

            <div className="space-y-1.5">
              <Label>Mercado</Label>
              <Select
                value={market}
                onValueChange={(v) => v && setValue("market", v, { shouldValidate: true })}
              >
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
              <Label htmlFor="entryPrice">Entrada</Label>
              <Input id="entryPrice" type="number" step="any" {...register("entryPrice")} />
              {errors.entryPrice ? <FieldError message={errors.entryPrice.message} /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stopPrice">Stop</Label>
              <Input id="stopPrice" type="number" step="any" {...register("stopPrice")} />
              {errors.stopPrice ? <FieldError message={errors.stopPrice.message} /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exitPrice">Salida</Label>
              <Input id="exitPrice" type="number" step="any" {...register("exitPrice")} />
              {errors.exitPrice ? <FieldError message={errors.exitPrice.message} /> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="size">Tamaño</Label>
              <Input id="size" type="number" step="any" {...register("size")} />
              {errors.size ? <FieldError message={errors.size.message} /> : null}
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
              <Select value={session} onValueChange={(v) => setValue("session", v ?? undefined)}>
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
              <Label htmlFor="tags">Tags (separados por coma)</Label>
              <Input id="tags" placeholder="A+ Setup, Scalp" {...register("tags")} />
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
