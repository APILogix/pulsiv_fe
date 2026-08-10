import { useState } from "react";
import { Link } from "react-router";
import type { LucideIcon } from "lucide-react";
import {
  Bug, Check, Copy, FileText, Gauge, Globe,
  Activity, ScrollText, GitBranch, Clock, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime, formatAbsoluteTime } from "./format";

// ── module-level constants (rules.md §1.2 — no inline objects in JSX) ──
const SEVERITY_STYLES: Record<string, string> = {
  debug: "bg-[var(--bg3)] text-[var(--text2)]",
  info: "bg-[var(--blue-bg)] text-[var(--blue)]",
  warning: "bg-[var(--amber-bg)] text-[var(--amber)]",
  warn: "bg-[var(--amber-bg)] text-[var(--amber)]",
  error: "bg-[var(--red-bg)] text-[var(--red)]",
  fatal: "bg-[var(--red-bg)] text-[var(--red)]",
  low: "bg-[var(--bg3)] text-[var(--text2)]",
  medium: "bg-[var(--amber-bg)] text-[var(--amber)]",
  high: "bg-[var(--red-bg)] text-[var(--red)]",
  critical: "bg-[var(--red-bg)] text-[var(--red)]",
  P1: "bg-[var(--red-bg)] text-[var(--red)]",
  P2: "bg-[var(--amber-bg)] text-[var(--amber)]",
  P3: "bg-[var(--blue-bg)] text-[var(--blue)]",
  P4: "bg-[var(--bg3)] text-[var(--text2)]",
};

export function SeverityBadge({ severity }: { severity?: string | null }) {
  const safeSev = severity ?? "info";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] font-[family-name:var(--mono)]", SEVERITY_STYLES[safeSev] ?? SEVERITY_STYLES.debug)}>
      {safeSev}
    </span>
  );
}

export function StatusCodeBadge({ code }: { code?: number | null }) {
  const safeCode = code ?? 0;
  const tone =
    safeCode >= 500 ? "bg-[var(--red-bg)] text-[var(--red)]"
    : safeCode >= 400 ? "bg-[var(--amber-bg)] text-[var(--amber)]"
    : safeCode >= 300 ? "bg-[var(--blue-bg)] text-[var(--blue)]"
    : "bg-[var(--green-bg)] text-[var(--green)]";
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums font-[family-name:var(--mono)]", tone)}>{safeCode}</span>;
}

