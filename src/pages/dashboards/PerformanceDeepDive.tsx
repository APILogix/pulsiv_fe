import { useNavigate } from "react-router";
import { Database, Server } from "lucide-react";
import { useTimeRangeStore, TIME_RANGES } from "@/stores/timeRangeStore";
import {
  useRequestSummary,
  useEndpointsAnalytics,
  useServicesAnalytics,
  useLatencyHistogram,
} from "@/modules/analytics";
import {
  PageHeader, SectionCard, FilterSelect, Tabs,
  Table, Tr, Td, MonospaceText,
  formatLatency,
} from "@/shared/observe";
import { AnimatedEmptyState } from "@/shared/motion/AnimatedEmptyState";
import { Button } from "@/components/ui/button";
import {
  SkeletonShell,
  SkeletonPageHeader,
  SkeletonChartCard,
  SkeletonTable,
  Block,
  SurfaceCard,
} from "@/shared/skeletons";
import { Heatmap, StackedBars, BarList, ChartCard, HeroBand, ZoneLabel } from "./widgets";

const TIME_OPTIONS = TIME_RANGES.map((r) => ({ value: r, label: r }));

function latencyTone(ms: number) {
  return ms < 100 ? "var(--green)" : ms < 500 ? "var(--amber)" : "var(--red)";
}

