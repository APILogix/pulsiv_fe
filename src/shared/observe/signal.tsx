// ============================================================
// Signal sheet — the instrument that sits above every Observe
// explorer table (design/observe/DESIGN.md): readout cells over a
// volume histogram whose error share stacks in red.
// ============================================================
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { apiClient } from "@/infrastructure/api-client/axios";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import type { TimeRangeState } from "./controls/useTimeRangeParams";
import { formatCompact } from "./format";

// ── Time window ─────────────────────────────────────────────

const RANGE_MS: Record<string, number> = {
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "6h": 6 * 60 * 60_000,
  "24h": 24 * 60 * 60_000,
  "3d": 3 * 24 * 60 * 60_000,
  "7d": 7 * 24 * 60 * 60_000,
  "30d": 30 * 24 * 60 * 60_000,
};

export interface TimeWindow {
  from: Date;
  to: Date;
  ms: number;
}

/** Resolve the URL time range into concrete bounds, rounded to the minute so
 *  query keys built from it stay stable between renders. */
export function resolveWindow(state: TimeRangeState, now = Date.now()): TimeWindow {
  const minute = 60_000;
  const end = Math.ceil(now / minute) * minute;
  if (state.mode === "custom" && state.from) {
    const from = new Date(state.from).getTime();
    let to = state.to ? new Date(state.to).getTime() : end;
    if (!Number.isFinite(from)) return resolveWindow({ mode: "preset", range: "24h" }, now);
    if (!Number.isFinite(to) || to <= from) to = from + RANGE_MS["24h"];
    return { from: new Date(from), to: new Date(to), ms: to - from };
  }
  const span = RANGE_MS[state.range] ?? RANGE_MS["24h"];
  return { from: new Date(end - span), to: new Date(end), ms: span };
}

export function useTimeWindow(state: TimeRangeState): TimeWindow {
  // Keyed on the primitive parts only: the window moves when the user changes
  // the range, not on every render.
  const { mode, range, from, to } = state;
  return useMemo(() => resolveWindow({ mode, range, from, to }), [mode, range, from, to]);
}

/** Query params the explorer endpoints accept for a time range. */
export function rangeParams(state: TimeRangeState) {
  return {
    range: state.mode === "preset" ? state.range : undefined,
    from: state.from,
    to: state.to,
  };
}

// ── Timeline ────────────────────────────────────────────────

export interface TimelineBucket {
  bucket: string;
  count: number;
  errorCount: number;
}

export interface HistogramBar {
  start: number;
  end: number;
  count: number;
  errorCount: number;
}

type Interval = "minute" | "hour" | "day";
const INTERVAL_MS: Record<Interval, number> = { minute: 60_000, hour: 3_600_000, day: 86_400_000 };

function intervalFor(ms: number): Interval {
  if (ms <= RANGE_MS["6h"]) return "minute";
  if (ms <= RANGE_MS["7d"]) return "hour";
  return "day";
}

function clean(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(([key, v]) => key !== "cursor" && v !== undefined && v !== null && v !== ""),
  );
}

/**
 * Bucketed event volume for an explorer resource, zero-filled and merged into
 * at most `maxBars` bars. Falls back to the endpoint's default hourly buckets
 * if the finer interval is rejected by an older API build.
 */
export function useSignalTimeline(
  resource: string,
  params: Record<string, unknown>,
  window: TimeWindow,
  maxBars = 60,
) {
  const orgId = useOrgStore((s) => s.activeOrgId);
  const cleaned = clean(params);
  const preferred = intervalFor(window.ms);

  const query = useQuery({
    queryKey: ["observe-timeline", orgId, resource, cleaned, preferred],
    enabled: Boolean(orgId && resource),
    staleTime: 15_000,
    queryFn: async (): Promise<{ buckets: TimelineBucket[]; interval: Interval }> => {
      const url = `/organizations/${orgId}/observability/${resource}/timeline`;
      try {
        const res = await apiClient.get(url, { params: { ...cleaned, interval: preferred } });
        return { buckets: (res.data?.data ?? []) as TimelineBucket[], interval: preferred };
      } catch (err) {
        if (preferred === "hour") throw err;
        const res = await apiClient.get(url, { params: cleaned });
        return { buckets: (res.data?.data ?? []) as TimelineBucket[], interval: "hour" };
      }
    },
  });

  const bars = useMemo(
    () => (query.data ? binTimeline(query.data.buckets, window, INTERVAL_MS[query.data.interval], maxBars) : []),
    [query.data, window, maxBars],
  );

  return { bars, isLoading: query.isLoading, isError: query.isError };
}

