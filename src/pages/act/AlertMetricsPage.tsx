/**
 * Alert metrics: `GET /organizations/:orgId/alerting/metrics`.
 *
 * Rolled-up metric buckets (rule firing counts, notification counts, and so
 * on) keyed by metricType and granularity. An operator view of the raw
 * buckets, with one row per metric type whose sparkline plots that type's
 * buckets in time order.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { useAlertMetrics } from "@/modules/alerting/hooks/useAlerting";
import { METRIC_GRANULARITIES, type AlertMetric, type MetricGranularity } from "@/modules/alerting/api/types";
import { labelize } from "@/modules/alerting/components/alerting-ui";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  HIDE_BELOW_SM,
  ProjectPageHeader,
  Readouts,
  SearchField,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  ToolbarCount,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { SegmentedControl, type SegmentOption } from "@/shared/ui/pulse";
import {
  MetricSparkline,
  Timestamp,
  formatAbsoluteTime,
  formatNumber,
  formatRelativeTime,
} from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";

// ── Module-level constants ───────────────────────────────────

// The page asks for at most this many buckets (one week of hours).
const BUCKET_LIMIT = 168;
const PAGE_SIZE = 25;

const GRANULARITY_OPTIONS: SegmentOption<MetricGranularity>[] = METRIC_GRANULARITIES.map((value) => ({
  value,
  label: labelize(value),
}));

const TYPE_COLUMNS: SheetColumn[] = [
  { key: "type", header: "Metric type" },
  { key: "trend", header: "Trend", className: `w-[176px] ${HIDE_BELOW_MD}` },
  { key: "buckets", header: "Buckets", className: `w-[96px] ${HIDE_BELOW_SM}`, align: "right" },
  { key: "latest", header: "Latest", className: "w-[104px]", align: "right" },
  { key: "sum", header: "Sum", className: "w-[112px]", align: "right" },
];

const BUCKET_COLUMNS: SheetColumn[] = [
  { key: "type", header: "Metric type" },
  { key: "value", header: "Value", className: "w-[112px]", align: "right" },
  { key: "start", header: "Bucket start", className: "w-[136px]" },
  { key: "end", header: "Bucket end", className: `w-[136px] ${HIDE_BELOW_MD}` },
  { key: "rule", header: "Rule", className: `w-[136px] ${HIDE_BELOW_LG}` },
];

const MONO_VALUE = "font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]";

// ── Helpers ──────────────────────────────────────────────────

const numeric = (metric: AlertMetric) => Number(metric.value || 0);
const bucketTime = (metric: AlertMetric) => new Date(metric.bucketStart).getTime();

interface TypeSummary {
  type: string;
  buckets: number;
  sum: number;
  latest: number;
  series: number[];
}

function summarizeTypes(metrics: AlertMetric[]): TypeSummary[] {
  const grouped = new Map<string, AlertMetric[]>();
  for (const metric of metrics) {
    const list = grouped.get(metric.metricType) ?? [];
    list.push(metric);
    grouped.set(metric.metricType, list);
  }
  return Array.from(grouped.entries()).map(([type, rows]) => {
    const ordered = rows.slice().sort((a, b) => bucketTime(a) - bucketTime(b));
    const series = ordered.map(numeric);
    return {
      type,
      buckets: rows.length,
      sum: series.reduce((total, value) => total + value, 0),
      latest: series[series.length - 1] ?? 0,
      series,
    };
  });
}

/** Rounded for display without inventing precision the bucket did not carry. */
function formatValue(value: number): string {
  return Number.isInteger(value) ? formatNumber(value) : value.toFixed(2);
}

// ── Page ─────────────────────────────────────────────────────

