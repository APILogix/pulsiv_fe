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

export function SeverityBadge({ severity, size }: { severity?: string | null; size?: string }) {
  if (!severity) return null;
  const s = severity.toLowerCase();
  let color = "var(--text2)";
  let bg = "var(--bg2)";
  let border = "var(--border)";
  let dot = "var(--text3)";

  if (s === "error" || s === "critical" || s === "fatal") {
    color = "var(--red)";
    bg = "var(--red-bg)";
    border = "var(--red-border)";
    dot = "var(--red)";
  } else if (s === "warning" || s === "warn") {
    color = "var(--amber)";
    bg = "var(--amber-bg)";
    border = "var(--amber-border)";
    dot = "var(--amber)";
  } else if (s === "info" || s === "debug") {
    color = "var(--blue)";
    bg = "var(--blue-bg)";
    border = "var(--blue-border)";
    dot = "var(--blue)";
  }

  // Border colour is intentionally dropped: a tint alone carries the state.
  void border;
  const py = size === "sm" ? "py-0" : "py-0.5";

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[4px] px-1.5 ${py} text-[11px] font-medium leading-[1.35]`}
      style={{ color, backgroundColor: bg }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: dot }} />
      <span className="inline-block first-letter:uppercase">{s}</span>
    </span>
  );
}

export function StatusCodeBadge({ code }: { code?: number | null }) {
  const safeCode = code ?? 0;
  const tone =
    safeCode >= 500 ? "bg-[var(--red-bg)] text-[var(--red)]"
    : safeCode >= 400 ? "bg-[var(--amber-bg)] text-[var(--amber)]"
    : safeCode >= 300 ? "bg-[var(--blue-bg)] text-[var(--blue)]"
    : safeCode >= 200 ? "bg-[var(--green-bg)] text-[var(--green)]"
    : "bg-[var(--bg3)] text-[var(--text3)]";
  return <span className={cn("inline-flex items-center rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium leading-[1.35] tabular-nums font-[family-name:var(--mono)]", tone)}>{safeCode > 0 ? safeCode : "—"}</span>;
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
    <span className={cn("inline-flex items-center rounded-[4px] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[11px] font-medium leading-[1.35]", METHOD_TONE[safeMethod] ?? "bg-[var(--bg3)] text-[var(--text2)]")}>
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
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium leading-[1.35]", STATUS_TONE[safeStatus] ?? "bg-[var(--bg3)] text-[var(--text2)]")}>
      <span className="size-1.5 rounded-full bg-current" />
      <span className="inline-block first-letter:uppercase">{safeStatus.replace(/[-_]/g, " ")}</span>
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
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[4px] bg-[var(--bg3)] px-1.5 py-0.5 text-[11px] font-medium leading-[1.35] text-[var(--text2)]">
      <Icon className={cn("size-3", entry.tone)} />
      <span className="inline-block first-letter:uppercase">{safeType.replace("_", " ")}</span>
    </span>
  );
}

/* Environment pill — reused across every observe table/card (traces, logs,
   requests, errors, metrics, profiling, crons, replay, …). Tone follows the
   same red=prod / amber=staging / blue=dev convention as the environments
   management page (see modules/projects/environment.constants.ts). */
const DEFAULT_ENVIRONMENT_TONE = { text: "var(--text2)", bg: "var(--bg3)", border: "var(--border2)" };

const ENVIRONMENT_TONE: Record<string, { text: string; bg: string; border: string }> = {
  production: { text: "#fb7185", bg: "rgba(251,113,133,0.10)", border: "rgba(251,113,133,0.32)" },
  pre_production: { text: "#f97316", bg: "rgba(249,115,22,0.10)", border: "rgba(249,115,22,0.30)" },
  staging: { text: "#f59e0b", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)" },
  pre_staging: { text: "#eab308", bg: "rgba(234,179,8,0.10)", border: "rgba(234,179,8,0.30)" },
  development: { text: "#60a5fa", bg: "rgba(96,165,250,0.11)", border: "rgba(96,165,250,0.32)" },
  testing: { text: "#a78bfa", bg: "rgba(167,139,250,0.11)", border: "rgba(167,139,250,0.32)" },
  preview: { text: "#22d3ee", bg: "rgba(34,211,238,0.10)", border: "rgba(34,211,238,0.30)" },
  pre_deployment: { text: "#2dd4bf", bg: "rgba(45,212,191,0.10)", border: "rgba(45,212,191,0.30)" },
  custom: { text: "#c084fc", bg: "rgba(192,132,252,0.10)", border: "rgba(192,132,252,0.30)" },
  unknown: DEFAULT_ENVIRONMENT_TONE,
};
export function EnvironmentBadge({ environment }: { environment?: string | null }) {
  const safeEnv = (environment ?? "unknown").toLowerCase().replace(/-/g, "_");
  const tone = ENVIRONMENT_TONE[safeEnv] ?? DEFAULT_ENVIRONMENT_TONE;
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium leading-[1.35]"
      style={{ backgroundColor: tone.bg, color: tone.text }}
    >
      <span className="size-1.5 rounded-full bg-current" />
      <span className="inline-block first-letter:uppercase">{safeEnv.replace(/_/g, " ")}</span>
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-2 flex items-center gap-1 text-[12px] text-[var(--text3)]">
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
        <h1 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.025em] text-[var(--text)]">{title}</h1>
        {description && <p className="mt-1.5 max-w-[72ch] text-[13px] leading-[1.6] text-[var(--text2)]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionCard({ title, description, action, children, className }: {
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]", className)}>
      {(title || description || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3.5">
          <div className="min-w-0">
            {title && <h3 className="truncate text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">{title}</h3>}
            {description && <p className="mt-0.5 text-[12px] text-[var(--text2)]">{description}</p>}
          </div>
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
  neutral: "text-[var(--text3)]",
};
export function KpiCard({ label, value, delta, trend = "neutral" }: {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  /** @deprecated KPI tiles carry no icon (design/dashboards/DESIGN.md). */
  icon?: LucideIcon;
}) {
  return (
    <div className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] px-5 py-4">
      <div className="truncate text-[12px] text-[var(--text2)]">{label}</div>
      <div className="mt-2.5 truncate font-[family-name:var(--mono)] text-[24px] font-medium leading-none tracking-[-0.02em] tabular-nums text-[var(--text)]">{value}</div>
      {delta && <div className={cn("mt-2 truncate font-[family-name:var(--mono)] text-[12px] tabular-nums", TREND_TONE[trend])}>{delta}</div>}
    </div>
  );
}

// Tiny inline sparkline (SVG, no deps).
export function MetricSparkline({ data, color = "var(--text2)", width = 120, height = 32 }: {
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