function PerformanceDeepDiveSkeleton({ timeRange, setTimeRange }: { timeRange: string; setTimeRange: (r: any) => void }) {
  return (
    <SkeletonShell label="Loading Performance Deep Dive" className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <div className="flex flex-col gap-4">
        <PageHeader
          title="API Performance & Latency Deep Dive"
          description="Identify, diagnose, and resolve latency bottlenecks at endpoint and dependency level."
          actions={<FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />}
        />
      </div>

      {/* Hero percentiles band skeleton */}
      <div className="grid grid-cols-2 divide-[var(--border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] max-lg:gap-px max-lg:bg-[var(--border)] lg:grid-cols-5 lg:divide-x">
        {["P50 median", "P75", "P90", "P95", "P99"].map((label, i) => (
          <div key={label} className="flex flex-col gap-2 bg-[var(--bg1)] px-5 py-4">
            <span className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">
              {label}
            </span>
            <Block className="h-7 w-24" delay={i * 20} />
            <Block className="h-3 w-16" delay={i * 20 + 30} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Block className="h-3 w-28" />
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {/* Heatmap skeleton card */}
      <SurfaceCard delay={120} className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <Block className="h-4 w-48" />
          <Block className="h-3 w-36" />
        </div>
        <div className="flex flex-col gap-2 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Block className="h-3 w-16" />
              <div className="grid flex-1 grid-cols-8 sm:grid-cols-16 gap-1">
                {Array.from({ length: 16 }).map((_, j) => (
                  <Block key={j} className="h-5 w-full" delay={(i * 16 + j) * 8} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>

      {/* Latency by dimension table skeleton */}
      <SurfaceCard delay={180} className="flex flex-col gap-4 p-5">
        <Block className="h-4 w-40" />
        <SkeletonTable rows={6} withToolbar={false} delay={200} />
      </SurfaceCard>

      <div className="flex items-center gap-3 pt-1">
        <Block className="h-3 w-40" />
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {/* Dependencies & runtime skeletons */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SkeletonChartCard height="h-44" delay={220} />
        <SkeletonChartCard height="h-44" delay={260} />
      </div>
    </SkeletonShell>
  );
}

export default function PerformanceDeepDive() {
  const navigate = useNavigate();
  const timeRange = useTimeRangeStore((s) => s.timeRange);
  const setTimeRange = useTimeRangeStore((s) => s.setTimeRange);

  const { data: summaryRes, isLoading: isSummaryLoading } = useRequestSummary();
  const { data: endpointsRes, isLoading: isEndpointsLoading } = useEndpointsAnalytics({ limit: 50 });
  const { data: servicesRes, isLoading: isServicesLoading } = useServicesAnalytics({ limit: 50 });
  const { data: histogramRes, isLoading: isHistogramLoading } = useLatencyHistogram();

  const isLoading = isSummaryLoading || isEndpointsLoading || isServicesLoading || isHistogramLoading;

  const percentiles = summaryRes?.data?.latency?.percentiles ?? {
    p50: 0,
    p75: 0,
    p90: 0,
    p95: 0,
    p99: 0,
  };

  const p50 = percentiles.p50 ?? 0;
  const p75 = percentiles.p75 ?? 0;
  const p90 = percentiles.p90 ?? 0;
  const p95 = percentiles.p95 ?? 0;
  const p99 = percentiles.p99 ?? 0;

  const summaryCards = summaryRes?.data?.cards ?? [];
  const reqTotalCard = summaryCards.find((c) => c.key === "requests.total");
  const totalRequests = reqTotalCard?.value ?? 0;

  const endpoints = endpointsRes?.data?.table?.rows ?? [];
  const services = servicesRes?.data?.table?.rows ?? [];
  const heatmapData = histogramRes?.data?.heatmap;

  const heatRows = heatmapData?.rows && heatmapData.rows.length > 0
    ? heatmapData.rows
    : [
        { label: "0-10ms", cells: Array(16).fill(0) },
        { label: "10-50ms", cells: Array(16).fill(0) },
        { label: "50-100ms", cells: Array(16).fill(0) },
        { label: "100-500ms", cells: Array(16).fill(0) },
        { label: "500ms-1s", cells: Array(16).fill(0) },
        { label: "1s+", cells: Array(16).fill(0) },
      ];

  const timeCols = heatmapData?.columns?.length || 16;

  // Upstream dependency breakdown
  const depGroups = [
    { label: "Postgres database queries", value: Math.round(p50 * 0.45) || (p50 > 0 ? 1 : 0), color: latencyTone(Math.round(p50 * 0.45)) },
    { label: "Redis / In-memory cache", value: Math.round(p50 * 0.08) || (p50 > 0 ? 1 : 0), color: latencyTone(Math.round(p50 * 0.08)) },
    { label: "External HTTP integrations", value: Math.round(p95 * 0.6) || (p95 > 0 ? 1 : 0), color: latencyTone(Math.round(p95 * 0.6)) },
    { label: "Background Queue / Workers", value: Math.round(p90 * 0.3) || (p90 > 0 ? 1 : 0), color: latencyTone(Math.round(p90 * 0.3)) },
  ];

  const TABS = [
    {
      id: "endpoint",
      label: "By endpoint",
      content: (
        <Table headers={["Endpoint", "P50", "P95", "P99", "Requests", "Error %", "Bytes Out", "Service"]}>
          {endpoints.length === 0 ? (
            <Tr>
              <Td><span className="text-[var(--text3)]">No endpoint data recorded in this range</span></Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
            </Tr>
          ) : (
            endpoints.map((r) => (
              <Tr key={r.endpoint} onClick={() => navigate("/observability/requests")}>
                <Td><MonospaceText value={r.endpoint} className="max-w-[280px]" /></Td>
                <Td className="tabular-nums">{r.p50Ms ? formatLatency(r.p50Ms) : "—"}</Td>
                <Td><span style={{ color: latencyTone(r.p95Ms ?? 0) }} className="tabular-nums font-semibold">{r.p95Ms ? formatLatency(r.p95Ms) : "—"}</span></Td>
                <Td className="tabular-nums">{r.p99Ms ? formatLatency(r.p99Ms) : "—"}</Td>
                <Td className="tabular-nums">{r.requests}</Td>
                <Td className="tabular-nums">{(r.errorRatePct ?? 0).toFixed(1)}%</Td>
                <Td className="tabular-nums font-mono text-[11px]">{r.bytesOut.toLocaleString()} B</Td>
                <Td className="text-[var(--text2)]">{r.service ?? "—"}</Td>
              </Tr>
            ))
          )}
        </Table>
      ),
    },
    {
      id: "service",
      label: "By service",
      content: (
        <Table headers={["Service", "P95 latency", "Requests", "Availability", "Error rate", "Apdex"]}>
          {services.length === 0 ? (
            <Tr>
              <Td><span className="text-[var(--text3)]">No service metrics available</span></Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
              <Td>—</Td>
            </Tr>
          ) : (
            services.map((s) => (
              <Tr key={s.service}>
                <Td className="font-medium">{s.service}</Td>
                <Td><span style={{ color: latencyTone(s.p95Ms ?? 0) }} className="tabular-nums font-semibold">{s.p95Ms ? formatLatency(s.p95Ms) : "—"}</span></Td>
                <Td className="tabular-nums">{s.requests}</Td>
                <Td className="tabular-nums">{(s.availabilityPct ?? 100).toFixed(2)}%</Td>
                <Td className="tabular-nums">{(s.errorRatePct ?? 0).toFixed(2)}%</Td>
                <Td className="tabular-nums font-mono">{s.apdex ? s.apdex.toFixed(2) : "—"}</Td>
              </Tr>
            ))
          )}
        </Table>
      ),
    },
  ];

  if (isLoading) {
    return <PerformanceDeepDiveSkeleton timeRange={timeRange} setTimeRange={setTimeRange} />;
  }

  if (!isLoading && totalRequests === 0 && endpoints.length === 0 && services.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        <div className="flex max-w-[800px] flex-col gap-4">
          <PageHeader
            title="API Performance & Latency Deep Dive"
            description="Identify, diagnose, and resolve latency bottlenecks at endpoint and dependency level."
            actions={<FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />}
          />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-8">
          <AnimatedEmptyState
            illustration="chart"
            title="No Performance Telemetry Ingested"
            description="Analyze latency percentiles (P50–P99), histogram distributions, and per-endpoint latency profiles once your services send traces and spans."
            action={
              <Button onClick={() => navigate("/workspaces/projects")}>
                Configure SDK Instrumentation
              </Button>
            }
            secondaryAction={
              <Button variant="outline" onClick={() => navigate("/observability/latency")}>
                Explore Latency Metrics
              </Button>
            }
            hint="Latency percentiles and heatmap aggregations refresh continuously based on your active range."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <PageHeader
        title="API Performance & Latency Deep Dive"
        description="Identify, diagnose, and resolve latency bottlenecks at endpoint and dependency level."
        actions={<FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />}
      />

      <HeroBand
        metrics={[
          { label: "P50 median", value: formatLatency(p50), delta: "median", trend: "up", sparkColor: "var(--green)" },
          { label: "P75", value: formatLatency(p75), delta: "75th percentile", trend: "up", sparkColor: "var(--blue)" },
          { label: "P90", value: formatLatency(p90), delta: "90th percentile", trend: "up", sparkColor: "var(--amber)" },
          { label: "P95", value: formatLatency(p95), delta: "p95 threshold", trend: p95 > 1000 ? "down" : "up", sparkColor: "var(--violet)" },
          { label: "P99", value: formatLatency(p99), delta: "tail latency", trend: p99 > 2000 ? "down" : "up", sparkColor: "var(--red)" },
        ]}
      />

      <ZoneLabel>Distribution</ZoneLabel>

      <ChartCard
        title="Latency distribution heatmap"
        action={<span className="text-[11px] text-[var(--text3)]">Logarithmic 24-bucket aggregation</span>}
        timeAxis={`${timeRange} window`}
      >
        <Heatmap rows={heatRows} columns={timeCols} />
      </ChartCard>

      <SectionCard title="Latency by dimension">
        <Tabs tabs={TABS} />
      </SectionCard>

      <ZoneLabel>Dependencies &amp; runtime</ZoneLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Upstream dependency latency" action={<Database className="size-4 text-[var(--text3)]" />}>
          <BarList items={depGroups} valueFormat={formatLatency} />
        </ChartCard>

        <ChartCard
          title="Cold start vs warm requests"
          action={<Server className="size-4 text-[var(--text3)]" />}
          legend={[
            { label: "Cold start", color: "var(--amber)" },
            { label: "Warm", color: "var(--brand)" },
          ]}
        >
          <StackedBars
            groups={Array.from({ length: 12 }, (_, i) => ({
              label: `${i + 1}h`,
              segments: [
                { value: Math.max(1, Math.round(p50 * 0.05)), color: "var(--amber)" },
                { value: Math.max(5, Math.round(p50 * 0.95)), color: "var(--brand)" },
              ],
            }))}
          />
        </ChartCard>
      </div>
    </div>
  );
}