export function binTimeline(buckets: TimelineBucket[], window: TimeWindow, intervalMs: number, maxBars: number): HistogramBar[] {
  const from = Math.floor(window.from.getTime() / intervalMs) * intervalMs;
  const to = window.to.getTime();
  const slots = Math.max(1, Math.ceil((to - from) / intervalMs));
  const perBar = Math.max(1, Math.ceil(slots / maxBars));
  const width = intervalMs * perBar;
  const count = Math.max(1, Math.ceil((to - from) / width));
  const bars: HistogramBar[] = Array.from({ length: count }, (_, i) => ({
    start: from + i * width,
    end: Math.min(to, from + (i + 1) * width),
    count: 0,
    errorCount: 0,
  }));
  for (const b of buckets) {
    const t = new Date(b.bucket).getTime();
    if (!Number.isFinite(t)) continue;
    const idx = Math.floor((t - from) / width);
    if (idx < 0 || idx >= bars.length) continue;
    bars[idx].count += Number(b.count) || 0;
    bars[idx].errorCount += Number(b.errorCount) || 0;
  }
  return bars;
}

// ── Readout cells ───────────────────────────────────────────

export type ReadoutTone = "good" | "warn" | "bad" | "neutral";

export interface ReadoutCell {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: ReadoutTone;
  title?: string;
}

const TONE_TEXT: Record<ReadoutTone, string> = {
  good: "text-[var(--green)]",
  warn: "text-[var(--amber)]",
  bad: "text-[var(--red)]",
  neutral: "text-[var(--text)]",
};

