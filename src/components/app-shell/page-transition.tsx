"use client";

import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

/** Se remonta en cada cambio de ruta (vía `key`) para que la animación fade-up se repita. */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="animate-fade-up">
      {children}
    </div>
  );
}
