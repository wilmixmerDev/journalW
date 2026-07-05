"use client";

import Link from "next/link";
import { LogOut, Shield, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { JournalSwitch } from "@/components/app-shell/journal-switch";
import { signOut } from "@/app/(app)/actions";

interface MobileHeaderProps {
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
}

export function MobileHeader({ email, displayName, isAdmin }: MobileHeaderProps) {
  const initials = (displayName ?? email ?? "JW")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex items-center gap-2">
        <BrandMark className="size-7" />
        <span className="font-serif text-lg text-ink">Journal W</span>
      </div>

      <div className="w-32">
        <JournalSwitch />
      </div>

      <div className="flex items-center gap-0.5">
        <ThemeToggle />
        <Button
          render={<Link href="/settings" />}
          nativeButton={false}
          variant="ghost"
          size="icon"
          aria-label="Configuración"
        >
          <Settings className="size-4" />
        </Button>
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
