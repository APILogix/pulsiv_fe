import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import {
  useMonthlyUsage,
  useUsageAnalytics,
  useUsageComparison,
  useUsageHeatmap,
  useUsageTopList,
} from "@/modules/projects/hooks/useProjectAnalytics";
import { useEnvironments } from "@/modules/projects/hooks/useEnvironments";
import { environmentTypeLabel } from "@/modules/projects/environment.constants";
import {
  TOP_LIST_DIMENSIONS,
  type HeatmapType,
  type TopListDimension,
  type UsageGranularity,
} from "@/modules/projects/api/types";
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
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Meter, Notice, Panel, SegmentedControl, type SegmentOption } from "@/shared/ui/pulse";
import { FilterSelect, formatBytes, formatCompact, formatNumber } from "@/shared/observe";
import { cn } from "@/lib/utils";
import { useCurrentProject } from "./ProjectShellPage";
import { HeatmapGrid, VolumeChart } from "./ProjectAnalyticsCharts";

// ── module-level constants (rules.md §1.2) ───────────────────

type RangeKey = "24h" | "7d" | "30d" | "90d";

const RANGE_OPTIONS: SegmentOption<RangeKey>[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
];

const RANGE_HOURS: Record<RangeKey, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30, "90d": 24 * 90 };

const DEFAULT_GRANULARITY: Record<RangeKey, UsageGranularity> = {
  "24h": "hourly",
  "7d": "hourly",
  "30d": "daily",
  "90d": "daily",
};

const GRANULARITY_OPTIONS: SegmentOption<UsageGranularity>[] = [
  { value: "minute", label: "Minute" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
];

const GRANULARITY_NOUN: Record<UsageGranularity, string> = {
  minute: "minute",
  hourly: "hour",
  daily: "day",
  monthly: "month",
};

const HEATMAP_OPTIONS: SegmentOption<HeatmapType>[] = [
  { value: "calendar", label: "Calendar" },
  { value: "hourly", label: "Hour of day" },
  { value: "dayOfWeek", label: "Day of week" },
];

const HEATMAP_CAPTION: Record<HeatmapType, string> = {
  calendar: "Event volume by calendar day",
  hourly: "Event volume by hour of day",
  dayOfWeek: "Event volume by day of week",
};

const COMPARISON_OPTIONS: SegmentOption<"environment" | "apiKey">[] = [
  { value: "environment", label: "By environment" },
  { value: "apiKey", label: "By API key" },
];

const TOP_DIMENSION_OPTIONS = TOP_LIST_DIMENSIONS.map((dimension) => ({
  value: dimension,
  label: dimension.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()),
}));

const COMPARISON_COLUMNS: SheetColumn[] = [
  { key: "series", header: "Series", className: "w-full" },
  { key: "events", header: "Events", align: "right", className: "w-[112px]" },
  { key: "errors", header: "Errors", align: "right", className: `w-[112px] ${HIDE_BELOW_SM}` },
  { key: "requests", header: "Requests", align: "right", className: `w-[112px] ${HIDE_BELOW_MD}` },
  { key: "rate", header: "Error rate", align: "right", className: "w-[104px]" },
];

const WINDOW_FMT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type RateTone = "bad" | "warn" | "neutral";

function rateTone(rate: number): RateTone {
  return rate > 5 ? "bad" : rate > 1 ? "warn" : "neutral";
}

const RATE_TEXT: Record<RateTone, string> = {
  bad: "text-[var(--red)]",
  warn: "text-[var(--amber)]",
  neutral: "text-[var(--text)]",
};

