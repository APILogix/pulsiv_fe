import { useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Gauge,
  Globe,
  LineChart as LineChartIcon,
  Layers,
  ListOrdered,
  TrendingUp,
} from "lucide-react";
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
  type UsageTimeSeriesPoint,
} from "@/modules/projects/api/types";
import { useCurrentProject } from "./ProjectShellPage";
import {
  ChartTooltip,
  Meter,
  Notice,
  Panel,
  SegmentedControl,
  StatCard,
  Toolbar,
  type ChartTooltipState,
  type SegmentOption,
} from "@/shared/ui/pulse";
import { FilterSelect, Table, Td, Tr, formatBytes, formatCompact, formatNumber } from "@/shared/observe";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { cn } from "@/lib/utils";

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

const HEATMAP_OPTIONS: SegmentOption<HeatmapType>[] = [
  { value: "calendar", label: "Calendar" },
  { value: "hourly", label: "Hour of day" },
  { value: "dayOfWeek", label: "Day of week" },
];

const COMPARISON_OPTIONS: SegmentOption<"environment" | "apiKey">[] = [
  { value: "environment", label: "By environment" },
  { value: "apiKey", label: "By API key" },
];

const TOP_DIMENSION_OPTIONS = TOP_LIST_DIMENSIONS.map((dimension) => ({
  value: dimension,
  label: dimension.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()),
}));

/** Series rendered on the volume chart, in draw order. */
const CHART_SERIES = [
  { key: "totalEvents", label: "Events", color: "var(--brand)" },
  { key: "errors", label: "Errors", color: "var(--red)" },
  { key: "requests", label: "Requests", color: "var(--blue)" },
] as const;

const COMPARISON_HEADERS = ["Series", "Events", "Errors", "Requests", "Error rate"];

// ── multi-series line chart (SVG, no deps) ───────────────────

function VolumeChart({ points }: { points: UsageTimeSeriesPoint[] }) {
  const width = 1000;
  const height = 220;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (points.length < 2) return null;
    const max = Math.max(
      1,
      ...points.flatMap((point) => CHART_SERIES.map((series) => Number(point[series.key] ?? 0))),
    );
    const step = width / (points.length - 1);
    const xAt = (index: number) => index * step;
    const yAt = (value: number) => height - (value / max) * height;
    const series = CHART_SERIES.map((item) => {
      const coords = points.map((point, index) => `${xAt(index).toFixed(2)},${yAt(Number(point[item.key] ?? 0)).toFixed(2)}`);
      return { ...item, line: coords.join(" "), area: `0,${height} ${coords.join(" ")} ${width},${height}` };
    });
    return { series, xAt, yAt };
  }, [points]);

  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const ratio = rect.width === 0 ? 0 : (event.clientX - rect.left) / rect.width;
    setHoverIndex(Math.round(Math.max(0, Math.min(1, ratio)) * (points.length - 1)));
  };

  if (!chart || points.length < 2) {
    return (
      <p className="py-12 text-center text-[12.5px] text-[var(--text3)]">
        Not enough data points in this range to draw a trend.
      </p>
    );
  }

  const first = points[0]?.bucket;
  const last = points[points.length - 1]?.bucket;
  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;

  const tooltip: ChartTooltipState | null =
    hoveredPoint && hoverIndex !== null
      ? {
          x: `${(chart.xAt(hoverIndex) / width) * 100}%`,
          y: 0,
          title: new Date(hoveredPoint.bucket).toLocaleString(),
          rows: CHART_SERIES.map((series) => ({
            label: series.label,
            value: formatCompact(Number(hoveredPoint[series.key] ?? 0)),
            color: series.color,
          })),
        }
      : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        {CHART_SERIES.map((series) => (
          <span key={series.key} className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--text2)]">
            <span className="size-2 rounded-full" style={{ background: series.color }} aria-hidden="true" />
            {series.label}
          </span>
        ))}
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-[220px] w-full cursor-crosshair"
          role="img"
          aria-label="Event volume over the selected range"
          onPointerMove={handleMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={0}
              x2={width}
              y1={height * ratio}
              y2={height * ratio}
              stroke="var(--border)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {chart.series.map((series) => (
            <g key={series.key}>
              <polygon points={series.area} fill={series.color} opacity="0.08" />
              <polyline
                points={series.line}
                fill="none"
                stroke={series.color}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
          {hoverIndex !== null && (
            <>
              <line
                x1={chart.xAt(hoverIndex)}
                x2={chart.xAt(hoverIndex)}
                y1={0}
                y2={height}
                stroke="var(--border2)"
                strokeWidth="1"
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
              {CHART_SERIES.map((series) => (
                <circle
                  key={series.key}
                  cx={chart.xAt(hoverIndex)}
                  cy={chart.yAt(Number(points[hoverIndex][series.key] ?? 0))}
                  r="3.5"
                  fill={series.color}
                  stroke="var(--bg1)"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  className="animate-in zoom-in-50 duration-150"
                />
              ))}
            </>
          )}
        </svg>
        <ChartTooltip state={tooltip} />
      </div>
      <div className="flex justify-between font-[family-name:var(--mono)] text-[10.5px] text-[var(--text3)]">
        <span>{first ? new Date(first).toLocaleString() : ""}</span>
        <span>{last ? new Date(last).toLocaleString() : ""}</span>
      </div>
    </div>
  );
}

