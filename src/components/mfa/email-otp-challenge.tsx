"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const RESEND_COOLDOWN_SECONDS = 30;

interface EmailOtpChallengeProps {
  email: string;
  onVerify: (code: string) => Promise<{ error: string | null }>;
  onResend: () => Promise<{ error: string | null }>;
  onVerified: () => void;
  /** Si ya se envió el primer código antes de montar este componente (p. ej. desde el server). */
  alreadySent?: boolean;
}

export function EmailOtpChallenge({ email, onVerify, onResend, onVerified, alreadySent = true }: EmailOtpChallengeProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [cooldown, setCooldown] = useState(alreadySent ? RESEND_COOLDOWN_SECONDS : 0);
  const isVerifyingRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function verify(currentCode: string) {
    if (isVerifyingRef.current) return;
    isVerifyingRef.current = true;
    setIsPending(true);
    setError(null);

    const { error: verifyError } = await onVerify(currentCode);

    if (verifyError) {
      setError(verifyError);
      setIsPending(false);
      isVerifyingRef.current = false;
      setCode("");
      return;
    }

    onVerified();
  }

  function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value.replace(/\D/g, "");
    setCode(value);
    if (value.length === 6) {
      verify(value);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setError(null);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    const { error: resendError } = await onResend();
    if (resendError) setError(resendError);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email-otp-code">Código de 6 dígitos</Label>
        <p className="text-xs text-ink-3">Lo enviamos a {email}.</p>
        <Input
          id="email-otp-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          autoFocus
          aria-invalid={Boolean(error)}
          value={code}
          onChange={handleCodeChange}
          disabled={isPending}
        />
      </div>

      {error ? (
        <p className="animate-fade-up rounded-md border border-neg/30 bg-neg-soft px-3 py-2 text-xs text-neg">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={cooldown > 0 || isPending}
        onClick={handleResend}
      >
        {cooldown > 0 ? `Reenviar código (${cooldown}s)` : "Reenviar código"}
      </Button>
    </div>
  );
}
