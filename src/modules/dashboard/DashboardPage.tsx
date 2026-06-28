import { useNavigate } from "react-router";
import {
  AlertTriangle, Globe, Timer, Gauge as GaugeIcon, Siren,
} from "lucide-react";
import { useErrorEvents, useRequestEvents, useIncidents } from "@/hooks/useDummyData";
import { useTimeRangeStore, TIME_RANGES } from "@/stores/timeRangeStore";
import {
  PageHeader, SectionCard, KpiCard, FilterSelect,
  Timestamp, MonospaceText, StatusBadge, formatCompact, formatLatency,
} from "@/shared/observe";
import {
  Gauge, AreaChart, MultiLineChart, DualAxisChart, Donut, BarList, StatTile, CHART_COLORS,
} from "@/pages/dashboards/widgets";
import {
  percentile, avg, errorRate, bucketCounts, seededSeries, uniqueBy, groupBy,
} from "@/pages/dashboards/lib";

const TIME_OPTIONS = TIME_RANGES.map((r) => ({ value: r, label: r }));

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--green)]/30 bg-[var(--green-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--green)]">
      <span className="size-1.5 rounded-full bg-[var(--green)] pulse-dot" />
      Live
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="Real-time health across your monitored API portfolio." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`kpi-skel-${i}`} className="h-[104px] animate-pulse rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-[280px] animate-pulse rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] lg:col-span-2" />
        <div className="h-[280px] animate-pulse rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const timeRange = useTimeRangeStore((s) => s.timeRange);
  const setTimeRange = useTimeRangeStore((s) => s.setTimeRange);
  const requests = useRequestEvents();
  const errors = useErrorEvents();
  const incidents = useIncidents();

  if (requests.isLoading || errors.isLoading) {
    return <DashboardSkeleton />;
  }

  const reqList = requests.data ?? [];
  const errList = errors.data ?? [];
  const incList = incidents.data ?? [];

  const total = reqList.length;
  const latencies = reqList.map((r) => r.latency);
  const p95 = percentile(latencies, 95);
  const rate = errorRate(reqList);
  const availability = total ? (reqList.filter((r) => r.statusCode < 500).length / total) * 100 : 100;
  const latencyScore = Math.max(0, 100 - p95 / 10);
  const healthScore = Math.round(availability * 0.4 + (1 - rate / 100) * 100 * 0.35 + latencyScore * 0.25);
  const openIncidents = incList.filter((i) => i.status === "open" || i.status === "investigating").length;

  // Time-bucketed series for the trend graphs.
  const volumeSeries = bucketCounts(reqList, 32).map((c) => c * 14 + 60);
  const errorSeries = bucketCounts(errList, 24).map((c) => c + 1);
  const volBars = bucketCounts(reqList, 24).map((c) => c * 12 + 40);

  // Status-code distribution → donut.
  const family = (code: number) => (code >= 500 ? "5xx" : code >= 400 ? "4xx" : code >= 300 ? "3xx" : "2xx");
  const statusGroups = groupBy(reqList, (r) => family(r.statusCode));
  const statusSegments = [
    { label: "2xx Success", value: statusGroups["2xx"]?.length ?? 0, color: "var(--green)" },
    { label: "3xx Redirect", value: statusGroups["3xx"]?.length ?? 0, color: "var(--blue)" },
    { label: "4xx Client", value: statusGroups["4xx"]?.length ?? 0, color: "var(--amber)" },
    { label: "5xx Server", value: statusGroups["5xx"]?.length ?? 0, color: "var(--red)" },
  ].filter((s) => s.value > 0);

  // Top endpoints by traffic.
  const topEndpoints = Object.entries(groupBy(reqList, (r) => `${r.method} ${r.route}`))
    .map(([k, rs]) => ({ key: k, count: rs.length, p95: percentile(rs.map((r) => r.latency), 95) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  const recentErrors = [...errList].slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Real-time health across your monitored API portfolio · auto-refreshes every 60s."
        actions={
          <div className="flex items-center gap-2">
            <LiveBadge />
            <FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />
          </div>
        }
      />

      {/* KPI ribbon */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <SectionCard className="row-span-2 flex items-center justify-center">
          <Gauge value={healthScore} label={`${healthScore}`} sublabel="Health score — availability, error rate, P95 latency" />
        </SectionCard>
        <KpiCard label="API calls (24h)" value={formatCompact(total * 1240)} delta="+12.4% vs prev" trend="up" icon={Globe} />
        <KpiCard label="Error rate" value={`${rate.toFixed(2)}%`} delta="-0.08% vs prev" trend="up" icon={AlertTriangle} />
        <KpiCard label="P95 latency" value={formatLatency(p95)} delta="-22ms vs prev" trend="up" icon={Timer} />
        <KpiCard label="Availability" value={`${availability.toFixed(2)}%`} delta="+0.01%" trend="up" icon={GaugeIcon} />
        <KpiCard
          label="Active incidents"
          value={openIncidents}
          delta={openIncidents ? "Needs attention" : "All clear"}
          trend={openIncidents ? "down" : "up"}
          icon={Siren}
        />
        <div className="hidden xl:block" />
      </div>

      {/* Request volume + status distribution */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Request volume (24h)"
          className="lg:col-span-2"
          action={<button onClick={() => navigate("/observability/requests")} className="text-[12px] text-[var(--brand)]">View requests →</button>}
        >
          <AreaChart data={volumeSeries} label="volume" color="var(--brand)" />
          <div className="mt-3 flex items-center gap-4 text-[11px] text-[var(--text2)]">
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-[var(--brand)] opacity-70" /> Requests / min</span>
            <span className="text-[var(--text3)]">Peak {formatCompact(Math.max(...volumeSeries) * 18)} req/min</span>
          </div>
        </SectionCard>

        <SectionCard title="Status code distribution">
          {statusSegments.length === 0 ? (
            <p className="text-[13px] text-[var(--text3)]">No request data.</p>
          ) : (
            <Donut
              segments={statusSegments}
              centerLabel={formatCompact(total)}
              centerSub="requests"
            />
          )}
        </SectionCard>
      </div>

      {/* Latency percentiles + volume/error correlation */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Latency percentiles over time">
          <MultiLineChart
            series={[
              { label: "P50", color: CHART_COLORS[2], data: seededSeries("p50", 24, percentile(latencies, 50), 30) },
              { label: "P90", color: CHART_COLORS[3], data: seededSeries("p90", 24, percentile(latencies, 90), 60) },
              { label: "P95", color: CHART_COLORS[5], data: seededSeries("p95", 24, p95, 80) },
              { label: "P99", color: CHART_COLORS[4], data: seededSeries("p99", 24, percentile(latencies, 99), 120) },
            ]}
          />
        </SectionCard>

        <SectionCard title="Volume vs error correlation">
          <DualAxisChart bars={volBars} line={errorSeries} />
          <div className="mt-2 flex gap-4 text-[11px] text-[var(--text2)]">
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-[var(--brand)] opacity-60" /> Requests/min</span>
            <span className="flex items-center gap-1.5"><span className="h-1 w-3 rounded-full bg-[var(--red)]" /> Errors/min</span>
          </div>
        </SectionCard>
      </div>

      {/* Top endpoints + recent errors */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Top endpoints by traffic"
          action={<button onClick={() => navigate("/observability/requests")} className="text-[12px] text-[var(--brand)]">All →</button>}
        >
          <BarList
            items={topEndpoints.map((e) => ({
              label: e.key,
              value: e.count,
              sub: formatLatency(e.p95),
              color: e.p95 > 1000 ? "var(--red)" : e.p95 > 500 ? "var(--amber)" : "var(--brand)",
              onClick: () => navigate("/observability/requests"),
            }))}
            valueFormat={(v) => formatCompact(v * 320)}
          />
        </SectionCard>

        <SectionCard
          title="Recent errors"
          action={<button onClick={() => navigate("/observability/errors")} className="text-[12px] text-[var(--brand)]">View all →</button>}
        >
          {recentErrors.length === 0 ? (
            <p className="text-[13px] text-[var(--text3)]">No errors in range.</p>
          ) : (
            <div className="flex flex-col divide-y divide-[var(--border)]">
              {recentErrors.map((e) => (
                <button
                  key={e.eventId}
                  onClick={() => navigate(`/observability/errors/${e.fingerprint}`)}
                  className="flex items-center gap-3 py-2.5 text-left first:pt-0 last:pb-0 hover:opacity-80"
                >
                  <MonospaceText value={e.fingerprint.slice(0, 8)} className="w-16 shrink-0 text-[var(--text3)]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-[var(--text)]">{e.name}</div>
                    <div className="truncate text-[12px] text-[var(--text3)]">{e.message}</div>
                  </div>
                  <Timestamp value={e.timestamp} />
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Incidents + stat tiles */}
      {incList.length > 0 && (
        <SectionCard
          title="Active incidents"
          action={<button onClick={() => navigate("/alerts")} className="text-[12px] text-[var(--brand)]">Incident center →</button>}
        >
          <div className="flex flex-col divide-y divide-[var(--border)]">
            {incList.slice(0, 4).map((inc) => (
              <button
                key={inc.id}
                onClick={() => navigate(`/alerts/${inc.id}`)}
                className="flex items-center gap-3 py-2.5 text-left first:pt-0 last:pb-0 hover:opacity-80"
              >
                <StatusBadge status={inc.status} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text)]">{inc.title}</span>
                <Timestamp value={inc.startedAt} />
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Total requests" value={formatCompact(total * 1240)} />
        <StatTile label="Unique error groups" value={uniqueBy(errList, (e) => e.fingerprint)} />
        <StatTile label="Avg latency" value={formatLatency(Math.round(avg(latencies)))} />
        <StatTile label="Open incidents" value={openIncidents} tone={openIncidents ? "var(--red)" : "var(--green)"} />
      </div>
    </div>
  );
}
