import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  Sparkles,
} from "lucide-react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  SeverityBadge,
  EnvironmentBadge,
  AskAiModal,
  Timestamp,
  InfiniteTable,
  SelectionProvider,
  useSelection,
  TimeRangePicker,
  useTimeRangeParams,
  formatCompact,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { LogEvent } from "@/types/events";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { cn } from "@/lib/utils";

const SEVERITY_FILTERS = [
  { label: "ALL", value: "" },
  { label: "ERROR", value: "error" },
  { label: "WARN", value: "warn" },
  { label: "INFO", value: "info" },
  { label: "DEBUG", value: "debug" },
];

const ENV_OPTS = [
  { value: "", label: "All environments" },
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "development", label: "Development" },
  { value: "preview", label: "Preview" },
];

function LogsPageContent() {
  const navigate = useNavigate();
  const activeProjectSlug = useOrgStore((s) => s.activeProjectSlug);
  const [level, setLevel] = useState("");
  const [environment, setEnvironment] = useState("");
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isLive, setIsLive] = useState(true);

  const { timeRangeState } = useTimeRangeParams();
  const { selectedKeys, toggleSelect, selectAll } = useSelection();

  // Reset cursor when filter params change
  useEffect(() => {
    setCursor(undefined);
    setCursorHistory([]);
  }, [activeProjectSlug, level, environment, timeRangeState, query]);

  const { data, isLoading } = useObservabilityList<LogEvent>("logs", {
    project: activeProjectSlug ?? undefined,
    severity: level || undefined,
    environment: environment || undefined,
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

  const logs = data?.items ?? [];
  const total = Number(data?.summary?.total ?? logs.length);
  const errorCount = logs.filter((l) => ((l as any).severity ?? l.level)?.toLowerCase() === "error").length;
  const warnCount = logs.filter((l) => ((l as any).severity ?? l.level)?.toLowerCase() === "warn").length;

  const baseColumns: Column<LogEvent>[] = [
    {
      key: "level",
      header: "Severity",
      width: "90px",
      cell: (l) => <SeverityBadge severity={(l as any).severity ?? l.level} />,
    },
    {
      key: "time",
      header: "Timestamp",
      width: "125px",
      cell: (l) => (
        <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text-tertiary)]">
          <Timestamp value={(l as any).occurredAt ?? l.timestamp} />
        </span>
      ),
    },
    {
      key: "service",
      header: "Service",
      width: "140px",
      cell: (l) => (
        <span className="truncate font-[family-name:var(--mono)] text-[11px] text-[var(--text-secondary)]">
          {(l as any).service ?? l.metadata?.service ?? "default"}
        </span>
      ),
    },
    {
      key: "message",
      header: "Structured Message / Payload",
      width: "1fr",
      cell: (l) => (
        <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text-primary)]" title={l.message}>
          {l.message}
        </span>
      ),
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
          cell: (l: LogEvent) => <EnvironmentBadge environment={(l as any).environment ?? l.metadata?.environment ?? "production"} />,
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
            <span className="text-[var(--text-secondary)]">Log Stream</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] font-[family-name:var(--display)]">
            Application Logs
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            High-throughput structured log stream across distributed runtime pods, cron workers, and gateway instances.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsLive(!isLive)}
            className={cn(
              "flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-[12px] font-[family-name:var(--mono)] transition-colors",
              isLive
                ? "border-[var(--success)]/30 bg-[var(--success-muted)] text-[var(--success)]"
                : "border-[var(--border-default)] bg-[var(--surface-1)] text-[var(--text-tertiary)]"
            )}
          >
            <span className={cn("size-1.5 rounded-full", isLive ? "bg-[var(--success)] animate-pulse" : "bg-[var(--text-tertiary)]")} />
            {isLive ? "TAILING" : "PAUSED"}
          </button>

          <TimeRangePicker />
          
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--brand-border)] bg-[var(--brand-muted)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--brand)] hover:text-white transition-all"
          >
            <Sparkles className="size-3.5 text-[var(--brand)]" />
            <span>Synthesize Logs</span>
          </button>
        </div>
      </div>

      {/* ── 2. Unified Hero Telemetry Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] divide-x divide-y md:divide-y-0 divide-[var(--border-subtle)]">
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Log Ingested</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {formatCompact(total)}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Structured events</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Errors</span>
            <span className={cn("size-2 rounded-full", errorCount > 0 ? "bg-[var(--error)] animate-pulse" : "bg-[var(--success)]")} />
          </div>
          <div className={cn(
            "mt-2 text-[24px] font-semibold tracking-[-0.03em] font-[family-name:var(--mono)] tabular-nums",
            errorCount > 0 ? "text-[var(--error)]" : "text-[var(--text-primary)]"
          )}>
            {errorCount}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Exception logs</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Warnings</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--warning)] font-[family-name:var(--mono)] tabular-nums">
            {warnCount}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Performance / dep warnings</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Stream Speed</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {isLive ? "142 msg/s" : "0 msg/s"}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Socket throughput</div>
        </div>
      </div>

      {/* ── 3. High-Density Filter Toolbar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-3">
        {/* Left: Search + Severity Chips */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[240px] max-w-[340px] flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Grep regex or search message payload…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] pl-8 pr-3 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
            />
          </div>

          {/* Severity Class Pills */}
          <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] p-0.5 text-[11px] font-[family-name:var(--mono)]">
            {SEVERITY_FILTERS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setLevel(s.value)}
                className={cn(
                  "rounded-[4px] px-2.5 py-0.5 transition-colors font-medium",
                  level === s.value
                    ? "bg-[var(--surface-4)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Environment Selector */}
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
        </div>
      </div>

      {/* ── 4. Infinite Log Table ── */}
      <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] overflow-hidden">
        <InfiniteTable
          className="flex-1"
          loading={isLoading}
          items={logs}
          queryKey={["logs", activeProjectSlug, level, environment, timeRangeState, query, cursor]}
          columns={columns}
          getKey={(l) => (l as any).id ?? l.eventId ?? String(Math.random())}
          onRowClick={(l) => navigate(`/observability/logs/${encodeURIComponent((l as any).id ?? l.eventId ?? "")}`)}
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
        resource="logs"
        selectedIds={Array.from(selectedKeys)}
        filters={{ severity: level, environment }}
        search={query}
      />
    </div>
  );
}

export default function LogsPage() {
  return (
    <SelectionProvider>
      <LogsPageContent />
    </SelectionProvider>
  );
}
