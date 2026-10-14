// Data hooks for the Observe performance pages (latency, metrics, runtime,
// event loop, GC, profiling). Everything here reads real stored telemetry:
//  - short windows (≤ 6h) bin raw metric points from the explorer, so a 15m
//    view still has minute resolution;
//  - longer windows use the event-analytics series endpoint (hour/day buckets).
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api-client/axios";
import { errorStatus } from "@/infrastructure/api-client/api-error";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { normalizeExplorerListResponse, type ExplorerListResponse } from "./useObservabilityApi";
import type { TimeWindow } from "@/shared/observe";

export type Aggregate = "avg" | "max" | "min" | "sum" | "count";

export interface SeriesPoint {
  t: number;
  v: number;
}

export interface MetricStats {
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  p50: number | null;
  p95: number | null;
  p99: number | null;
}

/** One raw metric data point as the explorer list returns it. */
export interface MetricEventRow {
  id: string;
  occurredAt?: string;
  metricName?: string;
  metricType?: string;
  metricUnit?: string;
  value?: number | string | null;
  p95?: number | string | null;
  p99?: number | string | null;
  service?: string;
  endpoint?: string;
  environment?: string;
}

export interface MetricCatalogEntry {
  name: string;
  type: string | null;
  samples: number;
  lastSeen: string | null;
}

const SIX_HOURS = 6 * 3_600_000;
const SEVEN_DAYS = 7 * 86_400_000;

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function analyticsParams(window: TimeWindow, projectId?: string, environment?: string) {
  return {
    from: window.from.toISOString(),
    to: window.to.toISOString(),
    ...(projectId ? { projectId } : {}),
    ...(environment ? { environment } : {}),
  };
}

function aggregate(values: number[], fn: Aggregate): number {
  if (values.length === 0) return 0;
  switch (fn) {
    case "max": return Math.max(...values);
    case "min": return Math.min(...values);
    case "sum": return values.reduce((a, b) => a + b, 0);
    case "count": return values.length;
    default: return values.reduce((a, b) => a + b, 0) / values.length;
  }
}

/** Bin raw points into `bins` equal slots across the window; empty slots are dropped. */
export function binPoints(points: SeriesPoint[], window: TimeWindow, fn: Aggregate, bins = 60): SeriesPoint[] {
  const from = window.from.getTime();
  const width = window.ms / bins;
  const slots: number[][] = Array.from({ length: bins }, () => []);
  for (const p of points) {
    const idx = Math.floor((p.t - from) / width);
    if (idx >= 0 && idx < bins) slots[idx].push(p.v);
  }
  return slots
    .map((vals, i) => (vals.length ? { t: from + i * width, v: aggregate(vals, fn) } : null))
    .filter((p): p is SeriesPoint => p !== null);
}

async function fetchRawPoints(orgId: string, name: string, window: TimeWindow, environment?: string, projectSlug?: string) {
  const res = await apiClient.get(`/organizations/${orgId}/observability/metrics`, {
    params: {
      search: `metric:${name}`,
      from: window.from.toISOString(),
      to: window.to.toISOString(),
      limit: 200,
      ...(environment ? { environment } : {}),
      ...(projectSlug ? { project: projectSlug } : {}),
    },
  });
  const list = normalizeExplorerListResponse<Record<string, unknown>>(res.data);
  return list.items
    .map((r) => ({ t: new Date(String(r.occurredAt ?? r.occurred_at)).getTime(), v: num(r.value) }))
    .filter((p): p is SeriesPoint => Number.isFinite(p.t) && p.v !== null)
    .sort((a, b) => a.t - b.t);
}

/**
 * Placeholder that keeps the previous result on screen while the next window
 * loads — but only when the query is for the same thing (same metric name /
 * environment at `index` in the key). The window rolls every minute, and
 * without this each roll dropped the chart back to its loading state. A
 * different metric never borrows another metric's data.
 */
function keepWhileSame<T>(index: number, value: unknown) {
  return (previous: T | undefined, previousQuery?: { queryKey: readonly unknown[] }) =>
    previousQuery && previousQuery.queryKey[index] === value ? previous : undefined;
}

/** Stable query-key component for a TimeWindow rounded to 30-second buckets */
function windowKey(w: TimeWindow): string {
  const bucketTo = Math.floor(w.to.getTime() / 30_000) * 30_000;
  return `${w.ms}:${bucketTo}`;
}

