import { Badge } from "@/components/ui/badge";
import { Info, AlertTriangle, AlertOctagon, Bomb } from "lucide-react";

/**
 * Severity badge — truth channel only (sentinel-design.md §2.2, §7).
 * info → --blue · warning → --amber · error → --red · critical → --red, solid.
 * Never uses the brand or AI channel.
 */
export type Severity = "info" | "warning" | "error" | "critical";

const config = {
  info: { icon: Info, variant: "info" as const, className: "" },
  warning: { icon: AlertTriangle, variant: "warning" as const, className: "" },
  error: { icon: AlertOctagon, variant: "destructive" as const, className: "" },
  critical: {
    icon: Bomb,
    variant: "destructive" as const,
    className: "bg-[var(--red)] text-white",
  },
};

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const { icon: Icon, variant, className: toneClass } = config[severity] || config.info;

  return (
    <Badge variant={variant} className={`gap-1 pr-2 ${toneClass} ${className ?? ""}`}>
      <Icon className="size-3" />
      {severity}
    </Badge>
  );
}
