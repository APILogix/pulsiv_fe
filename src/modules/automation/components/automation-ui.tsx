/**
 * Shared automation surface bits: status/risk pills, label formatting, and the
 * enable/disable switch. Sits on top of `@/shared/ui/pulse` so the automation
 * pages stay declarative and inherit the theme tokens.
 */
import { AlertTriangle, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Pill, type SurfaceTone, Toggle } from "@/shared/ui/pulse";
import { cn } from "@/lib/utils";
import type { ActionRiskLevel } from "../api/types";

// ── module-level constants (rules.md §1.2) ───────────────────

const WORKFLOW_STATUS_TONE: Record<string, SurfaceTone> = {
  draft: "neutral",
  active: "green",
  paused: "amber",
  disabled: "neutral",
  archived: "red",
};

const RUN_STATUS_TONE: Record<string, SurfaceTone> = {
  queued: "blue",
  running: "brand",
  waiting_approval: "amber",
  succeeded: "green",
  failed: "red",
  cancelled: "neutral",
  skipped: "neutral",
  timed_out: "red",
};

const APPROVAL_STATUS_TONE: Record<string, SurfaceTone> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
  expired: "neutral",
  cancelled: "neutral",
};

const RISK_TONE: Record<string, SurfaceTone> = {
  low: "green",
  medium: "amber",
  high: "red",
  critical: "red",
};

/** Run statuses that are still in flight — drives the live dot + cancel action. */
export const ACTIVE_RUN_STATUSES: readonly string[] = ["queued", "running", "waiting_approval"];

/** Runs the backend will accept a retry for (`AUTOMATION_RUN_NOT_RETRYABLE` otherwise). */
export const RETRYABLE_RUN_STATUSES: readonly string[] = ["failed", "cancelled", "timed_out"];

// ── Formatting ───────────────────────────────────────────────

/** `alert.event.created` / `alert_routing` → `Alert event created`. */
export function labelize(value: string | null | undefined): string {
  if (!value) return "—";
  const words = value.replace(/[._-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Enum value → `{ value, label }` option for FilterSelect / native selects. */
export function toOptions(values: readonly string[]): Array<{ value: string; label: string }> {
  return values.map((value) => ({ value, label: labelize(value) }));
}

export function withAllOption(
  values: readonly string[],
  allLabel: string,
): Array<{ value: string; label: string }> {
  return [{ value: "", label: allLabel }, ...toOptions(values)];
}

/** Duration between two timestamps, tolerant of nulls. */
export function elapsed(from: string | null, to: string | null): string {
  if (!from) return "—";
  const start = new Date(from).getTime();
  const end = to ? new Date(to).getTime() : Date.now();
  const ms = Math.max(0, end - start);
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

// ── Pills ────────────────────────────────────────────────────

export function WorkflowStatusPill({ status }: { status: string }) {
  return <Pill tone={WORKFLOW_STATUS_TONE[status] ?? "neutral"} dot>{labelize(status)}</Pill>;
}

export function RunStatusPill({ status }: { status: string }) {
  return <Pill tone={RUN_STATUS_TONE[status] ?? "neutral"} dot>{labelize(status)}</Pill>;
}

export function ApprovalStatusPill({ status }: { status: string }) {
  return <Pill tone={APPROVAL_STATUS_TONE[status] ?? "neutral"} dot>{labelize(status)}</Pill>;
}

export function RiskPill({ risk }: { risk: string }) {
  return <Pill tone={RISK_TONE[risk] ?? "neutral"}>{labelize(risk)} risk</Pill>;
}

export function EnabledPill({ enabled }: { enabled: boolean }) {
  return (
    <Pill tone={enabled ? "green" : "neutral"} dot>
      {enabled ? "On" : "Off"}
    </Pill>
  );
}

/** High/critical risk and the dangerous action list always need an approver. */
export function requiresApprovalRisk(risk: ActionRiskLevel): boolean {
  return risk === "high" || risk === "critical";
}

// ── Enable / disable switch ──────────────────────────────────
// Wraps the pulse Toggle with a pending spinner and an explanatory blocked
// state, since the backend refuses `enable` until a version is published.

export function PowerToggle({
  checked,
  onChange,
  label,
  pending,
  blockedReason,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  pending?: boolean;
  blockedReason?: string | null;
}) {
  const disabled = !!pending || (!checked && !!blockedReason);
  return (
    <span className="inline-flex items-center gap-2" title={disabled && blockedReason ? blockedReason : undefined}>
      {pending && <Loader2 className="size-3.5 animate-spin text-[var(--text3)]" aria-hidden="true" />}
      <Toggle checked={checked} onChange={onChange} label={label} disabled={disabled} />
    </span>
  );
}

// ── Small labelled cell used across detail panels ────────────

export function MetaCell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--text3)]">{label}</span>
      <span className="text-[13px] text-[var(--text)]">{children}</span>
    </div>
  );
}

/** Monospace code chip for action keys, paths, cron expressions. */
export function CodeChip({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[5px] bg-[var(--bg2)] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[11.5px] text-[var(--text2)]">
      {children}
    </code>
  );
}

// ── Entitlement banner ───────────────────────────────────────

export function EntitlementNote({
  unavailable,
  reason,
  icon: Icon = AlertTriangle,
}: {
  unavailable?: boolean;
  reason?: string | null;
  icon?: LucideIcon;
}) {
  if (!unavailable) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--amber)]">
      <Icon className="size-3.5" aria-hidden="true" />
      {reason ?? "Plan upgrade required"}
    </span>
  );
}
