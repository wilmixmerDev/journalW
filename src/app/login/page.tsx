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

  return <LoginForm errorMessage={error} notice={notice} />;
}
