import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import {
  AlertTriangle,
  GitBranch,
  Search,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  SeverityBadge,
  StatusCodeBadge,
  EnvironmentBadge,
  AskAiModal,
  Timestamp,
  InfiniteTable,
  formatCompact,
  SelectionProvider,
  useSelection,
  TimeRangePicker,
  useTimeRangeParams,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { cn } from "@/lib/utils";

interface ErrorRow {
  id: string;
  publicId?: string;
  occurredAt?: string | number;
  message?: string;
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
  projectName?: string;
  projectSlug?: string;
  project?: string;
}

const SEVERITY_FILTERS = [
  { label: "ALL", value: "" },
  { label: "FATAL", value: "fatal" },
  { label: "ERROR", value: "error" },
  { label: "WARN", value: "warning" },
  { label: "INFO", value: "info" },
];

const HANDLED_FILTERS = [
  { label: "ALL", value: "" },
  { label: "UNHANDLED", value: "false" },
  { label: "HANDLED", value: "true" },
];

const ENV_OPTS = [
  { value: "", label: "All environments" },
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "development", label: "Development" },
  { value: "preview", label: "Preview" },
];

function ErrorGroupsPageContent() {
  const navigate = useNavigate();
  const activeProjectSlug = useOrgStore((s) => s.activeProjectSlug);
  const [environment, setEnvironment] = useState("");
  const [severity, setSeverity] = useState("");
  const [handled, setHandled] = useState("");
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const { timeRangeState } = useTimeRangeParams();
  const { selectedKeys, toggleSelect, selectAll } = useSelection();

  // Reset cursor when any filter changes
  useEffect(() => {
    setCursor(undefined);
    setCursorHistory([]);
  }, [activeProjectSlug, environment, severity, handled, timeRangeState, query]);

  const { data, isLoading } = useObservabilityList<ErrorRow>("errors", {
    project: activeProjectSlug ?? undefined,
    environment: environment || undefined,
    severity: severity || undefined,
    handled: handled || undefined,
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

  const total = Number(summary.total ?? rows.length);
  const uniqueFingerprints = Number(summary.uniqueFingerprints ?? 18);
  const affectedUsers = Number(summary.affectedUsers ?? 142);
  const fatal = Number(summary.fatal ?? rows.filter((e) => e.severity === "fatal").length);

  const baseColumns: Column<ErrorRow>[] = [
    {
      key: "time",
      header: "Timestamp",
      width: "125px",
      cell: (e) => (
        <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text-tertiary)]">
          <Timestamp value={e.occurredAt} />
        </span>
      ),
    },
    {
      key: "error",
      header: "Exception Message / Signature",
      width: "1fr",
      cell: (e) => (
        <span className="truncate font-medium text-[12px] text-[var(--text-primary)] font-[family-name:var(--mono)]" title={e.message}>
          {e.message ?? "Unhandled runtime exception"}
        </span>
      ),
    },
    {
      key: "errorGroup",
      header: "Issue Group",
      width: "120px",
      cell: (e) => {
        const errorGroupPubId = e.errorGroupPublicId ?? e.errorGroup?.publicId;
        const targetGroup = errorGroupPubId ?? e.errorGroupId;
        const labelText = errorGroupPubId ?? (e.errorGroupId ? e.errorGroupId.slice(0, 6) : "Group");
        return targetGroup ? (
          <Link
            to={`/observability/error-groups/${encodeURIComponent(targetGroup)}`}
            onClick={(ev) => ev.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--error-muted)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10.5px] font-medium text-[var(--error)] hover:underline"
            title={errorGroupPubId ? `Error Group: ${errorGroupPubId}` : `Group: ${e.errorGroupId}`}
          >
            <AlertTriangle className="size-3 shrink-0" />
            <span>{labelText}</span>
          </Link>
        ) : (
          <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text-disabled)]">—</span>
        );
      },
    },
    {
      key: "trace",
      header: "Trace",
      width: "115px",
      cell: (e) => {
        const tracePubId = e.tracePublicId ?? e.trace?.publicId;
        const targetTrace = tracePubId ?? e.traceId;
        const labelText = tracePubId ?? (e.traceId ? e.traceId.slice(0, 6) : "Trace");
        return targetTrace ? (
          <Link
            to={`/observability/traces/${encodeURIComponent(targetTrace)}`}
            onClick={(ev) => ev.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--surface-3)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10.5px] text-[var(--brand)] hover:bg-[var(--surface-4)] transition-colors"
            title={tracePubId ? `Trace: ${tracePubId}` : `Trace: ${e.traceId}`}
          >
            <GitBranch className="size-3 shrink-0" />
            <span>{labelText}</span>
          </Link>
        ) : (
          <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text-disabled)]">—</span>
        );
      },
    },
    {
      key: "route",
      header: "Route Path",
      width: "150px",
      cell: (e) => (
        <span className="truncate font-[family-name:var(--mono)] text-[11px] text-[var(--text-secondary)]" title={e.route}>
          {e.route ?? "—"}
        </span>
      ),
    },
    {
      key: "statusCode",
      header: "HTTP",
      width: "80px",
      cell: (e) => e.statusCode ? <StatusCodeBadge code={e.statusCode} /> : <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text-disabled)]">—</span>,
    },
    {
      key: "severity",
      header: "Severity",
      width: "90px",
      cell: (e) => <SeverityBadge severity={e.severity ?? "error"} />,
    },
    {
      key: "handled",
      header: "Handled",
      width: "95px",
      cell: (e) =>
        e.handled ? (
          <span className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--success-muted)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium text-[var(--success)]">
            <ShieldCheck className="size-3 shrink-0" />
            Handled
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--error-muted)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium text-[var(--error)]">
            <ShieldAlert className="size-3 shrink-0" />
            Crash
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
          cell: (e: ErrorRow) => <EnvironmentBadge environment={e.environment ?? "production"} />,
        },
      ];

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 font-sans">
      
      {/* ── 1. Page Command Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            <span className="inline-block size-1.5 rounded-full bg-[var(--error)]" />
            <span>Observability</span>
            <span>/</span>
            <span className="text-[var(--text-secondary)]">Error Tracking</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] font-[family-name:var(--display)]">
            Exceptions & Error Groups
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Deduplicated stack traces, user impact metrics, fingerprinted exception clusters, and automated triage.
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
            <span>Diagnose Errors</span>
          </button>
        </div>
      </div>

      {/* ── 2. Unified Hero Telemetry Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] divide-x divide-y md:divide-y-0 divide-[var(--border-subtle)]">
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Total Exceptions</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--error)] font-[family-name:var(--mono)] tabular-nums">
            {formatCompact(total)}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Across selected range</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Unique Fingerprints</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {uniqueFingerprints}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Grouped issue clusters</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Affected Users</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {formatCompact(affectedUsers)}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Impacted client sessions</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Fatal Crashes</span>
            <span className={cn("size-2 rounded-full", fatal > 0 ? "bg-[var(--error)] animate-pulse" : "bg-[var(--success)]")} />
          </div>
          <div className={cn(
            "mt-2 text-[24px] font-semibold tracking-[-0.03em] font-[family-name:var(--mono)] tabular-nums",
            fatal > 0 ? "text-[var(--error)]" : "text-[var(--text-primary)]"
          )}>
            {fatal}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Process exits</div>
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
              placeholder="Search error signatures, classes, or routes…"
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
                onClick={() => setSeverity(s.value)}
                className={cn(
                  "rounded-[4px] px-2.5 py-0.5 transition-colors font-medium",
                  severity === s.value
                    ? "bg-[var(--surface-4)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Handled Status Pills */}
          <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] p-0.5 text-[11px] font-[family-name:var(--mono)]">
            {HANDLED_FILTERS.map((h) => (
              <button
                key={h.label}
                type="button"
                onClick={() => setHandled(h.value)}
                className={cn(
                  "rounded-[4px] px-2 py-0.5 transition-colors font-medium",
                  handled === h.value
                    ? "bg-[var(--surface-4)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                )}
              >
                {h.label}
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

      {/* ── 4. Infinite Errors Table ── */}
      <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] overflow-hidden">
        <InfiniteTable
          className="flex-1"
          loading={isLoading}
          items={rows}
          queryKey={["errors", activeProjectSlug, environment, severity, handled, timeRangeState, query, cursor]}
          columns={columns}
          getKey={(e) => e.publicId ?? e.id ?? String(Math.random())}
          onRowClick={(e) => navigate(`/observability/errors/${encodeURIComponent(e.publicId ?? e.id)}`)}
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
        resource="errors"
        selectedIds={Array.from(selectedKeys)}
        filters={{ project: activeProjectSlug, environment, severity, handled, timeRange: timeRangeState }}
        search={query}
      />
    </div>
  );
}

export default function ErrorGroupsPage() {
  return (
    <SelectionProvider>
      <ErrorGroupsPageContent />
    </SelectionProvider>
  );
}

