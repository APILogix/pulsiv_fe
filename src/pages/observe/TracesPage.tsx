import type { ExplorerPagination } from "./hooks/useObservabilityApi";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, FillPage, TableToolbar, FilterSelect, SearchInput,
  InfiniteTable, MethodBadge, EnvironmentBadge, Timestamp, LatencyBar, AskAiModal,
  formatCompact, formatLatency, SelectionProvider, useSelection,
  TimeRangePicker, useTimeRangeParams, SignalSheet, useSignalTimeline, useTimeWindow,
  rangeParams, pct, MUTED_DASH, ENVIRONMENT_OPTIONS, DURATION_OPTIONS,
} from "@/shared/observe";
import type { Column, ReadoutCell } from "@/shared/observe";
import type { TraceEvent } from "@/types/events";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { cn } from "@/lib/utils";
import { useCursorPagination } from "./hooks/useCursorPagination";

const STATUS_OPTS = [
  { value: "", label: "Any root status" },
  { value: "ok", label: "OK" },
  { value: "error", label: "Error" },
  { value: "unset", label: "Unset" },
];

const ROOT_TONE: Record<string, string> = {
  ok: "bg-[var(--green-bg)] text-[var(--green)]",
  error: "bg-[var(--red-bg)] text-[var(--red)]",
  unset: "bg-[var(--bg3)] text-[var(--text2)]",
};

function RootStatus({ value }: { value?: string | null }) {
  const raw = String(value ?? "unset").toLowerCase();
  const key = raw === "success" ? "ok" : raw === "failed" ? "error" : ROOT_TONE[raw] ? raw : "unset";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium leading-[1.35]", ROOT_TONE[key])}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {key === "ok" ? "OK" : key === "error" ? "Error" : "Unset"}
    </span>
  );
}

/** Span count drawn as a short rule so dense traces stand out while scanning. */
function SpanCount({ count, max }: { count?: number | null; max: number }) {
  if (count === null || count === undefined) return MUTED_DASH;
  return (
    <span className="flex items-center gap-2">
      <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">{count}</span>
      <span className="h-[3px] w-10 overflow-hidden rounded-full bg-[var(--bg3)]" aria-hidden="true">
        <span className="block h-full rounded-full bg-[var(--violet)]" style={{ width: `${Math.min(100, (count / Math.max(1, max)) * 100)}%` }} />
      </span>
    </span>
  );
}

