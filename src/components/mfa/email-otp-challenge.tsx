"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { CircleCheckIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

const RESEND_COOLDOWN_SECONDS = 30;
const POLL_INTERVAL_MS = 2500;

interface EmailOtpChallengeProps {
  email: string;
  onVerify: (code: string) => Promise<{ error: string | null }>;
  onResend: () => Promise<{ error: string | null }>;
  onVerified: () => void;
  /** Si ya se envió el primer código antes de montar este componente (p. ej. desde el server). */
  alreadySent?: boolean;
  /** Si el usuario verifica desde el enlace del correo en otra pestaña, esto detecta el cambio y avanza solo. */
  onCheckVerifiedElsewhere?: () => Promise<boolean>;
  /** Avisa al padre que esta pestaña quedó inhabilitada (verificado en otra pestaña), para que oculte
   * cualquier acción propia (volver, cambiar de método, etc.) — esta pestaña ya no debe hacer nada más. */
  onVerifiedElsewhere?: () => void;
}

export function EmailOtpChallenge({
  email,
  onVerify,
  onResend,
  onVerified,
  alreadySent = true,
  onCheckVerifiedElsewhere,
  onVerifiedElsewhere,
}: EmailOtpChallengeProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [cooldown, setCooldown] = useState(alreadySent ? RESEND_COOLDOWN_SECONDS : 0);
  // Cuando se verifica desde el enlace en OTRA pestaña, esta se queda quieta en vez de seguir su
  // propio proceso — la que continúa es la pestaña donde se abrió el enlace, para no duplicar el flujo.
  const [verifiedElsewhere, setVerifiedElsewhere] = useState(false);
  const isVerifyingRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!onCheckVerifiedElsewhere) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      if (cancelled || isVerifyingRef.current) return;
      const verified = await onCheckVerifiedElsewhere();
      if (verified && !cancelled) {
        clearInterval(timer);
        setVerifiedElsewhere(true);
        onVerifiedElsewhere?.();
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [onCheckVerifiedElsewhere, onVerifiedElsewhere]);

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

  if (verifiedElsewhere) {
    return (
      <div className="animate-fade-up flex flex-col items-center gap-3 rounded-2xl border border-pos/20 bg-pos-soft/60 px-6 py-8 text-center">
        <div className="animate-scale-in flex size-12 items-center justify-center rounded-full bg-pos/15">
          <CircleCheckIcon className="size-6 text-pos" strokeWidth={2} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">Correo verificado</p>
          <p className="text-sm text-ink-2">
            Continúa el proceso en la pestaña donde abriste el enlace. Puedes cerrar esta.
          </p>
        </div>
      </div>
    );
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
        <div className="animate-fade-up">
          <Notice variant="error">{error}</Notice>
        </div>
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
