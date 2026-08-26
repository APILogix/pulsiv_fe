import { useNavigate } from "react-router";
import { useTimeRangeStore, TIME_RANGES } from "@/stores/timeRangeStore";
import {
  useAnalyticsOverview,
  useRequestSummary,
  useSlowestEndpoints,
  useServicesAnalytics,
  useErrorGroupsAnalytics,
} from "@/modules/analytics";
import {
  PageHeader, SectionCard, FilterSelect,
  Timestamp, MonospaceText, formatCompact, formatLatency,
} from "@/shared/observe";
import { AnimatedEmptyState } from "@/shared/motion/AnimatedEmptyState";
import { Button } from "@/components/ui/button";
import {
  SkeletonShell,
  SkeletonPageHeader,
  SkeletonChartCard,
  Block,
  SurfaceCard,
} from "@/shared/skeletons";
import { DualAxisChart, MultiLineChart, BarList, ChartCard, HeroBand, ZoneLabel, CHART_COLORS } from "./widgets";

const TIME_OPTIONS = TIME_RANGES.map((r) => ({ value: r, label: r }));

function ExecutiveDashboardSkeleton({ timeRange, setTimeRange }: { timeRange: string; setTimeRange: (r: any) => void }) {
  return (
    <SkeletonShell label="Loading Executive Command Center" className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Executive Command Center"
          description="Single-pane health of the entire API portfolio · auto-refreshes continuously."
          actions={<FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />}
        />
      </div>

      {/* Hero metric band skeleton */}
      <div className="grid grid-cols-2 divide-[var(--border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] max-lg:gap-px max-lg:bg-[var(--border)] lg:grid-cols-5 lg:divide-x">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 bg-[var(--bg1)] px-5 py-4">
            <Block className="h-3 w-20" delay={i * 20} />
            <div className="flex items-end justify-between gap-2">
              <Block className="h-7 w-24" delay={i * 20 + 20} />
              <Block className="h-4 w-12" delay={i * 20 + 40} />
            </div>
            <Block className="h-3 w-16" delay={i * 20 + 40} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Block className="h-3 w-28" />
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {/* Two chart cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SkeletonChartCard height="h-48" delay={120} />
        <SkeletonChartCard height="h-48" delay={160} />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Block className="h-3 w-36" />
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {/* Service fleet cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SurfaceCard key={i} delay={180 + i * 20} className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Block className="size-2 rounded-full" />
                <Block className="h-3.5 w-24" />
              </div>
              <Block className="h-3 w-10" />
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div className="flex flex-col gap-1.5">
                <Block className="h-6 w-16" />
                <Block className="h-3 w-28" />
              </div>
            </div>
          </SurfaceCard>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Block className="h-3 w-32" />
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {/* Attention section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SurfaceCard delay={260} className="flex flex-col gap-3 p-4">
          <Block className="h-4 w-36" />
          <div className="flex flex-col divide-y divide-[var(--border)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <Block className="h-3 w-12" />
                <div className="flex flex-1 flex-col gap-1">
                  <Block className="h-3.5 w-32" />
                  <Block className="h-2.5 w-48" />
                </div>
                <Block className="h-3 w-16" />
              </div>
            ))}
          </div>
        </SurfaceCard>
        <SurfaceCard delay={300} className="flex flex-col gap-3 p-4">
          <Block className="h-4 w-32" />
          <div className="flex flex-col gap-2 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Block key={i} className="h-8 w-full" delay={i * 20} />
            ))}
          </div>
        </SurfaceCard>
      </div>

      {/* Bottom KPI band */}
      <div className="grid grid-cols-2 divide-[var(--border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] max-lg:gap-px max-lg:bg-[var(--border)] lg:grid-cols-4 lg:divide-x">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 bg-[var(--bg1)] px-5 py-4">
            <Block className="h-3 w-24" delay={i * 20} />
            <Block className="h-7 w-20" delay={i * 20 + 20} />
          </div>
        ))}
      </div>
    </SkeletonShell>
  );
}

