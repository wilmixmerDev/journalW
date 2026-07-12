"use client";

import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { JournalSwitch } from "@/components/app-shell/journal-switch";
import { signOut } from "@/app/(app)/actions";

interface MobileHeaderProps {
  email: string | null;
  displayName: string | null;
}

export function MobileHeader({ email, displayName }: MobileHeaderProps) {
  const initials = (displayName ?? email ?? "JW")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
      <BrandMark className="size-8 shrink-0" />

      <div className="w-36">
        <JournalSwitch />
      </div>

      <div className="flex items-center gap-1.5">
        <ThemeToggle />

        {/* Todas las acciones de cuenta viven en este menú: el header no crece aunque se agreguen más. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button type="button" aria-label="Menú de cuenta" className="rounded-full">
                <Avatar className="size-8 border border-line">
                  <AvatarFallback className="bg-surface-2 text-xs">{initials}</AvatarFallback>
                </Avatar>
              </button>
            }
          />
          <DropdownMenuContent align="end" sideOffset={8} className="min-w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span className="block truncate text-sm font-medium text-ink">{displayName ?? "Mi cuenta"}</span>
                {email ? <span className="block truncate text-xs font-normal text-ink-3">{email}</span> : null}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
              <LogOut />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
