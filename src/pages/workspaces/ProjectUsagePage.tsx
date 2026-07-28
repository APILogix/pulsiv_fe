import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Activity,
  ArrowRight,
  Database,
  Gauge,
  HardDrive,
  KeyRound,
  LineChart as LineChartIcon,
  Layers,
  RefreshCcw,
  Sigma,
  TrendingUp,
} from "lucide-react";
import { useProjectStats, useProjectUsageCounters } from "@/modules/projects/hooks/useProjects";
import { useMonthlyUsage, useUsageAnalytics } from "@/modules/projects/hooks/useProjectAnalytics";
import type { UsageGranularity } from "@/modules/projects/api/types";
import { UsageTrendChart } from "@/modules/projects/components/UsageTrendChart";
import { useCurrentProject } from "./ProjectShellPage";
import { Notice, Panel, SectionHeading, SegmentedControl, StatCard, Toolbar, type SegmentOption } from "@/shared/ui/pulse";
import { FilterSelect, Table, Td, Timestamp, Tr, formatBytes, formatCompact, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const COUNTER_HEADERS = ["Counter", "Total", "Period", "Last flushed"];

type UsageRangeKey = "30d" | "90d" | "180d" | "1y";
const USAGE_RANGE_OPTIONS: SegmentOption<UsageRangeKey>[] = [
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "180d", label: "180d" },
  { value: "1y", label: "1y" },
];
const USAGE_RANGE_DAYS: Record<UsageRangeKey, number> = { "30d": 30, "90d": 90, "180d": 180, "1y": 365 };
const USAGE_GRANULARITY_OPTIONS = [
  { value: "daily", label: "Daily usage" },
  { value: "monthly", label: "Monthly usage" },
];

/** Human labels for the known `project_usage_counters.counter_type` values. */
const COUNTER_LABELS: Record<string, string> = {
  events: "Events ingested",
  events_total: "Events ingested",
  bytes: "Bytes ingested",
  bytes_total: "Bytes ingested",
  errors: "Error events",
  requests: "Request events",
  api_key_requests: "API key requests",
  rate_limited: "Rate-limited events",
  alert_notifications: "Alert notifications",
  connector_deliveries: "Connector deliveries",
};

const BYTE_COUNTERS = new Set(["bytes", "bytes_total", "event_bytes", "storage_bytes"]);