/** Time series of one metric name, aggregated per bucket. */
export function useMetricSeries(name: string | null, fn: Aggregate, window: TimeWindow, environment?: string) {
  const orgId = useOrgStore((s) => s.activeOrgId);
  const projectId = useOrgStore((s) => s.activeProjectId);
  const projectSlug = useOrgStore((s) => s.activeProjectSlug);
  const short = window.ms <= SIX_HOURS;

  return useQuery({
    queryKey: ["observe-metric-series", orgId, projectId, name, fn, windowKey(window), environment, short],
    enabled: Boolean(orgId && name),
    staleTime: 60_000,
    placeholderData: keepWhileSame<SeriesPoint[]>(3, name),
    queryFn: async (): Promise<SeriesPoint[]> => {
      if (!orgId || !name) return [];
      if (short) {
        const raw = await fetchRawPoints(orgId, name, window, environment, projectSlug ?? undefined);
        return binPoints(raw, window, fn, 60);
      }
      const res = await apiClient.get(`/organizations/${orgId}/analytics/metrics/${encodeURIComponent(name)}`, {
        params: {
          ...analyticsParams(window, projectId ?? undefined, environment),
          granularity: window.ms <= SEVEN_DAYS ? "hour" : "day",
          aggregate: fn,
        },
      });
      const rows = (res.data?.data ?? []) as Array<Record<string, unknown>>;
      return rows
        .map((r) => ({ t: new Date(String(r.bucket)).getTime(), v: num(r.value) }))
        .filter((p): p is SeriesPoint => Number.isFinite(p.t) && p.v !== null);
    },
  });
}

/** count / min / max / avg / p50 / p95 / p99 for one metric over the window. */
export function useMetricStats(name: string | null, window: TimeWindow, environment?: string) {
  const orgId = useOrgStore((s) => s.activeOrgId);
  const projectId = useOrgStore((s) => s.activeProjectId);
  return useQuery({
    queryKey: ["observe-metric-stats", orgId, projectId, name, windowKey(window), environment],
    enabled: Boolean(orgId && name),
    staleTime: 60_000,
    placeholderData: keepWhileSame<MetricStats>(3, name),
    queryFn: async (): Promise<MetricStats> => {
      try {
        const res = await apiClient.get(`/organizations/${orgId}/analytics/metrics/${encodeURIComponent(name!)}/stats`, {
          params: analyticsParams(window, projectId ?? undefined, environment),
        });
        const d = (res.data?.data ?? {}) as Record<string, unknown>;
        return { count: num(d.count) ?? 0, min: num(d.min), max: num(d.max), avg: num(d.avg), p50: num(d.p50), p95: num(d.p95), p99: num(d.p99) };
      } catch (err) {
        // The endpoint answers 404 when the metric has no rows at all.
        if (errorStatus(err) === 404) return { count: 0, min: null, max: null, avg: null, p50: null, p95: null, p99: null };
        throw err;
      }
    },
  });
}

/** Every metric name seen in the window with its type, sample count, and last-seen time. */
export function useMetricCatalog(window: TimeWindow, environment?: string) {
  const orgId = useOrgStore((s) => s.activeOrgId);
  const projectId = useOrgStore((s) => s.activeProjectId);
  return useQuery({
    queryKey: ["observe-metric-catalog", orgId, projectId, windowKey(window), environment],
    enabled: Boolean(orgId),
    staleTime: 60_000,
    placeholderData: keepWhileSame<MetricCatalogEntry[]>(5, environment),
    queryFn: async (): Promise<MetricCatalogEntry[]> => {
      const res = await apiClient.get(`/organizations/${orgId}/analytics/metrics`, {
        params: analyticsParams(window, projectId ?? undefined, environment),
      });
      const rows = (res.data?.data ?? []) as Array<Record<string, unknown>>;
      return rows.map((r) => ({
        name: String(r.metric_name ?? r.metricName ?? ""),
        type: (r.metric_type ?? r.metricType ?? null) as string | null,
        samples: num(r.sample_count ?? r.sampleCount) ?? 0,
        lastSeen: (r.last_seen ?? r.lastSeen ?? null) as string | null,
      })).filter((r) => r.name);
    },
  });
}

/** Raw explorer rows for a metric name (newest first), e.g. individual GC pauses. */
export function useMetricEvents(name: string, window: TimeWindow, extra: Record<string, unknown> = {}) {
  const orgId = useOrgStore((s) => s.activeOrgId);
  const projectSlug = useOrgStore((s) => s.activeProjectSlug);
  return useQuery({
    queryKey: ["observe-metric-events", orgId, projectSlug, name, windowKey(window), extra],
    enabled: Boolean(orgId && name),
    staleTime: 60_000,
    placeholderData: keepWhileSame<ExplorerListResponse<MetricEventRow>>(3, name),
    queryFn: async () => {
      const res = await apiClient.get(`/organizations/${orgId}/observability/metrics`, {
        params: {
          search: `metric:${name}`,
          from: window.from.toISOString(),
          to: window.to.toISOString(),
          limit: 200,
          ...(projectSlug ? { project: projectSlug } : {}),
          ...extra,
        },
      });
      return normalizeExplorerListResponse<MetricEventRow>(res.data);
    },
  });
}

