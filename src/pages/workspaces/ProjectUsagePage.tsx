import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

import { projectPath } from "@/modules/projects/navigation/project-routes";
import { useProjectStats, useProjectUsageCounters } from "@/modules/projects/hooks/useProjects";
import { useMonthlyUsage, useUsageAnalytics } from "@/modules/projects/hooks/useProjectAnalytics";
import type { UsageGranularity } from "@/modules/projects/api/types";
import { UsageTrendChart } from "@/modules/projects/components/UsageTrendChart";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_MD,
  HIDE_BELOW_SM,
  ProjectPageHeader,
  Readouts,
  RowTitle,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  TextLink,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Meter, Notice, Panel, SegmentedControl, type SegmentOption } from "@/shared/ui/pulse";
import { FilterSelect, Timestamp, formatBytes, formatCompact, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrentProject } from "./ProjectShellPage";

// ── module-level constants (rules.md §1.2) ───────────────────

type UsageRangeKey = "30d" | "90d" | "180d" | "1y";
const USAGE_RANGE_OPTIONS: SegmentOption<UsageRangeKey>[] = [
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "180d", label: "180d" },
  { value: "1y", label: "1y" },
];
const USAGE_RANGE_DAYS: Record<UsageRangeKey, number> = { "30d": 30, "90d": 90, "180d": 180, "1y": 365 };
const USAGE_GRANULARITY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
];

