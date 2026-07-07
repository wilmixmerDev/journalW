"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "@/lib/countries";
import { MARKETS, EXPERIENCE_LEVELS, TIMEZONES } from "@/lib/onboarding-options";
import { updateUserProfileAsAdmin, type AdminUserRow, type AdminProfileInput } from "@/app/(app)/admin/actions";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUserRow;
  onSaved: () => void;
}

const CHIP_CLASS =
  "inline-flex cursor-pointer items-center rounded-lg border border-line-2 bg-surface px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors";
const CHIP_ACTIVE_CLASS = "border-transparent bg-ink text-bg";
const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function toFormState(user: AdminUserRow): AdminProfileInput {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    country: user.country,
    birthDate: user.birthDate,
    experienceLevel: user.experienceLevel,
    markets: user.markets,
    initialCapital: user.initialCapital,
    timezone: user.timezone,
  };
}

export function EditUserDialog({ open, onOpenChange, user, onSaved }: EditUserDialogProps) {
  const [form, setForm] = useState<AdminProfileInput>(() => toFormState(user));
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function toggleMarket(market: string) {
    setForm((f) => ({
      ...f,
      markets: f.markets.includes(market) ? f.markets.filter((m) => m !== market) : [...f.markets, market],
    }));
  }

  async function handleSubmit() {
    setError(null);
    setIsPending(true);
    const { error: saveError } = await updateUserProfileAsAdmin(user.id, form);
    setIsPending(false);

    if (saveError) {
      setError(saveError);
      return;
    }
    toast.success("Datos actualizados");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        {error ? <p className="rounded-md border border-neg/30 bg-neg-soft px-3 py-2 text-xs text-neg">{error}</p> : null}

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-firstName">Nombre</Label>
              <Input
                id="edit-firstName"
                value={form.firstName ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value || null }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-lastName">Apellido</Label>
              <Input
                id="edit-lastName"
                value={form.lastName ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value || null }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">Teléfono</Label>
            <Input
              id="edit-phone"
              value={form.phone ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value || null }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-country">País</Label>
              <select
                id="edit-country"
                className={SELECT_CLASS}
                value={form.country ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value || null }))}
              >
                <option value="">Sin especificar</option>
                {COUNTRIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-birthDate">Fecha de nacimiento</Label>
              <Input
                id="edit-birthDate"
                type="date"
                value={form.birthDate ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value || null }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nivel de experiencia</Label>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, experienceLevel: level.value }))}
                  className={cn(CHIP_CLASS, form.experienceLevel === level.value && CHIP_ACTIVE_CLASS)}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mercados</Label>
            <div className="flex flex-wrap gap-2">
              {MARKETS.map((market) => (
                <button
                  key={market}
                  type="button"
                  onClick={() => toggleMarket(market)}
                  className={cn(CHIP_CLASS, form.markets.includes(market) && CHIP_ACTIVE_CLASS)}
                >
                  {market}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-initialCapital">Capital inicial</Label>
              <Input
                id="edit-initialCapital"
                type="number"
                value={form.initialCapital ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, initialCapital: e.target.value === "" ? null : Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-timezone">Zona horaria</Label>
              <select
                id="edit-timezone"
                className={SELECT_CLASS}
                value={form.timezone ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value || null }))}
              >
                <option value="">Sin especificar</option>
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <Button type="button" className="w-full" disabled={isPending} onClick={handleSubmit}>
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