function Cells({ cells, loading }: { cells: ReadoutCell[]; loading?: boolean }) {
  return (
    <div
      className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-3 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none"
    >
      {cells.map((cell) => (
        <div key={cell.label} className="flex min-w-0 flex-col gap-2 bg-[var(--bg1)] px-4 py-3.5" title={cell.title}>
          <span className="truncate text-[12px] text-[var(--text2)]">{cell.label}</span>
          {loading ? (
            <span className="h-[22px] w-16 animate-pulse rounded-[4px] bg-[var(--bg3)]" />
          ) : (
            <span
              className={cn(
                "truncate font-[family-name:var(--mono)] text-[22px] font-medium leading-none tracking-[-0.02em] tabular-nums",
                TONE_TEXT[cell.tone ?? "neutral"],
              )}
            >
              {cell.value}
            </span>
          )}
          {cell.sub !== undefined && (
            <span className="truncate text-[12px] text-[var(--text3)]">{cell.sub}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Stand-alone hairline-divided readout band (detail pages, perf pages). */
export function ReadoutBand({ cells, loading, className }: { cells: ReadoutCell[]; loading?: boolean; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]", className)}>
      <Cells cells={cells} loading={loading} />
    </div>
  );
}

// ── Histogram ───────────────────────────────────────────────

const TICK_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const TIME_FMT = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
const DAY_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function tickLabel(ms: number, spanMs: number) {
  if (spanMs <= RANGE_MS["24h"]) return TIME_FMT.format(ms);
  if (spanMs <= RANGE_MS["7d"]) return TICK_FMT.format(ms);
  return DAY_FMT.format(ms);
}

export function SignalHistogram({
  bars,
  loading,
  height = 56,
  countLabel = "Events",
  errorLabel = "Errors",
  className,
}: {
  bars: HistogramBar[];
  loading?: boolean;
  height?: number;
  countLabel?: string;
  errorLabel?: string;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.count));
  const total = bars.reduce((s, b) => s + b.count, 0);
  const errors = bars.reduce((s, b) => s + b.errorCount, 0);
  const span = bars.length ? bars[bars.length - 1].end - bars[0].start : 0;
  const active = hover !== null ? bars[hover] : null;
  const empty = !loading && total === 0;

  return (
    <div className={cn("px-4 pb-3 pt-3", className)}>
      <div className="mb-2 flex items-center justify-between gap-3 text-[12px]">
        <div className="flex items-center gap-4 text-[var(--text2)]">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-[var(--text3)]" aria-hidden="true" />
            {countLabel}
            <span className="font-[family-name:var(--mono)] tabular-nums text-[var(--text)]">{formatCompact(total)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-[var(--red)]" aria-hidden="true" />
            {errorLabel}
            <span className={cn("font-[family-name:var(--mono)] tabular-nums", errors > 0 ? "text-[var(--red)]" : "text-[var(--text)]")}>{formatCompact(errors)}</span>
          </span>
        </div>
        <span className="font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]" aria-live="polite">
          {active
            ? `${TICK_FMT.format(active.start)} · ${active.count.toLocaleString()} ${countLabel.toLowerCase()} · ${active.errorCount.toLocaleString()} ${errorLabel.toLowerCase()}`
            : bars.length > 0 ? `${bars.length} buckets` : ""}
        </span>
      </div>

      <div
        className="relative flex items-end gap-[2px]"
        style={{ height }}
        role="img"
        aria-label={`${countLabel} over time: ${total.toLocaleString()} total, ${errors.toLocaleString()} ${errorLabel.toLowerCase()}`}
        onMouseLeave={() => setHover(null)}
      >
        {loading
          ? Array.from({ length: 48 }, (_, i) => (
              <div key={i} className="flex-1 animate-pulse rounded-[1px] bg-[var(--bg2)]" style={{ height: `${20 + ((i * 37) % 60)}%` }} />
            ))
          : bars.map((bar, i) => {
              const h = bar.count === 0 ? 0 : Math.max(4, (bar.count / max) * 100);
              const eh = bar.count === 0 ? 0 : (bar.errorCount / bar.count) * 100;
              return (
                <div
                  key={bar.start}
                  className="group relative flex h-full flex-1 flex-col justify-end"
                  onMouseEnter={() => setHover(i)}
                >
                  <div
                    className={cn(
                      "flex w-full flex-col justify-end overflow-hidden rounded-[1px] transition-colors duration-150",
                      hover === i ? "bg-[var(--text2)]" : "bg-[var(--border2)]",
                    )}
                    style={{ height: `${h}%` }}
                  >
                    {eh > 0 && <div className="w-full bg-[var(--red)]" style={{ height: `${Math.max(eh, 6)}%` }} />}
                  </div>
                  {bar.count === 0 && <div className="h-px w-full bg-[var(--border)]" />}
                </div>
              );
            })}
        {empty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[12px] text-[var(--text3)]">
            No events in this window
          </span>
        )}
      </div>

      {bars.length > 1 && (
        <div className="mt-1.5 flex justify-between font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]">
          <span>{tickLabel(bars[0].start, span)}</span>
          <span className="hidden sm:inline">{tickLabel(bars[Math.floor(bars.length / 2)].start, span)}</span>
          <span>{tickLabel(bars[bars.length - 1].end, span)}</span>
        </div>
      )}
    </div>
  );
}

/** Readout cells over the volume histogram, on one hairline sheet. */
export function SignalSheet({
  cells,
  bars,
  loading,
  timelineLoading,
  countLabel,
  errorLabel,
  className,
}: {
  cells: ReadoutCell[];
  bars: HistogramBar[];
  loading?: boolean;
  timelineLoading?: boolean;
  countLabel?: string;
  errorLabel?: string;
  className?: string;
}) {
  return (
    <section className={cn("shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]", className)}>
      <div className="border-b border-[var(--border)]">
        <Cells cells={cells} loading={loading} />
      </div>
      <SignalHistogram bars={bars} loading={timelineLoading} countLabel={countLabel} errorLabel={errorLabel} />
    </section>
  );
}

// ── Row link chips ──────────────────────────────────────────

export const CHIP_BASE =
  "inline-flex max-w-full items-center gap-1 rounded-[4px] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[11px] font-medium leading-[1.35] transition-colors focus-visible:outline-none focus-visible:ring-2";
export const TRACE_CHIP = `${CHIP_BASE} bg-[var(--violet-bg)] text-[var(--violet)] hover:bg-[var(--violet)]/20 focus-visible:ring-[var(--violet)]`;
export const GROUP_CHIP = `${CHIP_BASE} bg-[var(--red-bg)] text-[var(--red)] hover:bg-[var(--red)]/20 focus-visible:ring-[var(--red)]`;
export const NEUTRAL_CHIP = `${CHIP_BASE} bg-[var(--bg3)] text-[var(--text2)] hover:text-[var(--text)] focus-visible:ring-[var(--text3)]`;

export const MUTED_DASH = <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">—</span>;

/** Shared environment filter options for every explorer. */
export const ENVIRONMENT_OPTIONS = [
  { value: "", label: "All environments" },
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "development", label: "Development" },
  { value: "pre_production", label: "Pre-production" },
  { value: "pre_staging", label: "Pre-staging" },
  { value: "testing", label: "Testing" },
  { value: "preview", label: "Preview" },
  { value: "pre_deployment", label: "Pre-deployment" },
  { value: "custom", label: "Custom" },
];

export const DURATION_OPTIONS = [
  { value: "", label: "Any duration" },
  { value: "gte:100", label: "Over 100 ms" },
  { value: "gte:500", label: "Over 500 ms" },
  { value: "gte:1000", label: "Over 1 s" },
  { value: "gte:2000", label: "Over 2 s" },
];

export function pct(part: number, whole: number, digits = 1) {
  if (!whole) return "0%";
  return `${((part / whole) * 100).toFixed(digits)}%`;
}
