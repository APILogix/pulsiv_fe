import React, { useState, useMemo } from "react";
import { Link } from "react-router";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  PageHeader,
  TimeRangePicker,
  useTimeRangeParams,
  useTimeWindow,
  ReadoutBand,
  Panel,
  EmptyNote,
  MethodBadge,
  StatusCodeBadge,
  Timestamp,
  CopyButton,
  formatCompact,
  formatLatency,
} from "@/shared/observe";
import type { ReadoutCell } from "@/shared/observe";
import { TimeSeriesChart } from "./components/TimeSeriesChart";
import type { ChartSeries } from "./components/TimeSeriesChart";
import { useQueryClient } from "@tanstack/react-query";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { cn } from "@/lib/utils";
import {
  useLatencyOverview,
  useLatencyTimeSeries,
  useLatencyDistribution,
  useLatencyEndpoints,
  useLatencyEndpointDetail,
  useLatencySlowRequests,
} from "@/modules/latency/hooks/useLatency";
import type {
  LatencyQueryParams,
  LatencyDistributionBucket,
  EndpointPerformanceItem,
  SlowRequestItem,
} from "@/modules/latency/types/latency.types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const SLOW_MS = 1000;
const HTTP_METHODS = ["ALL", "GET", "POST", "PUT", "DELETE", "PATCH"] as const;
const STATUS_CLASSES = ["ALL", "2xx", "3xx", "4xx", "5xx"] as const;
const INTERVAL_OPTIONS = [
  { value: "auto", label: "Auto Interval" },
  { value: "1m", label: "1 minute" },
  { value: "5m", label: "5 minutes" },
  { value: "15m", label: "15 minutes" },
  { value: "1h", label: "1 hour" },
  { value: "1d", label: "1 day" },
] as const;

function latencyTone(v: number | null | undefined): "good" | "warn" | "bad" | "neutral" {
  if (v == null) return "neutral";
  if (v >= SLOW_MS) return "bad";
  if (v >= 500) return "warn";
  if (v < 200) return "good";
  return "neutral";
}

function renderDelta(deltaPct: number | null | undefined, higherIsBetter = false) {
  if (deltaPct == null || Number.isNaN(deltaPct)) return null;
  if (Math.abs(deltaPct) < 0.1) {
    return <span className="text-[var(--text3)]">0.0% vs prev</span>;
  }
  const isPositive = deltaPct > 0;
  const isGood = higherIsBetter ? isPositive : !isPositive;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-[family-name:var(--mono)] text-[11px] font-medium tabular-nums",
        isGood ? "text-[var(--green)]" : "text-[var(--red)]",
      )}
    >
      {isPositive ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(deltaPct).toFixed(1)}% vs prev
    </span>
  );
}

