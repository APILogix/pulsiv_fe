import { useNavigate } from "react-router";
import { AlertTriangle, DollarSign, Gauge as GaugeIcon, Globe, Timer } from "lucide-react";
import { useErrorEvents, useRequestEvents } from "@/hooks/useDummyData";
import { useTimeRangeStore, TIME_RANGES } from "@/stores/timeRangeStore";
import {
  PageHeader, SectionCard, KpiCard, FilterSelect,
  Timestamp, MonospaceText, formatCompact, formatLatency,
} from "@/shared/observe";
import { EmptyState } from "@/shared/components/EmptyState";
import { DualAxisChart, MultiLineChart, BarList, StatTile, CHART_COLORS } from "./widgets";
import { percentile, avg, errorRate, bucketCounts, seededSeries, uniqueBy, groupBy } from "./lib";

const TIME_OPTIONS = TIME_RANGES.map((r) => ({ value: r, label: r }));
const SERVICES = ["api-gateway", "user-service", "payment-service", "notification-service", "analytics-service", "billing-service"];

export default function ExecutiveCommandCenter() {
  const navigate = useNavigate();
  const timeRange = useTimeRangeStore((s) => s.timeRange);
  const setTimeRange = useTimeRangeStore((s) => s.setTimeRange);
  const requests = useRequestEvents();
  const errors = useErrorEvents();

  const reqList = requests.data ?? [];
  const errList = errors.data ?? [];

  if (!requests.isLoading && reqList.length === 0 && errList.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Executive Command Center" description="Single-pane health of the entire API portfolio." />
        <EmptyState message="No data available for the selected time range. Verify SDK integration or adjust filters." />
      </div>
    );
  }

  const total = reqList.length;
  const latencies = reqList.map((r) => r.latency);
  const p95 = percentile(latencies, 95);
  const rate = errorRate(reqList);
  const availability = total ? (reqList.filter((r) => r.statusCode < 500).length / total) * 100 : 100;
  // latencyScore is removed to fix unused variable error
  // healthScore is removed to fix unused variable error

  const paymentFails = reqList.filter((r) => r.url.includes("/payment") && r.statusCode >= 500).length;
  const revenueAtRisk = paymentFails * 285; // avg txn value

  const volumeSeries = bucketCounts(reqList, 24).map((c) => c * 12 + 40);
  const errorSeries = bucketCounts(errList, 24).map((c) => c + 1);

  const topErrors = [...errList].slice(0, 6);
  const slowest = Object.entries(groupBy(reqList, (r) => `${r.method} ${r.route}`))
    .map(([k, rs]) => ({ key: k, p95: percentile(rs.map((r) => r.latency), 95), count: rs.length }))
    .sort((a, b) => b.p95 - a.p95)
    .slice(0, 7);

  const services = SERVICES.map((svc, i) => {
    const svcReqs = reqList.filter((r) => r.metadata.service === svc);
    const score = 99.95 - i * 0.7;
    return {
      name: svc,
      score,
      tone: score > 99 ? "var(--green)" : score > 97 ? "var(--amber)" : "var(--red)",
      spark: seededSeries(svc, 24, 60, 30),
      count: svcReqs.length,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Executive Command Center"
        description="Single-pane health of the entire API portfolio · auto-refreshes every 60s."
        actions={<FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />}
      />

      {/* KPI ribbon */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="API calls (24h)" value={formatCompact(total * 1240)} delta="+12.4% vs prev" trend="up" icon={Globe} />
        <KpiCard label="Error rate" value={`${rate.toFixed(2)}%`} delta="-0.08% vs prev" trend="up" icon={AlertTriangle} />
        <KpiCard label="P95 latency" value={formatLatency(p95)} delta="-22ms vs prev" trend="up" icon={Timer} />
        <KpiCard label="Availability" value={`${availability.toFixed(2)}%`} delta="+0.01%" trend="up" icon={GaugeIcon} />
        <KpiCard
          label="Revenue at risk"
          value={revenueAtRisk ? `$${revenueAtRisk.toLocaleString()}` : "$0"}
          delta={paymentFails ? `${paymentFails} failed payment reqs` : "No payment failures"}
          trend={revenueAtRisk ? "down" : "up"}
          icon={DollarSign}
        />
      </div>

      {/* Service health grid */}
      <SectionCard title="Service health">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((svc) => (
            <button
              key={svc.name}
              onClick={() => navigate(`/dashboards/performance?service=${svc.name}`)}
              className="rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] p-3 text-left transition-colors hover:border-[var(--input)]"
            >
              <div className="flex items-center justify-between">
                <span className="truncate text-[13px] font-medium text-[var(--text)]">{svc.name}</span>
                <span className="size-2 rounded-full pulse-dot" style={{ background: svc.tone }} />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-semibold tabular-nums text-[var(--text)]">{svc.score.toFixed(2)}%</span>
                <span className="text-[11px] text-[var(--text3)]">{formatCompact(svc.count * 320)} req/min</span>
              </div>
              <div className="mt-1 text-[11px] text-[var(--text3)]">Last deploy 4h ago · v2.4.1</div>
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Request volume & error correlation">
          <DualAxisChart bars={volumeSeries} line={errorSeries} />
          <div className="mt-2 flex gap-4 text-[11px] text-[var(--text2)]">
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-[var(--brand)] opacity-60" /> Requests/min</span>
            <span className="flex items-center gap-1.5"><span className="h-1 w-3 rounded-full bg-[var(--red)]" /> Errors/min</span>
          </div>
        </SectionCard>

        <SectionCard title="Latency distribution over time">
          <MultiLineChart
            series={[
              { label: "P50", color: CHART_COLORS[2], data: seededSeries("p50", 24, percentile(latencies, 50), 30) },
              { label: "P75", color: CHART_COLORS[1], data: seededSeries("p75", 24, percentile(latencies, 75), 40) },
              { label: "P90", color: CHART_COLORS[3], data: seededSeries("p90", 24, percentile(latencies, 90), 60) },
              { label: "P95", color: CHART_COLORS[5], data: seededSeries("p95", 24, p95, 80) },
              { label: "P99", color: CHART_COLORS[4], data: seededSeries("p99", 24, percentile(latencies, 99), 120) },
            ]}
          />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Top error groups (24h)" action={<button onClick={() => navigate("/dashboards/errors")} className="text-[12px] text-[var(--brand)]">View all →</button>}>
          {topErrors.length === 0 ? <EmptyState message="No errors in range" /> : (
            <div className="flex flex-col divide-y divide-[var(--border)]">
              {topErrors.map((e) => (
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
                  <span className="shrink-0 tabular-nums text-[12px] text-[var(--text2)]">{e.user ? 1 : 0} usr</span>
                  <Timestamp value={e.timestamp} />
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Slowest endpoints">
          <BarList
            items={slowest.map((s) => ({
              label: s.key,
              value: s.p95,
              sub: `${s.count} req`,
              color: s.p95 > 1000 ? "var(--red)" : s.p95 > 500 ? "var(--amber)" : "var(--green)",
              onClick: () => navigate("/dashboards/performance"),
            }))}
            valueFormat={formatLatency}
          />
        </SectionCard>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Unique error groups" value={uniqueBy(errList, (e) => e.fingerprint)} />
        <StatTile label="Affected users" value={uniqueBy(errList.filter((e) => e.user), (e) => e.user!.id)} />
        <StatTile label="Avg latency" value={formatLatency(Math.round(avg(latencies)))} />
        <StatTile label="Services monitored" value={SERVICES.length} />
      </div>
    </div>
  );
}