// The product's own volume in white and blue; errors are state, so red.
const TREND_SERIES = [
  { key: "totalEvents", label: "Events", color: "var(--text)" },
  { key: "requests", label: "Requests", color: "var(--blue)" },
  { key: "errors", label: "Errors", color: "var(--red)" },
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

const COLUMNS: SheetColumn[] = [
  { key: "counter", header: "Counter", className: "w-full" },
  { key: "total", header: "Total", align: "right", className: "w-[140px]" },
  { key: "period", header: "Last period", className: `w-[260px] ${HIDE_BELOW_MD}` },
  { key: "flushed", header: "Last flushed", className: `w-[120px] ${HIDE_BELOW_SM}` },
];

function counterLabel(counterType: string) {
  const label = COUNTER_LABELS[counterType] ?? counterType.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectUsagePage() {
  const { projectId, orgSlug, publicId } = useCurrentProject();
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

  const readouts: Readout[] = [
    { label: "Events", value: formatCompact(totalEvents), sub: "Lifetime total" },
    { label: "Ingested", value: formatBytes(totalBytes), sub: "Lifetime total" },
    { label: "Requests", value: formatCompact(stats?.stats.totalRequests ?? 0), sub: "Recorded for this project" },
    {
      label: "Active keys",
      value: formatNumber(stats?.stats.activeKeysCount ?? 0),
      sub: `of ${formatNumber(stats?.stats.apiKeysCount ?? 0)} keys`,
    },
    { label: "Environments", value: formatNumber(stats?.stats.environmentCount ?? 0), sub: "Configured" },
  ];

  let countersBody: ReactNode;
  if (isLoading) {
    countersBody = <SheetLoading rows={4} label="Loading counters" />;
  } else if (error) {
    countersBody = (
      <SheetError title="Could not load usage counters" message={asMessage(error)} onRetry={() => void refetch()} />
    );
  } else if (counters.length === 0) {
    countersBody = (
      <SheetEmpty
        title="No usage recorded yet"
        description="Counters appear after the first telemetry batch is accepted for this project."
      />
    );
  } else {
    countersBody = (
      <SheetTable columns={COLUMNS} caption="Usage counters" minWidth={420}>
        {counters.map((counter) => (
          <SheetRow key={counter.counterType}>
            <SheetCell className="w-full max-w-0">
              <RowTitle title={counterLabel(counter.counterType)} subtitle={counter.counterType} subtitleMono />
            </SheetCell>
            <SheetCell align="right" className="max-sm:pr-5">
              <span className="font-[family-name:var(--mono)] text-[13px] tabular-nums text-[var(--text)]">
                {BYTE_COUNTERS.has(counter.counterType) ? formatBytes(counter.totalValue) : formatNumber(counter.totalValue)}
              </span>
            </SheetCell>
            <SheetCell className={HIDE_BELOW_MD}>
              {counter.lastPeriodStart && counter.lastPeriodEnd ? (
                <span className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-[var(--text3)]">
                  <Timestamp value={counter.lastPeriodStart} />
                  <span>to</span>
                  <Timestamp value={counter.lastPeriodEnd} />
                </span>
              ) : (
                <span className="text-[12px] text-[var(--text3)]">—</span>
              )}
            </SheetCell>
            <SheetCell className={HIDE_BELOW_SM}>
              {counter.lastFlushedAt ? (
                <Timestamp value={counter.lastFlushedAt} />
              ) : (
                <span className="text-[12px] text-[var(--text3)]">Never</span>
              )}
            </SheetCell>
          </SheetRow>
        ))}
      </SheetTable>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Usage"
        description={
          <>
            Lifetime counters kept by the ingestion pipeline, and this month's position against the plan. For
            time-sliced breakdowns, open <TextLink to={projectPath(orgSlug, publicId, "analytics")}>Analytics</TextLink>.
          </>
        }
        actions={
          <UiButton variant="outline" size="lg" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCcw className={cn("size-4", isFetching && "animate-spin")} aria-hidden="true" />
            {isFetching ? "Refreshing" : "Refresh"}
          </UiButton>
        }
      />

      <Readouts cells={readouts} loading={isLoading} label="Lifetime usage" />

      <Panel
        title="Usage trend"
        description="Accepted events, requests, and errors across the selected range."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              value={usageRange}
              onChange={setUsageRange}
              options={USAGE_RANGE_OPTIONS}
              ariaLabel="Usage range"
            />
            <FilterSelect
              label="Bucket"
              value={usageGranularity}
              onChange={(value) => setUsageGranularity(value as Extract<UsageGranularity, "daily" | "monthly">)}
              options={USAGE_GRANULARITY_OPTIONS}
            />
          </div>
        }
      >
        {analytics.isLoading ? (
          <div role="status" aria-label="Loading usage trend">
            <div aria-hidden="true" className="loading-skeleton h-[296px] rounded-[var(--radius)]" />
          </div>
        ) : analytics.error ? (
          <div role="alert">
            <Notice tone="red" icon={AlertTriangle} title="Could not load the usage trend">
              {asMessage(analytics.error)}
            </Notice>
          </div>
        ) : (
          <UsageTrendChart
            ariaLabel="Project event, request, and error usage over time"
            points={(analytics.data?.timeSeries ?? []).map((point) => ({
              bucket: point.bucket,
              totalEvents: point.totalEvents,
              requests: point.requests,
              errors: point.errors,
            }))}
            series={TREND_SERIES}
            emptyMessage="No project usage was recorded in this range."
          />
        )}
      </Panel>

      {monthly && (
        <Panel title="Plan consumption" description={`Billing month ${monthly.yearMonth}.`}>
          <div className="flex flex-col gap-5">
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
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-[var(--border)] pt-5 sm:grid-cols-4">
              {[
                { label: "Ingested", value: formatBytes(monthly.totalBytes) },
                { label: "Key requests", value: formatCompact(monthly.apiKeyRequests) },
                { label: "Rate-limited", value: formatCompact(monthly.rateLimitedEvents) },
                { label: "Notifications", value: formatCompact(monthly.alertNotifications) },
              ].map((item) => (
                <div key={item.label} className="flex min-w-0 flex-col gap-1">
                  <dt className="truncate text-[12px] text-[var(--text3)]">{item.label}</dt>
                  <dd className="font-[family-name:var(--mono)] text-[15px] font-medium tabular-nums text-[var(--text)]">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Panel>
      )}

      <Sheet
        title="Raw counters"
        description="Aggregated by the ingestion flush worker. Values may lag real time by one flush interval."
      >
        {countersBody}
      </Sheet>
    </WorkspacePage>
  );
}
