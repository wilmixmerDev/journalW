"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface SetupMfaFormProps {
  factorId: string;
  qrCode: string;
  secret: string;
}

export function SetupMfaForm({ factorId, qrCode, secret }: SetupMfaFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const isVerifyingRef = useRef(false);

  async function verify(currentCode: string) {
    if (isVerifyingRef.current) return;
    isVerifyingRef.current = true;
    setIsPending(true);
    setError(null);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: currentCode });

    if (verifyError) {
      setError(verifyError.message);
      setIsPending(false);
      isVerifyingRef.current = false;
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setCode(value);
    if (value.length === 6) {
      verify(value);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    verify(code);
  }

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <h1 className="font-serif text-4xl text-ink">Activa la verificación en dos pasos</h1>
      <p className="mt-2 text-sm text-ink-2">
        Por seguridad, Journal W requiere una app autenticadora (Google Authenticator, Authy, etc.)
        antes de poder continuar. Escanea el código y confírmalo para terminar tu registro.
      </p>

      {error ? (
        <div className="mt-6 rounded-lg border border-neg/30 bg-neg-soft px-4 py-3 text-sm text-neg">
          {error}
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrCode}
          alt="Código QR para activar 2FA"
          className="size-40 rounded-lg border border-line bg-white p-2"
        />
        <p className="rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-ink-2">
          {secret}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="code">Código de 6 dígitos</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            required
            autoFocus
            aria-invalid={Boolean(error)}
            value={code}
            onChange={handleCodeChange}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isPending || code.length < 6}>
          {isPending ? "Verificando..." : "Activar y continuar"}
        </Button>
      </form>
    </div>
  );
}
