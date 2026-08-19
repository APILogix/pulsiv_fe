import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import {
  GitBranch,
  Search,
  Sparkles,
} from "lucide-react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  StatusCodeBadge,
  MethodBadge,
  LatencyBar,
  EnvironmentBadge,
  AskAiModal,
  Timestamp,
  InfiniteTable,
  formatCompact,
  formatLatency,
  SelectionProvider,
  useSelection,
  TimeRangePicker,
  useTimeRangeParams,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { RequestEvent } from "@/types/events";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { cn } from "@/lib/utils";

const METHOD_FILTERS = ["ALL", "GET", "POST", "PUT", "DELETE", "PATCH"];
const STATUS_FILTERS = [
  { label: "ALL", value: "" },
  { label: "2XX", value: "2xx" },
  { label: "3XX", value: "3xx" },
  { label: "4XX", value: "4xx" },
  { label: "5XX", value: "5xx" },
];

const ENV_OPTS = [
  { value: "", label: "All environments" },
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "development", label: "Development" },
  { value: "preview", label: "Preview" },
];

const DURATION_OPTS = [
  { value: "", label: "All latencies" },
  { value: "gte:100", label: "> 100ms" },
  { value: "gte:500", label: "> 500ms" },
  { value: "gte:1000", label: "> 1s (Slow)" },
  { value: "gte:2000", label: "> 2s (Critical)" },
];

