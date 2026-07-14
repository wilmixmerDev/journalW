import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type NoticeVariant = "success" | "error" | "warning" | "info";

const VARIANT_STYLES: Record<NoticeVariant, { border: string; bg: string; text: string; icon: LucideIcon }> = {
  success: { border: "border-pos/30", bg: "bg-pos-soft", text: "text-pos", icon: CircleCheckIcon },
  error: { border: "border-neg/30", bg: "bg-neg-soft", text: "text-neg", icon: OctagonXIcon },
  warning: { border: "border-gold/30", bg: "bg-gold-soft", text: "text-gold", icon: TriangleAlertIcon },
  info: { border: "border-line", bg: "bg-surface-2", text: "text-ink", icon: InfoIcon },
};

interface NoticeProps {
  variant: NoticeVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/** Banner en línea reutilizable para toda la app — mismo lenguaje visual que los toasts y el aviso de Live/Backtest. */
export function Notice({ variant, title, children, className }: NoticeProps) {
  const { border, bg, text, icon: Icon } = VARIANT_STYLES[variant];

  return (
    <div className={cn("flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm", border, bg, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", text)} />
      <div className="min-w-0">
        {title ? <p className={cn("font-medium", text)}>{title}</p> : null}
        <div className={cn(title ? "text-ink-2" : text, "text-[13px] leading-snug")}>{children}</div>
      </div>
    </div>
  );
}
