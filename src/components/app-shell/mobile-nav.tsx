"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  BarChart3,
  CalendarDays,
  Plus,
  Ellipsis,
  Shield,
  Settings,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";

const PRIMARY_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Operaciones", icon: ListChecks },
  { href: "/analytics", label: "Analíticas", icon: BarChart3 },
];

interface MobileNavProps {
  isAdmin: boolean;
}

export function MobileNav({ isAdmin }: MobileNavProps) {
  const pathname = usePathname();
  const openNewTrade = useUIStore((s) => s.openNewTrade);
  const [moreOpen, setMoreOpen] = useState(false);

  // Todo lo que no cabe en la barra vive aquí — las secciones nuevas se agregan a esta lista, no a la barra.
  const moreItems = [
    { href: "/calendar", label: "Calendario", icon: CalendarDays },
    ...(isAdmin ? [{ href: "/admin", label: "Administración", icon: Shield }] : []),
    { href: "/settings", label: "Configuración", icon: Settings },
  ];
  const moreActive = moreItems.some((item) => pathname.startsWith(item.href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-surface/95 px-2 py-2 backdrop-blur lg:hidden">
      {PRIMARY_ITEMS.slice(0, 2).map(({ href, label, icon: Icon }) => (
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

      {PRIMARY_ITEMS.slice(2).map(({ href, label, icon: Icon }) => (
        <NavLink key={href} href={href} label={label} Icon={Icon} active={pathname.startsWith(href)} />
      ))}

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium",
                moreActive ? "text-ink" : "text-ink-3"
              )}
            >
              <Ellipsis className="size-5" />
              Más
            </button>
          }
        />
        <SheetContent side="bottom" className="rounded-t-2xl border-line bg-surface pb-8">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />
          <SheetHeader className="pb-0">
            <SheetTitle className="font-serif text-lg font-normal text-ink">Más opciones</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 px-4">
            {moreItems.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border px-2 py-4 text-center text-xs font-medium transition-colors",
                    active
                      ? "border-transparent bg-ink text-bg"
                      : "border-line bg-surface-2/60 text-ink-2 hover:text-ink"
                  )}
                >
                  <Icon className="size-5" />
                  {label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
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
