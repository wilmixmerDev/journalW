"use client";

import { useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "@/lib/countries";
import { MARKETS, EXPERIENCE_LEVELS, TIMEZONES } from "@/lib/onboarding-options";
import { Notice } from "@/components/ui/notice";
import { completeOnboarding } from "./actions";

const NAME_REGEX = /^[\p{L}][\p{L}\s'-]*$/u;

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
  z.number().optional()
);

const todayISO = () => new Date().toISOString().slice(0, 10);

const schema = z.object({
  firstName: z.string().min(1, "Requerido").regex(NAME_REGEX, "Solo puede contener letras"),
  lastName: z.string().min(1, "Requerido").regex(NAME_REGEX, "Solo puede contener letras"),
  phoneDial: z.string().min(1, "Requerido"),
  phoneNumber: z
    .string()
    .min(5, "Requerido")
    .regex(/^\d+$/, "Solo números"),
  country: z.string().min(1, "Requerido"),
  birthDate: z
    .string()
    .min(1, "Requerido")
    .refine((v) => v < todayISO(), "Debe ser una fecha en el pasado"),
  experienceLevel: z.enum(["principiante", "intermedio", "avanzado", "profesional"], {
    message: "Selecciona una opción",
  }),
  markets: z.array(z.string()).min(1, "Selecciona al menos un mercado"),
  initialCapital: optionalNumber,
  timezone: z.string().min(1, "Requerido"),
});

type FormValues = z.input<typeof schema>;

const STEPS: { label: string; fields: FieldPath<FormValues>[] }[] = [
  { label: "Información personal", fields: ["firstName", "lastName", "phoneDial", "phoneNumber", "country", "birthDate"] },
  { label: "Tu operativa", fields: ["experienceLevel", "markets", "timezone"] },
];

const CHIP_CLASS =
  "inline-flex cursor-pointer items-center rounded-lg border border-line-2 bg-surface px-3.5 py-2 text-sm font-medium text-ink-2 transition-colors";
const CHIP_ACTIVE_CLASS = "border-transparent bg-ink text-bg";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

export function OnboardingForm() {
  const [step, setStep] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [justAdvanced, setJustAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { markets: [], phoneDial: "" },
  });

  const isLastStep = step === STEPS.length - 1;
  const markets = watch("markets") ?? [];
  const experienceLevel = watch("experienceLevel");

  function cooldownAfterStepChange() {
    // Evita que un doble clic golpee el botón que se re-renderiza en su lugar.
    setJustAdvanced(true);
    setTimeout(() => setJustAdvanced(false), 400);
  }

  async function goNext() {
    if (justAdvanced) return;
    const valid = await trigger(STEPS[step].fields);
    if (valid) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
      cooldownAfterStepChange();
    }
  }

  function goBack() {
    if (justAdvanced) return;
    setStep((s) => Math.max(s - 1, 0));
    cooldownAfterStepChange();
  }

  function toggleMarket(market: string) {
    const checked = markets.includes(market);
    setValue("markets", checked ? markets.filter((m) => m !== market) : [...markets, market], {
      shouldValidate: true,
    });
  }

  function onCountryChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const dial = COUNTRIES.find((c) => c.name === event.target.value)?.dial;
    if (dial && !getValues("phoneDial")) {
      setValue("phoneDial", dial, { shouldValidate: true });
    }
  }

  function keepDigitsOnly(event: React.ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, "");
    if (digits !== event.target.value) {
      setValue("phoneNumber", digits, { shouldValidate: true });
    }
  }

  async function onSubmit(raw: FormValues) {
    const values = schema.parse(raw);
    setServerError(null);
    setIsPending(true);

    const { error } = await completeOnboarding({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phone: `${values.phoneDial} ${values.phoneNumber}`,
      country: values.country,
      birthDate: values.birthDate,
      experienceLevel: values.experienceLevel,
      markets: values.markets,
      initialCapital: values.initialCapital ?? null,
      timezone: values.timezone,
    });

    if (error) {
      setServerError(error);
      setIsPending(false);
      return;
    }

    // Navegación completa para evitar una redirección cacheada obsoleta hacia esta página.
    window.location.href = "/dashboard";
  }

  return (
    <div className="w-full max-w-lg animate-fade-up">
      <h1 className="font-serif text-4xl text-ink">Cuéntanos sobre ti</h1>
      <p className="mt-2 text-sm text-ink-2">
        Necesitamos estos datos para terminar de crear tu cuenta.
      </p>

      <div className="mt-6 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-ink-2">
          <span>
            Paso {step + 1} de {STEPS.length}: {STEPS[step].label}
          </span>
          <span className="font-mono">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
        {serverError ? <Notice variant="error">{serverError}</Notice> : null}

        {step === 0 ? (
          <div className="animate-fade-in space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  aria-invalid={Boolean(errors.firstName)}
                  {...register("firstName")}
                />
                {errors.firstName ? <FieldError message={errors.firstName.message} /> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Apellido</Label>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  aria-invalid={Boolean(errors.lastName)}
                  {...register("lastName")}
                />
                {errors.lastName ? <FieldError message={errors.lastName.message} /> : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="country">País</Label>
              <select
                id="country"
                defaultValue=""
                aria-invalid={Boolean(errors.country)}
                className={SELECT_CLASS}
                {...register("country", { onChange: onCountryChange })}
              >
                <option value="" disabled>
                  Selecciona tu país
                </option>
                {COUNTRIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.country ? <FieldError message={errors.country.message} /> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phoneNumber">Teléfono</Label>
              <div className="flex gap-2">
                <select
                  aria-label="Código de país"
                  aria-invalid={Boolean(errors.phoneDial)}
                  className={cn(SELECT_CLASS, "w-32 shrink-0")}
                  {...register("phoneDial")}
                >
                  <option value="" disabled>
                    Código
                  </option>
                  {COUNTRIES.map((c) => (
                    <option key={c.name} value={c.dial}>
                      {c.name} ({c.dial})
                    </option>
                  ))}
                </select>
                <Input
                  id="phoneNumber"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="3001234567"
                  aria-invalid={Boolean(errors.phoneNumber)}
                  {...register("phoneNumber", { onChange: keepDigitsOnly })}
                />
              </div>
              {errors.phoneDial ? <FieldError message={errors.phoneDial.message} /> : null}
              {errors.phoneNumber ? <FieldError message={errors.phoneNumber.message} /> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="birthDate">Fecha de nacimiento</Label>
              <Input
                id="birthDate"
                type="date"
                max={todayISO()}
                aria-invalid={Boolean(errors.birthDate)}
                {...register("birthDate")}
              />
              {errors.birthDate ? <FieldError message={errors.birthDate.message} /> : null}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="animate-fade-in space-y-5">
            <div className="space-y-2">
              <Label>Nivel de experiencia</Label>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setValue("experienceLevel", level.value, { shouldValidate: true })}
                    className={cn(CHIP_CLASS, experienceLevel === level.value && CHIP_ACTIVE_CLASS)}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
              {errors.experienceLevel ? <FieldError message={errors.experienceLevel.message} /> : null}
            </div>

            <div className="space-y-2">
              <Label>Mercados que operas</Label>
              <div className="flex flex-wrap gap-2">
                {MARKETS.map((market) => (
                  <button
                    key={market}
                    type="button"
                    onClick={() => toggleMarket(market)}
                    className={cn(CHIP_CLASS, markets.includes(market) && CHIP_ACTIVE_CLASS)}
                  >
                    {market}
                  </button>
                ))}
              </div>
              {errors.markets ? <FieldError message={errors.markets.message} /> : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="initialCapital">Capital inicial (opcional)</Label>
                <Input
                  id="initialCapital"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="10000"
                  {...register("initialCapital")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="timezone">Zona horaria</Label>
                <select
                  id="timezone"
                  defaultValue=""
                  aria-invalid={Boolean(errors.timezone)}
                  className={SELECT_CLASS}
                  {...register("timezone")}
                >
                  <option value="" disabled>
                    Selecciona una zona
                  </option>
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                {errors.timezone ? <FieldError message={errors.timezone.message} /> : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={goBack} disabled={isPending}>
                Atrás
              </Button>
            ) : null}
          </div>
          {isLastStep ? (
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Completar"}
            </Button>
          ) : (
            <Button type="button" onClick={goNext} disabled={isPending}>
              Siguiente
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return <p className="text-xs text-neg">{message}</p>;
}
