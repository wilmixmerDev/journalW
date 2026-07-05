"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export interface TwoFactorProof {
  method: "totp" | "email";
  code: string;
}

interface TwoFactorProofFieldsProps {
  hasTotp: boolean;
  value: TwoFactorProof;
  onChange: (value: TwoFactorProof) => void;
  onSendEmailCode: () => Promise<{ error: string | null }>;
}

/** Reverificación con el factor que el usuario elija, reusada en cambio de contraseña y al desactivar el autenticador. */
export function TwoFactorProofFields({ hasTotp, value, onChange, onSendEmailCode }: TwoFactorProofFieldsProps) {
  const [emailSent, setEmailSent] = useState(!hasTotp);
  const [sendError, setSendError] = useState<string | null>(null);

  async function selectEmail() {
    onChange({ method: "email", code: "" });
    if (emailSent) return;
    const { error } = await onSendEmailCode();
    if (error) {
      setSendError(error);
      return;
    }
    setEmailSent(true);
  }

  async function resend() {
    setSendError(null);
    const { error } = await onSendEmailCode();
    if (error) setSendError(error);
  }

  return (
    <div className="space-y-3">
      {hasTotp ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={value.method === "email" ? "default" : "outline"}
            onClick={selectEmail}
          >
            Código por correo
          </Button>
          <Button
            type="button"
            variant={value.method === "totp" ? "default" : "outline"}
            onClick={() => onChange({ method: "totp", code: "" })}
          >
            App autenticadora
          </Button>
        </div>
      ) : null}

      {sendError ? <p className="text-xs text-neg">{sendError}</p> : null}

      {value.method === "email" && !emailSent ? null : (
        <div className="space-y-1.5">
          <Label htmlFor="two-factor-proof-code">Código de 6 dígitos</Label>
          <Input
            id="two-factor-proof-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={value.code}
            onChange={(e) => onChange({ ...value, code: e.target.value.replace(/\D/g, "") })}
          />
          {value.method === "email" ? (
            <button type="button" onClick={resend} className="text-xs text-ink-2 underline-offset-4 hover:underline">
              Reenviar código
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
