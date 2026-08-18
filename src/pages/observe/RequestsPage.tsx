import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, KpiCard, FillPage, TableToolbar, FilterSelect, SearchInput,
  MethodBadge, StatusCodeBadge, LatencyBar, EnvironmentBadge, AskAiModal, Timestamp,
  InfiniteTable, formatCompact, formatLatency, SelectionProvider, useSelection,
  TimeRangePicker, useTimeRangeParams,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { RequestEvent } from "@/types/events";
import { GitBranch } from "lucide-react";

import { useOrgStore } from "@/modules/organizations/store/org.store";

const METHOD_OPTS = [
  { value: "", label: "All methods" },
  { value: "GET", label: "GET" }, { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" }, { value: "DELETE", label: "DELETE" }, { value: "PATCH", label: "PATCH" },
];
const STATUS_OPTS = [
  { value: "", label: "All statuses" },
  { value: "2xx", label: "2xx" }, { value: "3xx", label: "3xx" }, { value: "4xx", label: "4xx" }, { value: "5xx", label: "5xx" },
  { value: "200", label: "200 OK" }, { value: "400", label: "400 Bad Request" }, { value: "401", label: "401 Unauthorized" },
  { value: "404", label: "404 Not Found" }, { value: "500", label: "500 Internal Error" },
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
const DURATION_OPTS = [
  { value: "", label: "All durations" },
  { value: "gte:100", label: "> 100ms" },
  { value: "gte:500", label: "> 500ms" },
  { value: "gte:1000", label: "> 1s (Slow)" },
  { value: "gte:2000", label: "> 2s" },
];

function RequestsPageContent() {
  const navigate = useNavigate();
  const activeProjectSlug = useOrgStore((s) => s.activeProjectSlug);
  const [environment, setEnvironment] = useState("");
  const [method, setMethod] = useState("");
  const [statusClass, setStatusClass] = useState("");
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
  }, [activeProjectSlug, environment, method, statusClass, duration, timeRangeState, query]);

  const { data, isLoading } = useObservabilityList<RequestEvent>("requests", {
    project: activeProjectSlug ?? undefined,
    environment,
    method,
    status: statusClass,
    duration,
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

  const rows = data?.items ?? [];
  const summary = data?.summary ?? {};
  const stats = data?.statistics ?? {};

  const total = Number(summary.total ?? rows.length);
  const errs = Number(summary.errors ?? rows.filter((r) => (Number(r.statusCode ?? (r as any).status_code ?? 0) >= 500) || r.hasError).length);
  const avg = Number(stats.avgLatency ?? (total ? Math.round(rows.reduce((s, r) => s + Number(r.durationMs ?? (r as any).duration_ms ?? r.latency ?? 0), 0) / total) : 0));

  const baseColumns: Column<RequestEvent>[] = [
    {
      key: "time",
      header: "Time",
      width: "120px",
      cell: (r) => <Timestamp value={r.occurredAt ?? (r as any).occurred_at ?? r.timestamp} />,
    },
    {
      key: "method",
      header: "Method",
      width: "75px",
      cell: (r) => <MethodBadge method={r.method ?? (r as any).httpMethod ?? (r as any).http_method ?? "GET"} />,
    },
    {
      key: "endpoint",
      header: "Endpoint",
      width: "1fr",
      cell: (r) => (
        <span className="truncate font-mono text-[12px] font-medium text-[var(--text)]" title={r.endpoint ?? r.url ?? r.route ?? r.name ?? "/"}>
          {r.endpoint ?? r.url ?? r.route ?? r.name ?? "/"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "85px",
      cell: (r) => <StatusCodeBadge code={Number(r.statusCode ?? (r as any).status_code ?? (r as any).status ?? 0)} />,
    },
    {
      key: "duration",
      header: "Duration",
      width: "130px",
      cell: (r) => <LatencyBar value={Number(r.durationMs ?? (r as any).duration_ms ?? r.latency ?? 0)} />,
    },
    {
      key: "service",
      header: "Service",
      width: "120px",
      cell: (r) => (
        <span className="truncate font-mono text-[11px] text-[var(--text2)]" title={r.service ?? r.projectName ?? (r as any).project_name ?? "—"}>
          {r.service ?? r.projectName ?? (r as any).project_name ?? "—"}
        </span>
      ),
    },
    {
      key: "trace",
      header: "Trace",
      width: "115px",
      cell: (r) => {
        const targetTraceId = r.tracePublicId ?? (r as any).trace_public_id ?? r.traceId ?? (r as any).trace_id;
        const displayLabel = r.tracePublicId ?? (r as any).trace_public_id ?? (r.traceId ? r.traceId.slice(0, 7) : "Trace");
        return targetTraceId ? (
          <Link
            to={`/observability/traces/${encodeURIComponent(targetTraceId)}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--violet-bg)] px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--violet)] hover:underline"
            title={r.tracePublicId ? `Trace Public ID: ${r.tracePublicId}` : (r.traceId ? `Trace: ${r.traceId}` : "View Trace")}
          >
            <GitBranch className="size-3 shrink-0" />
            <span>{displayLabel}</span>
          </Link>
        ) : (
          <span className="font-mono text-[11px] text-[var(--text3)]">—</span>
        );
      },
    },
  ];

  const columns = environment
    ? baseColumns
    : [
        ...baseColumns,
        {
          key: "env",
          header: "Environment",
          width: "115px",
          cell: (r: RequestEvent) => <EnvironmentBadge environment={r.environment ?? r.metadata?.environment ?? "production"} />,
        },
      ];

  return (
    <FillPage>
      <PageHeader
        title="Requests"
        description="Inbound traffic across monitored services."
        actions={<TimeRangePicker />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total requests" value={formatCompact(total)} />
        <KpiCard label="5xx errors" value={errs} trend="down" delta={`${total ? ((errs / total) * 100).toFixed(1) : 0}%`} />
        <KpiCard label="Avg latency" value={formatLatency(avg)} />
        <KpiCard label="Throughput" value={`${formatCompact(total * 3)}/min`} />
      </div>

      <TableToolbar
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        onAskAi={() => setIsAiModalOpen(true)}
        resourceName="requests"
      >
        <SearchInput placeholder="Filter by URL/endpoint…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect value={environment} onChange={setEnvironment} options={ENV_OPTS} />
        <FilterSelect value={method} onChange={setMethod} options={METHOD_OPTS} />
        <FilterSelect value={statusClass} onChange={setStatusClass} options={STATUS_OPTS} />
        <FilterSelect value={duration} onChange={setDuration} options={DURATION_OPTS} />
      </TableToolbar>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={rows}
        queryKey={["requests", activeProjectSlug, environment, method, statusClass, duration, timeRangeState, query, cursor]}
        columns={columns}
        getKey={(r) => r.publicId ?? r.id ?? r.eventId ?? r.requestId ?? String(Math.random())}
        onRowClick={(r) => navigate(`/observability/requests/${encodeURIComponent(r.publicId ?? r.id ?? r.requestId ?? '')}`)}
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
        resource="requests"
        selectedIds={Array.from(selectedKeys)}
        filters={{ project: activeProjectSlug, environment, method, statusClass, duration, timeRange: timeRangeState }}
        search={query}
      />
    </FillPage>
  );
}

export default function RequestsPage() {
  return (
    <SelectionProvider>
      <RequestsPageContent />
    </SelectionProvider>
  );
}