function counterLabel(counterType: string) {
  return COUNTER_LABELS[counterType] ?? counterType.replace(/_/g, " ");
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectUsagePage() {
  const { projectId } = useCurrentProject();
  const [usageRange, setUsageRange] = useState<UsageRangeKey>("90d");
  const [usageGranularity, setUsageGranularity] = useState<Extract<UsageGranularity, "daily" | "monthly">>("daily");
  const usageWindow = useMemo(() => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    return {
      to: end.toISOString(),
      from: new Date(end.getTime() - USAGE_RANGE_DAYS[usageRange] * 24 * 60 * 60 * 1000).toISOString(),
      granularity: usageGranularity,
    };
  }, [usageGranularity, usageRange]);
  const analytics = useUsageAnalytics(projectId, usageWindow);
  const { data: counters = [], isLoading, error, refetch, isFetching } = useProjectUsageCounters(projectId);
  const { data: stats } = useProjectStats(projectId);
  const { data: monthly } = useMonthlyUsage(projectId);

  const asMessage = apiErrorMessage;

  const findCounter = (names: string[]) =>
    counters.find((counter) => names.includes(counter.counterType))?.totalValue ?? 0;

  const totalEvents = findCounter(["events", "events_total"]);
  const totalBytes = findCounter(["bytes", "bytes_total", "event_bytes"]);

  // Projected end-of-month calculation
  const projectedWarning = (() => {
    if (!monthly || !monthly.planLimit || monthly.planLimit <= 0) return null;
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const midMonth = Math.floor(daysInMonth / 2);
    const pct = monthly.usagePercent ?? 0;
    if (pct > 50 && dayOfMonth < midMonth) {
      const projected = Math.round((monthly.totalEvents / dayOfMonth) * daysInMonth);
      return `At current rate, projected end-of-month usage: ~${formatCompact(projected)} events (${Math.round((projected / monthly.planLimit) * 100)}% of limit)`;
    }
    return null;
  })();

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Usage counters"
        description="Durable lifetime counters maintained by the ingestion pipeline, plus the current plan position. For time-sliced breakdowns use Analytics."
        actions={
          <div className="flex items-center gap-2">
            <UiButton variant="outline" size="lg" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCcw className="mr-1.5 size-4" /> Refresh
            </UiButton>
            <Link to={`/projects/${projectId}/analytics`}>
              <UiButton size="lg">
                Analytics <ArrowRight className="ml-1.5 size-4" />
              </UiButton>
            </Link>
          </div>
        }
      />

      {error && <Notice tone="red">{asMessage(error)}</Notice>}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Events (lifetime)" value={formatCompact(totalEvents)} icon={Activity} tone="brand" />
        <StatCard label="Ingested (lifetime)" value={formatBytes(totalBytes)} icon={HardDrive} tone="blue" />
        <StatCard
          label="Total requests"
          value={formatCompact(stats?.stats.totalRequests ?? 0)}
          icon={Gauge}
          tone="violet"
        />
        <StatCard
          label="Keys / environments"
          value={`${formatNumber(stats?.stats.activeKeysCount ?? 0)} / ${formatNumber(stats?.stats.environmentCount ?? 0)}`}
          icon={KeyRound}
          tone="green"
          footnote={`${formatNumber(stats?.stats.apiKeysCount ?? 0)} keys total`}
        />
      </div>

      <Panel
        title="Project usage trend"
        description="Accepted telemetry volume and errors across the selected range."
        icon={LineChartIcon}
        actions={
          <Toolbar>
            <SegmentedControl
              value={usageRange}
              onChange={setUsageRange}
              options={USAGE_RANGE_OPTIONS}
              ariaLabel="Project usage range"
            />
            <FilterSelect
              label="Bucket"
              value={usageGranularity}
              onChange={(value) => setUsageGranularity(value as Extract<UsageGranularity, "daily" | "monthly">)}
              options={USAGE_GRANULARITY_OPTIONS}
            />
          </Toolbar>
        }
      >
        {analytics.isLoading ? (
          <div className="h-64 animate-pulse rounded-[12px] bg-[var(--bg2)]" />
        ) : analytics.error ? (
          <Notice tone="red">{asMessage(analytics.error)}</Notice>
        ) : (
          <UsageTrendChart
            ariaLabel="Project event, request, and error usage over time"
            points={(analytics.data?.timeSeries ?? []).map((point) => ({
              bucket: point.bucket,
              totalEvents: point.totalEvents,
              requests: point.requests,
              errors: point.errors,
            }))}
            series={[
              { key: "totalEvents", label: "Events", color: "var(--brand)" },
              { key: "requests", label: "Requests", color: "var(--blue)" },
              { key: "errors", label: "Errors", color: "var(--red)" },
            ]}
            emptyMessage="No project usage was recorded in this range."
          />
        )}
      </Panel>

      {monthly && (
        <Panel title="Plan consumption" description={`Billing month ${monthly.yearMonth}.`} icon={Sigma}>
          <div className="flex flex-col gap-5">
            {/* Enhanced meter with threshold markers */}
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12.5px] font-medium text-[var(--text2)]">Events against plan allowance</span>
                <span className="text-[12.5px] font-semibold tabular-nums text-[var(--text)]">
                  {formatCompact(monthly.totalEvents)}
                  <span className="ml-1 font-normal text-[var(--text3)]">
                    / {monthly.planLimit && monthly.planLimit > 0 ? formatCompact(monthly.planLimit) : "\u221E"}
                  </span>
                </span>
              </div>
              <div className="relative">
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg3)]"
                  role="progressbar"
                  aria-label="Events against plan allowance"
                  aria-valuenow={Math.round(monthly.usagePercent ?? 0)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${Math.min(100, monthly.usagePercent ?? 0)}%`,
                      background: (monthly.usagePercent ?? 0) >= 90 ? "var(--red)" : (monthly.usagePercent ?? 0) >= 70 ? "var(--amber)" : "var(--brand)",
                    }}
                  />
                </div>
                {/* Threshold markers at 70% and 90% */}
                {monthly.planLimit && monthly.planLimit > 0 && (
                  <>
                    <div
                      className="absolute top-0 h-2 w-px bg-[var(--amber)]"
                      style={{ left: "70%" }}
                      title="70% threshold"
                    />
                    <div
                      className="absolute top-0 h-2 w-px bg-[var(--red)]"
                      style={{ left: "90%" }}
                      title="90% threshold"
                    />
                  </>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11.5px] tabular-nums text-[var(--text3)]">
                  {monthly.usagePercent != null
                    ? `${monthly.usagePercent.toFixed(1)}% consumed this month`
                    : "This project has no explicit plan limit"}
                </p>
                {monthly.planLimit && monthly.planLimit > 0 && (
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text3)]">
                    <span className="flex items-center gap-1"><span className="inline-block size-1.5 rounded-full bg-[var(--amber)]" />70%</span>
                    <span className="flex items-center gap-1"><span className="inline-block size-1.5 rounded-full bg-[var(--red)]" />90%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Projected warning */}
            {projectedWarning && (
              <div className="flex items-start gap-2 rounded-[10px] border border-[var(--amber-bg)] bg-[var(--amber-bg)] px-3.5 py-2.5">
                <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-[var(--amber)]" aria-hidden="true" />
                <p className="text-[12px] font-medium text-[var(--amber)]">{projectedWarning}</p>
              </div>
            )}

            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
              {[
                { label: "Ingested", value: formatBytes(monthly.totalBytes) },
                { label: "Key requests", value: formatCompact(monthly.apiKeyRequests) },
                { label: "Rate-limited", value: formatCompact(monthly.rateLimitedEvents) },
                { label: "Notifications", value: formatCompact(monthly.alertNotifications) },
              ].map((item) => (
                <div key={item.label} className="flex flex-col gap-1 bg-[var(--bg1)] px-3.5 py-3">
                  <dt className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">
                    {item.label}
                  </dt>
                  <dd className="text-[15px] font-semibold tabular-nums text-[var(--text)]">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Panel>
      )}

      <Panel
        title="Raw counters"
        description="Aggregated by the ingestion flush worker. Values may lag real time by one flush interval."
        icon={Database}
        bodyClassName="p-0"
      >
        {isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-9 animate-pulse rounded-[8px] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : counters.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Layers className="size-8 text-[var(--text3)]" aria-hidden="true" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">No usage recorded yet</p>
            <p className="max-w-[46ch] text-[12.5px] text-[var(--text2)]">
              Counters appear after the first telemetry batch is accepted for this project.
            </p>
          </div>
        ) : (
          <Table headers={COUNTER_HEADERS} maxHeight="30rem">
            {counters.map((counter, index) => (
              <Tr key={counter.counterType} className={index % 2 === 1 ? "bg-[var(--bg2)]/30" : undefined}>
                <Td>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-medium capitalize text-[var(--text)]">
                      {counterLabel(counter.counterType)}
                    </span>
                    <code className="font-[family-name:var(--mono)] text-[10.5px] text-[var(--text3)]">
                      {counter.counterType}
                    </code>
                  </div>
                </Td>
                <Td>
                  <span className="text-[13px] font-semibold tabular-nums text-[var(--text)]">
                    {BYTE_COUNTERS.has(counter.counterType)
                      ? formatBytes(counter.totalValue)
                      : formatNumber(counter.totalValue)}
                  </span>
                </Td>
                <Td>
                  {counter.lastPeriodStart && counter.lastPeriodEnd ? (
                    <span className="text-[12px] text-[var(--text2)]">
                      <Timestamp value={counter.lastPeriodStart} /> → <Timestamp value={counter.lastPeriodEnd} />
                    </span>
                  ) : (
                    <span className="text-[12px] text-[var(--text3)]">-</span>
                  )}
                </Td>
                <Td>
                  {counter.lastFlushedAt ? (
                    <Timestamp value={counter.lastFlushedAt} />
                  ) : (
                    <span className="text-[12px] text-[var(--text3)]">Never</span>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}
