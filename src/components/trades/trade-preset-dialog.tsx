"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreatableSelect } from "@/components/ui/creatable-select";
import { Notice } from "@/components/ui/notice";
import { DISCIPLINE_ITEMS } from "@/lib/discipline";
import { createTradePreset, updateTradePreset, type TradeOptionLists } from "@/app/(app)/actions";
import type { JournalType, TradePreset } from "@/types/trade";

export const PRESET_NAME_MAX_LENGTH = 24;

const MARKETS = ["Forex", "Cripto", "Índices", "Acciones", "Materias primas", "Futuros"];
const SESSIONS = ["Asia", "Londres", "Nueva York", "Solapamiento Londres-NY"];
const TIMEFRAME_SUGGESTIONS = ["1m", "3m", "5m", "15m", "1H", "4H", "Diario"];

const INSTRUMENTS_BY_MARKET: Record<string, string[]> = {
  Forex: ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD", "EUR/GBP", "EUR/JPY", "GBP/JPY"],
  Cripto: ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "BNB/USD", "ADA/USD", "DOGE/USD"],
  Índices: ["NAS100", "US30", "SPX500", "GER40", "UK100", "JPN225"],
  Acciones: ["AAPL", "TSLA", "MSFT", "NVDA", "AMZN", "GOOGL", "META"],
  "Materias primas": ["XAU/USD", "XAG/USD", "WTI", "NATGAS"],
  Futuros: ["ES", "NQ", "CL", "GC", "ZB"],
};

interface TradePresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journalType: JournalType;
  options: TradeOptionLists;
  /** Favorito a editar; si es null/undefined, el diálogo crea uno nuevo. */
  preset?: TradePreset | null;
  /** Refresca la lista de favoritos del formulario padre al guardar. */
  onSaved: () => void;
  /** Mantiene sincronizadas las opciones creables (estrategia/setup/timeframe) con el formulario padre. */
  onCreateOption: (kind: "strategy" | "timeframe", name: string) => void;
  onCreateSetupOption: (strategy: string, name: string) => void;
}

export function TradePresetDialog({
  open,
  onOpenChange,
  journalType,
  options,
  preset,
  onSaved,
  onCreateOption,
  onCreateSetupOption,
}: TradePresetDialogProps) {
  const isEditing = Boolean(preset);
  const [name, setName] = useState("");
  const [market, setMarket] = useState("");
  const [instrument, setInstrument] = useState("");
  const [strategy, setStrategy] = useState("");
  const [setup, setSetup] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [session, setSession] = useState("");
  const [checklist, setChecklist] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Al abrir el diálogo (creación o edición), carga los campos del favorito si lo hay.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(preset?.name ?? "");
      setMarket(preset?.market ?? "");
      setInstrument(preset?.instrument ?? "");
      setStrategy(preset?.strategy ?? "");
      setSetup(preset?.setup ?? "");
      setTimeframe(preset?.timeframe ?? "");
      setSession(preset?.session ?? "");
      setChecklist(preset?.disciplineChecklist ?? []);
      setError(null);
    }
  }

  const instrumentOptions = market ? (INSTRUMENTS_BY_MARKET[market] ?? []) : [];
  const setupOptions = strategy
    ? (options.setupsByStrategy[strategy] ?? [])
    : Array.from(new Set(Object.values(options.setupsByStrategy).flat()));
  const timeframeOptions = Array.from(new Set([...TIMEFRAME_SUGGESTIONS, ...options.timeframe]));

  function resetForm() {
    setName("");
    setMarket("");
    setInstrument("");
    setStrategy("");
    setSetup("");
    setTimeframe("");
    setSession("");
    setChecklist([]);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  function toggleChecklistItem(id: string, checked: boolean) {
    setChecklist((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)));
  }

  async function handleSave() {
    setError(null);

    if (!name.trim()) {
      setError("Ponle un nombre al favorito (ej. \"NQ Nueva York\").");
      return;
    }
    const hasAnyField = market || instrument || strategy || setup || timeframe || session || checklist.length > 0;
    if (!hasAnyField) {
      setError("Rellena al menos un campo para que el favorito tenga algo que autorrellenar.");
      return;
    }

    const input = {
      name,
      market: market || null,
      instrument: instrument || null,
      strategy: strategy || null,
      setup: setup || null,
      timeframe: timeframe || null,
      session: session || null,
      disciplineChecklist: checklist,
    };

    setIsPending(true);
    const { error: saveError } = preset
      ? await updateTradePreset(preset.id, input)
      : await createTradePreset(journalType, input);
    setIsPending(false);

    if (saveError) {
      setError(saveError);
      return;
    }

    toast.success(preset ? "Favorito actualizado" : "Favorito guardado");
    handleOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar favorito" : "Nuevo favorito"}</DialogTitle>
          <DialogDescription>
            Guarda los datos que repites siempre. Solo lo que rellenes aquí se autorrellenará — el resto queda libre.
          </DialogDescription>
        </DialogHeader>

        {error ? <Notice variant="error">{error}</Notice> : null}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="preset-name">Nombre del favorito</Label>
            <Input
              id="preset-name"
              placeholder='Ej. "NQ Nueva York"'
              value={name}
              maxLength={PRESET_NAME_MAX_LENGTH}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-right text-xs text-ink-3">
              {name.length}/{PRESET_NAME_MAX_LENGTH}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Mercado</Label>
              <Select
                value={market}
                onValueChange={(v) => {
                  setMarket(v ?? "");
                  setInstrument("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {MARKETS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Instrumento</Label>
              <Select value={instrument} onValueChange={(v) => setInstrument(v ?? "")}>
                <SelectTrigger className="w-full" disabled={!market}>
                  <SelectValue placeholder={market ? "Opcional" : "Elige un mercado primero"} />
                </SelectTrigger>
                <SelectContent>
                  {instrumentOptions.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Estrategia</Label>
              <CreatableSelect
                value={strategy}
                onValueChange={(v) => {
                  setStrategy(v);
                  setSetup("");
                }}
                options={options.strategy}
                onCreate={(n) => onCreateOption("strategy", n)}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Setup</Label>
              <CreatableSelect
                value={setup}
                onValueChange={setSetup}
                options={setupOptions}
                onCreate={(n) => strategy && onCreateSetupOption(strategy, n)}
                disabled={!strategy}
                placeholder={strategy ? "Opcional" : "Elige una estrategia primero"}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Timeframe</Label>
              <CreatableSelect
                value={timeframe}
                onValueChange={setTimeframe}
                options={timeframeOptions}
                onCreate={(n) => onCreateOption("timeframe", n)}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sesión</Label>
              <Select value={session} onValueChange={(v) => setSession(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Opcional" />
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
          </div>

          <div className="space-y-2">
            <Label>Checklist de disciplina</Label>
            <div className="space-y-2 rounded-lg border border-line bg-surface-2/60 p-3">
              {DISCIPLINE_ITEMS.map((item) => (
                <label key={item.id} className="flex items-center gap-2.5 text-sm text-ink-2">
                  <Checkbox
                    checked={checklist.includes(item.id)}
                    onCheckedChange={(checked) => toggleChecklistItem(item.id, checked === true)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <Button type="button" className="w-full" disabled={isPending} onClick={handleSave}>
            {isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar favorito"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
