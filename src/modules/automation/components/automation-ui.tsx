/**
 * Shared Workflows surface pieces (design/automation/DESIGN.md): status and
 * risk pills, label formatting, the enable switch, record facts, page-level
 * states, and the sequence spine that every definition, run, and dry run uses.
 * Composes the Mono tokens; nothing here introduces a colour.
 */
import type { ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Notice, Pill, type SurfaceTone, Toggle } from "@/shared/ui/pulse";
import { SheetLoading, WorkspacePage } from "@/modules/projects/components/project-page";
import { cn } from "@/lib/utils";
import type { ActionRiskLevel } from "../api/types";

// ── module-level constants (rules.md §1.2) ───────────────────

// Colour is state only: green done or on, amber waiting or gated, red broken.
const WORKFLOW_STATUS_TONE: Record<string, SurfaceTone> = {
  draft: "amber",
  active: "green",
  paused: "amber",
  disabled: "neutral",
  archived: "neutral",
};

const RUN_STATUS_TONE: Record<string, SurfaceTone> = {
  queued: "neutral",
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
  low: "neutral",
  medium: "amber",
  high: "red",
  critical: "red",
};

/** Run statuses that are still in flight — drives the live dot + cancel action. */
export const ACTIVE_RUN_STATUSES: readonly string[] = ["queued", "running", "waiting_approval"];

/** Runs the backend will accept a retry for (`AUTOMATION_RUN_NOT_RETRYABLE` otherwise). */
export const RETRYABLE_RUN_STATUSES: readonly string[] = ["failed", "cancelled", "timed_out"];

/** Mono for identifiers, paths, numbers, and durations. */
export const MONO = "font-[family-name:var(--mono)] tabular-nums";

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

/** `1 action` / `3 actions`. */
export function plural(count: number, noun: string, pluralNoun = `${noun}s`): string {
  return `${count} ${count === 1 ? noun : pluralNoun}`;
}

/** Compact JSON for a condition value; strings stay quoted so types read. */
export function formatValue(value: unknown): string {
  if (value === undefined) return "null";
  try {
    return JSON.stringify(value) ?? "null";
  } catch {
    return String(value);
  }
}

// ── Pills ────────────────────────────────────────────────────

export function WorkflowStatusPill({ status }: { status: string }) {
  return <Pill tone={WORKFLOW_STATUS_TONE[status] ?? "neutral"} dot={status === "active"}>{labelize(status)}</Pill>;
}

export function RunStatusPill({ status }: { status: string }) {
  return (
    <Pill tone={RUN_STATUS_TONE[status] ?? "neutral"} dot={ACTIVE_RUN_STATUSES.includes(status)}>
      {labelize(status)}
    </Pill>
  );
}

export function ApprovalStatusPill({ status }: { status: string }) {
  return <Pill tone={APPROVAL_STATUS_TONE[status] ?? "neutral"} dot={status === "pending"}>{labelize(status)}</Pill>;
}

export function RiskPill({ risk }: { risk: string }) {
  return <Pill tone={RISK_TONE[risk] ?? "neutral"}>{labelize(risk)} risk</Pill>;
}

export function EnabledPill({ enabled }: { enabled: boolean }) {
  return (
    <Pill tone={enabled ? "green" : "neutral"} dot={enabled}>
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

// ── Record facts ─────────────────────────────────────────────

/** One labelled value. 12px sentence-case label, 13px value. */
export function MetaCell({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-[12px] text-[var(--text3)]">{label}</span>
      <span className="min-w-0 text-[13px] text-[var(--text)] [overflow-wrap:anywhere]">{children}</span>
    </div>
  );
}

export interface Fact {
  label: string;
  value: ReactNode;
  mono?: boolean;
  /** Span the full row (long keys, templates). */
  wide?: boolean;
}

const FACT_GRID_COLUMNS: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

/** A definition grid of record facts. Values in mono only when marked. */
export function FactGrid({
  facts,
  columns = 4,
  className,
}: {
  /** Falsy entries (including `""` from `value && {...}`) are skipped. */
  facts: Array<Fact | null | false | undefined | "">;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const items = facts.filter((fact): fact is Fact => Boolean(fact));
  if (items.length === 0) return null;
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-4", FACT_GRID_COLUMNS[columns], className)}>
      {items.map((fact) => (
        <div key={fact.label} className={cn("min-w-0", fact.wide && "sm:col-span-full")}>
          <dt className="text-[12px] text-[var(--text3)]">{fact.label}</dt>
          <dd
            className={cn(
              "mt-1 min-w-0 text-[13px] text-[var(--text)] [overflow-wrap:anywhere]",
              fact.mono && cn(MONO, "text-[12px]"),
            )}
          >
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Monospace chip for action keys, paths, cron expressions. */
export function CodeChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <code
      className={cn(
        "rounded-[4px] bg-[var(--bg2)] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[11.5px] text-[var(--text2)] [overflow-wrap:anywhere]",
        className,
      )}
    >
      {children}
    </code>
  );
}

/** `path operator value`, the one way a condition is written anywhere. */
export function ConditionText({
  path,
  operator,
  value,
}: {
  path: string;
  operator: string;
  value: unknown;
}) {
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px]">
      <CodeChip className="text-[var(--text)]">{path}</CodeChip>
      <span className="text-[var(--text3)]">{labelize(operator).toLowerCase()}</span>
      <CodeChip>{formatValue(value)}</CodeChip>
    </span>
  );
}

// ── Entitlement note ─────────────────────────────────────────

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
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--amber)]">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {reason ?? "Plan upgrade required"}
    </span>
  );
}

