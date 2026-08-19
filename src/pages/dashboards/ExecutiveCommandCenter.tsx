import { useNavigate } from "react-router";
import { useErrorEvents, useRequestEvents } from "@/hooks/useDummyData";
import { useTimeRangeStore, TIME_RANGES } from "@/stores/timeRangeStore";
import {
  formatCompact, formatLatency,
} from "@/shared/observe";
import { DualAxisChart, MultiLineChart, BarList, CHART_COLORS } from "./widgets";
import { percentile, errorRate, bucketCounts, seededSeries, groupBy } from "./lib";
import {
  Server,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  const total = reqList.length || 18420;
  const latencies = reqList.map((r) => r.latency).length ? reqList.map((r) => r.latency) : [42, 65, 88, 120, 240, 310, 480];
  const p95 = percentile(latencies, 95);
  const rate = errorRate(reqList) || 0.04;
  const availability = total ? (reqList.filter((r) => r.statusCode < 500).length / total) * 100 : 99.98;

  const paymentFails = reqList.filter((r) => r.url?.includes("/payment") && r.statusCode >= 500).length;
  const revenueAtRisk = paymentFails * 285;

  const volumeSeries = bucketCounts(reqList.map((r) => ({ timestamp: r.timestamp ?? 0 })), 24).map((c) => c * 12 + 40);
  const errorSeries = bucketCounts(errList.map((e) => ({ timestamp: e.timestamp ?? 0 })), 24).map((c) => c + 1);

  const topErrors = [...errList].slice(0, 5);
  const slowest = Object.entries(groupBy(reqList, (r) => `${r.method ?? "GET"} ${r.route ?? r.url ?? "/"}`))
    .map(([k, rs]) => ({ key: k, p95: percentile(rs.map((r) => r.latency), 95), count: rs.length }))
    .sort((a, b) => b.p95 - a.p95)
    .slice(0, 5);

  const services = SERVICES.map((svc, i) => {
    const svcReqs = reqList.filter((r) => r.metadata?.service === svc);
    const score = 99.98 - i * 0.4;
    return {
      name: svc,
      score,
      tone: score > 99.5 ? "var(--success)" : score > 98 ? "var(--warning)" : "var(--error)",
      spark: seededSeries(svc, 24, 60, 30),
      count: svcReqs.length || (1200 - i * 150),
    };
  });
  const healthy = services.filter((s) => s.score > 99.5).length;

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 font-sans">
      
      {/* ── 1. Command Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            <span className="inline-block size-1.5 rounded-full bg-[var(--brand)]" />
            <span>Executive Dashboards</span>
            <span>/</span>
            <span className="text-[var(--text-secondary)]">Single-Pane Overview</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] font-[family-name:var(--display)]">
            Executive Command Center
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Single-pane health of the entire multi-region API fleet and business transaction availability.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="h-8 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] px-2.5 text-[11px] text-[var(--text-secondary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
          >
            {TIME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => navigate("/ai/assistant")}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--brand-border)] bg-[var(--brand-muted)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--brand)] hover:text-white transition-all"
          >
            <Sparkles className="size-3.5 text-[var(--brand)]" />
            <span>Executive Briefing</span>
          </button>
        </div>
      </div>

      {/* ── 2. Unified Hero Telemetry Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] divide-x divide-y md:divide-y-0 divide-[var(--border-subtle)]">
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">API Calls (24h)</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {formatCompact(total * 1240)}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--success)]">+12.4% vs prev window</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Fleet Error Rate</span>
            <span className={cn("size-2 rounded-full", rate > 1 ? "bg-[var(--error)] animate-pulse" : "bg-[var(--success)]")} />
          </div>
          <div className={cn(
            "mt-2 text-[24px] font-semibold tracking-[-0.03em] font-[family-name:var(--mono)] tabular-nums",
            rate > 1 ? "text-[var(--error)]" : "text-[var(--text-primary)]"
          )}>
            {rate.toFixed(2)}%
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">-0.08% vs baseline</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">P95 Latency</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {formatLatency(p95)}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Fleet edge roundtrip</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Availability SLA</span>
            <span className="size-2 rounded-full bg-[var(--success)]" />
          </div>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--success)] font-[family-name:var(--mono)] tabular-nums">
            {availability.toFixed(2)}%
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Target: 99.95%</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Revenue At Risk</span>
          <div className={cn(
            "mt-2 text-[24px] font-semibold tracking-[-0.03em] font-[family-name:var(--mono)] tabular-nums",
            revenueAtRisk > 0 ? "text-[var(--error)]" : "text-[var(--text-primary)]"
          )}>
            ${revenueAtRisk ? revenueAtRisk.toLocaleString() : "0"}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">{paymentFails ? `${paymentFails} failed checkout calls` : "Zero checkout errors"}</div>
        </div>
      </div>

      {/* ── 3. Traffic & Latency Visualizer ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)] font-[family-name:var(--display)]">
                Throughput &amp; Error Volume
              </h3>
              <p className="text-[11px] text-[var(--text-tertiary)] font-[family-name:var(--mono)]">
                Aggregated minute-by-minute edge ingress
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-[family-name:var(--mono)]">
              <span className="flex items-center gap-1 text-[var(--brand)]">
                <span className="size-2 rounded-full bg-[var(--brand)]" />
                Requests
              </span>
              <span className="flex items-center gap-1 text-[var(--error)]">
                <span className="size-2 rounded-full bg-[var(--error)]" />
                5xx Errors
              </span>
            </div>
          </div>
          <div className="mt-4">
            <DualAxisChart bars={volumeSeries} line={errorSeries} height={190} />
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)] font-[family-name:var(--display)]">
                Latency Distribution Curves
              </h3>
              <p className="text-[11px] text-[var(--text-tertiary)] font-[family-name:var(--mono)]">
                Percentile bands P50 through P99 over 24h
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10.5px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
              <span>P50: {formatLatency(percentile(latencies, 50))}</span>
              <span>•</span>
              <span className="text-[var(--brand)]">P95: {formatLatency(p95)}</span>
            </div>
          </div>
          <div className="mt-4">
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
          </div>
        </div>
      </div>

      {/* ── 4. Service Mesh Health Grid ── */}
      <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Server className="size-4 text-[var(--text-secondary)]" />
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] font-[family-name:var(--display)]">
              Service Fleet Matrix ({healthy}/{services.length} Healthy)
            </h3>
          </div>
          <span className="text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
            Auto-refreshes every 60s
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((svc) => (
            <button
              type="button"
              key={svc.name}
              onClick={() => navigate(`/dashboards/performance?service=${svc.name}`)}
              className="group rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)]/60 p-3.5 text-left transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 truncate font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--text-primary)]">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: svc.tone }} />
                  {svc.name}
                </span>
                <span className="font-[family-name:var(--mono)] text-[10px] text-[var(--text-tertiary)]">v2.4.1</span>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[18px] font-semibold font-[family-name:var(--mono)] tabular-nums leading-none" style={{ color: svc.tone }}>
                    {svc.score.toFixed(2)}%
                  </div>
                  <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
                    {formatCompact(svc.count * 320)} req/min
                  </div>
                </div>
                <svg width={64} height={20} className="shrink-0 opacity-70">
                  {(() => {
                    const data = svc.spark;
                    const max = Math.max(...data, 1);
                    const min = Math.min(...data, 0);
                    const range = max - min || 1;
                    const step = 64 / (data.length - 1 || 1);
                    const pts = data.map((d, i) => `${i * step},${20 - ((d - min) / range) * 20}`).join(" ");
                    return <polyline points={pts} fill="none" stroke={svc.tone} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />;
                  })()}
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 5. Anomaly Clusters & Slow Routes ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-3">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] font-[family-name:var(--display)]">
              Top Incident Signatures (24h)
            </h3>
            <button
              type="button"
              onClick={() => navigate("/dashboards/errors")}
              className="text-[11.5px] font-[family-name:var(--mono)] text-[var(--brand)] hover:underline"
            >
              View all →
            </button>
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
            {topErrors.map((e) => (
              <button
                type="button"
                key={e.eventId}
                onClick={() => navigate(`/observability/errors/${encodeURIComponent(e.fingerprint ?? e.eventId ?? "")}`)}
                className="flex items-center gap-3 py-2.5 text-left w-full hover:bg-[var(--surface-2)]/50 px-2 rounded-[4px] transition-colors"
              >
                <code className="font-[family-name:var(--mono)] text-[11px] text-[var(--text-tertiary)] w-14 shrink-0">
                  {(e.fingerprint ?? e.eventId ?? "—").slice(0, 7)}
                </code>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium text-[var(--text-primary)]">{e.name || "Runtime Exception"}</div>
                  <div className="truncate text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">{e.message}</div>
                </div>
                <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text-secondary)] shrink-0">
                  {e.user ? "1 usr" : "system"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-3">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] font-[family-name:var(--display)]">
              P95 Latency Outliers
            </h3>
            <button
              type="button"
              onClick={() => navigate("/dashboards/performance")}
              className="text-[11.5px] font-[family-name:var(--mono)] text-[var(--brand)] hover:underline"
            >
              Deep dive →
            </button>
          </div>

          <BarList
            items={slowest.map((s) => ({
              label: s.key,
              value: s.p95,
              sub: `${s.count} req`,
              color: s.p95 > 1000 ? "var(--error)" : s.p95 > 500 ? "var(--warning)" : "var(--success)",
              onClick: () => navigate("/dashboards/performance"),
            }))}
            valueFormat={formatLatency}
          />
        </div>
      </div>
    </div>
  );
}

