"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { EmailOtpChallenge } from "@/components/mfa/email-otp-challenge";
import { sendAuthEmailOtp, verifyAuthEmailOtp } from "@/app/login/actions";

interface MfaFormProps {
  totpFactorId: string | null;
  email: string;
}

type Method = "choose" | "totp" | "email";

export function MfaForm({ totpFactorId, email }: MfaFormProps) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>(totpFactorId ? "choose" : "email");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const isVerifyingRef = useRef(false);

  function goToDashboard() {
    router.push("/dashboard");
    router.refresh();
  }

  async function verifyTotp(currentCode: string) {
    if (isVerifyingRef.current || !totpFactorId) return;
    isVerifyingRef.current = true;
    setIsPending(true);
    setError(null);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: totpFactorId,
      code: currentCode,
    });

    if (verifyError) {
      setError(verifyError.message);
      setIsPending(false);
      isVerifyingRef.current = false;
      setCode("");
      return;
    }

    goToDashboard();
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

  async function chooseEmail() {
    setError(null);
    const { error: sendError } = await sendAuthEmailOtp("login");
    if (sendError) {
      setError(sendError);
      return;
    }
    setMethod("email");
  }

  async function handleGoBack() {
    // Abandona el login a medias (sesión AAL1) y vuelve a /login.
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <h1 className="font-serif text-4xl text-ink">Verificación en dos pasos</h1>

      {method === "choose" ? (
        <>
          <p className="mt-2 text-sm text-ink-2">Elige cómo quieres verificar tu identidad.</p>
          {error ? (
            <div className="mt-6 rounded-lg border border-neg/30 bg-neg-soft px-4 py-3 text-sm text-neg">{error}</div>
          ) : null}
          <div className="mt-8 space-y-2">
            <Button type="button" className="w-full" onClick={chooseEmail}>
              Código por correo
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => setMethod("totp")}>
              App autenticadora
            </Button>
          </div>
        </>
      ) : method === "totp" ? (
        <>
          <p className="mt-2 text-sm text-ink-2">Ingresa el código de tu app autenticadora.</p>
          {error ? (
            <div className="mt-6 rounded-lg border border-neg/30 bg-neg-soft px-4 py-3 text-sm text-neg">{error}</div>
          ) : null}
          <form onSubmit={handleTotpSubmit} className="mt-8 space-y-4">
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
              {isPending ? "Verificando..." : "Verificar"}
            </Button>
          </form>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-2">Ingresa el código que te enviamos por correo.</p>
          <div className="mt-8">
            <EmailOtpChallenge
              email={email}
              onVerify={(otp) => verifyAuthEmailOtp(otp, "login")}
              onResend={() => sendAuthEmailOtp("login")}
              onVerified={goToDashboard}
            />
          </div>
        </>
      )}

      {totpFactorId && method !== "choose" ? (
        <Button type="button" variant="ghost" className="mt-2 w-full" onClick={() => setMethod("choose")}>
          ← Elegir otro método
        </Button>
      ) : null}

      <Button type="button" variant="ghost" className="mt-2 w-full" disabled={isPending} onClick={handleGoBack}>
        ← Volver al inicio de sesión
      </Button>
    </div>
  );
}
