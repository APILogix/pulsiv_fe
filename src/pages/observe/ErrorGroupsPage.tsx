import type { ExplorerPagination } from "./hooks/useObservabilityApi";
import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router";
import { GitBranch, Layers, X } from "lucide-react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, FillPage, TableToolbar, SearchInput, FilterSelect,
  SeverityBadge, StatusCodeBadge, EnvironmentBadge, Timestamp,
  InfiniteTable, formatCompact,
  TimeRangePicker, useTimeRangeParams, SignalSheet, useSignalTimeline, useTimeWindow,
  rangeParams, pct, TRACE_CHIP, GROUP_CHIP, MUTED_DASH, ENVIRONMENT_OPTIONS,
} from "@/shared/observe";
import type { Column, ReadoutCell } from "@/shared/observe";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useCursorPagination } from "./hooks/useCursorPagination";

interface ErrorRow {
  id: string;
  publicId?: string;
  occurredAt?: string | number;
  message?: string;
  errorName?: string;
  errorGroupId?: string;
  errorGroupPublicId?: string;
  errorGroup?: { publicId?: string };
  traceId?: string;
  tracePublicId?: string;
  trace?: { publicId?: string; traceId?: string };
  route?: string;
  statusCode?: number;
  severity?: string;
  handled?: boolean;
  environment?: string;
  release?: string;
  service?: string;
}

