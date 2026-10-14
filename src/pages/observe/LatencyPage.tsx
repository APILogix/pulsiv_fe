import { Link } from "react-router";
import {
  PageHeader, TimeRangePicker, useTimeRangeParams, useTimeWindow, ReadoutBand, Panel, EmptyNote,
  MethodBadge, StatusCodeBadge, Timestamp, formatCompact, formatLatency, rangeParams,
} from "@/shared/observe";
import type { ReadoutCell, TimeWindow } from "@/shared/observe";
import {
  useEndpointsAnalytics, useLatencyHistogram, useRequestSeries, useRequestSummary,
} from "@/modules/analytics/hooks/useAnalyticsV2";
import type { AnalyticsQueryParams } from "@/modules/analytics/api/analytics-v2.api";
import type { LatencyHistogramBucket, MetricSeries } from "@/modules/analytics/types/analytics-v2.types";
import { Heatmap } from "@/pages/dashboards/widgets";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import { TimeSeriesChart } from "./components/TimeSeriesChart";
import type { ChartSeries } from "./components/TimeSeriesChart";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { cn } from "@/lib/utils";

const SLOW_MS = 1000;

interface SlowRow { id: string; publicId?: string; method?: string; endpoint?: string; name?: string; statusCode?: number; durationMs?: number; occurredAt?: string }

function analyticsWindow(w: TimeWindow): AnalyticsQueryParams {
  const bucket: AnalyticsQueryParams["window"] =
    w.ms <= 3_600_000 ? "1m" : w.ms <= 86_400_000 ? "5m" : w.ms <= 7 * 86_400_000 ? "1h" : "1d";
  return { from: w.from.toISOString(), to: w.to.toISOString(), window: bucket };
}

const latencyTone = (v: number | null | undefined) => (v == null ? "neutral" : v >= SLOW_MS ? "bad" : v >= 500 ? "warn" : "neutral");

const PERCENTILE_SERIES: { match: RegExp; label: string; color: string }[] = [
  { match: /p50/, label: "p50", color: "var(--text)" },
  { match: /p90/, label: "p90", color: "var(--blue)" },
  { match: /p95/, label: "p95", color: "var(--violet)" },
  { match: /p99/, label: "p99", color: "var(--text2)" },
];

function toChartSeries(series: MetricSeries[] | undefined): ChartSeries[] {
  const list = series ?? [];
  return PERCENTILE_SERIES.map((def) => {
    const s = list.find((x) => def.match.test(x.key) && /latency/.test(x.key)) ?? list.find((x) => def.match.test(x.key));
    return {
      label: def.label,
      color: def.color,
      points: (s?.points ?? [])
        .map((p) => ({ t: new Date(p.t ?? p.bucket ?? "").getTime(), v: Number(p.v ?? p.value) }))
        .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v)),
    };
  }).filter((s) => s.points.length > 0);
}

function bucketLabel(b: LatencyHistogramBucket) {
  const f = (ms: number) => (ms >= 1000 ? `${ms / 1000}s` : `${ms}`);
  return b.toMs === null ? `${f(b.fromMs)}+` : `${f(b.fromMs)}–${f(b.toMs)}`;
}