/** Distribution Histogram with percentile tag overlays */
function LatencyHistogramView({
  buckets,
  p50,
  p90,
  p95,
  p99,
  totalRequests,
}: {
  buckets: LatencyDistributionBucket[];
  p50?: number | null;
  p90?: number | null;
  p95?: number | null;
  p99?: number | null;
  totalRequests: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));

  const marksForBucket = (b: LatencyDistributionBucket) => {
    const tags: string[] = [];
    const from = b.fromMs;
    const to = b.toMs ?? Number.POSITIVE_INFINITY;
    if (p50 != null && p50 >= from && p50 < to) tags.push("p50");
    if (p90 != null && p90 >= from && p90 < to) tags.push("p90");
    if (p95 != null && p95 >= from && p95 < to) tags.push("p95");
    if (p99 != null && p99 >= from && p99 < to) tags.push("p99");
    return tags;
  };

  const activeBucket = hoveredIdx !== null ? buckets[hoveredIdx] : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-[12px] text-[var(--text3)]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-[var(--text3)]" />
            Normal (&lt; 1s)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px] bg-[var(--red)]" />
            Slow (≥ 1s)
          </span>
        </div>
        <span className="font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text2)]">
          {activeBucket
            ? `${activeBucket.label}: ${activeBucket.count.toLocaleString()} reqs (${activeBucket.percentage.toFixed(1)}% · ${activeBucket.cumulativePercentage.toFixed(1)}% cum.)`
            : `${totalRequests.toLocaleString()} requests across ${buckets.length} duration bands`}
        </span>
      </div>

      <div
        className="flex h-[180px] items-end gap-1.5 pt-6"
        role="img"
        aria-label={`Latency distribution histogram over ${totalRequests} requests`}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {buckets.map((b, idx) => {
          const heightPct = b.count === 0 ? 0 : Math.max(4, (b.count / maxCount) * 100);
          const isHovered = hoveredIdx === idx;
          const tags = marksForBucket(b);

          return (
            <div
              key={`${b.fromMs}-${b.toMs}`}
              className="group relative flex h-full flex-1 flex-col justify-end"
              onMouseEnter={() => setHoveredIdx(idx)}
            >
              {tags.length > 0 && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-[family-name:var(--mono)] text-[9px] font-semibold tracking-wide text-[var(--text2)]">
                  {tags.join(" ")}
                </div>
              )}
              <div
                className={cn(
                  "w-full rounded-[2px] transition-all duration-150",
                  b.isSlow
                    ? isHovered
                      ? "bg-[var(--red)] shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                      : "bg-[var(--red)]/75"
                    : isHovered
                      ? "bg-[var(--text)] shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                      : "bg-[var(--border2)] hover:bg-[var(--text2)]",
                )}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex gap-1.5 font-[family-name:var(--mono)] text-[10px] tabular-nums text-[var(--text3)]">
        {buckets.map((b) => (
          <span key={b.label} className="flex-1 truncate text-center" title={b.label}>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** HTTP Status series & breakdown card */
function HttpStatusBreakdownCard({
  status2xx = 0,
  status3xx = 0,
  status4xx = 0,
  status5xx = 0,
  total = 0,
}: {
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status5xx: number;
  total: number;
}) {
  const safeTotal = total > 0 ? total : 1;
  const pct2xx = total > 0 ? (status2xx / safeTotal) * 100 : 100;
  const pct3xx = total > 0 ? (status3xx / safeTotal) * 100 : 0;
  const pct4xx = total > 0 ? (status4xx / safeTotal) * 100 : 0;
  const pct5xx = total > 0 ? (status5xx / safeTotal) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Proportion bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[12px] text-[var(--text3)]">
          <span>Status code distribution</span>
          <span className="font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text2)]">
            {total.toLocaleString()} total
          </span>
        </div>
        <div
          className="flex h-3 w-full overflow-hidden rounded-[var(--radius)] bg-[var(--bg3)]"
          role="progressbar"
          aria-label="HTTP Status Code distribution"
        >
          {status2xx > 0 && (
            <div
              style={{ width: `${pct2xx}%` }}
              className="bg-[var(--green)] transition-all"
              title={`2xx: ${status2xx.toLocaleString()} (${pct2xx.toFixed(1)}%)`}
            />
          )}
          {status3xx > 0 && (
            <div
              style={{ width: `${pct3xx}%` }}
              className="bg-[var(--blue)] transition-all"
              title={`3xx: ${status3xx.toLocaleString()} (${pct3xx.toFixed(1)}%)`}
            />
          )}
          {status4xx > 0 && (
            <div
              style={{ width: `${pct4xx}%` }}
              className="bg-[var(--amber)] transition-all"
              title={`4xx: ${status4xx.toLocaleString()} (${pct4xx.toFixed(1)}%)`}
            />
          )}
          {status5xx > 0 && (
            <div
              style={{ width: `${pct5xx}%` }}
              className="bg-[var(--red)] transition-all"
              title={`5xx: ${status5xx.toLocaleString()} (${pct5xx.toFixed(1)}%)`}
            />
          )}
        </div>
      </div>

      {/* Breakdown stat tiles */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/40 p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--green)]">
            <span className="size-1.5 rounded-full bg-[var(--green)]" />
            2xx Success
          </div>
          <div className="font-[family-name:var(--mono)] text-[16px] font-semibold tabular-nums text-[var(--text)]">
            {formatCompact(status2xx)}
          </div>
          <div className="font-[family-name:var(--mono)] text-[10px] tabular-nums text-[var(--text3)]">
            {pct2xx.toFixed(1)}% of traffic
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/40 p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--blue)]">
            <span className="size-1.5 rounded-full bg-[var(--blue)]" />
            3xx Redirect
          </div>
          <div className="font-[family-name:var(--mono)] text-[16px] font-semibold tabular-nums text-[var(--text)]">
            {formatCompact(status3xx)}
          </div>
          <div className="font-[family-name:var(--mono)] text-[10px] tabular-nums text-[var(--text3)]">
            {pct3xx.toFixed(1)}% of traffic
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/40 p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--amber)]">
            <span className="size-1.5 rounded-full bg-[var(--amber)]" />
            4xx Client Err
          </div>
          <div className="font-[family-name:var(--mono)] text-[16px] font-semibold tabular-nums text-[var(--text)]">
            {formatCompact(status4xx)}
          </div>
          <div className="font-[family-name:var(--mono)] text-[10px] tabular-nums text-[var(--text3)]">
            {pct4xx.toFixed(1)}% error rate
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/40 p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--red)]">
            <span className="size-1.5 rounded-full bg-[var(--red)]" />
            5xx Server Err
          </div>
          <div className="font-[family-name:var(--mono)] text-[16px] font-semibold tabular-nums text-[var(--text)]">
            {formatCompact(status5xx)}
          </div>
          <div className="font-[family-name:var(--mono)] text-[10px] tabular-nums text-[var(--text3)]">
            {pct5xx.toFixed(1)}% error rate
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LatencyPage() {
  const { timeRangeState } = useTimeRangeParams();
  const window = useTimeWindow(timeRangeState);
  const activeProjectId = useOrgStore((s) => s.activeProjectId || s.activeProjectSlug);

  // Filter States
  const [method, setMethod] = useState<string>("ALL");
  const [statusClass, setStatusClass] = useState<string>("ALL");
  const [interval, setInterval] = useState<string>("auto");
  const [search, setSearch] = useState<string>("");
  const [comparePrevious, setComparePrevious] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<LatencyQueryParams["sortBy"]>("p95");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);

  // Common parameters for queries
  const commonParams: LatencyQueryParams = useMemo(() => {
    return {
      from: window.from.toISOString(),
      to: window.to.toISOString(),
      method: method !== "ALL" ? method : undefined,
      statusClass: statusClass !== "ALL" ? (statusClass as "2xx" | "3xx" | "4xx" | "5xx") : undefined,
      interval: interval !== "auto" ? (interval as "1m" | "5m" | "15m" | "1h" | "1d") : undefined,
      search: search.trim() || undefined,
      compare: comparePrevious,
    };
  }, [window.from, window.to, method, statusClass, interval, search, comparePrevious]);

  const queryClient = useQueryClient();
  // Decouple secondary breakdown and analytical queries from the page-level gate
  queryClient.setQueryDefaults(["latency", "timeseries"], { meta: { nonBlocking: true } });
  queryClient.setQueryDefaults(["latency", "status-series"], { meta: { nonBlocking: true } });
  queryClient.setQueryDefaults(["latency", "distribution"], { meta: { nonBlocking: true } });
  queryClient.setQueryDefaults(["latency", "endpoints"], { meta: { nonBlocking: true } });
  queryClient.setQueryDefaults(["latency", "slow-requests"], { meta: { nonBlocking: true } });
  queryClient.setQueryDefaults(["latency", "endpoint-detail"], { meta: { nonBlocking: true } });

  // Backend Queries (Primary hero query: overviewQuery unblocks the gate immediately)
  const overviewQuery = useLatencyOverview(commonParams);
  const timeseriesQuery = useLatencyTimeSeries(commonParams);
  const distributionQuery = useLatencyDistribution(commonParams);
  const endpointsQuery = useLatencyEndpoints({
    ...commonParams,
    sortBy,
    sortOrder,
    page,
    limit: 15,
  });
  const slowRequestsQuery = useLatencySlowRequests({
    ...commonParams,
    limit: 10,
  });
  const endpointDetailQuery = useLatencyEndpointDetail(selectedEndpointId, {
    from: window.from.toISOString(),
    to: window.to.toISOString(),
  });

  const isRefreshing = overviewQuery.isFetching || timeseriesQuery.isFetching;

  const handleRefreshAll = () => {
    overviewQuery.refetch();
    timeseriesQuery.refetch();
    distributionQuery.refetch();
    endpointsQuery.refetch();
    slowRequestsQuery.refetch();
    if (selectedEndpointId) {
      endpointDetailQuery.refetch();
    }
  };

  const overview = overviewQuery.data;
  const deltas = overview?.comparison?.deltas;

  // Build the 6 KPI Readout Cells
  const kpiCells: ReadoutCell[] = [
    {
      label: "Total Requests",
      value: overview ? formatCompact(overview.totalRequests) : "—",
      sub: renderDelta(deltas?.totalRequestsPct, true) ?? "in window",
      tone: "neutral",
    },
    {
      label: "Avg Latency",
      value: overview?.avgLatencyMs != null ? formatLatency(overview.avgLatencyMs) : "—",
      sub: renderDelta(deltas?.avgLatencyPct, false) ?? "mean duration",
      tone: latencyTone(overview?.avgLatencyMs),
    },
    {
      label: "p50 (Median)",
      value: overview?.p50Ms != null ? formatLatency(overview.p50Ms) : "—",
      sub: renderDelta(deltas?.p50Pct, false) ?? "50% requests faster",
      tone: latencyTone(overview?.p50Ms),
    },
    {
      label: "p95 Latency",
      value: overview?.p95Ms != null ? formatLatency(overview.p95Ms) : "—",
      sub: renderDelta(deltas?.p95Pct, false) ?? "95% requests faster",
      tone: latencyTone(overview?.p95Ms),
    },
    {
      label: "p99 Latency",
      value: overview?.p99Ms != null ? formatLatency(overview.p99Ms) : "—",
      sub: overview?.maxLatencyMs != null ? `max ${formatLatency(overview.maxLatencyMs)}` : "slowest 1% tail",
      tone: latencyTone(overview?.p99Ms),
    },
    {
      label: "5xx Error Rate",
      value: overview?.errorRate5xxPct != null ? `${overview.errorRate5xxPct.toFixed(1)}%` : "0.0%",
      sub: renderDelta(deltas?.errorRatePct, false) ?? `${overview?.statusCodes?.c5xx ?? 0} errors`,
      tone: (overview?.errorRate5xxPct ?? 0) > 1 ? "bad" : (overview?.errorRate5xxPct ?? 0) > 0 ? "warn" : "good",
    },
  ];

  // Convert latency time series buckets to ChartSeries
  const chartSeries: ChartSeries[] = useMemo(() => {
    const buckets = timeseriesQuery.data?.buckets ?? [];
    if (buckets.length === 0) return [];

    return [
      {
        label: "p50",
        color: "var(--text)",
        points: buckets.map((b) => ({ t: new Date(b.bucket).getTime(), v: b.p50Ms })),
      },
      {
        label: "p95",
        color: "var(--violet)",
        points: buckets.map((b) => ({ t: new Date(b.bucket).getTime(), v: b.p95Ms })),
      },
      {
        label: "p99",
        color: "var(--text2)",
        dashed: true,
        points: buckets.map((b) => ({ t: new Date(b.bucket).getTime(), v: b.p99Ms })),
      },
      {
        label: "Avg",
        color: "var(--blue)",
        points: buckets.map((b) => ({ t: new Date(b.bucket).getTime(), v: b.avgLatencyMs })),
      },
    ];
  }, [timeseriesQuery.data?.buckets]);

  // Convert endpoint detail buckets to ChartSeries for the Drawer
  const endpointDetailChartSeries: ChartSeries[] = useMemo(() => {
    const buckets = endpointDetailQuery.data?.timeseries ?? [];
    if (buckets.length === 0) return [];
    return [
      {
        label: "p50",
        color: "var(--text)",
        points: buckets.map((b) => ({ t: new Date(b.bucket).getTime(), v: b.p50Ms })),
      },
      {
        label: "p95",
        color: "var(--violet)",
        points: buckets.map((b) => ({ t: new Date(b.bucket).getTime(), v: b.p95Ms })),
      },
      {
        label: "Avg",
        color: "var(--blue)",
        points: buckets.map((b) => ({ t: new Date(b.bucket).getTime(), v: b.avgLatencyMs })),
      },
    ];
  }, [endpointDetailQuery.data?.timeseries]);

  const endpointRows = endpointsQuery.data?.items ?? [];
  const maxP99 = Math.max(1, ...endpointRows.map((r) => r.p99Ms || r.p95Ms || 0));
  const slowRequests = slowRequestsQuery.data ?? [];
  const distributionBuckets = distributionQuery.data?.buckets ?? [];

  return (
    <div className="flex flex-col gap-5 pb-16">
      {/* Page Header */}
      <PageHeader
        title="Latency"
        description="High-resolution tail latency distribution, endpoint percentiles, and request degradation metrics."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {overview?.dataQuality && (
              <div
                className="hidden items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/50 px-2.5 py-1 text-[11px] text-[var(--text2)] sm:inline-flex"
                title={`${overview.dataQuality.sampleCount.toLocaleString()} events analyzed · Exact percentiles (PostgreSQL)`}
              >
                <CheckCircle2 className="size-3 text-[var(--green)]" />
                <span>Exact percentiles</span>
                <span className="font-[family-name:var(--mono)] text-[var(--text3)]">
                  ({formatCompact(overview.dataQuality.sampleCount)} samples)
                </span>
              </div>
            )}
            <TimeRangePicker />
            <button
              type="button"
              onClick={handleRefreshAll}
              aria-label="Refresh latency data"
              title="Refresh telemetry"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/40 text-[var(--text2)] transition-all hover:border-[var(--border2)] hover:bg-[var(--bg2)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border2)] cursor-pointer"
            >
              <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin text-[var(--text)]")} />
            </button>
          </div>
        }
      />

      {/* Global Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-3">
        {/* Search Input */}
        <div className="relative min-w-[220px] max-w-[340px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-[var(--text3)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Filter endpoint route…"
            className="h-8 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/50 pl-8 pr-7 text-[12px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--text3)] focus:border-[var(--border2)] focus:bg-[var(--bg2)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              aria-label="Clear endpoint search"
              className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full text-[var(--text3)] hover:text-[var(--text)]"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Method filter pills */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] text-[var(--text3)]">Method:</span>
          {HTTP_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMethod(m);
                setPage(1);
              }}
              className={cn(
                "h-7 rounded-[var(--radius)] px-2 font-[family-name:var(--mono)] text-[11px] font-medium transition-all cursor-pointer",
                method === m
                  ? "bg-[var(--text)] text-[var(--bg)] font-semibold shadow-xs"
                  : "border border-[var(--border)] bg-[var(--bg2)]/40 text-[var(--text2)] hover:border-[var(--border2)] hover:text-[var(--text)]",
              )}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Status class filter */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] text-[var(--text3)]">Status:</span>
          {STATUS_CLASSES.map((sc) => (
            <button
              key={sc}
              type="button"
              onClick={() => {
                setStatusClass(sc);
                setPage(1);
              }}
              className={cn(
                "h-7 rounded-[var(--radius)] px-2 font-[family-name:var(--mono)] text-[11px] font-medium transition-all cursor-pointer",
                statusClass === sc
                  ? "bg-[var(--text)] text-[var(--bg)] font-semibold shadow-xs"
                  : "border border-[var(--border)] bg-[var(--bg2)]/40 text-[var(--text2)] hover:border-[var(--border2)] hover:text-[var(--text)]",
              )}
            >
              {sc}
            </button>
          ))}
        </div>

        {/* Interval dropdown & comparison toggle */}
        <div className="flex items-center gap-2">
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            aria-label="Aggregation interval"
            className="h-8 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/50 px-2.5 text-[12px] text-[var(--text)] outline-none transition-all hover:border-[var(--border2)]"
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[var(--bg1)] text-[var(--text)]">
                {opt.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setComparePrevious(!comparePrevious)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border px-2.5 text-[12px] transition-all cursor-pointer",
              comparePrevious
                ? "border-[var(--border2)] bg-[var(--bg3)] text-[var(--text)] font-medium"
                : "border-[var(--border)] bg-[var(--bg2)]/40 text-[var(--text3)] hover:text-[var(--text2)]",
            )}
            title="Toggle previous period comparison calculation"
          >
            <SlidersHorizontal className="size-3" />
            <span className="hidden sm:inline">Compare prev</span>
          </button>
        </div>
      </div>

      {/* KPI Readout Band */}
      <ReadoutBand cells={kpiCells} loading={overviewQuery.isLoading && !overview} />

      {/* Main Percentiles Over Time Chart */}
      <Panel
        title="Latency Percentiles Over Time"
        description="Exact p50, p90, p95, and p99 percentiles calculated via PostgreSQL continuous percentile aggregation. Threshold marks 1.0s degradation limit."
      >
        <TimeSeriesChart
          window={window}
          height={240}
          format={(v) => formatLatency(v)}
          loading={timeseriesQuery.isLoading}
          threshold={{ value: SLOW_MS, label: "Slow Threshold (1 s)", color: "var(--red)" }}
          emptyLabel="No request samples recorded in this window."
          series={chartSeries}
        />
      </Panel>

      {/* Dual Deep Dive: Distribution & HTTP Status Series */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Latency Distribution Histogram */}
        <Panel
          title="Latency Distribution"
          description={
            distributionBuckets.length > 0
              ? `${(distributionQuery.data?.totalRequests ?? 0).toLocaleString()} requests across duration buckets. Tail bands (≥ 1s) highlighted in red.`
              : "Binned frequency distribution."
          }
        >
          {distributionQuery.isLoading ? (
            <div className="h-[210px] animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />
          ) : distributionBuckets.length === 0 ? (
            <EmptyNote>No latency distribution samples recorded for this window.</EmptyNote>
          ) : (
            <LatencyHistogramView
              buckets={distributionBuckets}
              p50={distributionQuery.data?.p50Ms}
              p90={distributionQuery.data?.p90Ms}
              p95={distributionQuery.data?.p95Ms}
              p99={distributionQuery.data?.p99Ms}
              totalRequests={distributionQuery.data?.totalRequests ?? 0}
            />
          )}
        </Panel>

        {/* HTTP Status Breakdown */}
        <Panel
          title="HTTP Status Distribution"
          description="Status class share across 2xx (healthy), 3xx (redirects), 4xx (client errors), and 5xx (server errors)."
        >
          {overviewQuery.isLoading && !overview ? (
            <div className="h-[210px] animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />
          ) : !overview || overview.totalRequests === 0 ? (
            <EmptyNote>No HTTP status logs recorded for this window.</EmptyNote>
          ) : (
            <HttpStatusBreakdownCard
              status2xx={overview.statusCodes.c2xx}
              status3xx={overview.statusCodes.c3xx}
              status4xx={overview.statusCodes.c4xx}
              status5xx={overview.statusCodes.c5xx}
              total={overview.totalRequests}
            />
          )}
        </Panel>
      </div>

      {/* Endpoints Performance Table */}
      <Panel
        title="Endpoint Performance & Tail Ranking"
        description="All monitored routes sorted by tail latency (p95 / p99), throughput, or error degradation. Click any endpoint row for granular drill-down analysis."
        flush
      >
        {endpointsQuery.isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : endpointRows.length === 0 ? (
          <div className="p-6">
            <EmptyNote title="No endpoints found">
              No matching endpoints recorded in this window with the active filters. Try selecting a wider time range or clearing the search query.
            </EmptyNote>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[840px]">
              {/* Table Header */}
              <div className="grid grid-cols-[minmax(0,1fr)_80px_80px_80px_220px_80px_70px] gap-4 border-b border-[var(--border)] px-5 py-2.5 text-[12px] font-medium text-[var(--text3)]">
                <span>Endpoint Route</span>
                <button
                  type="button"
                  onClick={() => {
                    setSortBy("requests");
                    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                  }}
                  className="text-right hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  Requests {sortBy === "requests" && (sortOrder === "desc" ? "↓" : "↑")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortBy("p50");
                    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                  }}
                  className="text-right hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  p50 {sortBy === "p50" && (sortOrder === "desc" ? "↓" : "↑")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortBy("p95");
                    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                  }}
                  className="text-right hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  p95 {sortBy === "p95" && (sortOrder === "desc" ? "↓" : "↑")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortBy("p99");
                    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                  }}
                  className="hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  p99 Tail Bar {sortBy === "p99" && (sortOrder === "desc" ? "↓" : "↑")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortBy("errorRate");
                    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                  }}
                  className="text-right hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  Errors {sortBy === "errorRate" && (sortOrder === "desc" ? "↓" : "↑")}
                </button>
                <span className="text-right">Action</span>
              </div>

              {/* Table Rows */}
              <ul className="divide-y divide-[var(--border)]">
                {endpointRows.map((r) => {
                  const isSelected = selectedEndpointId === r.endpoint;
                  const isSlowP95 = r.p95Ms >= SLOW_MS;
                  const isSlowP99 = r.p99Ms >= SLOW_MS;

                  return (
                    <li
                      key={`${r.method}-${r.endpoint}`}
                      onClick={() => setSelectedEndpointId(r.endpoint)}
                      className={cn(
                        "grid grid-cols-[minmax(0,1fr)_80px_80px_80px_220px_80px_70px] items-center gap-4 px-5 py-3 text-[12px] transition-colors cursor-pointer hover:bg-[var(--bg2)]/60",
                        isSelected && "bg-[var(--bg2)]",
                      )}
                    >
                      {/* Method + Route */}
                      <div className="flex min-w-0 items-center gap-2.5">
                        <MethodBadge method={r.method} />
                        <span
                          className="truncate font-[family-name:var(--mono)] text-[var(--text)]"
                          title={r.endpoint}
                        >
                          {r.endpoint}
                        </span>
                        {r.service && (
                          <span className="hidden sm:inline rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg3)]/60 px-1.5 py-0.2 text-[10px] text-[var(--text3)]">
                            {r.service}
                          </span>
                        )}
                      </div>

                      {/* Request count */}
                      <span className="text-right font-[family-name:var(--mono)] tabular-nums text-[var(--text2)]">
                        {formatCompact(r.requestCount)}
                      </span>

                      {/* p50 */}
                      <span className="text-right font-[family-name:var(--mono)] tabular-nums text-[var(--text2)]">
                        {formatLatency(r.p50Ms)}
                      </span>

                      {/* p95 */}
                      <span
                        className={cn(
                          "text-right font-[family-name:var(--mono)] tabular-nums font-medium",
                          isSlowP95
                            ? "text-[var(--red)]"
                            : r.p95Ms >= 500
                              ? "text-[var(--amber)]"
                              : "text-[var(--text)]",
                        )}
                      >
                        {formatLatency(r.p95Ms)}
                      </span>

                      {/* p99 relative bar */}
                      <div className="flex items-center gap-2">
                        <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg3)]" aria-hidden="true">
                          <span
                            className={cn(
                              "absolute inset-y-0 left-0 rounded-full transition-all",
                              isSlowP99 ? "bg-[var(--red)]" : "bg-[var(--text2)]",
                            )}
                            style={{ width: `${Math.min(100, (r.p99Ms / maxP99) * 100)}%` }}
                          />
                        </span>
                        <span
                          className={cn(
                            "w-14 text-right font-[family-name:var(--mono)] tabular-nums text-[11px]",
                            isSlowP99 ? "text-[var(--red)] font-medium" : "text-[var(--text2)]",
                          )}
                        >
                          {formatLatency(r.p99Ms)}
                        </span>
                      </div>

                      {/* Errors */}
                      <span
                        className={cn(
                          "text-right font-[family-name:var(--mono)] tabular-nums",
                          r.errorRatePct >= 5
                            ? "text-[var(--red)] font-semibold"
                            : r.errorRatePct > 0
                              ? "text-[var(--amber)]"
                              : "text-[var(--text3)]",
                        )}
                      >
                        {r.errorRatePct.toFixed(1)}%
                      </span>

                      {/* Inspect button */}
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEndpointId(r.endpoint);
                          }}
                          className="inline-flex items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-2 py-1 text-[11px] text-[var(--text2)] hover:border-[var(--border2)] hover:text-[var(--text)] cursor-pointer"
                        >
                          Detail
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Pagination controls */}
              {endpointsQuery.data?.pagination && endpointsQuery.data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-[12px] text-[var(--text3)]">
                  <span>
                    Showing {endpointRows.length} of {endpointsQuery.data.pagination.total} endpoints
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-2.5 py-1 text-[11px] text-[var(--text2)] disabled:opacity-40 hover:text-[var(--text)] cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="font-[family-name:var(--mono)] tabular-nums text-[var(--text)]">
                      Page {page} of {endpointsQuery.data.pagination.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={!endpointsQuery.data.pagination.hasMore}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-2.5 py-1 text-[11px] text-[var(--text2)] disabled:opacity-40 hover:text-[var(--text)] cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Panel>

      {/* Recent Slow Requests (≥ 1s) */}
      <Panel
        title="Recent Slow Requests (≥ 1,000 ms)"
        description="Top degradation events captured by the ingestion pipeline. Click any item to inspect its trace spans, database queries, and stack trace."
        action={
          <Link
            to="/observability/requests"
            className="inline-flex items-center gap-1 text-[12px] text-[var(--text2)] hover:text-[var(--text)]"
          >
            <span>All explorer requests</span>
            <ExternalLink className="size-3" />
          </Link>
        }
        flush
      >
        {slowRequestsQuery.isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : slowRequests.length === 0 ? (
          <div className="p-6">
            <EmptyNote title="Clean latency profile">
              No requests exceeded the 1,000 ms slow threshold during this time period.
            </EmptyNote>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {slowRequests.map((r: SlowRequestItem) => {
              const targetId = r.publicId || r.id;
              return (
                <li key={r.id}>
                  <Link
                    to={`/observability/requests/${encodeURIComponent(targetId)}`}
                    className="grid grid-cols-[64px_minmax(0,1fr)_60px_90px_120px_40px] items-center gap-4 px-5 py-3 transition-colors hover:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
                  >
                    <MethodBadge method={r.method} />
                    <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]" title={r.endpoint}>
                      {r.endpoint}
                    </span>
                    <StatusCodeBadge code={r.statusCode} />
                    <span className="text-right font-[family-name:var(--mono)] text-[12px] font-semibold tabular-nums text-[var(--red)]">
                      {formatLatency(r.durationMs)}
                    </span>
                    <span className="text-right text-[12px]">
                      <Timestamp value={r.occurredAt} />
                    </span>
                    <span className="text-right text-[var(--text3)]">
                      <ExternalLink className="size-3.5" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* Endpoint Detail Slide-Over Inspector (Sheet) */}
      <Sheet open={Boolean(selectedEndpointId)} onOpenChange={(open) => !open && setSelectedEndpointId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto bg-[var(--bg1)] border-[var(--border)] p-6">
          <SheetHeader className="p-0 pb-4 border-b border-[var(--border)]">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="flex items-center gap-2 text-[16px] font-semibold text-[var(--text)]">
                <Layers className="size-4 text-[var(--violet)]" />
                Endpoint Drill-Down
              </SheetTitle>
              {selectedEndpointId && (
                <CopyButton value={selectedEndpointId} label="Copy Route" className="h-7 text-[11px]" />
              )}
            </div>
            <SheetDescription className="mt-1 break-all font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">
              {selectedEndpointId}
            </SheetDescription>
          </SheetHeader>

          {endpointDetailQuery.isLoading ? (
            <div className="flex flex-col gap-4 py-8">
              <div className="h-20 animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />
              <div className="h-40 animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />
              <div className="h-32 animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />
            </div>
          ) : !endpointDetailQuery.data ? (
            <div className="py-8">
              <EmptyNote>No granular telemetry available for this endpoint in this window.</EmptyNote>
            </div>
          ) : (
            <div className="flex flex-col gap-6 py-4">
              {/* Endpoint Overview Readout Cells */}
              <div className="grid grid-cols-3 gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg2)]/50 p-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-[var(--text3)]">Requests</span>
                  <span className="font-[family-name:var(--mono)] text-[16px] font-semibold text-[var(--text)]">
                    {formatCompact(endpointDetailQuery.data.overview.totalRequests)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-[var(--text3)]">p50</span>
                  <span className="font-[family-name:var(--mono)] text-[16px] font-semibold text-[var(--text)]">
                    {formatLatency(endpointDetailQuery.data.overview.p50Ms)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-[var(--text3)]">p95</span>
                  <span className="font-[family-name:var(--mono)] text-[16px] font-semibold text-[var(--red)]">
                    {formatLatency(endpointDetailQuery.data.overview.p95Ms)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-[var(--text3)]">p99</span>
                  <span className="font-[family-name:var(--mono)] text-[16px] font-semibold text-[var(--text2)]">
                    {formatLatency(endpointDetailQuery.data.overview.p99Ms)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-[var(--text3)]">Avg</span>
                  <span className="font-[family-name:var(--mono)] text-[16px] font-semibold text-[var(--blue)]">
                    {formatLatency(endpointDetailQuery.data.overview.avgLatencyMs)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-[var(--text3)]">5xx Rate</span>
                  <span className="font-[family-name:var(--mono)] text-[16px] font-semibold text-[var(--amber)]">
                    {endpointDetailQuery.data.overview.errorRate5xxPct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Endpoint Timeseries */}
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-[var(--text)]">Latency Over Time</span>
                <TimeSeriesChart
                  window={window}
                  height={160}
                  format={(v) => formatLatency(v)}
                  series={endpointDetailChartSeries}
                  emptyLabel="No time series points for this route"
                />
              </div>

              {/* Endpoint Latency Distribution */}
              {endpointDetailQuery.data.distribution.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-medium text-[var(--text)]">Route Latency Distribution</span>
                  <LatencyHistogramView
                    buckets={endpointDetailQuery.data.distribution}
                    p50={endpointDetailQuery.data.overview.p50Ms}
                    p95={endpointDetailQuery.data.overview.p95Ms}
                    p99={endpointDetailQuery.data.overview.p99Ms}
                    totalRequests={endpointDetailQuery.data.overview.totalRequests}
                  />
                </div>
              )}

              {/* Endpoint Slow Requests */}
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-[var(--text)]">Route Slowest Executions</span>
                {endpointDetailQuery.data.recentSlowRequests.length === 0 ? (
                  <EmptyNote>No slow requests recorded for this specific route.</EmptyNote>
                ) : (
                  <ul className="divide-y divide-[var(--border)] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/30">
                    {endpointDetailQuery.data.recentSlowRequests.map((req) => (
                      <li key={req.id}>
                        <Link
                          to={`/observability/requests/${encodeURIComponent(req.publicId || req.id)}`}
                          className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[12px] hover:bg-[var(--bg2)]"
                        >
                          <div className="flex items-center gap-2">
                            <StatusCodeBadge code={req.statusCode} />
                            <span className="font-[family-name:var(--mono)] text-[var(--red)] font-semibold tabular-nums">
                              {formatLatency(req.durationMs)}
                            </span>
                          </div>
                          <Timestamp value={req.occurredAt} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