function PanelError({ title, error }: { title: string; error: unknown }) {
  return (
    <div role="alert">
      <Notice tone="red" icon={AlertTriangle} title={title}>
        {apiErrorMessage(error)}
      </Notice>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectAnalyticsPage() {
  const { projectId } = useCurrentProject();
  const { data: environments = [] } = useEnvironments(projectId);

  const [range, setRange] = useState<RangeKey>("7d");
  const [granularity, setGranularity] = useState<UsageGranularity>(DEFAULT_GRANULARITY["7d"]);
  const [environmentId, setEnvironmentId] = useState("");
  const [heatmapType, setHeatmapType] = useState<HeatmapType>("calendar");
  const [dimension, setDimension] = useState<TopListDimension>("endpoint");
  const [comparisonDimension, setComparisonDimension] = useState<"environment" | "apiKey">("environment");

  // Range is derived once per render from a stable bucket so query keys stay
  // stable across re-renders instead of changing every millisecond.
  const { from, to } = useMemo(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    const end = now.toISOString();
    const start = new Date(now.getTime() - RANGE_HOURS[range] * 60 * 60 * 1000).toISOString();
    return { from: start, to: end };
  }, [range]);

  const scoped = environmentId ? { environmentId } : {};

  const usageQuery = useUsageAnalytics(projectId, { from, to, granularity, ...scoped });
  const heatmapQuery = useUsageHeatmap(projectId, { from, to, type: heatmapType, ...scoped });
  const topQuery = useUsageTopList(projectId, { from, to, dimension, limit: 10, ...scoped });
  const comparisonQuery = useUsageComparison(projectId, { from, to, dimension: comparisonDimension, limit: 10 });
  const monthlyQuery = useMonthlyUsage(projectId);

  const summary = usageQuery.data?.summary;
  const series = useMemo(
    () =>
      [...(usageQuery.data?.timeSeries ?? [])].sort(
        (left, right) => new Date(left.bucket).getTime() - new Date(right.bucket).getTime(),
      ),
    [usageQuery.data?.timeSeries],
  );
  const errorRate = summary && summary.totalEvents > 0 ? (summary.errors / summary.totalEvents) * 100 : 0;

  const environmentOptions = [
    { value: "", label: "All environments" },
    ...environments.map((environment) => ({
      value: environment.id,
      label: `${environment.name} · ${environmentTypeLabel(environment.type)}`,
    })),
  ];

  const readouts: Readout[] = [
    { label: "Events", value: formatCompact(summary?.totalEvents ?? 0), sub: "In this window" },
    {
      label: "Errors",
      value: formatCompact(summary?.errors ?? 0),
      sub: `${errorRate.toFixed(2)}% of events`,
      tone: rateTone(errorRate),
    },
    {
      label: "Requests",
      value: formatCompact(summary?.requests ?? 0),
      sub: `${formatCompact(summary?.sdkRequests ?? 0)} SDK requests`,
    },
    {
      label: "Active keys",
      value: formatNumber(summary?.activeApiKeys ?? 0),
      sub: `${formatNumber(summary?.activeEnvironments ?? 0)} environments active`,
    },
    {
      label: "Active users",
      value: formatCompact(summary?.activeUsers ?? 0),
      sub: `${formatNumber(summary?.activeMembers ?? 0)} active members`,
    },
  ];

  const failedNotifications = summary?.failedNotifications ?? 0;
  const breakdown: Array<{ title: string; items: Array<{ label: string; value?: number; bad?: boolean }> }> = [
    {
      title: "Telemetry",
      items: [
        { label: "Transactions", value: summary?.transactions },
        { label: "Traces", value: summary?.traces },
        { label: "Spans", value: summary?.spans },
        { label: "Logs", value: summary?.logs },
        { label: "Metrics", value: summary?.metrics },
        { label: "Profiles", value: summary?.profiles },
        { label: "AI events", value: summary?.aiEvents },
      ],
    },
    {
      title: "Traffic",
      items: [
        { label: "Requests", value: summary?.requests },
        { label: "SDK requests", value: summary?.sdkRequests },
        { label: "Rate-limited", value: summary?.rateLimitUsage },
      ],
    },
    {
      title: "Alerting",
      items: [
        { label: "Alerts", value: summary?.alertCount },
        { label: "Deliveries", value: summary?.connectorDeliveries },
        { label: "Failed notifications", value: failedNotifications, bad: failedNotifications > 0 },
      ],
    },
    {
      title: "People",
      items: [
        { label: "Active users", value: summary?.activeUsers },
        { label: "Active members", value: summary?.activeMembers },
      ],
    },
  ];

  const topItems = topQuery.data ?? [];
  const topMax = Math.max(1, ...topItems.map((item) => item.totalEvents));
  const dimensionLabel = TOP_DIMENSION_OPTIONS.find((option) => option.value === dimension)?.label ?? dimension;

  const comparison = comparisonQuery.data ?? [];
  let comparisonBody: ReactNode;
  if (comparisonQuery.isLoading) {
    comparisonBody = <SheetLoading rows={3} label="Loading comparison" />;
  } else if (comparisonQuery.error) {
    comparisonBody = (
      <SheetError
        title="Could not load the comparison"
        message={apiErrorMessage(comparisonQuery.error)}
        onRetry={() => void comparisonQuery.refetch()}
      />
    );
  } else if (comparison.length === 0) {
    comparisonBody = (
      <SheetEmpty
        title="No comparable series in this range"
        description={`A comparison needs traffic from at least one ${comparisonDimension === "apiKey" ? "API key" : "environment"} in this window.`}
      />
    );
  } else {
    comparisonBody = (
      <SheetTable columns={COMPARISON_COLUMNS} caption="Usage comparison" minWidth={420}>
        {comparison.map((entry) => {
          const totals = entry.data.reduce(
            (accumulator, point) => ({
              events: accumulator.events + point.totalEvents,
              errors: accumulator.errors + point.errors,
              requests: accumulator.requests + point.requests,
            }),
            { events: 0, errors: 0, requests: 0 },
          );
          const rate = totals.events > 0 ? (totals.errors / totals.events) * 100 : 0;
          return (
            <SheetRow key={entry.id}>
              <SheetCell className="w-full max-w-0">
                <RowTitle title={entry.name} />
              </SheetCell>
              <SheetCell align="right">
                <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums">{formatCompact(totals.events)}</span>
              </SheetCell>
              <SheetCell align="right" className={HIDE_BELOW_SM}>
                <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums">{formatCompact(totals.errors)}</span>
              </SheetCell>
              <SheetCell align="right" className={HIDE_BELOW_MD}>
                <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums">{formatCompact(totals.requests)}</span>
              </SheetCell>
              <SheetCell align="right">
                <span className={cn("font-[family-name:var(--mono)] text-[12px] tabular-nums", RATE_TEXT[rateTone(rate)])}>
                  {rate.toFixed(2)}%
                </span>
              </SheetCell>
            </SheetRow>
          );
        })}
      </SheetTable>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Analytics"
        description="Event, error, and request volume for this project, sliced by time, telemetry type, and contributor."
        meta={[
          {
            label: "Window",
            value: `${WINDOW_FMT.format(new Date(from))} – ${WINDOW_FMT.format(new Date(to))}`,
            mono: true,
          },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Analytics scope">
        <SegmentedControl
          value={range}
          onChange={(next) => {
            setRange(next);
            setGranularity(DEFAULT_GRANULARITY[next]);
          }}
          options={RANGE_OPTIONS}
          ariaLabel="Time range"
        />
        <SegmentedControl
          value={granularity}
          onChange={setGranularity}
          options={GRANULARITY_OPTIONS}
          ariaLabel="Bucket size"
        />
        <FilterSelect label="Environment" value={environmentId} onChange={setEnvironmentId} options={environmentOptions} />
      </div>

      {usageQuery.error && <PanelError title="Could not load usage analytics" error={usageQuery.error} />}

      <Readouts cells={readouts} loading={usageQuery.isLoading} label="Analytics summary" />

      {/* ── volume trend ── */}
      <Panel
        title="Ingestion volume"
        description={`Events, requests, and errors per ${GRANULARITY_NOUN[granularity]}.`}
      >
        {usageQuery.isLoading ? (
          <div role="status" aria-label="Loading ingestion volume">
            <div aria-hidden="true" className="loading-skeleton h-[276px] rounded-[var(--radius)]" />
          </div>
        ) : (
          <VolumeChart points={series} label="Event, request, and error volume over the selected range" />
        )}
      </Panel>

      {/* ── signal breakdown ── */}
      <Panel title="Signal breakdown" description="Volume by telemetry type, traffic, alerting, and people in this window.">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
          {breakdown.map((group) => (
            <section key={group.title} className="min-w-0">
              <h3 className="text-[12px] font-medium text-[var(--text2)]">{group.title}</h3>
              <dl className="mt-2 divide-y divide-[var(--border)] border-t border-[var(--border)]">
                {group.items.map((item) => (
                  <div key={item.label} className="flex items-baseline justify-between gap-3 py-2">
                    <dt className="truncate text-[13px] text-[var(--text2)]">{item.label}</dt>
                    <dd
                      className={cn(
                        "font-[family-name:var(--mono)] text-[13px] tabular-nums",
                        item.bad ? "text-[var(--red)]" : "text-[var(--text)]",
                      )}
                    >
                      {usageQuery.isLoading ? "—" : formatCompact(item.value ?? 0)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </Panel>

      {/* ── heatmap + top list ── */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <Panel
          title="Activity heatmap"
          description="Where ingestion concentrates in time."
          actions={
            <SegmentedControl
              value={heatmapType}
              onChange={setHeatmapType}
              options={HEATMAP_OPTIONS}
              ariaLabel="Heatmap grouping"
            />
          }
        >
          {heatmapQuery.isLoading ? (
            <div role="status" aria-label="Loading heatmap">
              <div aria-hidden="true" className="loading-skeleton h-40 rounded-[var(--radius)]" />
            </div>
          ) : heatmapQuery.error ? (
            <PanelError title="Could not load the heatmap" error={heatmapQuery.error} />
          ) : (
            <HeatmapGrid cells={heatmapQuery.data?.cells ?? []} caption={HEATMAP_CAPTION[heatmapType]} />
          )}
        </Panel>

        <Panel
          title="Top contributors"
          description="The highest-volume slices for the chosen dimension."
          actions={
            <FilterSelect
              label="Dimension"
              value={dimension}
              onChange={(next) => setDimension(next as TopListDimension)}
              options={TOP_DIMENSION_OPTIONS}
            />
          }
        >
          {topQuery.isLoading ? (
            <div role="status" aria-label="Loading top contributors" className="flex flex-col gap-3">
              {[0, 1, 2, 3, 4].map((row) => (
                <div key={row} aria-hidden="true" className="loading-skeleton h-7 rounded-[var(--radius)]" />
              ))}
            </div>
          ) : topQuery.error ? (
            <PanelError title="Could not load top contributors" error={topQuery.error} />
          ) : topItems.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[var(--text3)]">
              No {dimensionLabel.toLowerCase()} data recorded in this range.
            </p>
          ) : (
            <ol className="flex flex-col" aria-label={`Top ${dimensionLabel.toLowerCase()} by events`}>
              {topItems.map((item, index) => (
                <li
                  key={`${item.key}-${index}`}
                  className="group flex flex-col gap-1.5 border-b border-[var(--border)] py-2.5 first:pt-0 last:border-b-0 last:pb-0"
                  title={item.key}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-baseline gap-2.5">
                      <span className="w-5 shrink-0 text-right font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]">
                        {index + 1}
                      </span>
                      <span className="truncate text-[13px] text-[var(--text2)] transition-colors group-hover:text-[var(--text)]">
                        {item.key || "Unknown"}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2 font-[family-name:var(--mono)] text-[12px] tabular-nums">
                      {item.errors > 0 && <span className="text-[var(--red)]">{formatCompact(item.errors)} errors</span>}
                      <span className="text-[var(--text)]">{formatCompact(item.totalEvents)}</span>
                    </span>
                  </div>
                  <div aria-hidden="true" className="ml-[30px] h-1 overflow-hidden rounded-full bg-[var(--bg3)]">
                    <div
                      className="h-full rounded-full bg-[var(--text3)] transition-colors duration-150 group-hover:bg-[var(--text2)]"
                      style={{ width: `${(item.totalEvents / topMax) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      {/* ── comparison ── */}
      <Sheet
        title="Comparison"
        description="Totals side by side, so an outlier environment or key stands out."
        actions={
          <SegmentedControl
            value={comparisonDimension}
            onChange={setComparisonDimension}
            options={COMPARISON_OPTIONS}
            ariaLabel="Comparison dimension"
          />
        }
      >
        {comparisonBody}
      </Sheet>

      {/* ── plan consumption ── */}
      <Panel title="This month against the plan" description="Billable consumption for the current billing month.">
        {monthlyQuery.isLoading ? (
          <div role="status" aria-label="Loading monthly usage">
            <div aria-hidden="true" className="loading-skeleton h-24 rounded-[var(--radius)]" />
          </div>
        ) : monthlyQuery.data ? (
          <div className="flex flex-col gap-5">
            <Meter
              label={`Events in ${monthlyQuery.data.yearMonth}`}
              used={monthlyQuery.data.totalEvents}
              limit={monthlyQuery.data.planLimit}
              format={formatCompact}
              hint={
                monthlyQuery.data.usagePercent != null
                  ? `${monthlyQuery.data.usagePercent.toFixed(1)}% of the plan allowance consumed`
                  : "No plan limit configured for this project"
              }
            />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: "Ingested", value: formatBytes(monthlyQuery.data.totalBytes) },
                { label: "Key requests", value: formatCompact(monthlyQuery.data.apiKeyRequests) },
                { label: "Rate-limited", value: formatCompact(monthlyQuery.data.rateLimitedEvents) },
                { label: "Alert notifications", value: formatCompact(monthlyQuery.data.alertNotifications) },
                { label: "Active users", value: formatCompact(monthlyQuery.data.activeUsers) },
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
        ) : (
          <p className="py-6 text-[13px] text-[var(--text3)]">Monthly usage is not available yet.</p>
        )}
      </Panel>
    </WorkspacePage>
  );
}
