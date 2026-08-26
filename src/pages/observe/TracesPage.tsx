import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, KpiCard, FillPage, TableToolbar, FilterSelect, SearchInput,
  InfiniteTable, StatusBadge, MethodBadge, EnvironmentBadge,
  Timestamp, LatencyBar, AskAiModal, formatCompact, formatLatency, SelectionProvider, useSelection,
  TimeRangePicker, useTimeRangeParams,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { TraceEvent } from "@/types/events";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { GitBranch, ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_OPTS = [
  { value: "", label: "All statuses" },
  { value: "ok", label: "ok" },
  { value: "error", label: "error" },
  { value: "unset", label: "unset" },
];

const DURATION_OPTS = [
  { value: "", label: "All durations" },
  { value: "gte:100", label: "> 100ms" },
  { value: "gte:500", label: "> 500ms" },
  { value: "gte:1000", label: "> 1s" },
  { value: "gte:2000", label: "> 2s" },
];

const ENV_OPTS = [
  { value: "", label: "All environments" },
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "development", label: "Development" },
  { value: "pre_production", label: "Pre-production" },
  { value: "pre_staging", label: "Pre-staging" },
  { value: "testing", label: "Testing" },
  { value: "preview", label: "Preview" },
  { value: "pre_deployment", label: "Pre-deployment" },
  { value: "custom", label: "Custom" },
];

