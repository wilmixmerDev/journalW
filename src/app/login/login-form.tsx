"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { signInWithGoogle } from "./actions";
import { LoginShowcase } from "./login-showcase";

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

    const name = String(formData.get("name") ?? "").trim();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: name ? { full_name: name } : undefined,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsPending(false);
      return;
    }

    if (data.session) {
      router.push("/login/setup-mfa");
      return;
    }

    setNotice("confirm-email");
    setIsPending(false);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <LoginShowcase />

      <div className="theme-force-light order-1 flex items-center justify-center bg-surface px-6 py-16 text-ink">
        <div className="w-full max-w-[360px]">
          <div
            className="animate-auth-up mb-5.5 inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-bg py-1 pr-3 pl-2 text-[11.5px] font-semibold whitespace-nowrap text-ink-2"
            style={{ animationDelay: "0.02s" }}
          >
            <span className="size-1.5 rounded-full bg-gold" />
            Journal W · Pro
          </div>

          <h2 className="animate-auth-up mb-1.5 font-serif text-[32px] font-normal" style={{ animationDelay: "0.06s" }}>
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
            {mode === "signup" ? (
              <div className="animate-expand-field space-y-1.5 overflow-hidden">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" placeholder="Tu nombre" autoComplete="name" />
              </div>
            ) : null}

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
              <Input
                id="password"
                name="password"
                type="password"
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
