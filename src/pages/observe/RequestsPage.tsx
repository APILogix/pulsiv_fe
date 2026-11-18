import type { ExplorerPagination } from "./hooks/useObservabilityApi";
import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router";
import { GitBranch, X } from "lucide-react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, FillPage, TableToolbar, FilterSelect, SearchInput,
  MethodBadge, StatusCodeBadge, LatencyBar, EnvironmentBadge, Timestamp,
  InfiniteTable, formatCompact, formatLatency,
  TimeRangePicker, useTimeRangeParams, SignalSheet, useSignalTimeline, useTimeWindow,
  rangeParams, pct, TRACE_CHIP, MUTED_DASH, ENVIRONMENT_OPTIONS, DURATION_OPTIONS,
} from "@/shared/observe";
import type { Column, ReadoutCell } from "@/shared/observe";
import type { RequestEvent } from "@/types/events";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useCursorPagination } from "./hooks/useCursorPagination";

const METHOD_OPTS = [
  { value: "", label: "Any method" },
  { value: "GET", label: "GET" }, { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" }, { value: "PATCH", label: "PATCH" }, { value: "DELETE", label: "DELETE" },
];
const STATUS_OPTS = [
  { value: "", label: "Any status" },
  { value: "2xx", label: "2xx" }, { value: "3xx", label: "3xx" }, { value: "4xx", label: "4xx" }, { value: "5xx", label: "5xx" },
  { value: "400", label: "400 Bad request" }, { value: "401", label: "401 Unauthorized" },
  { value: "404", label: "404 Not found" }, { value: "500", label: "500 Internal error" },
];

/** Explorer rows are camelCase; the snake_case keys cover older ingest payloads. */
type Row = RequestEvent & {
  duration_ms?: number;
  status_code?: number;
  status?: number;
  occurred_at?: string;
  http_method?: string;
  project_name?: string;
  trace_public_id?: string;
  trace_id?: string;
  httpMethod?: string;
  isSlow?: boolean;
};
const durationOf = (r: Row) => Number(r.durationMs ?? r.duration_ms ?? r.latency ?? 0);
const statusOf = (r: Row) => Number(r.statusCode ?? r.status_code ?? r.status ?? 0);
const endpointOf = (r: Row) => r.endpoint ?? r.url ?? r.route ?? r.name ?? "/";

export default function RequestsPage() {
  const navigate = useNavigate();
  const activeProjectSlug = useOrgStore((s) => s.activeProjectSlug);
  const [environment, setEnvironment] = useState("");
  const [method, setMethod] = useState("");
  const [statusClass, setStatusClass] = useState("");
  const [duration, setDuration] = useState("");
  const [query, setQuery] = useState("");

  const { timeRangeState } = useTimeRangeParams();
  const window = useTimeWindow(timeRangeState);
  const [activePagination, setActivePagination] = useState<ExplorerPagination | undefined>(undefined);

  const { cursor, paginationProps, onNextPage, onPreviousPage } = useCursorPagination(activePagination, {
    dependencies: [activeProjectSlug, environment, method, statusClass, duration, timeRangeState, query],
  });

  const filters = useMemo(
    () => ({
      project: activeProjectSlug ?? undefined,
      environment,
      method,
      status: statusClass,
      duration,
      ...rangeParams(timeRangeState),
      search: query,
    }),
    [activeProjectSlug, environment, method, statusClass, duration, timeRangeState, query],
  );

  const queryParams = useMemo(() => ({ ...filters, cursor }), [filters, cursor]);
  const { data, isLoading } = useObservabilityList<Row>("requests", queryParams);
  const timeline = useSignalTimeline("requests", filters, window);

  useEffect(() => {
    if (data?.pagination) setActivePagination(data.pagination);
  }, [data?.pagination]);

  const rows = data?.items ?? [];
  const summary = data?.summary ?? {};
  const stats = data?.statistics ?? {};

  const total = Number(summary.total ?? rows.length);
  const errors = Number(summary.errors ?? rows.filter((r) => statusOf(r) >= 500 || r.hasError).length);
  const slow = Number(summary.slow ?? rows.filter((r) => r.isSlow).length);
  const errorRate = stats.errorRate != null ? Number(stats.errorRate) : total ? errors / total : 0;
  const minutes = Math.max(1, window.ms / 60_000);

  const cells: ReadoutCell[] = [
    { label: "Requests", value: formatCompact(total), sub: `${formatCompact(total / minutes)} per minute` },
    {
      label: "Error rate",
      value: `${(errorRate * 100).toFixed(2)}%`,
      sub: `${formatCompact(errors)} failed`,
      tone: errorRate >= 0.05 ? "bad" : errorRate >= 0.01 ? "warn" : "neutral",
    },
    { label: "p50", value: stats.p50 != null ? formatLatency(Number(stats.p50)) : "—", sub: "median latency" },
    {
      label: "p95",
      value: stats.p95 != null ? formatLatency(Number(stats.p95)) : "—",
      sub: stats.avgLatency != null ? `avg ${formatLatency(Number(stats.avgLatency))}` : undefined,
      tone: Number(stats.p95 ?? 0) > 1000 ? "warn" : "neutral",
    },
    { label: "p99", value: stats.p99 != null ? formatLatency(Number(stats.p99)) : "—", sub: stats.maxLatency != null ? `max ${formatLatency(Number(stats.maxLatency))}` : undefined },
    { label: "Slow", value: formatCompact(slow), sub: `${pct(slow, total)} of traffic`, tone: slow > 0 ? "warn" : "neutral" },
  ];

  const baseColumns: Column<Row>[] = [
    { key: "time", header: "Time", width: "104px", cell: (r) => <Timestamp value={r.occurredAt ?? r.occurred_at ?? r.timestamp} /> },
    { key: "method", header: "Method", width: "76px", cell: (r) => <MethodBadge method={r.method ?? r.httpMethod ?? r.http_method ?? "GET"} /> },
    {
      key: "endpoint",
      header: "Endpoint",
      width: "minmax(220px, 1fr)",
      cell: (r) => (
        <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]" title={endpointOf(r)}>
          {endpointOf(r)}
        </span>
      ),
    },
    { key: "status", header: "Status", width: "70px", cell: (r) => <StatusCodeBadge code={statusOf(r)} /> },
    { key: "duration", header: "Duration", width: "150px", cell: (r) => <LatencyBar value={durationOf(r)} /> },
    {
      key: "service",
      header: "Service",
      width: "130px",
      cell: (r) => {
        const svc = r.service ?? r.projectName ?? r.project_name;
        return svc ? <span className="truncate text-[12px] text-[var(--text2)]" title={svc}>{svc}</span> : MUTED_DASH;
      },
    },
    {
      key: "trace",
      header: "Trace",
      width: "112px",
      cell: (r) => {
        const target = r.tracePublicId ?? r.trace_public_id ?? r.traceId ?? r.trace_id;
        if (!target) return MUTED_DASH;
        const label = r.tracePublicId ?? r.trace_public_id ?? String(target).slice(0, 8);
        return (
          <Link to={`/observability/traces/${encodeURIComponent(target)}`} onClick={(e) => e.stopPropagation()} className={TRACE_CHIP} title={`Open trace ${target}`}>
            <GitBranch className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </Link>
        );
      },
    },
  ];

  const columns = environment
    ? baseColumns
    : [
        ...baseColumns,
        { key: "env", header: "Environment", width: "118px", cell: (r: Row) => <EnvironmentBadge environment={r.environment ?? r.metadata?.environment} /> },
      ];

  return (
    <FillPage>
      <PageHeader
        title="Requests"
        actions={<TimeRangePicker />}
      />

      <SignalSheet
        cells={cells}
        loading={isLoading && !data}
        bars={timeline.bars}
        timelineLoading={timeline.isLoading}
        countLabel="Requests"
        errorLabel="Errors"
      />

      <TableToolbar resourceName="requests">
        <SearchInput placeholder="Search endpoint, status:500, latency>1000…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect label="Environment" value={environment} onChange={setEnvironment} options={ENVIRONMENT_OPTIONS} />
        <FilterSelect label="Method" value={method} onChange={setMethod} options={METHOD_OPTS} />
        <FilterSelect label="Status" value={statusClass} onChange={setStatusClass} options={STATUS_OPTS} />
        <FilterSelect label="Duration" value={duration} onChange={setDuration} options={DURATION_OPTIONS} />
        {(query || environment || method || statusClass || duration) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setEnvironment("");
              setMethod("");
              setStatusClass("");
              setDuration("");
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/60 px-2.5 text-[12px] text-[var(--text2)] transition-colors hover:border-[var(--border2)] hover:bg-[var(--bg2)] hover:text-[var(--text)] cursor-pointer"
          >
            <X className="size-3" />
            Clear filters
          </button>
        )}
      </TableToolbar>

      <InfiniteTable
        className="min-h-[320px] flex-1"
        loading={isLoading}
        items={rows}
        queryKey={["requests", activeProjectSlug, environment, method, statusClass, duration, timeRangeState, query, cursor]}
        columns={columns}
        getKey={(r) => r.publicId ?? r.id ?? r.eventId ?? r.requestId ?? ""}
        onRowClick={(r) => navigate(`/observability/requests/${encodeURIComponent(r.publicId ?? r.id ?? r.requestId ?? "")}`)}
        emptyTitle="No requests in this window"
        emptyMessage="Widen the time range or clear filters. Requests arrive from the LynkTrace SDK's HTTP middleware."
        pagination={paginationProps}
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}
      />
    </FillPage>
  );
}