export default function AlertMetricsPage() {
  const [granularity, setGranularity] = useState<MetricGranularity>("hour");
  const [metricType, setMetricType] = useState("");
  const [page, setPage] = useState(0);
  const { data, isLoading, error, refetch } = useAlertMetrics({
    granularity,
    limit: BUCKET_LIMIT,
    ...(metricType ? { metricType } : {}),
  });

  // One toast per failure, not one per render.
  useEffect(() => {
    if (error) toast.error(apiErrorMessage(error, "Could not load alert metrics."));
  }, [error]);

  const metrics = useMemo(() => data ?? [], [data]);
  const types = useMemo(() => summarizeTypes(metrics), [metrics]);

  const totalValue = metrics.reduce((sum, metric) => sum + numeric(metric), 0);
  const latestBucketEnd = metrics.reduce<string | null>((latest, metric) => {
    if (!latest) return metric.bucketEnd;
    return new Date(metric.bucketEnd).getTime() > new Date(latest).getTime() ? metric.bucketEnd : latest;
  }, null);
  const capped = metrics.length >= BUCKET_LIMIT;
  const filterNote = metricType.trim() ? `Filtered to ${metricType.trim()}` : `By ${granularity}`;

  const loading = isLoading && !data;
  const loadFailed = Boolean(error) && !data;

  const pageCount = Math.max(1, Math.ceil(metrics.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pageRows = metrics.slice(pageStart, pageStart + PAGE_SIZE);

  const changeGranularity = (next: MetricGranularity) => {
    setGranularity(next);
    setPage(0);
  };
  const changeMetricType = (next: string) => {
    setMetricType(next);
    setPage(0);
  };

  const readouts: Readout[] = [
    {
      label: "Buckets",
      value: formatNumber(metrics.length),
      sub: capped ? `Capped at ${formatNumber(BUCKET_LIMIT)} per request` : filterNote,
    },
    {
      label: "Metric types",
      value: formatNumber(types.length),
      sub: filterNote,
    },
    {
      label: "Sum across buckets",
      value: formatNumber(Math.round(totalValue)),
      sub: capped ? `Over the ${formatNumber(BUCKET_LIMIT)} buckets loaded` : "Every bucket in the response",
    },
    {
      label: "Latest bucket",
      value: latestBucketEnd ? formatRelativeTime(latestBucketEnd) : "—",
      title: latestBucketEnd ? formatAbsoluteTime(latestBucketEnd) : undefined,
      sub: latestBucketEnd ? "When the newest bucket closes" : "No buckets yet",
    },
  ];

  const toolbar = (
    <>
      {/* Scrolls sideways on narrow screens instead of widening the page. */}
      <div className="sidebar-scroll max-w-full overflow-x-auto">
        <SegmentedControl
          value={granularity}
          onChange={changeGranularity}
          options={GRANULARITY_OPTIONS}
          ariaLabel="Bucket granularity"
        />
      </div>
      <SearchField
        value={metricType}
        onChange={changeMetricType}
        placeholder="Metric type, e.g. rule_fired"
        label="Filter by metric type"
      />
      {!loading && !loadFailed && (
        <ToolbarCount>
          {formatNumber(types.length)} {types.length === 1 ? "type" : "types"}
        </ToolbarCount>
      )}
    </>
  );

  let typesBody: ReactNode;
  if (loading) {
    typesBody = <SheetLoading rows={4} label="Loading alert metrics" />;
  } else if (loadFailed) {
    typesBody = (
      <SheetError
        title="Could not load alert metrics"
        message={apiErrorMessage(error, "The metrics request failed. Try again, or pick another granularity.")}
        onRetry={() => void refetch()}
      />
    );
  } else if (metrics.length === 0) {
    typesBody = (
      <SheetEmpty
        title={metricType.trim() ? "No buckets for this metric type" : "No metrics recorded for this window yet"}
        description={
          metricType.trim()
            ? `Nothing is recorded as “${metricType.trim()}” at ${granularity} granularity. Check the name or clear the filter.`
            : "Buckets appear here as rules fire and notifications go out."
        }
        action={
          metricType.trim() ? (
            <UiButton variant="outline" size="lg" onClick={() => changeMetricType("")}>
              Clear filter
            </UiButton>
          ) : undefined
        }
      />
    );
  } else {
    typesBody = (
      <SheetTable columns={TYPE_COLUMNS} caption="Alert metrics grouped by metric type" minWidth={400}>
        {types.map((summary) => (
          <SheetRow key={summary.type}>
            <SheetCell className="max-w-0">
              <span className="block truncate font-[family-name:var(--mono)] text-[12.5px] text-[var(--text)]">
                {summary.type}
              </span>
            </SheetCell>
            <SheetCell className={HIDE_BELOW_MD}>
              {summary.series.length > 1 ? (
                <span
                  role="img"
                  aria-label={`${summary.type} over ${summary.series.length} buckets, oldest to newest`}
                  className="block"
                >
                  <MetricSparkline data={summary.series} width={144} height={24} />
                </span>
              ) : (
                <span className="text-[12px] text-[var(--text3)]">One bucket</span>
              )}
            </SheetCell>
            <SheetCell className={HIDE_BELOW_SM} align="right">
              <span className={MONO_VALUE}>{formatNumber(summary.buckets)}</span>
            </SheetCell>
            <SheetCell align="right">
              <span className={MONO_VALUE}>{formatValue(summary.latest)}</span>
            </SheetCell>
            <SheetCell align="right">
              <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text)]">
                {formatValue(summary.sum)}
              </span>
            </SheetCell>
          </SheetRow>
        ))}
      </SheetTable>
    );
  }

  const showBuckets = !loading && !loadFailed && metrics.length > 0;

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Metrics"
        description="Rolled-up counters for rule firings, notifications, and delivery outcomes."
        meta={[{ label: "Granularity", value: labelize(granularity) }]}
      />

      {!loadFailed && <Readouts cells={readouts} loading={loading} label="Metrics summary" />}

      <Sheet
        title="By metric type"
        description="One row per metric type. The trend plots that type's buckets from oldest to newest."
        toolbar={toolbar}
      >
        {typesBody}
      </Sheet>

      {showBuckets && (
        <Sheet
          title="Buckets"
          description="Every bucket in the response, with the granularity and filter above."
          footer={
            <>
              <span>
                Showing{" "}
                <span className="font-[family-name:var(--mono)] tabular-nums">
                  {formatNumber(pageStart + 1)}–{formatNumber(pageStart + pageRows.length)}
                </span>{" "}
                of <span className="font-[family-name:var(--mono)] tabular-nums">{formatNumber(metrics.length)}</span>
              </span>
              {pageCount > 1 && (
                <div className="flex items-center gap-2">
                  <UiButton
                    variant="outline"
                    size="sm"
                    aria-label="Previous page of buckets"
                    disabled={safePage === 0}
                    onClick={() => setPage(safePage - 1)}
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Previous
                  </UiButton>
                  <UiButton
                    variant="outline"
                    size="sm"
                    aria-label="Next page of buckets"
                    disabled={safePage >= pageCount - 1}
                    onClick={() => setPage(safePage + 1)}
                  >
                    Next
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </UiButton>
                </div>
              )}
            </>
          }
        >
          <SheetTable columns={BUCKET_COLUMNS} caption="Alert metric buckets" minWidth={420}>
            {pageRows.map((metric) => (
              <SheetRow key={metric.id}>
                <SheetCell className="max-w-0">
                  <span className="block truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">
                    {metric.metricType}
                  </span>
                </SheetCell>
                <SheetCell align="right">
                  <span className={MONO_VALUE}>{metric.value}</span>
                </SheetCell>
                <SheetCell>
                  <Timestamp value={metric.bucketStart} />
                </SheetCell>
                <SheetCell className={HIDE_BELOW_MD}>
                  <Timestamp value={metric.bucketEnd} />
                </SheetCell>
                <SheetCell className={HIDE_BELOW_LG}>
                  {metric.ruleId ? (
                    <code title={metric.ruleId} className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text2)]">
                      {metric.ruleId.slice(0, 8)}…
                    </code>
                  ) : (
                    <span className="text-[12px] text-[var(--text3)]">Org-level</span>
                  )}
                </SheetCell>
              </SheetRow>
            ))}
          </SheetTable>
        </Sheet>
      )}
    </WorkspacePage>
  );
}
