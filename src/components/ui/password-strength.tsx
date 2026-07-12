"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPasswordChecks, getPasswordScore, type PasswordChecks } from "@/lib/password-strength";

// La lógica vive en src/lib/password-strength.ts (también la usan las server actions); aquí solo la UI.
export { getPasswordChecks, getPasswordScore, isPasswordStrongEnough } from "@/lib/password-strength";
export type { PasswordChecks } from "@/lib/password-strength";

const BAR_COLORS = ["bg-neg", "bg-neg", "bg-amber-500", "bg-amber-500", "bg-pos"];
const LABELS = ["Muy débil", "Muy débil", "Débil", "Aceptable", "Fuerte"];
const LABEL_COLORS = ["text-neg", "text-neg", "text-amber-600", "text-amber-600", "text-pos"];

interface Requirement {
  key: keyof PasswordChecks;
  label: string;
}

const REQUIREMENTS: Requirement[] = [
  { key: "length", label: "Al menos 8 caracteres" },
  { key: "upper", label: "Una mayúscula" },
  { key: "number", label: "Un número" },
  { key: "symbol", label: "Un símbolo (!@#$...)" },
];

export function PasswordStrengthMeter({ password }: { password: string }) {
  const checks = getPasswordChecks(password);
  const score = checks.length ? getPasswordScore(checks) : 0;
  const filled = password.length === 0 ? 0 : Math.max(1, score);

  return (
    <div className="animate-fade-in space-y-2.5">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full bg-line transition-colors duration-200",
              i < filled && BAR_COLORS[filled]
            )}
          />
        ))}
      </div>
      {password.length > 0 ? (
        <p className={cn("text-xs font-medium", LABEL_COLORS[filled])}>{LABELS[filled]}</p>
      ) : null}
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {REQUIREMENTS.map((req) => {
          const met = checks[req.key];
          return (
            <li key={req.key} className={cn("flex items-center gap-1.5 text-xs", met ? "text-pos" : "text-ink-3")}>
              {met ? <CheckIcon className="size-3.5 shrink-0" /> : <XIcon className="size-3.5 shrink-0" />}
              {req.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
