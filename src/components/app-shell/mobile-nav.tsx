"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, BarChart3, CalendarDays, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Operaciones", icon: ListChecks },
  { href: "/analytics", label: "Analíticas", icon: BarChart3 },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
];

export function MobileNav() {
  const pathname = usePathname();
  const openNewTrade = useUIStore((s) => s.openNewTrade);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-surface/95 px-2 py-2 backdrop-blur lg:hidden">
      {NAV_ITEMS.slice(0, 2).map(({ href, label, icon: Icon }) => (
        <NavLink key={href} href={href} label={label} Icon={Icon} active={pathname.startsWith(href)} />
      ))}

      <button
        type="button"
        onClick={openNewTrade}
        aria-label="Nueva operación"
        className="flex size-12 items-center justify-center rounded-full bg-ink text-bg shadow-lg"
      >
        <Plus className="size-5" />
      </button>

      {NAV_ITEMS.slice(2).map(({ href, label, icon: Icon }) => (
        <NavLink key={href} href={href} label={label} Icon={Icon} active={pathname.startsWith(href)} />
      ))}
    </nav>
  );
}

function NavLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium",
        active ? "text-ink" : "text-ink-3"
      )}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}
