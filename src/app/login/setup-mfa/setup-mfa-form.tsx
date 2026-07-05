"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { EmailOtpChallenge } from "@/components/mfa/email-otp-challenge";
import { enrollTotp, type TotpEnrollment } from "@/lib/mfa/enroll-totp";
import { sendAuthEmailOtp, verifyAuthEmailOtp, checkAuthEmailOtpVerified } from "@/app/login/actions";

type Stage = "email-otp" | "totp-offer" | "totp-enroll";

interface SetupMfaFormProps {
  email: string;
  initialStage?: Stage;
}

export function SetupMfaForm({ email, initialStage = "email-otp" }: SetupMfaFormProps) {
  const [stage, setStage] = useState<Stage>(initialStage);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [stopped, setStopped] = useState(false);

  async function handleActivateTotp() {
    const enrolled = await enrollTotp(createClient());
    if (!enrolled) {
      setError("No se pudo iniciar la activación del autenticador. Intenta de nuevo.");
      return;
    }
    setEnrollment(enrolled);
    setStage("totp-enroll");
  }

  function goToOnboarding() {
    // Navegación completa para que el middleware reevalúe la sesión ya verificada.
    window.location.href = "/login/onboarding";
  }

  async function verifyTotp(currentCode: string) {
    if (!enrollment) return;
    setIsPending(true);
    setError(null);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code: currentCode,
    });

    if (verifyError) {
      setError(verifyError.message);
      setIsPending(false);
      setCode("");
      return;
    }

    goToOnboarding();
  }

  function handleTotpCodeChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setCode(value);
    if (value.length === 6) verifyTotp(value);
  }

  function handleTotpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    verifyTotp(code);
  }

  async function handleGoBack() {
    // "Volver" significa abandonar el login a medio crear.
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (stage === "email-otp") {
    return (
      <div className="w-full max-w-sm animate-fade-up">
        <h1 className="font-serif text-4xl text-ink">Verifica tu correo</h1>
        <p className="mt-2 text-sm text-ink-2">
          Por seguridad, Journal W requiere verificar tu correo antes de continuar.
        </p>
        <div className="mt-6">
          <EmailOtpChallenge
            email={email}
            onVerify={(otp) => verifyAuthEmailOtp(otp, "enroll")}
            onResend={() => sendAuthEmailOtp("enroll")}
            onVerified={() => setStage("totp-offer")}
            onCheckVerifiedElsewhere={() => checkAuthEmailOtpVerified("enroll")}
            onVerifiedElsewhere={() => setStopped(true)}
          />
        </div>
        {!stopped ? (
          <Button type="button" variant="ghost" className="mt-2 w-full" onClick={handleGoBack}>
            ← Volver al inicio de sesión
          </Button>
        ) : null}
      </div>
    );
  }

  if (stage === "totp-offer") {
    return (
      <div className="w-full max-w-sm animate-fade-up">
        <h1 className="font-serif text-4xl text-ink">¿Inicio de sesión más rápido?</h1>
        <p className="mt-2 text-sm text-ink-2">
          Ya tienes 2FA por correo activo. Si quieres, activa también una app autenticadora
          (Google Authenticator, Authy...) para verificarte más rápido en cada inicio de sesión.
        </p>
        {error ? (
          <div className="mt-6 rounded-lg border border-neg/30 bg-neg-soft px-4 py-3 text-sm text-neg">{error}</div>
        ) : null}
        <div className="mt-6 space-y-2">
          <Button type="button" className="w-full" onClick={handleActivateTotp}>
            Activar app autenticadora
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={goToOnboarding}>
            Ahora no
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <h1 className="font-serif text-4xl text-ink">Activa tu autenticador</h1>
      <p className="mt-2 text-sm text-ink-2">
        Escanea el código QR con tu app autenticadora (Google Authenticator, Authy, etc.) y confírmalo.
      </p>

      {error ? (
        <div className="mt-6 rounded-lg border border-neg/30 bg-neg-soft px-4 py-3 text-sm text-neg">{error}</div>
      ) : null}

      {enrollment ? (
        <div className="mt-6 space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrollment.qrCode}
            alt="Código QR para activar 2FA"
            className="size-40 rounded-lg border border-line bg-white p-2"
          />
          <p className="rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-ink-2">
            {enrollment.secret}
          </p>
        </div>
      ) : null}

      <form onSubmit={handleTotpSubmit} className="mt-6 space-y-4">
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
            onChange={handleTotpCodeChange}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isPending || code.length < 6}>
          {isPending ? "Verificando..." : "Activar y continuar"}
        </Button>
        <Button type="button" variant="ghost" className="w-full" disabled={isPending} onClick={goToOnboarding}>
          Omitir y continuar
        </Button>
      </form>
    </div>
  );
}
