"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signInWithGoogle, signInWithPassword, signUpWithPassword } from "./actions";

interface LoginFormProps {
  errorMessage?: string;
  notice?: string;
}

export function LoginForm({ errorMessage, notice }: LoginFormProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      if (mode === "login") {
        signInWithPassword(formData);
      } else {
        signUpWithPassword(formData);
      }
    });
  }

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <h1 className="font-serif text-4xl text-ink">
        {mode === "login" ? "Bienvenido de vuelta" : "Crea tu cuenta"}
      </h1>
      <p className="mt-2 text-sm text-ink-2">
        {mode === "login"
          ? "Inicia sesión para continuar registrando tus operaciones."
          : "Empieza a registrar y analizar tu operativa hoy mismo."}
      </p>

      {errorMessage ? (
        <div className="mt-6 rounded-lg border border-neg/30 bg-neg-soft px-4 py-3 text-sm text-neg">
          {errorMessage}
        </div>
      ) : null}
      {notice === "confirm-email" ? (
        <div className="mt-6 rounded-lg border border-gold/30 bg-gold-soft px-4 py-3 text-sm text-gold">
          Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.
        </div>
      ) : null}

      <form action={handleSubmit} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" name="email" type="email" placeholder="tu@correo.com" required autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" placeholder="••••••••" required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending
            ? "Procesando..."
            : mode === "login"
              ? "Iniciar sesión"
              : "Crear cuenta"}
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <Separator />
        <span className="text-xs text-ink-3">o</span>
        <Separator />
      </div>

      <Button
        type="button"
        variant="outline"
        className="mt-6 w-full"
        disabled={isGooglePending}
        onClick={() => startGoogleTransition(() => signInWithGoogle())}
      >
        <GoogleIcon className="size-4" />
        Continuar con Google
      </Button>

      <p className="mt-8 text-center text-sm text-ink-2">
        {mode === "login" ? (
          <>
            ¿Nuevo aquí?{" "}
            <button type="button" onClick={() => setMode("signup")} className="font-medium text-ink underline-offset-4 hover:underline">
              Crea tu cuenta
            </button>
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{" "}
            <button type="button" onClick={() => setMode("login")} className="font-medium text-ink underline-offset-4 hover:underline">
              Inicia sesión
            </button>
          </>
        )}
      </p>
    </div>
  );
}

function Separator() {
  return <div className="h-px flex-1 bg-line" />;
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
