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
} from "lucide-react";
import { useProjectStats, useProjectUsageCounters } from "@/modules/projects/hooks/useProjects";
import { useMonthlyUsage, useUsageAnalytics } from "@/modules/projects/hooks/useProjectAnalytics";
import type { UsageGranularity } from "@/modules/projects/api/types";
import { UsageTrendChart } from "@/modules/projects/components/UsageTrendChart";
import { useCurrentProject } from "./ProjectShellPage";
import { Meter, Notice, SectionHeading, SegmentedControl, StatCard, Toolbar, type SegmentOption } from "@/shared/ui/pulse";
import { FilterSelect, Table, Td, Timestamp, Tr, formatBytes, formatCompact, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { cn } from "@/lib/utils";

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

  // Calculate plan usage percentage for the gauge
  const usagePercent = monthly?.usagePercent ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Usage counters"
        description="Durable lifetime counters maintained by the ingestion pipeline, plus the current plan position."
        actions={
          <div className="flex items-center gap-2">
            <UiButton variant="outline" size="lg" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCcw className={cn("mr-1.5 size-4", isFetching && "animate-spin")} /> Refresh
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

      {/* ── Glass stat cards ── */}
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

      {/* ── Plan consumption with large gauge visualization ── */}
      {monthly && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg1)]/70 backdrop-blur-sm">
          <div className="border-b border-[var(--border)] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--brand)]/10">
                <Sigma className="size-4.5 text-[var(--brand)]" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">Plan consumption</h3>
                <p className="text-[12px] text-[var(--text3)]">Billing month {monthly.yearMonth}</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
              {/* Large circular gauge */}
              <div className="flex shrink-0 items-center justify-center">
                <div className="relative flex size-40 items-center justify-center">
                  <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg3)" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke={usagePercent > 90 ? "var(--red)" : usagePercent > 70 ? "var(--amber)" : "var(--brand)"}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(usagePercent / 100) * 264} 264`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[28px] font-bold tabular-nums tracking-tight text-[var(--text)]">
                      {usagePercent.toFixed(0)}%
                    </span>
                    <span className="text-[11px] text-[var(--text3)]">consumed</span>
                  </div>
                </div>
              </div>

              {/* Metrics grid */}
              <div className="flex-1">
                <Meter
                  label="Events against plan allowance"
                  used={monthly.totalEvents}
                  limit={monthly.planLimit}
                  format={formatCompact}
                  hint={
                    monthly.usagePercent != null
                      ? `${monthly.usagePercent.toFixed(1)}% consumed this month`
                      : "This project has no explicit plan limit"
                  }
                />
                <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
                  {[
                    { label: "Ingested", value: formatBytes(monthly.totalBytes) },
                    { label: "Key requests", value: formatCompact(monthly.apiKeyRequests) },
                    { label: "Rate-limited", value: formatCompact(monthly.rateLimitedEvents) },
                    { label: "Notifications", value: formatCompact(monthly.alertNotifications) },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col gap-1 bg-[var(--bg1)] px-3.5 py-3">
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text3)]">
                        {item.label}
                      </dt>
                      <dd className="text-[16px] font-bold tabular-nums text-[var(--text)]">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Trend chart with gradient background ── */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg1)]/70 backdrop-blur-sm transition-all duration-200 hover:shadow-lg hover:shadow-[var(--brand)]/5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--blue)]/10">
              <LineChartIcon className="size-4.5 text-[var(--blue)]" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">Project usage trend</h3>
              <p className="text-[12px] text-[var(--text3)]">Accepted telemetry volume and errors</p>
            </div>
          </div>
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
        </div>
        <div className="p-6">
          {analytics.isLoading ? (
            <div className="h-64 animate-pulse rounded-xl bg-[var(--bg2)]" />
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
        </div>
      </div>

      {/* ── Raw counters table ── */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg1)]/70 backdrop-blur-sm">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--violet)]/10">
              <Database className="size-4.5 text-[var(--violet)]" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">Raw counters</h3>
              <p className="text-[12px] text-[var(--text3)]">Aggregated by the ingestion flush worker</p>
            </div>
          </div>
        </div>
        <div>
          {isLoading ? (
            <div className="flex flex-col gap-2 p-5">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="h-9 animate-pulse rounded-lg bg-[var(--bg2)]" />
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
              {counters.map((counter) => (
                <Tr key={counter.counterType}>
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
                    <span className="text-[14px] font-bold tabular-nums text-[var(--text)]">
                      {BYTE_COUNTERS.has(counter.counterType)
                        ? formatBytes(counter.totalValue)
                        : formatNumber(counter.totalValue)}
                    </span>
                  </Td>
                  <Td>
                    {counter.lastPeriodStart && counter.lastPeriodEnd ? (
                      <span className="text-[12px] text-[var(--text2)]">
                        <Timestamp value={counter.lastPeriodStart} /> &rarr; <Timestamp value={counter.lastPeriodEnd} />
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
        </div>
      </div>
    </div>
  );
}
