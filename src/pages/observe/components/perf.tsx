// Shared bits for the runtime performance pages (runtime metrics, event loop, GC).
import { EmptyNote } from "@/shared/observe";
import type { MetricStats, SeriesPoint } from "../hooks/usePerformanceApi";

/** Runtime metrics are reported in MB by the Pulse Node SDK. Older agents sent
 *  bytes; anything that large is converted so both read the same. */
export function toMb(v: number): number {
  return v > 1_000_000 ? v / 1_048_576 : v;
}

export function mbPoints(points: SeriesPoint[] | undefined): SeriesPoint[] {
  return (points ?? []).map((p) => ({ t: p.t, v: toMb(p.v) }));
}

export function formatMb(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const mb = toMb(v);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb >= 100) return `${Math.round(mb)} MB`;
  return `${mb.toFixed(1)} MB`;
}

export function formatMs(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (v >= 1000) return `${(v / 1000).toFixed(2)} s`;
  if (v >= 100) return `${Math.round(v)} ms`;
  return `${v.toFixed(digits)} ms`;
}

/** Utilization may arrive as a 0–1 ratio or a 0–100 percentage. */
export function toPct(v: number): number {
  return v <= 1 ? v * 100 : v;
}

export function formatPct(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${toPct(v).toFixed(1)}%`;
}

export function hasSamples(...stats: (MetricStats | undefined)[]) {
  return stats.some((s) => (s?.count ?? 0) > 0);
}

/** Shown when none of a page's runtime metrics have a single sample. */
export function RuntimeNotReporting({ metrics, what }: { metrics: string[]; what: string }) {
  return (
    <EmptyNote title={`No ${what} samples in this window`}>
      This page reads{" "}
      {metrics.map((m, i) => (
        <span key={m}>
          <code className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{m}</code>
          {i < metrics.length - 2 ? ", " : i === metrics.length - 2 ? " and " : ""}
        </span>
      ))}
      , which Node services report through the Pulse SDK's runtime telemetry. Widen the time range if the service reported earlier, or check that runtime collection is on for it.
    </EmptyNote>
  );
}
