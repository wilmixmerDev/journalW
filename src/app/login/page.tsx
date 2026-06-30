import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión — Journal W",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; notice?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, notice } = await searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16">
        <LoginForm errorMessage={error} notice={notice} />
      </div>

      <div className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(154,123,63,0.35), transparent 45%), radial-gradient(circle at 80% 70%, rgba(47,125,84,0.25), transparent 50%)",
          }}
        />
        <div className="relative flex items-center gap-2 text-bg">
          <span className="flex size-8 items-center justify-center rounded-md bg-gold font-serif text-lg text-ink">
            W
          </span>
          <span className="font-serif text-xl">Journal W</span>
        </div>

        <div className="relative max-w-md">
          <p className="font-serif text-3xl leading-snug text-bg">
            “La disciplina es el puente entre tus metas y tus resultados.”
          </p>
          <p className="mt-4 text-sm text-bg/60">
            Registra cada operación, mide tu desempeño real y construye un proceso que
            puedas repetir con confianza.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-6 text-bg/70">
          <div>
            <p className="font-mono text-2xl text-bg">+2.4R</p>
            <p className="text-xs">Expectancy media</p>
          </div>
          <div>
            <p className="font-mono text-2xl text-bg">68%</p>
            <p className="text-xs">Win rate</p>
          </div>
          <div>
            <p className="font-mono text-2xl text-bg">1.9</p>
            <p className="text-xs">Profit factor</p>
          </div>
        </div>
      </div>
    </div>
  );
}
