"use client";

import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { JournalSwitch } from "@/components/app-shell/journal-switch";
import { signOut } from "@/app/(app)/actions";

interface MobileHeaderProps {
  email: string | null;
}

export function MobileHeader({ email }: MobileHeaderProps) {
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

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Cuenta" className="rounded-full outline-none">
            <Avatar className="size-8">
              <AvatarFallback className="bg-surface-2 text-xs">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5 text-xs text-ink-3">{email ?? "Cuenta demo"}</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
              <LogOut className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
