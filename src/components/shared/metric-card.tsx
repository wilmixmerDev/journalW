import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "pos" | "neg" | "gold" | "default";
  className?: string;
}

export function MetricCard({ label, value, hint, tone = "default", className }: MetricCardProps) {
  return (
    <Card className={cn("border-line bg-surface", className)}>
      <CardContent className="space-y-1 p-5">
        <p className="text-xs font-medium text-ink-3">{label}</p>
        <p
          className={cn(
            "font-mono text-2xl tracking-tight",
            tone === "pos" && "text-pos",
            tone === "neg" && "text-neg",
            tone === "gold" && "text-gold",
            tone === "default" && "text-ink"
          )}
        >
          {value}
        </p>
        {hint ? <p className="text-xs text-ink-3">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
