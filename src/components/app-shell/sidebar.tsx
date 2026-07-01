"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, BarChart3, CalendarDays, Plus, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { useUIStore } from "@/store/ui-store";
import { signOut } from "@/app/(app)/actions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Operaciones", icon: ListChecks },
  { href: "/analytics", label: "Analíticas", icon: BarChart3 },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
];

interface SidebarProps {
  email: string | null;
  isDemo: boolean;
}

export function Sidebar({ email, isDemo }: SidebarProps) {
  const pathname = usePathname();
  const openNewTrade = useUIStore((s) => s.openNewTrade);
  const initials = (email ?? "JW").slice(0, 2).toUpperCase();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface lg:flex">
      <div className="flex items-center gap-2 px-6 py-6">
        <span className="flex size-8 items-center justify-center rounded-lg bg-ink">
          <span className="size-3.5 rounded-full border-2 border-bg" />
        </span>
        <span className="font-serif text-xl text-ink">Journal W</span>
      </div>

      <div className="px-4">
        <JournalSwitch />
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-1 px-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-ink text-bg"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {isDemo ? (
        <div className="mx-4 mb-4 rounded-lg border border-gold/30 bg-gold-soft px-3 py-2 text-xs text-gold">
          Modo demo con datos de ejemplo. Conecta Supabase para guardar tus operaciones reales.
        </div>
      ) : null}

      <div className="border-t border-line px-4 py-4 space-y-3">
        <Button onClick={openNewTrade} className="w-full gap-2">
          <Plus className="size-4" />
          Nueva operación
        </Button>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Cuenta" className="rounded-full outline-none">
              <Avatar className="size-8">
                <AvatarFallback className="bg-surface-2 text-xs">{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <div className="px-2 py-1.5 text-xs text-ink-3">{email ?? "Cuenta demo"}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => signOut()}
              >
                <LogOut className="size-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="flex-1 truncate text-xs text-ink-2">{email ?? "Cuenta demo"}</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
