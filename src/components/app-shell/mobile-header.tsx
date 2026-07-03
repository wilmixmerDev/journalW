"use client";

import Link from "next/link";
import { LogOut, Shield } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { JournalSwitch } from "@/components/app-shell/journal-switch";
import { signOut } from "@/app/(app)/actions";

interface MobileHeaderProps {
  email: string | null;
  isAdmin: boolean;
}

export function MobileHeader({ email, isAdmin }: MobileHeaderProps) {
  const initials = (email ?? "JW").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-ink">
          <span className="size-3 rounded-full border-[1.5px] border-bg" />
        </span>
        <span className="font-serif text-lg text-ink">Journal W</span>
      </div>

      <div className="w-32">
        <JournalSwitch />
      </div>

      <div className="flex items-center gap-0.5">
        <ThemeToggle />
        {isAdmin ? (
          <Button
            render={<Link href="/admin" />}
            nativeButton={false}
            variant="ghost"
            size="icon"
            aria-label="Administración"
          >
            <Shield className="size-4" />
          </Button>
        ) : null}
        <Avatar className="size-8">
          <AvatarFallback className="bg-surface-2 text-xs">{initials}</AvatarFallback>
        </Avatar>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cerrar sesión"
          onClick={() => signOut()}
          className="text-neg hover:bg-neg-soft hover:text-neg"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
