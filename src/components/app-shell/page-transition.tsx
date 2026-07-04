"use client";

import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

/** Remounts on every route change (via `key`) so the fade-up animation replays. */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="animate-fade-up">
      {children}
    </div>
  );
}