const getInitialFromDate = () => {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const getInitialToDate = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const formatIsoBounds = (fromDate: string, toDate: string) => {
  if (!fromDate) return { from: undefined, to: undefined };
  const fromMs = new Date(fromDate).getTime();
  if (isNaN(fromMs)) return { from: undefined, to: undefined };

  let toMs = toDate ? new Date(toDate).getTime() : NaN;
  if (isNaN(toMs) || toMs <= fromMs) {
    toMs = fromMs + 24 * 60 * 60 * 1000;
  }
  return {
    from: new Date(fromMs).toISOString(),
    to: new Date(toMs).toISOString(),
  };
};

function TracesPageContent() {
  const navigate = useNavigate();
  const activeProjectSlug = useOrgStore((s) => s.activeProjectSlug);
  const [status, setStatus] = useState("");
  const [env, setEnv] = useState("");
  const [duration, setDuration] = useState("");
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const { timeRangeState } = useTimeRangeParams();
  const { selectedKeys, toggleSelect, selectAll, clearSelection, selectedCount } = useSelection();

  // Reset cursor when filter params change
  useEffect(() => {
    setCursor(undefined);
    setCursorHistory([]);
  }, [activeProjectSlug, status, env, duration, timeRangeState, query]);

  const { data, isLoading } = useObservabilityList<TraceEvent>("traces", {
    project: activeProjectSlug ?? undefined,
    rootSpanStatus: status || undefined,
    environment: env || undefined,
    duration: duration || undefined,
    range: timeRangeState.mode === "preset" ? timeRangeState.range : undefined,
    from: timeRangeState.from,
    to: timeRangeState.to,
    search: query,
    cursor,
  });

  const handleNextPage = (nextCursor: string) => {
    setCursorHistory((prev) => [...prev, cursor ?? ""]);
    setCursor(nextCursor);
  };

  const handlePreviousPage = () => {
    if (cursorHistory.length === 0) return;
    const prevCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((prev) => prev.slice(0, -1));
    setCursor(prevCursor || undefined);
  };

  const traces = data?.items ?? [];
  const summary = data?.summary ?? {};
  const stats = data?.statistics ?? {};

  const total = Number(summary.total ?? traces.length);
  const avgSpans = Number(summary.avgSpans ?? (total ? Math.round(traces.reduce((s, t) => s + (t.spanCount ?? 0), 0) / total) : 0));
  const avgDur = Number(stats.avgDuration ?? (total ? Math.round(traces.reduce((s, t) => s + (t.durationMs ?? 0), 0) / total) : 0));
  const partial = Number(summary.partial ?? traces.filter((t) => t.isPartial).length);

  const baseColumns: Column<TraceEvent>[] = [
    {
      key: "time",
      header: "TIME",
      width: "120px",
      cell: (t) => <Timestamp value={t.occurredAt} />,
    },
    {
      key: "service",
      header: "SERVICE",
      width: "120px",
      cell: (t) => (
        <span className="truncate font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--text2)]" title={t.service ?? t.metadata?.service ?? "default-service"}>
          {t.service ?? t.metadata?.service ?? "default-service"}
        </span>
      ),
    },
    {
      key: "operation",
      header: "OPERATION",
      width: "85px",
      cell: (t) => t.httpMethod ? <MethodBadge method={t.httpMethod} /> : <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">—</span>,
    },
    {
      key: "endpoint",
      header: "ENDPOINT",
      width: "1fr",
      cell: (t) => (
        <span className="truncate font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--text)]" title={t.endpoint}>
          {t.endpoint ?? "—"}
        </span>
      ),
    },
    {
      key: "duration",
      header: "DURATION",
      width: "130px",
      cell: (t) => <LatencyBar value={t.durationMs ?? 0} />,
    },
    {
      key: "status",
      header: "STATUS",
      width: "110px",
      cell: (t) => {
        const raw = String(t.rootSpanStatus ?? t.status ?? "unset").toLowerCase();
        if (raw === "ok" || raw === "success") {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--green-bg)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium text-[var(--green)]">
              ok
            </span>
          );
        }
        if (raw === "error" || raw === "failed") {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--red-bg)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium text-[var(--red)]">
              error
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg3)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium text-[var(--text2)]">
            unset
          </span>
        );
      },
    },
    {
      key: "spans",
      header: "SPANS",
      width: "70px",
      cell: (t) => <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">{t.spanCount ?? "—"}</span>,
    },
    {
      key: "trace",
      header: "TRACE",
      width: "115px",
      cell: (t) => {
        const targetId = t.publicId ?? t.tracePublicId ?? t.traceId ?? t.id;
        const displayLabel = t.publicId ?? t.tracePublicId ?? (t.traceId ? t.traceId.slice(0, 6) : (t.id ? t.id.slice(0, 6) : "Trace"));
        return targetId ? (
          <Link
            to={`/observability/traces/${targetId}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--violet-bg)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium text-[var(--violet)] hover:underline"
            title={`Trace Public ID: ${t.publicId ?? t.tracePublicId ?? t.traceId ?? t.id}`}
          >
            <GitBranch className="size-3 shrink-0" />
            <span>{displayLabel}</span>
          </Link>
        ) : (
          <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">—</span>
        );
      },
    },
  ];

  const columns = env
    ? baseColumns
    : [
        ...baseColumns,
        {
          key: "env",
          header: "ENV",
          width: "115px",
          cell: (t: TraceEvent) => <EnvironmentBadge environment={t.environment ?? "production"} />,
        },
      ];

  return (
    <FillPage>
      <PageHeader
        title="Traces"
        description="Distributed traces across services and spans."
        actions={<TimeRangePicker />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Traces" value={formatCompact(total)} />
        <KpiCard label="Avg spans" value={avgSpans} />
        <KpiCard label="Avg duration" value={formatLatency(avgDur)} />
        <KpiCard label="Partial" value={partial} />
      </div>

      <TableToolbar
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        onAskAi={() => setIsAiModalOpen(true)}
        resourceName="traces"
      >
        <SearchInput placeholder="Search by endpoint, trace ID…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect value={env} onChange={setEnv} options={ENV_OPTS} />
        <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTS} />
        <FilterSelect value={duration} onChange={setDuration} options={DURATION_OPTS} />
      </TableToolbar>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={traces}
        queryKey={["traces", activeProjectSlug, status, env, duration, timeRangeState, query, cursor]}
        columns={columns}
        getKey={(t) => t.publicId ?? t.id ?? t.eventId ?? t.traceId}
        onRowClick={(t) => navigate(`/observability/traces/${t.publicId ?? t.id}`)}
        selectable
        selectedKeys={selectedKeys}
        onSelectToggle={toggleSelect}
        onSelectAllToggle={selectAll}
        pagination={{
          nextCursor: data?.pagination?.nextCursor,
          previousCursor: data?.pagination?.previousCursor,
          hasNext: data?.pagination?.hasNext,
          hasPrevious: cursorHistory.length > 0 || !!data?.pagination?.hasPrevious,
          limit: data?.pagination?.limit,
        }}
        onNextPage={handleNextPage}
        onPreviousPage={cursorHistory.length > 0 ? handlePreviousPage : undefined}
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
