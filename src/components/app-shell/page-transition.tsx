"use client";

import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Remounts (via `key`) on every route change so the fade-up entrance
 * animation reliably replays, instead of relying on Next.js's internal
 * reuse/streaming behavior to happen to remount the subtree.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="animate-fade-up">
      {children}
    </div>
  );
}