/* §2.6 — method badges are a tinted background plus saturated text. */
const METHOD_TONE: Record<string, string> = {
  GET: "bg-[var(--blue-bg)] text-[var(--blue)]",
  POST: "bg-[var(--green-bg)] text-[var(--green)]",
  PUT: "bg-[var(--amber-bg)] text-[var(--amber)]",
  PATCH: "bg-[var(--amber-bg)] text-[var(--amber)]",
  DELETE: "bg-[var(--red-bg)] text-[var(--red)]",
};
export function MethodBadge({ method }: { method?: string | null }) {
  const safeMethod = method ?? "GET";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.08em]", METHOD_TONE[safeMethod] ?? "bg-[var(--bg3)] text-[var(--text2)]")}>
      {safeMethod}
    </span>
  );
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-[var(--green-bg)] text-[var(--green)]",
  healthy: "bg-[var(--green-bg)] text-[var(--green)]",
  ok: "bg-[var(--green-bg)] text-[var(--green)]",
  success: "bg-[var(--green-bg)] text-[var(--green)]",
  connected: "bg-[var(--green-bg)] text-[var(--green)]",
  compliant: "bg-[var(--green-bg)] text-[var(--green)]",
  paid: "bg-[var(--green-bg)] text-[var(--green)]",
  resolved: "bg-[var(--green-bg)] text-[var(--green)]",
  stable: "bg-[var(--green-bg)] text-[var(--green)]",
  approved: "bg-[var(--green-bg)] text-[var(--green)]",
  accepted: "bg-[var(--green-bg)] text-[var(--green)]",
  verified: "bg-[var(--green-bg)] text-[var(--green)]",
  open: "bg-[var(--red-bg)] text-[var(--red)]",
  failed: "bg-[var(--red-bg)] text-[var(--red)]",
  error: "bg-[var(--red-bg)] text-[var(--red)]",
  overdue: "bg-[var(--red-bg)] text-[var(--red)]",
  revoked: "bg-[var(--red-bg)] text-[var(--red)]",
  suspended: "bg-[var(--red-bg)] text-[var(--red)]",
  denied: "bg-[var(--red-bg)] text-[var(--red)]",
  regression: "bg-[var(--red-bg)] text-[var(--red)]",
  disconnected: "bg-[var(--red-bg)] text-[var(--red)]",
  degraded: "bg-[var(--amber-bg)] text-[var(--amber)]",
  investigating: "bg-[var(--amber-bg)] text-[var(--amber)]",
  pending: "bg-[var(--amber-bg)] text-[var(--amber)]",
  "in-progress": "bg-[var(--amber-bg)] text-[var(--amber)]",
  in_progress: "bg-[var(--amber-bg)] text-[var(--amber)]",
  invited: "bg-[var(--blue-bg)] text-[var(--blue)]",
  scheduled: "bg-[var(--blue-bg)] text-[var(--blue)]",
  archived: "bg-[var(--bg3)] text-[var(--text2)]",
  expired: "bg-[var(--bg3)] text-[var(--text2)]",
  "not-started": "bg-[var(--bg3)] text-[var(--text2)]",
};
export function StatusBadge({ status }: { status?: string | null }) {
  const safeStatus = status ?? "unknown";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.08em]", STATUS_TONE[safeStatus] ?? "bg-[var(--bg3)] text-[var(--text2)]")}>
      <span className="size-1.5 rounded-full bg-current" />
      {safeStatus.replace(/[-_]/g, " ")}
    </span>
  );
}

const EVENT_ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  error: { icon: Bug, tone: "text-[var(--red)]" },
  request: { icon: Globe, tone: "text-[var(--blue)]" },
  span: { icon: GitBranch, tone: "text-[var(--violet)]" },
  trace: { icon: GitBranch, tone: "text-[var(--violet)]" },
  metric: { icon: Gauge, tone: "text-[var(--blue)]" },
  log: { icon: ScrollText, tone: "text-[var(--text2)]" },
  profile: { icon: Activity, tone: "text-[var(--amber)]" },
  cron_checkin: { icon: Clock, tone: "text-[var(--green)]" },
  replay: { icon: FileText, tone: "text-[var(--blue)]" },
};
export function EventTypeBadge({ type }: { type?: string | null }) {
  const safeType = type ?? "log";
  const entry = EVENT_ICONS[safeType] ?? EVENT_ICONS.log;
  const Icon = entry.icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg2)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text2)]">
      <Icon className={cn("size-3", entry.tone)} />
      {safeType.replace("_", " ")}
    </span>
  );
}

/* Environment pill — reused across every observe table/card (traces, logs,
   requests, errors, metrics, profiling, crons, replay, …). Tone follows the
   same red=prod / amber=staging / blue=dev convention as the environments
   management page (see modules/projects/environment.constants.ts). */
const ENVIRONMENT_TONE: Record<string, string> = {
  production: "bg-[var(--red-bg)] text-[var(--red)]",
  pre_production: "bg-[var(--amber-bg)] text-[var(--amber)]",
  staging: "bg-[var(--amber-bg)] text-[var(--amber)]",
  pre_staging: "bg-[var(--amber-bg)] text-[var(--amber)]",
  development: "bg-[var(--blue-bg)] text-[var(--blue)]",
  testing: "bg-[var(--violet-bg)] text-[var(--violet)]",
  preview: "bg-[var(--violet-bg)] text-[var(--violet)]",
  pre_deployment: "bg-[var(--blue-bg)] text-[var(--blue)]",
};
export function EnvironmentBadge({ environment }: { environment?: string | null }) {
  const safeEnv = environment ?? "unknown";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] font-[family-name:var(--mono)]", ENVIRONMENT_TONE[safeEnv] ?? "bg-[var(--bg3)] text-[var(--text2)]")}>
      {safeEnv.replace(/_/g, " ")}
    </span>
  );
}

