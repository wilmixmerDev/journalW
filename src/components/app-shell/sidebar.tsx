"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ListChecks,
  BarChart3,
  CalendarDays,
  Plus,
  LogOut,
  Shield,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  displayName: string | null;
  isDemo: boolean;
  isAdmin: boolean;
}

export function Sidebar({ email, displayName, isDemo, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const openNewTrade = useUIStore((s) => s.openNewTrade);
  const initials = (displayName ?? email ?? "JW")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
        {NAV_ITEMS.map(({ href, label, icon }) => (
          <NavLink key={href} href={href} label={label} icon={icon} pathname={pathname} />
        ))}

        <div className="my-2 border-t border-line" />
        <NavLink href="/settings" label="Configuración" icon={Settings} pathname={pathname} />
        {isAdmin ? (
          <NavLink href="/admin" label="Administración" icon={Shield} pathname={pathname} />
        ) : null}
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
          <Avatar className="size-8">
            <AvatarFallback className="bg-surface-2 text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-1 flex-col">
            {displayName ? (
              <span className="truncate text-xs font-medium text-ink">{displayName}</span>
            ) : null}
            <span className="truncate text-[11px] text-ink-3">{email ?? "Cuenta demo"}</span>
          </span>
          <ThemeToggle />
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
      </div>
    </aside>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  pathname: string;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "text-bg" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
      )}
    >
      {active ? (
        <motion.span
          layoutId="sidebar-active-pill"
          className="absolute inset-0 -z-10 rounded-lg bg-ink"
          transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
        />
      ) : null}
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
