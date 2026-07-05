import { useNavigate } from "react-router";
import { useErrorEvents, useRequestEvents } from "@/hooks/useDummyData";
import { useTimeRangeStore, TIME_RANGES } from "@/stores/timeRangeStore";
import {
  PageHeader, SectionCard, FilterSelect,
  Timestamp, MonospaceText, formatCompact, formatLatency,
} from "@/shared/observe";
import { EmptyState } from "@/shared/components/EmptyState";
import { DualAxisChart, MultiLineChart, BarList, ChartCard, HeroBand, ZoneLabel, CHART_COLORS } from "./widgets";
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
  const healthy = services.filter((s) => s.score > 99).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Executive Command Center"
        description="Single-pane health of the entire API portfolio · auto-refreshes every 60s."
        actions={<FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />}
      />

      {/* Hero metric band */}
      <HeroBand
        metrics={[
          { label: "API calls (24h)", value: formatCompact(total * 1240), delta: "+12.4% vs prev", trend: "up", spark: seededSeries("exec-calls", 20, 70, 25) },
          { label: "Error rate", value: `${rate.toFixed(2)}%`, delta: "-0.08% vs prev", trend: "up", spark: seededSeries("exec-err", 20, 30, 20), sparkColor: "var(--red)" },
          { label: "P95 latency", value: formatLatency(p95), delta: "-22ms vs prev", trend: "up", spark: seededSeries("exec-lat", 20, 55, 30), sparkColor: "var(--blue)" },
          { label: "Availability", value: `${availability.toFixed(2)}%`, delta: "+0.01%", trend: "up" },
          {
            label: "Revenue at risk",
            value: revenueAtRisk ? `$${revenueAtRisk.toLocaleString()}` : "$0",
            delta: paymentFails ? `${paymentFails} failed payments` : "No payment failures",
            trend: revenueAtRisk ? "down" : "up",
          },
        ]}
      />

      <ZoneLabel>Traffic &amp; latency</ZoneLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Request volume & error correlation"
          legend={[
            { label: "Requests/min", color: "var(--brand)" },
            { label: "Errors/min", color: "var(--red)" },
          ]}
          headline={formatCompact(total * 1240)}
          headlineLabel="total requests"
          timeAxis="24 hours ago"
        >
          <DualAxisChart bars={volumeSeries} line={errorSeries} height={190} />
        </ChartCard>

        <ChartCard
          title="Latency distribution"
          legend={[
            { label: "P50", color: CHART_COLORS[2], value: formatLatency(percentile(latencies, 50)) },
            { label: "P90", color: CHART_COLORS[3], value: formatLatency(percentile(latencies, 90)) },
            { label: "P95", color: CHART_COLORS[5], value: formatLatency(p95) },
            { label: "P99", color: CHART_COLORS[4], value: formatLatency(percentile(latencies, 99)) },
          ]}
          timeAxis="24 hours ago"
        >
          <MultiLineChart
            height={190}
            series={[
              { label: "P50", color: CHART_COLORS[2], data: seededSeries("p50", 24, percentile(latencies, 50), 30) },
              { label: "P75", color: CHART_COLORS[1], data: seededSeries("p75", 24, percentile(latencies, 75), 40) },
              { label: "P90", color: CHART_COLORS[3], data: seededSeries("p90", 24, percentile(latencies, 90), 60) },
              { label: "P95", color: CHART_COLORS[5], data: seededSeries("p95", 24, p95, 80) },
              { label: "P99", color: CHART_COLORS[4], data: seededSeries("p99", 24, percentile(latencies, 99), 120) },
            ]}
          />
        </ChartCard>
      </div>

      <ZoneLabel>Service fleet · {healthy}/{services.length} healthy</ZoneLabel>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((svc) => (
          <button
            key={svc.name}
            onClick={() => navigate(`/dashboards/performance?service=${svc.name}`)}
            className="group rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4 text-left transition-colors hover:border-[var(--input)]"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 truncate font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--text)]">
                <span className="size-2 shrink-0 rounded-full pulse-dot" style={{ background: svc.tone }} />
                {svc.name}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">v2.4.1</span>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <div className="text-xl font-semibold tabular-nums leading-none" style={{ color: svc.tone }}>{svc.score.toFixed(2)}%</div>
                <div className="mt-1 text-[11px] text-[var(--text3)]">{formatCompact(svc.count * 320)} req/min · deployed 4h ago</div>
              </div>
              <svg width={72} height={24} className="shrink-0 opacity-70">
                {(() => {
                  const data = svc.spark;
                  const max = Math.max(...data, 1);
                  const min = Math.min(...data, 0);
                  const range = max - min || 1;
                  const step = 72 / (data.length - 1 || 1);
                  const pts = data.map((d, i) => `${i * step},${24 - ((d - min) / range) * 24}`).join(" ");
                  return <polyline points={pts} fill="none" stroke={svc.tone} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />;
                })()}
              </svg>
            </div>
          </button>
        ))}
      </div>

      <ZoneLabel>Attention required</ZoneLabel>

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

        <SectionCard title="Slowest endpoints" action={<button onClick={() => navigate("/dashboards/performance")} className="text-[12px] text-[var(--brand)]">Deep dive →</button>}>
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

      <HeroBand
        metrics={[
          { label: "Unique error groups", value: uniqueBy(errList, (e) => e.fingerprint) },
          { label: "Affected users", value: uniqueBy(errList.filter((e) => e.user), (e) => e.user!.id) },
          { label: "Avg latency", value: formatLatency(Math.round(avg(latencies))) },
          { label: "Services monitored", value: SERVICES.length },
        ]}
      />
    </div>
  );
}
