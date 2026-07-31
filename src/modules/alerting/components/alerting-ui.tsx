/**
 * Shared alerting surface bits: severity/status pills and label formatting.
 * Sits on top of `@/shared/observe` (SeverityBadge/StatusBadge already cover
 * generic tones) plus a few alerting-specific tone maps for concepts the
 * generic badges don't know about (dead-letter status, batch status).
 */
import { Pill, type SurfaceTone } from "@/shared/ui/pulse";
import type {
  AlertEventStatus,
  BatchStatus,
  DeadLetterStatus,
  DeliveryAttemptStatus,
} from "../api/types";

// ── Tone maps ────────────────────────────────────────────────

const EVENT_STATUS_TONE: Record<AlertEventStatus, SurfaceTone> = {
  pending: "neutral",
  processing: "blue",
  firing: "red",
  resolved: "green",
  acknowledged: "amber",
  suppressed: "neutral",
  silenced: "neutral",
  error: "red",
};

const DELIVERY_STATUS_TONE: Record<DeliveryAttemptStatus, SurfaceTone> = {
  pending: "neutral",
  queued: "blue",
  sent: "blue",
  delivered: "green",
  failed: "red",
  retrying: "amber",
  cancelled: "neutral",
};

const BATCH_STATUS_TONE: Record<BatchStatus, SurfaceTone> = {
  pending: "neutral",
  processing: "blue",
  completed: "green",
  failed: "red",
  partial: "amber",
};

const DEAD_LETTER_STATUS_TONE: Record<DeadLetterStatus, SurfaceTone> = {
  pending_retry: "amber",
  retried: "blue",
  exhausted: "red",
  discarded: "neutral",
};

// ── Formatting ───────────────────────────────────────────────

/** `pending_retry` / `alert.rule.firing` → `Pending retry`. */
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
export function elapsed(from: string | null | undefined, to?: string | null): string {
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

export function EventStatusPill({ status }: { status: AlertEventStatus }) {
  return <Pill tone={EVENT_STATUS_TONE[status] ?? "neutral"} dot>{labelize(status)}</Pill>;
}

export function DeliveryStatusPill({ status }: { status: DeliveryAttemptStatus }) {
  return <Pill tone={DELIVERY_STATUS_TONE[status] ?? "neutral"} dot>{labelize(status)}</Pill>;
}

export function BatchStatusPill({ status }: { status: BatchStatus }) {
  return <Pill tone={BATCH_STATUS_TONE[status] ?? "neutral"} dot>{labelize(status)}</Pill>;
}

export function DeadLetterStatusPill({ status }: { status: DeadLetterStatus }) {
  return <Pill tone={DEAD_LETTER_STATUS_TONE[status] ?? "neutral"} dot>{labelize(status)}</Pill>;
}

export function EnabledPill({ enabled }: { enabled: boolean }) {
  return (
    <Pill tone={enabled ? "green" : "neutral"} dot>
      {enabled ? "On" : "Off"}
    </Pill>
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
    <div className={className}>
      <div className="flex flex-col gap-1">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--text3)]">{label}</span>
        <span className="text-[13px] text-[var(--text)]">{children}</span>
      </div>
    </div>
  );
}

/** Monospace code chip for fingerprints, ids, cron/regex fragments. */
export function CodeChip({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[5px] bg-[var(--bg2)] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[11.5px] text-[var(--text2)]">
      {children}
    </code>
  );
}