function TracesPageContent() {
  const navigate = useNavigate();
  const activeProjectSlug = useOrgStore((s) => s.activeProjectSlug);
  const [status, setStatus] = useState("");
  const [env, setEnv] = useState("");
  const [duration, setDuration] = useState("");
  const [query, setQuery] = useState("");
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const { timeRangeState } = useTimeRangeParams();
  const window = useTimeWindow(timeRangeState);
  const { selectedKeys, toggleSelect, selectAll, clearSelection, selectedCount } = useSelection();
  const [activePagination, setActivePagination] = useState<ExplorerPagination | undefined>(undefined);

  const { cursor, paginationProps, onNextPage, onPreviousPage } = useCursorPagination(activePagination, {
    dependencies: [activeProjectSlug, status, env, duration, timeRangeState, query],
  });

  const filters = {
    project: activeProjectSlug ?? undefined,
    rootSpanStatus: status || undefined,
    environment: env || undefined,
    duration: duration || undefined,
    ...rangeParams(timeRangeState),
    search: query,
  };

  const { data, isLoading } = useObservabilityList<TraceEvent>("traces", { ...filters, cursor });
  const timeline = useSignalTimeline("traces", filters, window);

  useEffect(() => {
    if (data?.pagination) setActivePagination(data.pagination);
  }, [data?.pagination]);

  const traces = data?.items ?? [];
  const summary = data?.summary ?? {};
  const stats = data?.statistics ?? {};

  const total = Number(summary.total ?? traces.length);
  const avgSpans = Number(summary.avgSpans ?? (traces.length ? traces.reduce((s, t) => s + (t.spanCount ?? 0), 0) / traces.length : 0));
  const partial = Number(summary.partial ?? traces.filter((t) => t.isPartial).length);
  const operations = Number(summary.uniqueOperations ?? 0);
  const maxSpans = Math.max(1, ...traces.map((t) => t.spanCount ?? 0));

  const cells: ReadoutCell[] = [
    { label: "Traces", value: formatCompact(total), sub: operations ? `${operations} distinct operations` : "root operations" },
    { label: "p50 duration", value: stats.p50 != null ? formatLatency(Number(stats.p50)) : "—", sub: stats.avgDuration != null ? `avg ${formatLatency(Number(stats.avgDuration))}` : undefined },
    { label: "p95 duration", value: stats.p95 != null ? formatLatency(Number(stats.p95)) : "—", tone: Number(stats.p95 ?? 0) > 1000 ? "warn" : "neutral" },
    { label: "p99 duration", value: stats.p99 != null ? formatLatency(Number(stats.p99)) : "—", sub: stats.maxDuration != null ? `max ${formatLatency(Number(stats.maxDuration))}` : undefined },
    { label: "Spans per trace", value: avgSpans ? avgSpans.toFixed(1) : "—", sub: "average fan-out" },
    { label: "Partial", value: formatCompact(partial), sub: `${pct(partial, total)} missing spans`, tone: partial > 0 ? "warn" : "neutral" },
  ];

  const baseColumns: Column<TraceEvent>[] = [
    { key: "time", header: "Time", width: "104px", cell: (t) => <Timestamp value={t.occurredAt} /> },
    { key: "status", header: "Root", width: "76px", cell: (t) => <RootStatus value={t.rootSpanStatus ?? t.status} /> },
    { key: "method", header: "Method", width: "76px", cell: (t) => (t.httpMethod ? <MethodBadge method={t.httpMethod} /> : MUTED_DASH) },
    {
      key: "endpoint",
      header: "Operation",
      width: "minmax(220px, 1fr)",
      cell: (t) => (
        <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]" title={t.endpoint}>
          {t.endpoint ?? "—"}
        </span>
      ),
    },
    {
      key: "service",
      header: "Service",
      width: "130px",
      cell: (t) => {
        const svc = t.service ?? t.metadata?.service;
        return svc ? <span className="truncate text-[12px] text-[var(--text2)]" title={svc}>{svc}</span> : MUTED_DASH;
      },
    },
    { key: "duration", header: "Duration", width: "150px", cell: (t) => <LatencyBar value={t.durationMs ?? 0} /> },
    { key: "spans", header: "Spans", width: "96px", cell: (t) => <SpanCount count={t.spanCount} max={maxSpans} /> },
    {
      key: "id",
      header: "Trace",
      width: "104px",
      cell: (t) => (
        <span className="truncate font-[family-name:var(--mono)] text-[11px] text-[var(--violet)]" title={t.traceId ?? t.publicId}>
          {t.publicId ?? t.tracePublicId ?? (t.traceId ? t.traceId.slice(0, 8) : "—")}
        </span>
      ),
    },
  ];

  const columns = env
    ? baseColumns
    : [...baseColumns, { key: "env", header: "Environment", width: "118px", cell: (t: TraceEvent) => <EnvironmentBadge environment={t.environment} /> }];

  return (
    <FillPage>
      <PageHeader
        title="Traces"
        description="Distributed traces across services. Open one to walk its span waterfall and the logs and errors it touched."
        actions={<TimeRangePicker />}
      />

      <SignalSheet cells={cells} loading={isLoading && !data} bars={timeline.bars} timelineLoading={timeline.isLoading} countLabel="Traces" errorLabel="Errored" />

      <TableToolbar selectedCount={selectedCount} onClearSelection={clearSelection} onAskAi={() => setIsAiModalOpen(true)} resourceName="traces">
        <SearchInput placeholder="Search operation, trace id, service:api…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect value={env} onChange={setEnv} options={ENVIRONMENT_OPTIONS} />
        <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTS} />
        <FilterSelect value={duration} onChange={setDuration} options={DURATION_OPTIONS} />
      </TableToolbar>

      <InfiniteTable
        className="min-h-[320px] flex-1"
        loading={isLoading}
        items={traces}
        queryKey={["traces", activeProjectSlug, status, env, duration, timeRangeState, query, cursor]}
        columns={columns}
        getKey={(t) => t.publicId ?? t.id ?? t.eventId ?? t.traceId}
        onRowClick={(t) => navigate(`/observability/traces/${encodeURIComponent(t.publicId ?? t.id ?? t.traceId ?? "")}`)}
        emptyTitle="No traces in this window"
        emptyMessage="Traces appear once the SDK's tracing middleware is enabled. Widen the range or clear filters."
        selectable
        selectedKeys={selectedKeys}
        onSelectToggle={toggleSelect}
        onSelectAllToggle={selectAll}
        pagination={paginationProps}
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}
      />

      <AskAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        resource="traces"
        selectedIds={Array.from(selectedKeys)}
        filters={{ rootSpanStatus: status, environment: env }}
        search={query}
      />
    </FillPage>
  );
}

export default function TracesPage() {
  return (
    <SelectionProvider>
      <TracesPageContent />
    </SelectionProvider>
  );
}