const SEV_OPTS = [
  { value: "", label: "Any severity" },
  { value: "fatal", label: "Fatal" },
  { value: "error", label: "Error" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
];

const HANDLED_OPTS = [
  { value: "", label: "Handled or not" },
  { value: "true", label: "Handled" },
  { value: "false", label: "Unhandled" },
];

const STATUS_OPTS = [
  { value: "", label: "Any HTTP status" },
  { value: "5xx", label: "5xx server error" },
  { value: "4xx", label: "4xx client error" },
  { value: "500", label: "500 Internal error" },
  { value: "502", label: "502 Bad gateway" },
  { value: "503", label: "503 Unavailable" },
  { value: "404", label: "404 Not found" },
  { value: "401", label: "401 Unauthorized" },
];

export default function ErrorGroupsPage() {
  const navigate = useNavigate();
  const activeProjectSlug = useOrgStore((s) => s.activeProjectSlug);
  const [environment, setEnvironment] = useState("");
  const [severity, setSeverity] = useState("");
  const [statusClass, setStatusClass] = useState("");
  const [handled, setHandled] = useState("");
  const [query, setQuery] = useState("");

  const { timeRangeState } = useTimeRangeParams();
  const window = useTimeWindow(timeRangeState);
  const [activePagination, setActivePagination] = useState<ExplorerPagination | undefined>(undefined);

  const { cursor, paginationProps, onNextPage, onPreviousPage } = useCursorPagination(activePagination, {
    dependencies: [activeProjectSlug, environment, severity, statusClass, handled, timeRangeState, query],
  });

  const filters = useMemo(
    () => ({
      project: activeProjectSlug ?? undefined,
      environment: environment || undefined,
      severity: severity || undefined,
      status: statusClass || undefined,
      handled: handled || undefined,
      ...rangeParams(timeRangeState),
      search: query,
    }),
    [activeProjectSlug, environment, severity, statusClass, handled, timeRangeState, query],
  );

  const queryParams = useMemo(() => ({ ...filters, cursor }), [filters, cursor]);
  const { data, isLoading } = useObservabilityList<ErrorRow>("errors", queryParams);
  const timeline = useSignalTimeline("errors", filters, window);

  useEffect(() => {
    if (data?.pagination) setActivePagination(data.pagination);
  }, [data?.pagination]);

  const rows = data?.items ?? [];
  const summary = data?.summary ?? {};
  const total = Number(summary.total ?? rows.length);
  const groups = Number(summary.uniqueFingerprints ?? 0);
  const users = Number(summary.affectedUsers ?? 0);
  const { fatal, unhandled } = useMemo(() => {
    return {
      fatal: Number(summary.fatal ?? rows.filter((e) => e.severity === "fatal").length),
      unhandled: rows.filter((e) => e.handled === false).length,
    };
  }, [rows, summary.fatal]);

  const cells: ReadoutCell[] = [
    { label: "Error events", value: formatCompact(total), sub: `${formatCompact(total / Math.max(1, window.ms / 3_600_000))} per hour`, tone: total > 0 ? "bad" : "good" },
    { label: "Distinct groups", value: formatCompact(groups), sub: groups ? `${(total / groups).toFixed(1)} events per group` : "no fingerprints yet" },
    { label: "Affected users", value: formatCompact(users), sub: "unique user ids" },
    { label: "Fatal", value: formatCompact(fatal), sub: `${pct(fatal, total)} of events`, tone: fatal > 0 ? "bad" : "neutral" },
    { label: "Unhandled", value: formatCompact(unhandled), sub: `in the loaded ${rows.length} rows`, tone: unhandled > 0 ? "warn" : "neutral" },
  ];

  const baseColumns: Column<ErrorRow>[] = [
    { key: "time", header: "Time", width: "104px", cell: (e) => <Timestamp value={e.occurredAt} /> },
    { key: "severity", header: "Severity", width: "86px", cell: (e) => <SeverityBadge severity={e.severity ?? "error"} /> },
    {
      key: "error",
      header: "Error",
      width: "minmax(240px, 1fr)",
      cell: (e) => (
        <span className="flex min-w-0 items-baseline gap-2" title={e.message}>
          {e.errorName && <span className="shrink-0 text-[13px] font-medium text-[var(--text)]">{e.errorName}</span>}
          <span className={e.errorName ? "truncate text-[12px] text-[var(--text2)]" : "truncate text-[13px] text-[var(--text)]"}>{e.message ?? "—"}</span>
        </span>
      ),
    },
    {
      key: "route",
      header: "Route",
      width: "170px",
      cell: (e) => (e.route ? <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]" title={e.route}>{e.route}</span> : MUTED_DASH),
    },
    { key: "statusCode", header: "HTTP", width: "64px", cell: (e) => (e.statusCode ? <StatusCodeBadge code={e.statusCode} /> : MUTED_DASH) },
    {
      key: "handled",
      header: "Handled",
      width: "80px",
      cell: (e) =>
        e.handled === undefined || e.handled === null ? MUTED_DASH : (
          <span className={e.handled ? "text-[12px] text-[var(--text2)]" : "text-[12px] font-medium text-[var(--amber)]"}>{e.handled ? "Handled" : "Unhandled"}</span>
        ),
    },
    {
      key: "group",
      header: "Group",
      width: "112px",
      cell: (e) => {
        const pub = e.errorGroupPublicId ?? e.errorGroup?.publicId;
        const target = pub ?? e.errorGroupId;
        if (!target) return MUTED_DASH;
        return (
          <Link to={`/observability/error-groups/${encodeURIComponent(target)}`} onClick={(ev) => ev.stopPropagation()} className={GROUP_CHIP} title={`Open error group ${target}`}>
            <Layers className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{pub ?? target.slice(0, 8)}</span>
          </Link>
        );
      },
    },
    {
      key: "trace",
      header: "Trace",
      width: "112px",
      cell: (e) => {
        const pub = e.tracePublicId ?? e.trace?.publicId;
        const target = pub ?? e.traceId;
        if (!target) return MUTED_DASH;
        return (
          <Link to={`/observability/traces/${encodeURIComponent(target)}`} onClick={(ev) => ev.stopPropagation()} className={TRACE_CHIP} title={`Open trace ${target}`}>
            <GitBranch className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{pub ?? target.slice(0, 8)}</span>
          </Link>
        );
      },
    },
  ];

  const columns = environment
    ? baseColumns
    : [...baseColumns, { key: "env", header: "Environment", width: "118px", cell: (e: ErrorRow) => <EnvironmentBadge environment={e.environment} /> }];

  return (
    <FillPage>
      <PageHeader
        title="Errors"
        actions={
          <>
            <Link
              to="/observability/error-groups"
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border2)] px-3 text-[13px] text-[var(--text2)] transition-colors hover:border-[var(--text3)] hover:text-[var(--text)]"
            >
              <Layers className="size-3.5" aria-hidden="true" />
              View groups
            </Link>
            <TimeRangePicker />
          </>
        }
      />

      <SignalSheet cells={cells} loading={isLoading && !data} bars={timeline.bars} timelineLoading={timeline.isLoading} countLabel="Errors" errorLabel="Fatal or 5xx" />

      <TableToolbar resourceName="errors">
        <SearchInput placeholder="Search message, error:TypeError, route:/api…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect label="Environment" value={environment} onChange={setEnvironment} options={ENVIRONMENT_OPTIONS} />
        <FilterSelect label="Severity" value={severity} onChange={setSeverity} options={SEV_OPTS} />
        <FilterSelect label="Status" value={statusClass} onChange={setStatusClass} options={STATUS_OPTS} />
        <FilterSelect label="Handling" value={handled} onChange={setHandled} options={HANDLED_OPTS} />
        {(query || environment || severity || statusClass || handled) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setEnvironment("");
              setSeverity("");
              setStatusClass("");
              setHandled("");
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/60 px-2.5 text-[12px] text-[var(--text2)] transition-colors hover:border-[var(--border2)] hover:bg-[var(--bg2)] hover:text-[var(--text)] cursor-pointer"
          >
            <X className="size-3" />
            Clear filters
          </button>
        )}
      </TableToolbar>

      <InfiniteTable
        className="min-h-[280px] flex-1"
        loading={isLoading}
        items={rows}
        queryKey={["errors", activeProjectSlug, environment, severity, statusClass, handled, timeRangeState, query, cursor]}
        columns={columns}
        getKey={(e) => e.publicId ?? e.id}
        onRowClick={(e) => navigate(`/observability/errors/${encodeURIComponent(e.publicId ?? e.id)}`)}
        emptyTitle="No errors in this window"
        emptyMessage="Nothing was captured for these filters. Widen the time range to compare against earlier traffic."
        emptyIllustration="inbox"
        pagination={paginationProps}
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}
      />
    </FillPage>
  );
}
