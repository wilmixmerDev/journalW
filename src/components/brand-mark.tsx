"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

/** El servidor no conoce el tema real (vive en localStorage); hasta montar en el cliente, se mantiene el ícono del server. */
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

interface BrandMarkProps {
  className?: string;
}

/** Isotipo de Journal W: caja oscura en tema claro, caja dorada en tema oscuro. */
export function BrandMark({ className }: BrandMarkProps) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const src = mounted && resolvedTheme === "dark" ? "/brand/icon-dark.svg" : "/brand/icon-light.svg";

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={cn("shrink-0", className)} />;
}
