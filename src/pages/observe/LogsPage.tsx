import type { ExplorerPagination } from "./hooks/useObservabilityApi";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { X } from "lucide-react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, FillPage, TableToolbar, SearchInput, FilterSelect,
  EnvironmentBadge, InfiniteTable,
  TimeRangePicker, useTimeRangeParams, SignalSheet, useSignalTimeline, useTimeWindow,
  rangeParams, pct, formatCompact, formatLatency, formatAbsoluteTime, MUTED_DASH,
  ENVIRONMENT_OPTIONS, DURATION_OPTIONS,
} from "@/shared/observe";
import type { Column, ReadoutCell } from "@/shared/observe";
import type { LogEvent } from "@/types/events";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { cn } from "@/lib/utils";
import { useCursorPagination } from "./hooks/useCursorPagination";

const LEVEL_OPTS = [
  { value: "", label: "Any level" },
  { value: "fatal", label: "Fatal" },
  { value: "error", label: "Error" },
  { value: "warn", label: "Warn" },
  { value: "info", label: "Info" },
  { value: "debug", label: "Debug" },
];

const LEVEL_TONE: Record<string, string> = {
  fatal: "text-[var(--red)]",
  error: "text-[var(--red)]",
  warn: "text-[var(--amber)]",
  warning: "text-[var(--amber)]",
  info: "text-[var(--blue)]",
  debug: "text-[var(--text3)]",
};

const TIME_FMT = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

type Row = LogEvent & Record<string, unknown> & { logCategory?: string; publicId?: string };

function LogTime({ value }: { value: unknown }) {
  const d = value ? new Date(value as string) : null;
  if (!d || Number.isNaN(d.getTime())) return MUTED_DASH;
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return (
    <time title={formatAbsoluteTime(d)} className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text3)]">
      {TIME_FMT.format(d)}
      <span className="text-[var(--text3)]/70">.{ms}</span>
    </time>
  );
}

function LevelMark({ level }: { level?: string | null }) {
  const l = String(level ?? "info").toLowerCase();
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-[family-name:var(--mono)] text-[11px] font-medium", LEVEL_TONE[l] ?? "text-[var(--text2)]")}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {l === "warning" ? "warn" : l}
    </span>
  );
}