export default function ExecutiveCommandCenter() {
  const navigate = useNavigate();
  const timeRange = useTimeRangeStore((s) => s.timeRange);
  const setTimeRange = useTimeRangeStore((s) => s.setTimeRange);

  const { data: overviewRes, isLoading: isOverviewLoading } = useAnalyticsOverview();
  const { data: requestSummaryRes, isLoading: isSummaryLoading } = useRequestSummary();
  const { data: slowestRes, isLoading: isSlowestLoading } = useSlowestEndpoints(7);
  const { data: servicesRes, isLoading: isServicesLoading } = useServicesAnalytics();
  const { data: errorGroupsRes, isLoading: isErrorsLoading } = useErrorGroupsAnalytics({ limit: 6 });

  const isLoading = isOverviewLoading || isSummaryLoading;

  const cards = overviewRes?.data?.cards ?? requestSummaryRes?.data?.cards ?? [];
  const reqCard = cards.find((c) => c.key === "requests.total");
  const errRateCard = cards.find((c) => c.key === "requests.error_rate");
  const p95Card = cards.find((c) => c.key === "requests.latency_p95");
  const availCard = cards.find((c) => c.key === "requests.availability");
  const uniqueUsersCard = cards.find((c) => c.key === "requests.unique_users");
  const p50Card = cards.find((c) => c.key === "requests.latency_p50");
  const p99Card = cards.find((c) => c.key === "requests.latency_p99");

  const total = reqCard?.value ?? 0;
  const p95 = p95Card?.value ?? 0;
  const p50 = p50Card?.value ?? 0;
  const p99 = p99Card?.value ?? 0;
  const rate = errRateCard?.value ?? 0;
  const availability = availCard?.value ?? 100;

  const p95Delta = p95Card?.deltaAbsolute ?? p95Card?.delta ?? p95Card?.deltaPct;
  const reqDelta = reqCard?.deltaPct ?? reqCard?.delta;
  const errDelta = errRateCard?.deltaPct ?? errRateCard?.delta;
  const availDelta = availCard?.deltaPct ?? availCard?.delta;

  const requestSeriesPoints = overviewRes?.data?.requestSeries?.points ?? overviewRes?.data?.series?.requests?.points ?? [];
  const errorSeriesPoints = overviewRes?.data?.errorSeries?.points ?? overviewRes?.data?.series?.errors?.points ?? [];
  const volumeSeries = requestSeriesPoints.map((p) => p.v ?? p.value ?? 0);
  const errorSeries = errorSeriesPoints.map((p) => p.v ?? p.value ?? 0);

  const topErrors = errorGroupsRes?.data?.table?.rows ?? overviewRes?.data?.topErrors ?? [];
  const slowestItems = slowestRes?.data?.list?.items ?? [];
  const servicesList = servicesRes?.data?.table?.rows ?? overviewRes?.data?.services ?? [];

  const healthy = servicesList.filter((s) => (s.availabilityPct ?? 100) >= 99).length;

  if (isLoading) {
    return <ExecutiveDashboardSkeleton timeRange={timeRange} setTimeRange={setTimeRange} />;
  }

  if (!isLoading && total === 0 && topErrors.length === 0 && servicesList.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        <div className="flex max-w-[800px] flex-col gap-4">
          <PageHeader
            title="Executive Command Center"
            description="Single-pane health of the entire API portfolio."
            actions={<FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />}
          />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-8">
          <AnimatedEmptyState
            illustration="dashboard"
            title="No Telemetry Data Ingested"
            description="Your executive dashboard is ready to track API traffic, error rates, and latency. Integrate the Pulsiv SDK to begin streaming telemetry events."
            action={
              <Button onClick={() => navigate("/workspaces/projects")}>
                Configure SDK Quickstart
              </Button>
            }
            secondaryAction={
              <Button variant="outline" onClick={() => navigate("/observability/requests")}>
                View Live Stream
              </Button>
            }
            hint="Telemetry metrics auto-refresh every 15s to 5m based on your selected time range."
          />
        </div>
      </div>
    );
  }

  const latencyChartPoints = volumeSeries.length > 0 ? volumeSeries : [1, 1];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <PageHeader
        title="Executive Command Center"
        description="Single-pane health of the entire API portfolio · auto-refreshes continuously."
        actions={<FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />}
      />

      {/* Hero metric band */}
      <HeroBand
        metrics={[
          {
            label: `API calls (${timeRange})`,
            value: formatCompact(total),
            delta: reqDelta != null ? `${reqDelta > 0 ? "+" : ""}${reqDelta.toFixed(1)}% vs prev` : "Live",
            trend: reqCard?.trend === "down" ? "down" : "up",
            spark: reqCard?.sparkline ?? undefined,
          },
          {
            label: "Error rate",
            value: `${rate.toFixed(2)}%`,
            delta: errDelta != null ? `${errDelta > 0 ? "+" : ""}${errDelta.toFixed(2)}% vs prev` : "5xx status",
            trend: rate > 1 ? "down" : "up",
            sparkColor: "var(--red)",
          },
          {
            label: "P95 latency",
            value: formatLatency(p95),
            delta: p95Delta != null ? `${p95Delta > 0 ? "+" : ""}${Math.round(p95Delta)}ms vs prev` : "p95 quantile",
            trend: p95 > 1000 ? "down" : "up",
            sparkColor: "var(--blue)",
          },
          {
            label: "Availability",
            value: `${availability.toFixed(2)}%`,
            delta: availDelta != null ? `${availDelta > 0 ? "+" : ""}${availDelta.toFixed(2)}%` : "Target: 99.9%",
            trend: availability >= 99.9 ? "up" : "down",
          },
          {
            label: "Active users",
            value: formatCompact(uniqueUsersCard?.value ?? 0),
            delta: "HLL cardinality estimate",
            trend: "up",
          },
        ]}
      />

      <ZoneLabel>Traffic &amp; latency</ZoneLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Request volume & error correlation"
          legend={[
            { label: "Requests", color: "var(--brand)" },
            { label: "Errors", color: "var(--red)" },
          ]}
          headline={formatCompact(total)}
          headlineLabel="total requests"
          timeAxis={`${timeRange} window`}
        >
          <DualAxisChart bars={volumeSeries.length > 0 ? volumeSeries : [0]} line={errorSeries.length > 0 ? errorSeries : [0]} height={190} />
        </ChartCard>

        <ChartCard
          title="Latency distribution"
          legend={[
            { label: "P50", color: CHART_COLORS[2], value: formatLatency(p50) },
            { label: "P95", color: CHART_COLORS[5], value: formatLatency(p95) },
            { label: "P99", color: CHART_COLORS[4], value: formatLatency(p99) },
          ]}
          timeAxis={`${timeRange} window`}
        >
          <MultiLineChart
            height={190}
            series={[
              { label: "P50", color: CHART_COLORS[2], data: latencyChartPoints.map(() => p50) },
              { label: "P95", color: CHART_COLORS[5], data: latencyChartPoints.map(() => p95) },
              { label: "P99", color: CHART_COLORS[4], data: latencyChartPoints.map(() => p99) },
            ]}
          />
        </ChartCard>
      </div>

      <ZoneLabel>Service fleet · {healthy}/{servicesList.length} healthy</ZoneLabel>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {servicesList.map((svc) => {
          const score = svc.availabilityPct ?? 100;
          const tone = score >= 99.5 ? "var(--green)" : score >= 97 ? "var(--amber)" : "var(--red)";
          return (
            <button
              type="button"
              key={svc.service}
              onClick={() => navigate(`/dashboards/performance?service=${encodeURIComponent(svc.service)}`)}
              className="group rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4 text-left transition-colors hover:border-[var(--input)]"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 truncate font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--text)]">
                  <span className="size-2 shrink-0 rounded-full pulse-dot" style={{ background: tone }} />
                  {svc.service}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">
                  {svc.p95Ms ? formatLatency(svc.p95Ms) : "p95"}
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <div className="text-xl font-semibold tabular-nums leading-none" style={{ color: tone }}>
                    {score.toFixed(2)}%
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--text3)]">
                    {formatCompact(svc.requests)} req · error: {(svc.errorRatePct ?? 0).toFixed(2)}%
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <ZoneLabel>Attention required</ZoneLabel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title={`Top error groups (${timeRange})`}
          action={
            <button type="button" onClick={() => navigate("/dashboards/errors")} className="text-[12px] text-[var(--brand)]">
              View all →
            </button>
          }
        >
          {topErrors.length === 0 ? (
            <div className="py-6 text-center text-[13px] text-[var(--text3)]">
              No errors detected in this time range
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[var(--border)]">
              {topErrors.slice(0, 6).map((e) => (
                <button
                  type="button"
                  key={e.fingerprint}
                  onClick={() => navigate(`/observability/errors/${encodeURIComponent(e.fingerprint)}`)}
                  className="flex items-center gap-3 py-2.5 text-left first:pt-0 last:pb-0 hover:opacity-80"
                >
                  <MonospaceText value={e.fingerprint.slice(0, 8)} className="w-16 shrink-0 text-[var(--text3)]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-[var(--text)]">{e.errorName}</div>
                    <div className="truncate text-[12px] text-[var(--text3)]">{e.message}</div>
                  </div>
                  <span className="shrink-0 tabular-nums text-[12px] text-[var(--text2)]">
                    {formatCompact(e.occurrences)} events
                  </span>
                  <Timestamp value={e.lastSeen} />
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Slowest endpoints"
          action={
            <button type="button" onClick={() => navigate("/dashboards/performance")} className="text-[12px] text-[var(--brand)]">
              Deep dive →
            </button>
          }
        >
          {slowestItems.length === 0 ? (
            <div className="py-6 text-center text-[13px] text-[var(--text3)]">
              No endpoint latency bottlenecks recorded
            </div>
          ) : (
            <BarList
              items={slowestItems.map((s) => ({
                label: s.label,
                value: s.value,
                sub: s.secondary ?? "",
                color: s.severity === "critical" ? "var(--red)" : s.severity === "warn" ? "var(--amber)" : "var(--green)",
                onClick: () => navigate("/dashboards/performance"),
              }))}
              valueFormat={formatLatency}
            />
          )}
        </SectionCard>
      </div>

      <HeroBand
        metrics={[
          { label: "Unique error groups", value: topErrors.length },
          { label: "Affected users", value: topErrors.reduce((acc, e) => acc + (e.affectedUsers ?? 0), 0) },
          { label: "P50 latency", value: formatLatency(p50) },
          { label: "Services monitored", value: servicesList.length },
        ]}
      />
    </div>
  );
}