/** Column histogram of request latency, with the p50/p95/p99 buckets marked. */
function Distribution({ buckets, marks }: { buckets: LatencyHistogramBucket[]; marks: { label: string; value: number | null | undefined }[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const total = buckets.reduce((s, b) => s + b.count, 0);
  const markFor = (b: LatencyHistogramBucket) =>
    marks.filter((m) => m.value != null && m.value >= b.fromMs && (b.toMs === null || m.value < b.toMs)).map((m) => m.label);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-[180px] items-end gap-1" role="img" aria-label={`Latency histogram over ${total.toLocaleString()} requests`}>
        {buckets.map((b) => {
          const tagged = markFor(b);
          const slow = b.fromMs >= SLOW_MS;
          return (
            <div key={b.fromMs} className="group relative flex h-full flex-1 flex-col justify-end" title={`${bucketLabel(b)} ms · ${b.count.toLocaleString()} requests · ${b.cumulativePct.toFixed(1)}% cumulative`}>
              {tagged.length > 0 && (
                <span className="mb-1 text-center font-[family-name:var(--mono)] text-[10px] text-[var(--text2)]">{tagged.join(" ")}</span>
              )}
              <div
                className={cn("w-full rounded-[2px] transition-colors", slow ? "bg-[var(--red)]/70 group-hover:bg-[var(--red)]" : "bg-[var(--border2)] group-hover:bg-[var(--text2)]")}
                style={{ height: `${b.count === 0 ? 0 : Math.max(3, (b.count / max) * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 font-[family-name:var(--mono)] text-[10px] tabular-nums text-[var(--text3)]">
        {buckets.map((b) => <span key={b.fromMs} className="flex-1 truncate text-center">{bucketLabel(b)}</span>)}
      </div>
    </div>
  );
}

export default function LatencyPage() {
  const { timeRangeState } = useTimeRangeParams();
  const window = useTimeWindow(timeRangeState);
  const activeProjectSlug = useOrgStore((s) => s.activeProjectSlug);
  const overrides = analyticsWindow(window);

  const summary = useRequestSummary(overrides);
  const series = useRequestSeries("latency", overrides);
  const histogram = useLatencyHistogram(overrides);
  const endpoints = useEndpointsAnalytics({ ...overrides, limit: 50 });
  // Raw explorer statistics are computed straight from events, so the headline
  // percentiles do not depend on the rollup workers being caught up.
  const raw = useObservabilityList<Record<string, unknown>>("requests", { project: activeProjectSlug ?? undefined, ...rangeParams(timeRangeState), limit: 1 });
  const slow = useObservabilityList<SlowRow>("requests", { project: activeProjectSlug ?? undefined, ...rangeParams(timeRangeState), duration: `gte:${SLOW_MS}`, limit: 12 });

  const stats = raw.data?.statistics ?? {};
  const pct = summary.data?.data?.latency?.percentiles ?? {};
  const p = (key: "p50" | "p75" | "p90" | "p95" | "p99") => {
    const fromRaw = stats[key];
    if (fromRaw !== undefined && fromRaw !== null) return Number(fromRaw);
    const v = pct[key];
    return v === undefined || v === null ? null : Number(v);
  };
  const total = Number(raw.data?.summary?.total ?? 0);
  const slowCount = Number(raw.data?.summary?.slow ?? 0);

  const cells: ReadoutCell[] = [
    { label: "p50", value: p("p50") != null ? formatLatency(p("p50")!) : "—", sub: "median", tone: latencyTone(p("p50")) },
    { label: "p75", value: p("p75") != null ? formatLatency(p("p75")!) : "—" },
    { label: "p90", value: p("p90") != null ? formatLatency(p("p90")!) : "—", tone: latencyTone(p("p90")) },
    { label: "p95", value: p("p95") != null ? formatLatency(p("p95")!) : "—", tone: latencyTone(p("p95")) },
    { label: "p99", value: p("p99") != null ? formatLatency(p("p99")!) : "—", tone: latencyTone(p("p99")), sub: stats.maxLatency != null ? `max ${formatLatency(Number(stats.maxLatency))}` : undefined },
    { label: "Slow requests", value: formatCompact(slowCount), sub: total ? `${((slowCount / total) * 100).toFixed(1)}% of ${formatCompact(total)}` : "flagged slow", tone: slowCount > 0 ? "warn" : "neutral" },
  ];

  const chartSeries = toChartSeries(series.data?.data?.series);
  const buckets = histogram.data?.data?.buckets ?? [];
  const heat = histogram.data?.data?.heatmap;
  const rows = [...(endpoints.data?.data?.table?.rows ?? [])].sort((a, b) => (b.p95Ms ?? 0) - (a.p95Ms ?? 0));
  const maxP95 = Math.max(1, ...rows.map((r) => r.p99Ms ?? r.p95Ms ?? 0));
  const slowRows = slow.data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Latency"
        description="Request latency percentiles over time, how response times are distributed, and which endpoints own the tail."
        actions={<TimeRangePicker />}
      />

      <ReadoutBand cells={cells} loading={raw.isLoading && !raw.data} />

      <Panel title="Percentiles over time" description="p50 shows the typical request; p95 and p99 show what your slowest users wait for.">
        <TimeSeriesChart
          window={window}
          height={240}
          format={(v) => formatLatency(v)}
          loading={series.isLoading}
          threshold={{ value: SLOW_MS, label: "Slow (1 s)", color: "var(--red)" }}
          emptyLabel="No latency rollups for this window yet"
          series={chartSeries}
        />
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Distribution" description={buckets.length ? `${buckets.reduce((s, b) => s + b.count, 0).toLocaleString()} requests by latency bucket (ms). Red buckets are 1 s or slower.` : undefined}>
          {histogram.isLoading ? (
            <div className="h-[200px] animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />
          ) : buckets.length === 0 ? (
            <EmptyNote>No latency histogram for this window.</EmptyNote>
          ) : (
            <Distribution buckets={buckets} marks={[{ label: "p50", value: p("p50") }, { label: "p95", value: p("p95") }, { label: "p99", value: p("p99") }]} />
          )}
        </Panel>

        <Panel title="Latency heatmap" description="Request count per latency band over time. Brighter cells hold more requests.">
          {histogram.isLoading ? (
            <div className="h-[200px] animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />
          ) : !heat?.rows?.length ? (
            <EmptyNote>No heatmap cells for this window.</EmptyNote>
          ) : (
            <Heatmap rows={heat.rows} columns={heat.columns?.length} />
          )}
        </Panel>
      </div>

      <Panel title="Endpoints by p95" description="The routes that make up the tail. Bars run to each endpoint's p99." flush>
        {endpoints.isLoading ? (
          <div className="flex flex-col gap-1.5 p-5">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-8 animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />)}</div>
        ) : rows.length === 0 ? (
          <div className="p-5"><EmptyNote>No endpoint rollups for this window.</EmptyNote></div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[minmax(0,1fr)_84px_84px_84px_220px_80px] gap-4 border-b border-[var(--border)] px-5 py-2.5 text-[12px] font-medium text-[var(--text3)]">
                <span>Endpoint</span><span className="text-right">Requests</span><span className="text-right">p50</span><span className="text-right">p95</span><span>p99</span><span className="text-right">Errors</span>
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {rows.slice(0, 25).map((r) => (
                  <li key={`${r.service ?? ""}-${r.endpoint}`} className="grid grid-cols-[minmax(0,1fr)_84px_84px_84px_220px_80px] items-center gap-4 px-5 py-2.5 text-[12px]">
                    <span className="min-w-0">
                      <span className="block truncate font-[family-name:var(--mono)] text-[var(--text)]" title={r.endpoint}>{r.endpoint}</span>
                      {r.service && <span className="block truncate text-[11px] text-[var(--text3)]">{r.service}</span>}
                    </span>
                    <span className="text-right font-[family-name:var(--mono)] tabular-nums text-[var(--text2)]">{formatCompact(r.requests)}</span>
                    <span className="text-right font-[family-name:var(--mono)] tabular-nums text-[var(--text2)]">{r.p50Ms != null ? formatLatency(r.p50Ms) : "—"}</span>
                    <span className={cn("text-right font-[family-name:var(--mono)] tabular-nums", (r.p95Ms ?? 0) >= SLOW_MS ? "text-[var(--red)]" : (r.p95Ms ?? 0) >= 500 ? "text-[var(--amber)]" : "text-[var(--text)]")}>
                      {r.p95Ms != null ? formatLatency(r.p95Ms) : "—"}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg3)]" aria-hidden="true">
                        <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--border2)]" style={{ width: `${((r.p99Ms ?? 0) / maxP95) * 100}%` }} />
                        <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--text2)]" style={{ width: `${((r.p95Ms ?? 0) / maxP95) * 100}%` }} />
                      </span>
                      <span className="w-14 text-right font-[family-name:var(--mono)] tabular-nums text-[var(--text2)]">{r.p99Ms != null ? formatLatency(r.p99Ms) : "—"}</span>
                    </span>
                    <span className={cn("text-right font-[family-name:var(--mono)] tabular-nums", (r.errorRatePct ?? 0) >= 5 ? "text-[var(--red)]" : "text-[var(--text3)]")}>
                      {r.errorRatePct != null ? `${r.errorRatePct.toFixed(1)}%` : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Panel>

      <Panel
        title="Recent slow requests"
        description={`The latest requests that took ${formatLatency(SLOW_MS)} or longer.`}
        action={<Link to="/observability/requests" className="text-[12px] text-[var(--text2)] hover:text-[var(--text)]">All requests</Link>}
        flush
      >
        {slow.isLoading ? (
          <div className="flex flex-col gap-1.5 p-5">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-8 animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />)}</div>
        ) : slowRows.length === 0 ? (
          <div className="p-5"><EmptyNote>No request took {formatLatency(SLOW_MS)} or longer in this window.</EmptyNote></div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {slowRows.map((r) => (
              <li key={r.publicId ?? r.id}>
                <Link
                  to={`/observability/requests/${encodeURIComponent(r.publicId ?? r.id)}`}
                  className="grid grid-cols-[64px_minmax(0,1fr)_56px_80px_104px] items-center gap-4 px-5 py-2.5 transition-colors hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
                >
                  <MethodBadge method={r.method} />
                  <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{r.endpoint ?? r.name}</span>
                  <StatusCodeBadge code={r.statusCode} />
                  <span className="text-right font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--red)]">{formatLatency(Number(r.durationMs ?? 0))}</span>
                  <span className="text-right"><Timestamp value={r.occurredAt} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