export default function LogsPage() {
  const navigate = useNavigate();
  const activeProjectSlug = useOrgStore((s) => s.activeProjectSlug);
  const [level, setLevel] = useState("");
  const [environment, setEnvironment] = useState("");
  const [duration, setDuration] = useState("");
  const [query, setQuery] = useState("");

  const { timeRangeState } = useTimeRangeParams();
  const window = useTimeWindow(timeRangeState);
  const [activePagination, setActivePagination] = useState<ExplorerPagination | undefined>(undefined);

  const { cursor, paginationProps, onNextPage, onPreviousPage } = useCursorPagination(activePagination, {
    dependencies: [activeProjectSlug, level, environment, duration, timeRangeState, query],
  });

  const filters = useMemo(
    () => ({
      project: activeProjectSlug ?? undefined,
      severity: level || undefined,
      environment: environment || undefined,
      duration: duration || undefined,
      ...rangeParams(timeRangeState),
      search: query,
    }),
    [activeProjectSlug, level, environment, duration, timeRangeState, query],
  );

  const queryParams = useMemo(() => ({ ...filters, cursor }), [filters, cursor]);
  const { data, isLoading } = useObservabilityList<Row>("logs", queryParams);
  const timeline = useSignalTimeline("logs", filters, window);

  useEffect(() => {
    if (data?.pagination) setActivePagination(data.pagination);
  }, [data?.pagination]);

  const logs = data?.items ?? [];
  const summary = data?.summary ?? {};
  const stats = data?.statistics ?? {};
  const total = Number(summary.total ?? logs.length);
  const errorLogs = Number(summary.errorLogs ?? 0);
  const warnLogs = Number(summary.warnLogs ?? 0);
  const http5xx = Number(summary.http5xx ?? 0);
  const loggers = Number(summary.uniqueLoggers ?? 0);

  const cells: ReadoutCell[] = [
    { label: "Log lines", value: formatCompact(total), sub: `${formatCompact(total / Math.max(1, window.ms / 60_000))} per minute` },
    { label: "Errors", value: formatCompact(errorLogs), sub: `${pct(errorLogs, total)} of lines`, tone: errorLogs > 0 ? "bad" : "neutral" },
    { label: "Warnings", value: formatCompact(warnLogs), sub: `${pct(warnLogs, total)} of lines`, tone: warnLogs > 0 ? "warn" : "neutral" },
    { label: "HTTP 5xx", value: formatCompact(http5xx), sub: "logged server errors", tone: http5xx > 0 ? "bad" : "neutral" },
    { label: "Loggers", value: formatCompact(loggers), sub: stats.p95Runtime != null ? `p95 runtime ${formatLatency(Number(stats.p95Runtime))}` : "distinct sources" },
  ];

  const baseColumns: Column<Row>[] = [
    { key: "time", header: "Time", width: "112px", cell: (l) => <LogTime value={l.occurredAt ?? l.timestamp} /> },
    { key: "level", header: "Level", width: "68px", cell: (l) => <LevelMark level={l.severity ?? l.level} /> },
    {
      key: "service",
      header: "Service",
      width: "130px",
      cell: (l) => {
        const svc = l.service ?? l.metadata?.service;
        return svc ? <span className="truncate text-[12px] text-[var(--text2)]" title={svc}>{svc}</span> : MUTED_DASH;
      },
    },
    {
      key: "category",
      header: "Category",
      width: "96px",
      cell: (l) => (l.logCategory ? <span className="truncate text-[12px] text-[var(--text3)]">{l.logCategory}</span> : MUTED_DASH),
    },
    {
      key: "message",
      header: "Message",
      width: "minmax(280px, 1fr)",
      cell: (l) => {
        const lvl = String(l.severity ?? l.level ?? "").toLowerCase();
        const loud = lvl === "error" || lvl === "fatal";
        return (
          <span className={cn("truncate font-[family-name:var(--mono)] text-[12px]", loud ? "text-[var(--text)]" : "text-[var(--text2)]")} title={l.message}>
            {l.message ?? "—"}
          </span>
        );
      },
    },
  ];

  const columns = environment
    ? baseColumns
    : [...baseColumns, { key: "env", header: "Environment", width: "118px", cell: (l: Row) => <EnvironmentBadge environment={l.environment ?? l.metadata?.environment} /> }];

  return (
    <FillPage>
      <PageHeader
        title="Logs"
        actions={<TimeRangePicker />}
      />

      <SignalSheet cells={cells} loading={isLoading && !data} bars={timeline.bars} timelineLoading={timeline.isLoading} countLabel="Lines" errorLabel="Error level" />

      <TableToolbar resourceName="logs">
        <SearchInput placeholder="Search messages, level:error, service:api…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect label="Environment" value={environment} onChange={setEnvironment} options={ENVIRONMENT_OPTIONS} />
        <FilterSelect label="Level" value={level} onChange={setLevel} options={LEVEL_OPTS} />
        <FilterSelect label="Duration" value={duration} onChange={setDuration} options={DURATION_OPTIONS} />
        {(query || environment || level || duration) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setEnvironment("");
              setLevel("");
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
        items={logs}
        queryKey={["logs", activeProjectSlug, level, environment, duration, timeRangeState, query, cursor]}
        columns={columns}
        getKey={(l) => l.publicId ?? l.id ?? l.eventId}
        onRowClick={(l) => navigate(`/observability/logs/${encodeURIComponent(l.publicId ?? l.id ?? l.eventId)}`)}
        emptyTitle="No log lines in this window"
        emptyIllustration="terminal"
        emptyMessage="Send logs through the LynkTrace SDK logger or console capture, then widen the time range."
        pagination={paginationProps}
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}
      />
    </FillPage>
  );
}