// ── heatmap grid ─────────────────────────────────────────────

function HeatmapGrid({ cells }: { cells: Array<{ x: string; y: string; value: number }> }) {
  const [hovered, setHovered] = useState<{ x: string; y: string; value: number; left: number; top: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const yKeys = Array.from(new Set(cells.map((cell) => cell.y)));
    const xKeys = Array.from(new Set(cells.map((cell) => cell.x)));
    const lookup = new Map(cells.map((cell) => [`${cell.x}|${cell.y}`, cell.value]));
    const max = Math.max(1, ...cells.map((cell) => cell.value));
    return { yKeys, xKeys, lookup, max };
  }, [cells]);

  if (cells.length === 0) {
    return <p className="py-10 text-center text-[12.5px] text-[var(--text3)]">No activity recorded in this range.</p>;
  }

  const tooltip: ChartTooltipState | null = hovered
    ? {
        x: hovered.left,
        y: hovered.top,
        title: `${hovered.x} · ${hovered.y}`,
        rows: [{ label: "Events", value: formatNumber(hovered.value), color: "var(--brand)" }],
      }
    : null;

  return (
    <div ref={gridRef} className="sidebar-scroll relative overflow-x-auto">
      <table className="border-separate border-spacing-[2px]">
        <tbody>
          {rows.yKeys.map((yKey) => (
            <tr key={yKey}>
              <th className="pr-2 text-right align-middle font-[family-name:var(--mono)] text-[10.5px] font-normal text-[var(--text3)]">
                {yKey}
              </th>
              {rows.xKeys.map((xKey) => {
                const value = rows.lookup.get(`${xKey}|${yKey}`) ?? 0;
                const intensity = value === 0 ? 0 : 0.15 + (value / rows.max) * 0.85;
                const isHovered = hovered?.x === xKey && hovered?.y === yKey;
                return (
                  <td key={xKey}>
                    <div
                      onPointerEnter={(event) => {
                        const gridRect = gridRef.current?.getBoundingClientRect();
                        const cellRect = event.currentTarget.getBoundingClientRect();
                        if (!gridRect) return;
                        setHovered({
                          x: xKey,
                          y: yKey,
                          value,
                          left: cellRect.left - gridRect.left + cellRect.width / 2,
                          top: cellRect.top - gridRect.top,
                        });
                      }}
                      onPointerLeave={() => setHovered(null)}
                      className={cn(
                        "size-4 cursor-pointer rounded-[3px] ring-1 ring-inset ring-[var(--border)] transition-transform duration-150",
                        isHovered && "scale-125 ring-[var(--brand)]",
                      )}
                      style={{
                        background:
                          value === 0
                            ? "var(--bg2)"
                            : `color-mix(in srgb, var(--brand) ${Math.round(intensity * 100)}%, transparent)`,
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <ChartTooltip state={tooltip} />
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
    () => [...(usageQuery.data?.timeSeries ?? [])].sort(
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

  const topMax = Math.max(1, ...(topQuery.data ?? []).map((item) => item.totalEvents));

  return (
    <div className="flex flex-col gap-6">
      <Toolbar
        trailing={
          <span className="text-[11.5px] text-[var(--text3)]">
            {new Date(from).toLocaleString()} → {new Date(to).toLocaleString()}
          </span>
        }
      >
        <SegmentedControl
          value={range}
          onChange={(next) => {
            setRange(next);
            setGranularity(DEFAULT_GRANULARITY[next]);
          }}
          options={RANGE_OPTIONS}
          ariaLabel="Analytics time range"
        />
        <SegmentedControl
          value={granularity}
          onChange={setGranularity}
          options={GRANULARITY_OPTIONS}
          ariaLabel="Bucket granularity"
        />
        <FilterSelect
          label="Environment"
          value={environmentId}
          onChange={setEnvironmentId}
          options={environmentOptions}
        />
      </Toolbar>

      {usageQuery.error && (
        <Notice tone="red" icon={AlertTriangle} title="Could not load usage analytics">
          {apiErrorMessage(usageQuery.error)}
        </Notice>
      )}

      {/* ── summary ── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Total events"
          value={formatCompact(summary?.totalEvents ?? 0)}
          icon={Activity}
          tone="brand"
          series={series.map((point) => point.totalEvents)}
        />
        <StatCard
          label="Errors"
          value={formatCompact(summary?.errors ?? 0)}
          icon={AlertTriangle}
          tone={errorRate > 5 ? "red" : errorRate > 1 ? "amber" : "green"}
          footnote={`${errorRate.toFixed(2)}% of ingested events`}
          series={series.map((point) => point.errors)}
        />
        <StatCard
          label="Requests"
          value={formatCompact(summary?.requests ?? 0)}
          icon={Gauge}
          tone="violet"
          series={series.map((point) => point.requests)}
        />
        <StatCard
          label="Active keys"
          value={formatNumber(summary?.activeApiKeys ?? 0)}
          icon={Gauge}
          tone="blue"
          footnote={`${formatNumber(summary?.activeEnvironments ?? 0)} environments active`}
        />
      </div>

      {/* ── volume trend ── */}
      <Panel
        title="Ingestion volume"
        description="Events, errors, and requests across the selected range."
        icon={LineChartIcon}
      >
        {usageQuery.isLoading ? (
          <div className="h-56 animate-pulse rounded-[12px] bg-[var(--bg2)]" />
        ) : (
          <VolumeChart points={series} />
        )}
      </Panel>

      {/* ── secondary metrics ── */}
      <Panel title="Signal breakdown" description="Volume by telemetry type in this range." icon={Layers}>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Requests", value: summary?.requests },
            { label: "Transactions", value: summary?.transactions },
            { label: "Traces", value: summary?.traces },
            { label: "Spans", value: summary?.spans },
            { label: "Logs", value: summary?.logs },
            { label: "Metrics", value: summary?.metrics },
            { label: "Profiles", value: summary?.profiles },
            { label: "AI events", value: summary?.aiEvents },
            { label: "SDK requests", value: summary?.sdkRequests },
            { label: "Alerts", value: summary?.alertCount },
            { label: "Deliveries", value: summary?.connectorDeliveries },
            { label: "Failed notifications", value: summary?.failedNotifications },
            { label: "Rate-limited", value: summary?.rateLimitUsage },
            { label: "Active users", value: summary?.activeUsers },
            { label: "Active members", value: summary?.activeMembers },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-1 bg-[var(--bg1)] px-3.5 py-3">
              <dt className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">
                {item.label}
              </dt>
              <dd className="text-[15px] font-semibold tabular-nums text-[var(--text)]">
                {formatCompact(item.value ?? 0)}
              </dd>
            </div>
          ))}
        </dl>
      </Panel>

      {/* ── heatmap + top list ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel
          title="Activity heatmap"
          description="Where ingestion concentrates in time."
          icon={CalendarDays}
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
            <div className="h-40 animate-pulse rounded-[12px] bg-[var(--bg2)]" />
          ) : (
            <HeatmapGrid cells={heatmapQuery.data?.cells ?? []} />
          )}
        </Panel>

        <Panel
          title="Top contributors"
          description="Highest-volume slices for the chosen dimension."
          icon={ListOrdered}
          actions={
            <FilterSelect
              value={dimension}
              onChange={(next) => setDimension(next as TopListDimension)}
              options={TOP_DIMENSION_OPTIONS}
            />
          }
        >
          {topQuery.isLoading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3, 4].map((row) => (
                <div key={row} className="h-8 animate-pulse rounded-[8px] bg-[var(--bg2)]" />
              ))}
            </div>
          ) : (topQuery.data ?? []).length === 0 ? (
            <p className="py-10 text-center text-[12.5px] text-[var(--text3)]">
              No {dimension} data recorded in this range.
            </p>
          ) : (
            <ol className="flex flex-col gap-2.5">
              {(topQuery.data ?? []).map((item, index) => (
                <li
                  key={`${item.key}-${index}`}
                  className="group flex flex-col gap-1 rounded-[8px] px-1 py-0.5 transition-colors hover:bg-[var(--bg2)]"
                  title={item.key}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="w-4 shrink-0 font-[family-name:var(--mono)] text-[10.5px] text-[var(--text3)]">
                        {index + 1}
                      </span>
                      <span className="truncate text-[12.5px] text-[var(--text2)] transition-colors group-hover:text-[var(--text)]">
                        {item.key || "(unknown)"}
                      </span>
                    </span>
                    <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-[var(--text)]">
                      {formatCompact(item.totalEvents)}
                      {item.errors > 0 && (
                        <span className="ml-1.5 text-[11px] font-normal text-[var(--red)]">
                          {formatCompact(item.errors)} err
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg3)]">
                    <div
                      className="h-full rounded-full bg-[var(--brand)] transition-[filter] duration-200 group-hover:brightness-125 group-hover:shadow-[0_0_8px_var(--brand-glow)]"
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
      <Panel
        title="Comparison"
        description="Side-by-side totals so you can spot an outlier environment or key."
        icon={BarChart3}
        actions={
          <SegmentedControl
            value={comparisonDimension}
            onChange={setComparisonDimension}
            options={COMPARISON_OPTIONS}
            ariaLabel="Comparison dimension"
          />
        }
        bodyClassName="p-0"
      >
        {comparisonQuery.isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-9 animate-pulse rounded-[8px] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : (comparisonQuery.data ?? []).length === 0 ? (
          <p className="py-10 text-center text-[12.5px] text-[var(--text3)]">
            No comparable series in this range.
          </p>
        ) : (
          <Table headers={COMPARISON_HEADERS} maxHeight="24rem">
            {(comparisonQuery.data ?? []).map((entry) => {
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
                <Tr key={entry.id}>
                  <Td>
                    <span className="truncate text-[13px] font-medium text-[var(--text)]">{entry.name}</span>
                  </Td>
                  <Td>
                    <span className="tabular-nums text-[12.5px]">{formatCompact(totals.events)}</span>
                  </Td>
                  <Td>
                    <span className="tabular-nums text-[12.5px]">{formatCompact(totals.errors)}</span>
                  </Td>
                  <Td>
                    <span className="tabular-nums text-[12.5px]">{formatCompact(totals.requests)}</span>
                  </Td>
                  <Td>
                    <span
                      className={cn(
                        "tabular-nums text-[12.5px] font-semibold",
                        rate > 5 ? "text-[var(--red)]" : rate > 1 ? "text-[var(--amber)]" : "text-[var(--green)]",
                      )}
                    >
                      {rate.toFixed(2)}%
                    </span>
                  </Td>
                </Tr>
              );
            })}
          </Table>
        )}
      </Panel>

      {/* ── plan consumption ── */}
      <Panel
        title="This month vs plan"
        description="Billable consumption for the current billing month."
        icon={TrendingUp}
      >
        {monthlyQuery.isLoading ? (
          <div className="h-24 animate-pulse rounded-[12px] bg-[var(--bg2)]" />
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
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: "Ingested", value: formatBytes(monthlyQuery.data.totalBytes) },
                { label: "Key requests", value: formatCompact(monthlyQuery.data.apiKeyRequests) },
                { label: "Rate-limited", value: formatCompact(monthlyQuery.data.rateLimitedEvents) },
                { label: "Alert notifications", value: formatCompact(monthlyQuery.data.alertNotifications) },
                { label: "Active users", value: formatCompact(monthlyQuery.data.activeUsers) },
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
        ) : (
          <p className="flex items-center gap-1.5 py-6 text-center text-[12.5px] text-[var(--text3)]">
            <Globe className="size-3.5" aria-hidden="true" /> Monthly usage is not available yet.
          </p>
        )}
      </Panel>
    </div>
  );
}
