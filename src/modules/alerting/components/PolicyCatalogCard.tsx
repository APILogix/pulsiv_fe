import type { OrganizationAlertPolicy, AlertSeverity } from "../api/types";
import {
  Activity,
  Cpu,
  Lock,
  ArrowRight,
  Layers,
  Clock,
  Code,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  ExternalLink,
  Zap,
  Flame,
  Database,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PolicyCatalogCardProps {
  policy: OrganizationAlertPolicy;
  isSubscribed?: boolean;
  onSubscribe?: (policy: OrganizationAlertPolicy) => void;
  onViewDetails?: (policy: OrganizationAlertPolicy) => void;
  onEdit?: (policy: OrganizationAlertPolicy) => void;
}

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; style: string }> = {
  performance: {
    icon: <Activity className="size-3.5 text-blue-400 shrink-0" />,
    style: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  },
  errors: {
    icon: <Flame className="size-3.5 text-rose-400 shrink-0" />,
    style: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  },
  availability: {
    icon: <Zap className="size-3.5 text-emerald-400 shrink-0" />,
    style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  infrastructure: {
    icon: <Cpu className="size-3.5 text-amber-400 shrink-0" />,
    style: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  security: {
    icon: <Lock className="size-3.5 text-red-400 shrink-0" />,
    style: "bg-red-500/10 text-red-400 border-red-500/30",
  },
  database: {
    icon: <Database className="size-3.5 text-violet-400 shrink-0" />,
    style: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  },
  custom: {
    icon: <Layers className="size-3.5 text-brand shrink-0" />,
    style: "bg-[var(--brand)]/10 text-[var(--brand)] border-[var(--brand)]/30",
  },
};

const SEVERITY_CONFIG: Record<AlertSeverity, { icon: React.ReactNode; style: string }> = {
  info: {
    icon: <Info className="size-3 text-sky-400 shrink-0" />,
    style: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  },
  warning: {
    icon: <AlertTriangle className="size-3 text-amber-400 shrink-0" />,
    style: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  error: {
    icon: <AlertTriangle className="size-3 text-orange-400 shrink-0" />,
    style: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  },
  critical: {
    icon: <AlertOctagon className="size-3 text-rose-400 shrink-0" />,
    style: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  },
};

export const PolicyCatalogCard: React.FC<PolicyCatalogCardProps> = ({
  policy,
  isSubscribed,
  onSubscribe,
  onViewDetails,
  onEdit,
}) => {
  const catKey = policy.category?.toLowerCase() || "custom";
  const catConf = CATEGORY_CONFIG[catKey] ?? CATEGORY_CONFIG.custom;
  const sevConf = SEVERITY_CONFIG[policy.severity] ?? SEVERITY_CONFIG.warning;

  return (
    <div className="group relative flex flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4.5 transition-all duration-200 hover:border-[var(--brand)]/40 hover:bg-[var(--bg2)] hover:shadow-lg">
      <div>
        {/* Top Bar: Title + Badges */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg2)] group-hover:border-[var(--brand)]/40">
              {catConf.icon}
            </div>
            <div className="min-w-0">
              <h4 className="truncate text-[13px] font-semibold text-[var(--text)] group-hover:text-[var(--brand)] transition-colors">
                {policy.name}
              </h4>
              <div className="inline-flex items-center gap-1 font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
                <Code className="size-3 shrink-0" />
                <span className="truncate">{policy.slug}</span>
                {policy.version && (
                  <span className="rounded bg-[var(--bg3)] px-1 py-0.2 text-[10px]">v{policy.version}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-semibold capitalize", catConf.style)}>
              {policy.category}
            </span>
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-semibold capitalize", sevConf.style)}>
              {sevConf.icon}
              {policy.severity}
            </span>
          </div>
        </div>

        {/* Documentation / Description */}
        <p className="text-[12px] leading-relaxed text-[var(--text2)] line-clamp-2 mb-3.5">
          {policy.documentation || policy.description || `Evaluates ${policy.metricSource} telemetry against defined thresholds.`}
        </p>

        {/* Metric Source & Expression Grid */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-2.5 mb-3.5 space-y-1.5 font-[family-name:var(--mono)] text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[var(--text3)] uppercase text-[10px] tracking-wider font-medium">
              <Terminal className="size-3 shrink-0" /> Metric
            </span>
            <span className="truncate font-medium text-[var(--brand)]">{policy.metricSource}</span>
          </div>
          {policy.expression && (
            <div className="flex items-center justify-between gap-2 border-t border-[var(--border)]/50 pt-1.5">
              <span className="inline-flex items-center gap-1 text-[var(--text3)] uppercase text-[10px] tracking-wider font-medium">
                <Sliders className="size-3 shrink-0" /> Condition
              </span>
              <span className="truncate text-[var(--text)]">{policy.expression}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info & Action Bar */}
      <div className="flex items-center justify-between border-t border-[var(--border)]/70 pt-3 text-[11px]">
        <div className="inline-flex items-center gap-1.5 text-[var(--text3)] font-[family-name:var(--mono)]">
          <Clock className="size-3.5 shrink-0 text-[var(--text3)]" />
          <span>Cooldown: {policy.cooldownSeconds}s</span>
        </div>

        <div className="flex items-center gap-2">
          {onViewDetails && (
            <button
              type="button"
              onClick={() => onViewDetails(policy)}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium text-[var(--text2)] transition-colors hover:bg-[var(--bg2)] hover:text-[var(--text)] cursor-pointer"
            >
              <ExternalLink className="size-3.5 shrink-0" />
              <span>Details</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(policy)}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium text-[var(--brand)] transition-colors hover:bg-[var(--brand)]/10 cursor-pointer"
            >
              <span>Edit</span>
            </button>
          )}

          {onSubscribe && (
            <button
              type="button"
              onClick={() => onSubscribe(policy)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[12px] font-medium transition-colors cursor-pointer",
                isSubscribed
                  ? "border-[var(--green)]/30 bg-[var(--green-bg)] text-[var(--green)] cursor-default"
                  : "border-[var(--brand)] bg-[var(--brand)] text-[var(--bg)] hover:opacity-90 shadow-xs"
              )}
            >
              {isSubscribed ? (
                <>
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  <span>Subscribed</span>
                </>
              ) : (
                <>
                  <span>Subscribe</span>
                  <ArrowRight className="size-3.5 shrink-0" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