function RequestsPageContent() {
  const navigate = useNavigate();
  const activeProjectSlug = useOrgStore((s) => s.activeProjectSlug);

  const [environment, setEnvironment] = useState("");
  const [method, setMethod] = useState("ALL");
  const [statusClass, setStatusClass] = useState("");
  const [duration, setDuration] = useState("");
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const { timeRangeState } = useTimeRangeParams();
  const { selectedKeys, toggleSelect, selectAll } = useSelection();

  // Reset cursor when filter params change
  useEffect(() => {
    setCursor(undefined);
    setCursorHistory([]);
  }, [activeProjectSlug, environment, method, statusClass, duration, timeRangeState, query]);

  const { data, isLoading } = useObservabilityList<RequestEvent>("requests", {
    project: activeProjectSlug ?? undefined,
    environment,
    method: method === "ALL" ? undefined : method,
    status: statusClass || undefined,
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
  const errs = Number(summary.errors ?? rows.filter((r) => Number(r.statusCode ?? (r as any).status_code ?? 0) >= 500 || r.hasError).length);
  const avg = Number(stats.avgLatency ?? (total ? Math.round(rows.reduce((s, r) => s + Number(r.durationMs ?? (r as any).duration_ms ?? r.latency ?? 0), 0) / total) : 0));
  const errRatePct = total ? ((errs / total) * 100).toFixed(2) : "0.00";

  const baseColumns: Column<RequestEvent>[] = [
    {
      key: "time",
      header: "Timestamp",
      width: "125px",
      cell: (r) => (
        <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text-tertiary)]">
          <Timestamp value={r.occurredAt ?? (r as any).occurred_at ?? r.timestamp} />
        </span>
      ),
    },
    {
      key: "method",
      header: "Method",
      width: "80px",
      cell: (r) => <MethodBadge method={r.method ?? (r as any).httpMethod ?? (r as any).http_method ?? "GET"} />,
    },
    {
      key: "endpoint",
      header: "Route Path",
      width: "1fr",
      cell: (r) => {
        const path = r.endpoint ?? r.url ?? r.route ?? (r as any).name ?? "/";
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--text-primary)]" title={path}>
              {path}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      width: "90px",
      cell: (r) => <StatusCodeBadge code={Number(r.statusCode ?? (r as any).status_code ?? (r as any).status ?? 200)} />,
    },
    {
      key: "duration",
      header: "Latency",
      width: "135px",
      cell: (r) => <LatencyBar value={Number(r.durationMs ?? (r as any).duration_ms ?? r.latency ?? 0)} />,
    },
    {
      key: "service",
      header: "Service",
      width: "130px",
      cell: (r) => (
        <span className="truncate font-[family-name:var(--mono)] text-[11px] text-[var(--text-secondary)]" title={(r as any).service ?? r.projectName ?? (r as any).project_name ?? "default"}>
          {(r as any).service ?? r.projectName ?? (r as any).project_name ?? "default"}
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
            className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--surface-3)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10.5px] text-[var(--brand)] hover:bg-[var(--surface-4)] transition-colors"
            title={r.tracePublicId ? `Trace: ${r.tracePublicId}` : `Trace: ${r.traceId}`}
          >
            <GitBranch className="size-3 shrink-0" />
            <span>{displayLabel}</span>
          </Link>
        ) : (
          <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text-disabled)]">—</span>
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
          header: "Env",
          width: "110px",
          cell: (r: RequestEvent) => <EnvironmentBadge environment={r.environment ?? r.metadata?.environment ?? "production"} />,
        },
      ];

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 font-sans">
      
      {/* ── 1. Page Command Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            <span className="inline-block size-1.5 rounded-full bg-[var(--brand)]" />
            <span>Observability</span>
            <span>/</span>
            <span className="text-[var(--text-secondary)]">HTTP Ingest</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] font-[family-name:var(--display)]">
            Inbound Requests
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Streaming edge transaction logs, route latency profiles, status codes, and trace correlations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <TimeRangePicker />
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--brand-border)] bg-[var(--brand-muted)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--brand)] hover:text-white transition-all"
          >
            <Sparkles className="size-3.5 text-[var(--brand)]" />
            <span>Analyze with AI</span>
          </button>
        </div>
      </div>

      {/* ── 2. Unified Linear-Style Telemetry Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] divide-x divide-y md:divide-y-0 divide-[var(--border-subtle)]">
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Total Requests</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {formatCompact(total)}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Across all active routes</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">5xx Errors</span>
            <span className={cn("size-2 rounded-full", errs > 0 ? "bg-[var(--error)] animate-pulse" : "bg-[var(--success)]")} />
          </div>
          <div className={cn(
            "mt-2 text-[24px] font-semibold tracking-[-0.03em] font-[family-name:var(--mono)] tabular-nums",
            errs > 0 ? "text-[var(--error)]" : "text-[var(--text-primary)]"
          )}>
            {errs} <span className="text-[14px] font-normal text-[var(--text-tertiary)]">({errRatePct}%)</span>
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Failed transactions</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Avg Latency</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {formatLatency(avg)}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Edge round-trip duration</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Throughput</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {formatCompact(total * 3)}<span className="text-[14px] font-normal text-[var(--text-tertiary)]">/min</span>
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Current ingestion pace</div>
        </div>
      </div>

      {/* ── 3. High-Density Filter Toolbar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-3">
        {/* Left: Search + Method Chips */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[240px] max-w-[340px] flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search by route, URL, or service…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] pl-8 pr-3 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
            />
          </div>

          {/* HTTP Method Chips */}
          <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] p-0.5 text-[11px] font-[family-name:var(--mono)]">
            {METHOD_FILTERS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={cn(
                  "rounded-[4px] px-2 py-0.5 transition-colors font-medium",
                  method === m
                    ? "bg-[var(--surface-4)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Status Code Class Pills */}
          <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] p-0.5 text-[11px] font-[family-name:var(--mono)]">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setStatusClass(s.value)}
                className={cn(
                  "rounded-[4px] px-2 py-0.5 transition-colors font-medium",
                  statusClass === s.value
                    ? "bg-[var(--surface-4)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Environment & Latency Dropdowns */}
        <div className="flex items-center gap-2">
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            className="h-8 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] px-2.5 text-[11px] text-[var(--text-secondary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
          >
            {ENV_OPTS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="h-8 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] px-2.5 text-[11px] text-[var(--text-secondary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
          >
            {DURATION_OPTS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── 4. Infinite Telemetry Table ── */}
      <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] overflow-hidden">
        <InfiniteTable
          className="flex-1"
          loading={isLoading}
          items={rows}
          queryKey={["requests", activeProjectSlug, environment, method, statusClass, duration, timeRangeState, query, cursor]}
          columns={columns}
          getKey={(r) => r.publicId ?? r.id ?? r.eventId ?? r.requestId ?? String(Math.random())}
          onRowClick={(r) => navigate(`/observability/requests/${encodeURIComponent(r.publicId ?? r.id ?? r.requestId ?? "")}`)}
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
      </div>

      <AskAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        resource="requests"
        selectedIds={Array.from(selectedKeys)}
        filters={{ project: activeProjectSlug, environment, method, statusClass, duration, timeRange: timeRangeState }}
        search={query}
      />
    </div>
  );
}

export default function RequestsPage() {
  return (
    <SelectionProvider>
      <RequestsPageContent />
    </SelectionProvider>
  );
}

