import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertOctagon, AlertTriangle, Bug, Check, Copy, FileText, Gauge, Globe, Info,
  Timer, Activity, ScrollText, GitBranch, Clock, ChevronRight,
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

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-[5px] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide font-[family-name:var(--mono)]", SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.debug)}>
      {severity}
    </span>
  );
}

export function StatusCodeBadge({ code }: { code: number }) {
  const tone =
    code >= 500 ? "bg-[var(--red-bg)] text-[var(--red)]"
    : code >= 400 ? "bg-[var(--amber-bg)] text-[var(--amber)]"
    : code >= 300 ? "bg-[var(--blue-bg)] text-[var(--blue)]"
    : "bg-[var(--green-bg)] text-[var(--green)]";
  return <span className={cn("inline-flex items-center rounded-[5px] px-2 py-0.5 text-[11px] font-semibold font-[family-name:var(--mono)]", tone)}>{code}</span>;
}

const METHOD_TONE: Record<string, string> = {
  GET: "text-[var(--get)]",
  POST: "text-[var(--green)]",
  PUT: "text-[var(--amber)]",
  PATCH: "text-[var(--violet)]",
  DELETE: "text-[var(--red)]",
};
export function MethodBadge({ method }: { method: string }) {
  return <span className={cn("font-[family-name:var(--mono)] text-[11px] font-bold", METHOD_TONE[method] ?? "text-[var(--text2)]")}>{method}</span>;
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-[var(--green-bg)] text-[var(--green)]",
  healthy: "bg-[var(--green-bg)] text-[var(--green)]",
  ok: "bg-[var(--green-bg)] text-[var(--green)]",
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
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-[5px] px-2 py-0.5 text-[11px] font-medium capitalize", STATUS_TONE[status] ?? "bg-[var(--bg3)] text-[var(--text2)]")}>
      <span className="size-1.5 rounded-full bg-current" />
      {status.replace(/[-_]/g, " ")}
    </span>
  );
}

const EVENT_ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  error: { icon: Bug, tone: "text-[var(--red)]" },
  request: { icon: Globe, tone: "text-[var(--get)]" },
  span: { icon: GitBranch, tone: "text-[var(--violet)]" },
  trace: { icon: GitBranch, tone: "text-[var(--violet)]" },
  metric: { icon: Gauge, tone: "text-[var(--blue)]" },
  log: { icon: ScrollText, tone: "text-[var(--text2)]" },
  profile: { icon: Activity, tone: "text-[var(--amber)]" },
  cron_checkin: { icon: Clock, tone: "text-[var(--green)]" },
  replay: { icon: FileText, tone: "text-[var(--blue)]" },
};
export function EventTypeBadge({ type }: { type: string }) {
  const entry = EVENT_ICONS[type] ?? EVENT_ICONS.log;
  const Icon = entry.icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[5px] bg-[var(--bg2)] px-2 py-0.5 text-[11px] font-medium text-[var(--text2)]">
      <Icon className={cn("size-3", entry.tone)} />
      {type.replace("_", " ")}
    </span>
  );
}

export function Timestamp({ value }: { value: number }) {
  return (
    <time title={formatAbsoluteTime(value)} className="text-[var(--text2)] tabular-nums">
      {formatRelativeTime(value)}
    </time>
  );
}

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--bg2)] px-2 py-1 text-[12px] text-[var(--text2)] transition-colors hover:text-[var(--text)] hover:border-[var(--input)]"
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
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-1.5 flex items-center gap-1 text-[12px] text-[var(--text3)]">
            {breadcrumbs.map((b, i) => (
              <span key={b.label} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3" />}
                <span className={i === breadcrumbs.length - 1 ? "text-[var(--text2)]" : ""}>{b.label}</span>
              </span>
            ))}
          </div>
        )}
        <h1 className="text-2xl font-semibold text-[var(--text)]">{title}</h1>
        {description && <p className="mt-1 text-sm text-[var(--text2)]">{description}</p>}
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
    <div className={cn("rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]", className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
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
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium uppercase tracking-wider text-[var(--text3)]">{label}</span>
        {Icon && <Icon className="size-4 text-[var(--text3)]" />}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text)]">{value}</div>
      {delta && <div className={cn("mt-1 text-[12px] font-medium", TREND_TONE[trend])}>{delta}</div>}
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

export const STATUS_ICONS = { AlertOctagon, AlertTriangle, Info, Timer };
