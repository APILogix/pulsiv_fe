import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import {
  GitBranch,
  Search,
  Sparkles,
} from "lucide-react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  MethodBadge,
  EnvironmentBadge,
  Timestamp,
  LatencyBar,
  AskAiModal,
  formatCompact,
  formatLatency,
  SelectionProvider,
  useSelection,
  TimeRangePicker,
  useTimeRangeParams,
  InfiniteTable,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { TraceEvent } from "@/types/events";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { label: "ALL", value: "" },
  { label: "OK", value: "ok" },
  { label: "ERROR", value: "error" },
  { label: "UNSET", value: "unset" },
];

const DURATION_OPTS = [
  { value: "", label: "All durations" },
  { value: "gte:100", label: "> 100ms" },
  { value: "gte:500", label: "> 500ms" },
  { value: "gte:1000", label: "> 1s (Slow)" },
  { value: "gte:2000", label: "> 2s (Critical)" },
];

const ENV_OPTS = [
  { value: "", label: "All environments" },
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "development", label: "Development" },
  { value: "preview", label: "Preview" },
];

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
  const { selectedKeys, toggleSelect, selectAll } = useSelection();

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
  const errorTraces = traces.filter((t) => String(t.rootSpanStatus ?? (t as any).status ?? "").toLowerCase() === "error").length;

  const baseColumns: Column<TraceEvent>[] = [
    {
      key: "time",
      header: "Timestamp",
      width: "125px",
      cell: (t) => (
        <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text-tertiary)]">
          <Timestamp value={t.occurredAt} />
        </span>
      ),
    },
    {
      key: "service",
      header: "Root Service",
      width: "130px",
      cell: (t) => (
        <span className="truncate font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--text-secondary)]" title={t.service ?? t.metadata?.service ?? "default-service"}>
          {t.service ?? t.metadata?.service ?? "default-service"}
        </span>
      ),
    },
    {
      key: "operation",
      header: "Method",
      width: "80px",
      cell: (t) => t.httpMethod ? <MethodBadge method={t.httpMethod} /> : <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text-disabled)]">—</span>,
    },
    {
      key: "endpoint",
      header: "Root Operation / Route",
      width: "1fr",
      cell: (t) => (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate font-[family-name:var(--mono)] text-[12px] font-medium text-[var(--text-primary)]" title={t.endpoint}>
            {t.endpoint ?? "—"}
          </span>
        </div>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      width: "135px",
      cell: (t) => <LatencyBar value={t.durationMs ?? 0} />,
    },
    {
      key: "status",
      header: "Verdict",
      width: "100px",
      cell: (t) => {
        const raw = String(t.rootSpanStatus ?? (t as any).status ?? "unset").toLowerCase();
        if (raw === "ok" || raw === "success") {
          return (
            <span className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--success-muted)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10.5px] font-medium text-[var(--success)]">
              OK
            </span>
          );
        }
        if (raw === "error" || raw === "failed") {
          return (
            <span className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--error-muted)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10.5px] font-medium text-[var(--error)]">
              ERROR
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--surface-3)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10.5px] font-medium text-[var(--text-tertiary)]">
            UNSET
          </span>
        );
      },
    },
    {
      key: "spans",
      header: "Spans",
      width: "80px",
      cell: (t) => <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text-secondary)]">{t.spanCount ?? "1"}</span>,
    },
    {
      key: "trace",
      header: "Trace ID",
      width: "120px",
      cell: (t) => {
        const targetId = t.publicId ?? t.tracePublicId ?? t.traceId ?? t.id;
        const displayLabel = t.publicId ?? t.tracePublicId ?? (t.traceId ? t.traceId.slice(0, 6) : (t.id ? t.id.slice(0, 6) : "Trace"));
        return targetId ? (
          <Link
            to={`/observability/traces/${targetId}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--surface-3)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10.5px] text-[var(--brand)] hover:bg-[var(--surface-4)] transition-colors"
            title={`Trace: ${t.publicId ?? t.tracePublicId ?? t.traceId ?? t.id}`}
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

  const columns = env
    ? baseColumns
    : [
        ...baseColumns,
        {
          key: "env",
          header: "Env",
          width: "110px",
          cell: (t: TraceEvent) => <EnvironmentBadge environment={t.environment ?? "production"} />,
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
            <span className="text-[var(--text-secondary)]">Distributed Tracing</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] font-[family-name:var(--display)]">
            Distributed Traces
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            End-to-end multi-service span graphs, async execution trees, network bottlenecks, and root cause traces.
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
            <span>Trace AI Insights</span>
          </button>
        </div>
      </div>

      {/* ── 2. Unified Hero Telemetry Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] divide-x divide-y md:divide-y-0 divide-[var(--border-subtle)]">
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Total Traces</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {formatCompact(total)}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">In current time window</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Avg Duration</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {formatLatency(avgDur)}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Full waterfall execution</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Avg Spans / Trace</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {avgSpans || "4.2"}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Call stack depth</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Error Traces</span>
            <span className={cn("size-2 rounded-full", errorTraces > 0 ? "bg-[var(--error)]" : "bg-[var(--success)]")} />
          </div>
          <div className={cn(
            "mt-2 text-[24px] font-semibold tracking-[-0.03em] font-[family-name:var(--mono)] tabular-nums",
            errorTraces > 0 ? "text-[var(--error)]" : "text-[var(--text-primary)]"
          )}>
            {errorTraces}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">{partial ? `${partial} partial spans` : "Complete telemetry"}</div>
        </div>
      </div>

      {/* ── 3. High-Density Filter Toolbar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-3">
        {/* Left: Search + Status Chips */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[240px] max-w-[340px] flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search trace name, route, or ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] pl-8 pr-3 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
            />
          </div>

          {/* Root Span Status Pills */}
          <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] p-0.5 text-[11px] font-[family-name:var(--mono)]">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setStatus(s.value)}
                className={cn(
                  "rounded-[4px] px-2.5 py-0.5 transition-colors font-medium",
                  status === s.value
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
            value={env}
            onChange={(e) => setEnv(e.target.value)}
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

      {/* ── 4. Infinite Traces Table ── */}
      <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] overflow-hidden">
        <InfiniteTable
          className="flex-1"
          loading={isLoading}
          items={traces}
          queryKey={["traces", activeProjectSlug, status, env, duration, timeRangeState, query, cursor]}
          columns={columns}
          getKey={(t) => t.publicId ?? t.tracePublicId ?? t.traceId ?? t.id ?? String(Math.random())}
          onRowClick={(t) => navigate(`/observability/traces/${encodeURIComponent(t.publicId ?? t.tracePublicId ?? t.traceId ?? t.id ?? "")}`)}
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
        resource="traces"
        selectedIds={Array.from(selectedKeys)}
        filters={{ project: activeProjectSlug, environment: env, status, duration, timeRange: timeRangeState }}
        search={query}
      />
    </div>
  );
}

export default function TracesPage() {
  return (
    <SelectionProvider>
      <TracesPageContent />
    </SelectionProvider>
  );
}
