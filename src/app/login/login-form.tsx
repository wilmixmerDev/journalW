"use client";

import { useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { signInWithGoogle } from "./actions";
import { LoginShowcase, type MfaSetupCardProps } from "./login-showcase";

interface LoginFormProps {
  errorMessage?: string;
  notice?: string;
}

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

export function LoginForm({ errorMessage, notice: initialNotice }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isPending, setIsPending] = useState(false);
  const [isGooglePending, startGoogleTransition] = useTransition();
  const [error, setError] = useState<string | null>(errorMessage ?? null);
  const [notice, setNotice] = useState<string | null>(initialNotice ?? null);

  // Configuración de 2FA post-registro, mostrada dentro del panel de showcase.
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const isVerifyingRef = useRef(false);

  function switchMode(next: "login" | "signup") {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const supabase = createClient();

    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        setIsPending(false);
        return;
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        router.push("/login/mfa");
        return;
      }

      router.push("/dashboard");
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsPending(false);
      return;
    }

    if (data.session) {
      const enrolled = await enrollTotp();
      setIsPending(false);
      if (enrolled) setEnrollment(enrolled);
      return;
    }

    setNotice("confirm-email");
    setIsPending(false);
  }

  async function enrollTotp(): Promise<Enrollment | null> {
    const supabase = createClient();

    async function cleanUpUnverified() {
      const { data } = await supabase.auth.mfa.listFactors();
      for (const factor of data?.all ?? []) {
        if (factor.factor_type === "totp" && factor.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }
    }

    await cleanUpUnverified();
    let { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator",
    });

    if (enrollError?.message.includes("already exists")) {
      await cleanUpUnverified();
      ({ data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator",
      }));
    }

    if (enrollError || !data) {
      // Recae en la página de configuración independiente.
      window.location.href = "/login/setup-mfa";
      return null;
    }

    return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
  }

  async function verifyMfa(currentCode: string) {
    if (!enrollment || isVerifyingRef.current) return;
    isVerifyingRef.current = true;
    setIsVerifying(true);
    setMfaError(null);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code: currentCode,
    });

    if (verifyError) {
      setMfaError(verifyError.message);
      setIsVerifying(false);
      isVerifyingRef.current = false;
      return;
    }

    // Navegación completa para que el middleware reevalúe la sesión AAL2 recién creada.
    window.location.href = "/login/onboarding";
  }

  function handleMfaCodeChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setMfaCode(value);
    if (value.length === 6) {
      verifyMfa(value);
    }
  }

  async function abandonSignup() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setEnrollment(null);
    setMfaCode("");
    setMfaError(null);
    switchMode("login");
  }

  const mfaSetup: MfaSetupCardProps | null = enrollment
    ? {
        qrCode: enrollment.qrCode,
        secret: enrollment.secret,
        code: mfaCode,
        error: mfaError,
        isPending: isVerifying,
        onCodeChange: handleMfaCodeChange,
        onSubmit: (e) => {
          e.preventDefault();
          verifyMfa(mfaCode);
        },
      }
    : null;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <LoginShowcase mfaSetup={mfaSetup} />

      <div className="theme-force-light order-1 flex items-center justify-center bg-surface px-6 py-16 text-ink">
        {enrollment ? (
          <div className="w-full max-w-[360px] animate-fade-up">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-pos/30 bg-pos-soft px-3 py-1 text-xs font-semibold text-pos">
              <span className="size-1.5 rounded-full bg-pos" />
              Cuenta creada
            </div>
            <h2 className="mb-1.5 font-serif text-[32px] font-normal">Un último paso</h2>
            <p className="mb-6 text-sm text-ink-2">
              Por seguridad, Journal W requiere una app autenticadora (Google Authenticator, Authy...).
              <span className="hidden lg:inline"> Escanea el código QR del panel derecho y escribe el código de 6 dígitos.</span>
            </p>

            {/* On mobile the dark showcase panel doesn't exist, so the QR card renders here. */}
            <div className="mb-6 lg:hidden">
              <div className="space-y-3 rounded-xl border border-line bg-bg p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={enrollment.qrCode} alt="Código QR para activar 2FA" className="mx-auto size-40 rounded-lg bg-white p-2" />
                <p className="rounded-md border border-line bg-surface-2 px-3 py-2 text-center font-mono text-xs break-all text-ink-2">
                  {enrollment.secret}
                </p>
                {mfaError ? (
                  <p className="rounded-md border border-neg/30 bg-neg-soft px-3 py-2 text-xs text-neg">{mfaError}</p>
                ) : null}
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="Código de 6 dígitos"
                  value={mfaCode}
                  onChange={handleMfaCodeChange}
                  aria-invalid={Boolean(mfaError)}
                />
              </div>
            </div>

            <Button type="button" variant="ghost" className="w-full" disabled={isVerifying} onClick={abandonSignup}>
              ← Volver al inicio de sesión
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-[360px]">
            <h2 className="animate-auth-up mb-1.5 font-serif text-[32px] font-normal" style={{ animationDelay: "0.02s" }}>
              {mode === "login" ? "Bienvenido de vuelta" : "Crea tu cuenta"}
            </h2>
            <p className="animate-auth-up mb-8 text-sm text-ink-2" style={{ animationDelay: "0.1s" }}>
              {mode === "login"
                ? "Inicia sesión para continuar registrando tus operaciones."
                : "Empieza a registrar y analizar tu operativa hoy mismo."}
            </p>

            {error ? (
              <div className="mb-6 rounded-lg border border-neg/30 bg-neg-soft px-4 py-3 text-sm text-neg">{error}</div>
            ) : null}
            {notice === "confirm-email" ? (
              <div className="mb-6 rounded-lg border border-gold/30 bg-gold-soft px-4 py-3 text-sm text-gold">
                Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4" key={mode}>
              <div className="animate-auth-up space-y-1.5" style={{ animationDelay: "0.14s" }}>
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@correo.com"
                  required
                  autoComplete="email"
                  aria-invalid={Boolean(error)}
                />
              </div>
              <div className="animate-auth-up space-y-1.5" style={{ animationDelay: "0.18s" }}>
                <Label htmlFor="password">Contraseña</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  aria-invalid={Boolean(error)}
                />
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="login-shimmer animate-auth-up h-auto w-full py-3 text-sm"
                style={{ animationDelay: "0.22s" }}
              >
                {isPending ? "Procesando..." : mode === "login" ? "Entrar al journal →" : "Crear cuenta →"}
              </Button>
            </form>

            <div className="animate-auth-up my-5.5 flex items-center gap-3 text-xs text-ink-3" style={{ animationDelay: "0.26s" }}>
              <div className="h-px flex-1 bg-line" />o<div className="h-px flex-1 bg-line" />
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={isGooglePending}
              onClick={() => startGoogleTransition(() => signInWithGoogle())}
              className="animate-auth-up h-auto w-full gap-2 py-3 text-sm"
              style={{ animationDelay: "0.3s" }}
            >
              <GoogleIcon className="size-4" />
              {mode === "login" ? "Continuar con Google" : "Registrarse con Google"}
            </Button>

            <p className="animate-auth-up mt-6.5 text-center text-[13px] text-ink-3" style={{ animationDelay: "0.34s" }}>
              {mode === "login" ? (
                <>
                  ¿Nuevo aquí?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="font-semibold text-ink underline-offset-4 hover:underline"
                  >
                    Crea tu cuenta
                  </button>
                </>
              ) : (
                <>
                  ¿Ya tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-semibold text-ink underline-offset-4 hover:underline"
                  >
                    Inicia sesión
                  </button>
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.54-5.17 3.54-8.65z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.75-2.1-6.69-4.93H1.3v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.31 14.32c-.24-.72-.38-1.49-.38-2.32s.14-1.6.38-2.32V6.59H1.3A11.95 11.95 0 0 0 0 12c0 1.93.46 3.76 1.3 5.41z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.3 6.59l4.01 3.09c.94-2.83 3.58-4.93 6.69-4.93z"
      />
    </svg>
  );
}