export function Timestamp({ value }: { value?: number | string | Date | null }) {
  const formattedAbs = formatAbsoluteTime(value);
  const formattedRel = formatRelativeTime(value);
  if (formattedAbs === "—" || formattedRel === "—") {
    return <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">—</span>;
  }
  return (
    <time title={formattedAbs} className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)] tabular-nums">
      {formattedRel}
    </time>
  );
}

export function CopyButton({ value, label, className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn("inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border2)] bg-transparent px-2 py-1 text-[12px] text-[var(--text2)] transition-colors hover:text-[var(--text)] hover:border-[var(--text3)]", className)}
    >
      {copied ? <Check className="size-3.5 text-[var(--green)]" /> : <Copy className="size-3.5" />}
      {label ?? (copied ? "Copied" : "Copy")}
    </button>
  );
}

export function MonospaceText({ value, className }: { value: string; className?: string }) {
  return <span className={cn("font-[family-name:var(--mono)] text-[12px] text-[var(--text2)] truncate", className)} title={value}>{value}</span>;
}

// ── layout primitives ──
export function PageHeader({ title, description, breadcrumbs, actions }: {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; to?: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-1.5 flex items-center gap-1 text-[12px] text-[var(--text3)]">
            {breadcrumbs.map((b, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <span key={b.label} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="size-3" />}
                  {b.to ? (
                    <Link to={b.to} className="cursor-pointer transition-colors hover:text-[var(--text2)] focus-visible:outline-none focus-visible:underline">
                      {b.label}
                    </Link>
                  ) : (
                    <span className={isLast ? "text-[var(--text2)]" : ""}>{b.label}</span>
                  )}
                </span>
              );
            })}
          </div>
        )}
        <h1 className="font-[family-name:var(--display)] text-[22px] font-semibold tracking-[-0.02em] text-[var(--text)]">{title}</h1>
        {description && <p className="mt-1 text-[13px] leading-[1.5] text-[var(--text2)]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionCard({ title, action, children, className }: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]", className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <h3 className="text-[14px] font-semibold text-[var(--text)]">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

// Fixed-height shell for list pages: header/filters stay pinned, only the
// table body inside scrolls. Height = viewport minus app header minus padding.
export function FillPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4", className)} style={{ height: "calc(100vh - var(--header-height) - 3rem)" }}>
      {children}
    </div>
  );
}

const TREND_TONE: Record<string, string> = {
  up: "text-[var(--green)]",
  down: "text-[var(--red)]",
  neutral: "text-[var(--text2)]",
};
export function KpiCard({ label, value, delta, trend = "neutral", icon: Icon }: {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4">
      <div className="flex items-center justify-between">
        <span className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">{label}</span>
        {Icon && <Icon className="size-4 text-[var(--text3)]" />}
      </div>
      <div className="mt-2 font-[family-name:var(--mono)] text-[26px] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums text-[var(--text)]">{value}</div>
      {delta && <div className={cn("mt-1 font-[family-name:var(--mono)] text-[11px] font-medium tabular-nums", TREND_TONE[trend])}>{delta}</div>}
    </div>
  );
}

// Tiny inline sparkline (SVG, no deps).
export function MetricSparkline({ data, color = "var(--brand)", width = 120, height = 32 }: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1 || 1);
  const points = data.map((d, i) => `${i * step},${height - ((d - min) / range) * height}`).join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LatencyBar({ value, max = 2000 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const tone = value > 1000 ? "var(--red)" : value > 500 ? "var(--amber)" : "var(--green)";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--bg3)]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone }} />
      </div>
      <span className="text-[12px] tabular-nums text-[var(--text2)]">{value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${value}ms`}</span>
    </div>
  );
}

