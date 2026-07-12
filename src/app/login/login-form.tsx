"use client";

import { useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthMeter, isPasswordStrongEnough } from "@/components/ui/password-strength";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { EmailOtpChallenge } from "@/components/mfa/email-otp-challenge";
import { enrollTotp, type TotpEnrollment } from "@/lib/mfa/enroll-totp";
import { signInWithGoogle, sendAuthEmailOtp, verifyAuthEmailOtp, checkAuthEmailOtpVerified } from "./actions";
import { LoginShowcase, type MfaSetupCardProps } from "./login-showcase";

type SignupStage = "credentials" | "email-otp" | "totp-offer" | "totp-enroll";

interface LoginFormProps {
  errorMessage?: string;
  notice?: string;
}

export function LoginForm({ errorMessage, notice: initialNotice }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isPending, setIsPending] = useState(false);
  const [isGooglePending, startGoogleTransition] = useTransition();
  const [error, setError] = useState<string | null>(errorMessage ?? null);
  const [notice, setNotice] = useState<string | null>(initialNotice ?? null);

  // Post-registro: correo obligatorio primero, autenticador opcional después (mostrado en el panel de showcase).
  const [signupStage, setSignupStage] = useState<SignupStage>("credentials");
  const [signupEmail, setSignupEmail] = useState("");
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [signupStopped, setSignupStopped] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const isVerifyingRef = useRef(false);

  function switchMode(next: "login" | "signup") {
    setMode(next);
    setError(null);
    setNotice(null);
    setPasswordValue("");
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

      // El middleware decide si hace falta pasar por /login/mfa (TOTP y/o correo) antes del dashboard.
      router.push("/dashboard");
      router.refresh();
      return;
    }

    if (!isPasswordStrongEnough(password)) {
      setError("La contraseña no es lo suficientemente segura. Revisa los requisitos de abajo.");
      setIsPending(false);
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
      const { error: otpError } = await sendAuthEmailOtp("enroll");
      setIsPending(false);
      if (otpError) {
        setError(otpError);
        return;
      }
      setSignupEmail(email);
      setSignupStage("email-otp");
      return;
    }

    setNotice("confirm-email");
    setIsPending(false);
  }

  async function handleEmailOtpVerified() {
    setSignupStage("totp-offer");
  }

  async function handleActivateTotp() {
    const enrolled = await enrollTotp(createClient());
    if (enrolled) {
      setEnrollment(enrolled);
      setSignupStage("totp-enroll");
    } else {
      // Recae en la página de configuración independiente.
      window.location.href = "/login/setup-mfa";
    }
  }

  function skipTotp() {
    // Navegación completa para que el middleware reevalúe la sesión ya verificada por correo.
    window.location.href = "/login/onboarding";
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
    setSignupStage("credentials");
    setSignupEmail("");
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
    <div className="grid min-h-screen grid-rows-[auto_1fr] lg:grid-cols-[1.05fr_.95fr] lg:grid-rows-1">
      <LoginShowcase mfaSetup={mfaSetup} />

      {/* Versión condensada del panel oscuro de escritorio, para que el login en móvil no pierda la identidad de marca. */}
      <div className="relative order-0 overflow-hidden bg-[#141210] px-6 pt-8 pb-9 text-[#EDE8DE] lg:hidden">
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(201,165,95,.18), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon-dark.svg" alt="" className="size-7 shrink-0" />
          <span className="font-serif text-lg tracking-tight">Journal W</span>
        </div>
        <div className="relative mt-5 font-mono text-[10px] tracking-[.18em] text-[#C9A55F] uppercase">
          Trading Journal
        </div>
        <p className="relative mt-1.5 font-serif text-[26px] leading-[1.15] tracking-tight">
          No registres trades. <span className="text-[#A39C8F] italic">Conviértete en mejor trader.</span>
        </p>
      </div>

      <div className="theme-force-light order-1 flex items-center justify-center bg-surface px-6 py-16 text-ink">
        {signupStage === "email-otp" ? (
          <div className="w-full max-w-[360px] animate-fade-up">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-pos/30 bg-pos-soft px-3 py-1 text-xs font-semibold text-pos">
              <span className="size-1.5 rounded-full bg-pos" />
              Cuenta creada
            </div>
            <h2 className="mb-1.5 font-serif text-[32px] font-normal">Verifica tu correo</h2>
            <p className="mb-6 text-sm text-ink-2">
              Por seguridad, Journal W requiere verificar tu correo antes de continuar.
            </p>
            <EmailOtpChallenge
              email={signupEmail}
              onVerify={(code) => verifyAuthEmailOtp(code, "enroll")}
              onResend={() => sendAuthEmailOtp("enroll")}
              onVerified={handleEmailOtpVerified}
              onCheckVerifiedElsewhere={() => checkAuthEmailOtpVerified("enroll")}
              onVerifiedElsewhere={() => setSignupStopped(true)}
            />
            {!signupStopped ? (
              <Button type="button" variant="ghost" className="mt-2 w-full" onClick={abandonSignup}>
                ← Volver al inicio de sesión
              </Button>
            ) : null}
          </div>
        ) : signupStage === "totp-offer" ? (
          <div className="w-full max-w-[360px] animate-fade-up">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-pos/30 bg-pos-soft px-3 py-1 text-xs font-semibold text-pos">
              <span className="size-1.5 rounded-full bg-pos" />
              Correo verificado
            </div>
            <h2 className="mb-1.5 font-serif text-[32px] font-normal">¿Inicio de sesión más rápido?</h2>
            <p className="mb-6 text-sm text-ink-2">
              Ya tienes 2FA por correo activo. Si quieres, activa también una app autenticadora
              (Google Authenticator, Authy...) para verificarte más rápido en cada inicio de sesión.
            </p>
            <div className="space-y-2">
              <Button type="button" className="w-full" onClick={handleActivateTotp}>
                Activar app autenticadora
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={skipTotp}>
                Ahora no
              </Button>
            </div>
          </div>
        ) : enrollment ? (
          <div className="w-full max-w-[360px] animate-fade-up">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-pos/30 bg-pos-soft px-3 py-1 text-xs font-semibold text-pos">
              <span className="size-1.5 rounded-full bg-pos" />
              Correo verificado
            </div>
            <h2 className="mb-1.5 font-serif text-[32px] font-normal">Activa tu autenticador</h2>
            <p className="mb-6 text-sm text-ink-2 lg:hidden">
              Escanea el código QR con tu app autenticadora (Google Authenticator, Authy...).
            </p>

            {/* En desktop el QR y el código van en el panel oscuro de la derecha; esto dirige la mirada hacia allá. */}
            <div className="mb-6 hidden animate-fade-up items-center gap-3 rounded-xl border border-gold/30 bg-gold-soft px-4 py-3 text-sm font-medium text-gold lg:flex">
              <span>Mira el panel de la derecha para escanear el código</span>
              <ArrowRight className="size-5 shrink-0 animate-nudge-right" />
            </div>

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

            <Button type="button" variant="ghost" className="w-full" disabled={isVerifying} onClick={skipTotp}>
              Omitir y continuar
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
                  minLength={mode === "signup" ? 8 : 6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  aria-invalid={Boolean(error)}
                  value={passwordValue}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPasswordValue(e.target.value)}
                />
                {mode === "signup" ? <PasswordStrengthMeter password={passwordValue} /> : null}
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
