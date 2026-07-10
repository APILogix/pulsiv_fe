import { Badge } from "@/components/ui/badge";
import { Info, AlertTriangle, AlertOctagon, Bomb } from "lucide-react";

export type Severity = "info" | "warning" | "error" | "critical";

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

const config = {
  info: {
    icon: Info,
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  },
  warning: {
    icon: AlertTriangle,
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  },
  error: {
    icon: AlertOctagon,
    className: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  },
  critical: {
    icon: Bomb,
    className: "bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
  },
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const { icon: Icon, className: colorClass } = config[severity] || config.info;
  
  return (
    <Badge variant="outline" className={`gap-1 pr-2 uppercase text-[10px] tracking-wider font-semibold ${colorClass} ${className}`}>
      <Icon className="w-3 h-3" />
      {severity}
    </Badge>
  );
}