// ── Page-level states ────────────────────────────────────────

/** Every Workflows page renders this when no organization is active. */
export function NoOrgNotice({ children }: { children: ReactNode }) {
  return (
    <WorkspacePage>
      <Notice tone="amber" icon={AlertTriangle} title="No organization selected">
        {children}
      </Notice>
    </WorkspacePage>
  );
}

/** Detail pages before their record arrives: header, readouts, one surface. */
export function DetailLoading({ label }: { label: string }) {
  return (
    <WorkspacePage>
      <div role="status" aria-label={label} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2.5">
          <span aria-hidden="true" className="loading-skeleton h-3 w-40 rounded-[4px]" />
          <span aria-hidden="true" className="loading-skeleton h-[22px] w-[min(70%,360px)] rounded-[4px]" />
          <span aria-hidden="true" className="loading-skeleton h-3 w-[min(90%,520px)] rounded-[4px]" />
        </div>
        <div aria-hidden="true" className="h-[94px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]" />
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]">
          <SheetLoading rows={5} label={label} />
        </div>
      </div>
    </WorkspacePage>
  );
}

// ── Sequence spine ───────────────────────────────────────────
// Trigger → conditions → actions, or a run's steps, on one vertical hairline.
// The marker carries the stage's state; the content column carries the facts.

export type StageTone = "neutral" | "good" | "warn" | "bad" | "current";

const STAGE_MARKER: Record<StageTone, string> = {
  neutral: "border-[var(--border2)] bg-[var(--bg1)] text-[var(--text2)]",
  good: "border-[var(--green)]/40 bg-[var(--green-bg)] text-[var(--green)]",
  warn: "border-[var(--amber)]/40 bg-[var(--amber-bg)] text-[var(--amber)]",
  bad: "border-[var(--red)]/40 bg-[var(--red-bg)] text-[var(--red)]",
  current: "border-[var(--text)] bg-[var(--bg2)] text-[var(--text)]",
};

/** Map a run or step status onto the spine's marker. */
export function stageToneForStatus(status: string): StageTone {
  if (status === "succeeded" || status === "approved") return "good";
  if (status === "failed" || status === "timed_out" || status === "rejected") return "bad";
  if (status === "waiting_approval" || status === "pending") return "warn";
  if (status === "running") return "current";
  return "neutral";
}

export function Sequence({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  return (
    <ol aria-label={label} className={cn("py-2", className)}>
      {children}
    </ol>
  );
}

const SPINE = "w-px bg-[var(--border)]";

/** A labelled break in the spine: "Trigger", "Conditions", "Actions". */
export function SequenceGroup({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <li className="group/stage grid grid-cols-[28px_minmax(0,1fr)] gap-x-4 px-5">
      <div aria-hidden="true" className="flex flex-col items-center">
        {/* A leading group only draws the spine below its label. */}
        <span className={cn(SPINE, "h-full min-h-4 group-first/stage:mt-auto group-first/stage:h-2 group-first/stage:min-h-0")} />
      </div>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 pb-1 pt-4 group-first/stage:pt-2">
        <h3 className="text-[12px] font-medium text-[var(--text2)]">{title}</h3>
        {description && <p className="text-[12px] text-[var(--text3)]">{description}</p>}
      </div>
    </li>
  );
}

export function SequenceStage({
  marker,
  tone = "neutral",
  title,
  meta,
  children,
  highlighted = false,
}: {
  /** Short ordinal or code: "1", "T", "C2". */
  marker: ReactNode;
  tone?: StageTone;
  title: ReactNode;
  /** Pills and one inline action, right-aligned on wide screens. */
  meta?: ReactNode;
  /** Quiet facts under the title. */
  children?: ReactNode;
  /** The stage the page is about (the gated action on an approval). */
  highlighted?: boolean;
}) {
  return (
    <li className="group/stage grid grid-cols-[28px_minmax(0,1fr)] gap-x-4 px-5">
      <div aria-hidden="true" className="flex flex-col items-center">
        <span className={cn(SPINE, "h-4 shrink-0 group-first/stage:invisible")} />
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium",
            MONO,
            STAGE_MARKER[tone],
          )}
        >
          {marker}
        </span>
        <span className={cn(SPINE, "flex-1 group-last/stage:invisible")} />
      </div>
      <div
        className={cn(
          "min-w-0 py-4",
          highlighted && "-mx-3 my-1 rounded-[var(--radius)] bg-[var(--bg2)] px-3 py-3",
        )}
      >
        <div className="flex min-h-7 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 text-[13px] font-medium text-[var(--text)]">{title}</div>
          {meta && <div className="flex shrink-0 flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {children && <div className="mt-1.5 min-w-0 text-[12px] leading-[1.6] text-[var(--text3)]">{children}</div>}
      </div>
    </li>
  );
}
