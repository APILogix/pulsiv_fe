import type { ExplorerPagination } from "./hooks/useObservabilityApi";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, TableToolbar, SearchInput, FilterSelect, EnvironmentBadge, AskAiModal,
  Timestamp, InfiniteTable, formatDuration, formatCompact, SelectionProvider, useSelection,
  TimeRangePicker, useTimeRangeParams, SignalSheet, useSignalTimeline, useTimeWindow,
  rangeParams, Panel, EmptyNote, formatAbsoluteTime, MUTED_DASH, ENVIRONMENT_OPTIONS,
} from "@/shared/observe";
import type { Column, ReadoutCell } from "@/shared/observe";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { cn } from "@/lib/utils";
import { useCursorPagination } from "./hooks/useCursorPagination";

interface CronRow {
  id?: string;
  publicId?: string;
  eventId?: string;
  occurredAt?: string;
  monitorSlug?: string;
  monitorName?: string;
  status?: string;
  isSuccess?: boolean;
  durationMs?: number;
  checkinType?: string;
  environment?: string;
  service?: string;
}

const STATUS_OPTS = [
  { value: "", label: "Any status" },
  { value: "ok", label: "OK" },
  { value: "in_progress", label: "In progress" },
  { value: "error", label: "Error" },
  { value: "failed", label: "Failed" },
  { value: "timeout", label: "Timeout" },
  { value: "missed", label: "Missed" },
];

type Tone = "ok" | "bad" | "warn" | "idle";
function toneOf(status?: string): Tone {
  const s = String(status ?? "").toLowerCase();
  if (s === "ok") return "ok";
  if (s === "in_progress") return "idle";
  if (s === "missed" || s === "timeout") return "warn";
  return "bad";
}
const TONE_BG: Record<Tone, string> = {
  ok: "bg-[var(--green)]",
  bad: "bg-[var(--red)]",
  warn: "bg-[var(--amber)]",
  idle: "bg-[var(--text3)]",
};
const TONE_TEXT: Record<Tone, string> = {
  ok: "text-[var(--green)]",
  bad: "text-[var(--red)]",
  warn: "text-[var(--amber)]",
  idle: "text-[var(--text2)]",
};

function CronStatus({ status }: { status?: string }) {
  const tone = toneOf(status);
  const label = String(status ?? "unknown").replace(/_/g, " ");
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-medium", TONE_TEXT[tone])}>
      <span className={cn("size-1.5 rounded-full", TONE_BG[tone], status === "in_progress" && "animate-pulse")} aria-hidden="true" />
      <span className="first-letter:uppercase">{label}</span>
    </span>
  );
}

interface MonitorSummary {
  slug: string;
  name: string;
  checkins: CronRow[];
  ok: number;
  last: CronRow;
}

function summarizeMonitors(rows: CronRow[]): MonitorSummary[] {
  const map = new Map<string, MonitorSummary>();
  for (const r of rows) {
    const slug = r.monitorSlug ?? r.monitorName ?? "unnamed";
    const entry = map.get(slug) ?? { slug, name: r.monitorName ?? slug, checkins: [], ok: 0, last: r };
    entry.checkins.push(r);
    if (toneOf(r.status) === "ok") entry.ok += 1;
    map.set(slug, entry);
  }
  // Failing monitors first, then by name.
  return [...map.values()].sort((a, b) => {
    const af = toneOf(a.last.status) === "bad" ? 0 : 1;
    const bf = toneOf(b.last.status) === "bad" ? 0 : 1;
    return af - bf || a.name.localeCompare(b.name);
  });
}

/** One row per monitor: the last 40 check-ins as a tick strip, oldest left. */
function MonitorBoard({ monitors, loading, onPick }: { monitors: MonitorSummary[]; loading: boolean; onPick: (slug: string) => void }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-5">
        {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-8 animate-pulse rounded-[var(--radius)] bg-[var(--bg2)]" />)}
      </div>
    );
  }
  if (monitors.length === 0) {
    return (
      <div className="p-5">
        <EmptyNote title="No monitors have checked in">
          Wrap a scheduled job with the SDK's cron monitor (for example <code className="font-[family-name:var(--mono)] text-[var(--text2)]">pulse.cron("nightly-sync", fn)</code>) and its check-ins appear here.
        </EmptyNote>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-[var(--border)]">
      {monitors.map((m) => {
        const ticks = m.checkins.slice(0, 40).reverse();
        const rate = m.checkins.length ? Math.round((m.ok / m.checkins.length) * 100) : 0;
        return (
          <li key={m.slug}>
            <button
              type="button"
              onClick={() => onPick(m.slug)}
              className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-2.5 text-left transition-colors hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)] md:grid-cols-[minmax(160px,240px)_minmax(0,1fr)_72px_120px]"
              title={`Filter the table to ${m.slug}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("size-2 shrink-0 rounded-full", TONE_BG[toneOf(m.last.status)])} aria-hidden="true" />
                <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{m.name}</span>
              </span>
              <span className="hidden h-4 items-end gap-[2px] md:flex" aria-label={`${m.checkins.length} recent check-ins`}>
                {ticks.map((t, i) => (
                  <span
                    key={t.publicId ?? t.id ?? i}
                    title={`${formatAbsoluteTime(t.occurredAt)} · ${t.status ?? "unknown"}${t.durationMs ? ` · ${formatDuration(t.durationMs)}` : ""}`}
                    className={cn("h-full w-[5px] rounded-[1px] opacity-90", TONE_BG[toneOf(t.status)])}
                  />
                ))}
              </span>
              <span className={cn("hidden text-right font-[family-name:var(--mono)] text-[12px] tabular-nums md:block", rate >= 99 ? "text-[var(--green)]" : rate >= 90 ? "text-[var(--amber)]" : "text-[var(--red)]")}>
                {rate}%
              </span>
              <span className="text-right"><Timestamp value={m.last.occurredAt} /></span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function CronsPageContent() {
  const navigate = useNavigate();
  const activeProjectSlug = useOrgStore((s) => s.activeProjectSlug);
  const [status, setStatus] = useState("");
  const [environment, setEnvironment] = useState("");
  const [query, setQuery] = useState("");
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const { timeRangeState } = useTimeRangeParams();
  const window = useTimeWindow(timeRangeState);
  const { selectedKeys, toggleSelect, selectAll, clearSelection, selectedCount } = useSelection();
  const [activePagination, setActivePagination] = useState<ExplorerPagination | undefined>(undefined);

  const { cursor, paginationProps, onNextPage, onPreviousPage } = useCursorPagination(activePagination, {
    dependencies: [activeProjectSlug, status, environment, query, timeRangeState],
  });

  const filters = {
    project: activeProjectSlug ?? undefined,
    status: status || undefined,
    environment: environment || undefined,
    search: query || undefined,
    ...rangeParams(timeRangeState),
  };

  const { data, isLoading } = useObservabilityList<CronRow>("crons", { ...filters, cursor });
  // Board uses its own wider page, unaffected by the status filter, so a
  // monitor's strip keeps its green ticks while the table shows only failures.
  const board = useObservabilityList<CronRow>("crons", { ...filters, status: undefined, limit: 200 });
  const timeline = useSignalTimeline("crons", filters, window);

  useEffect(() => {
    if (data?.pagination) setActivePagination(data.pagination);
  }, [data?.pagination]);

  const rows = data?.items ?? [];
  const summary = data?.summary ?? {};
  const stats = data?.statistics ?? {};
  const total = Number(summary.total ?? rows.length);
  const failed = Number(summary.failed ?? 0);
  const inProgress = Number(summary.inProgress ?? 0);
  const monitorsCount = Number(summary.uniqueMonitors ?? 0);
  const successRate = summary.successRate != null ? Number(summary.successRate) : total ? (Number(summary.ok ?? 0) / total) * 100 : 0;
  const monitors = summarizeMonitors(board.data?.items ?? []);

  const cells: ReadoutCell[] = [
    { label: "Monitors", value: formatCompact(monitorsCount), sub: `${monitors.filter((m) => toneOf(m.last.status) === "bad").length} failing now` },
    { label: "Check-ins", value: formatCompact(total), sub: inProgress ? `${inProgress} in progress` : "in this window" },
    { label: "Success rate", value: total ? `${successRate.toFixed(1)}%` : "—", tone: !total ? "neutral" : successRate >= 99 ? "good" : successRate >= 90 ? "warn" : "bad" },
    { label: "Failed", value: formatCompact(failed), sub: "error, failed, timeout", tone: failed > 0 ? "bad" : "neutral" },
    { label: "p95 runtime", value: stats.p95Runtime != null ? formatDuration(Number(stats.p95Runtime)) : "—", sub: stats.avgRuntime != null ? `avg ${formatDuration(Number(stats.avgRuntime))}` : undefined },
  ];

  const baseColumns: Column<CronRow>[] = [
    { key: "status", header: "Status", width: "112px", cell: (c) => <CronStatus status={c.status} /> },
    {
      key: "monitor",
      header: "Monitor",
      width: "minmax(200px, 1fr)",
      cell: (c) => (
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{c.monitorSlug ?? c.monitorName ?? "—"}</span>
          {c.monitorName && c.monitorName !== c.monitorSlug && <span className="truncate text-[12px] text-[var(--text3)]">{c.monitorName}</span>}
        </span>
      ),
    },
    { key: "type", header: "Type", width: "96px", cell: (c) => (c.checkinType ? <span className="text-[12px] capitalize text-[var(--text2)]">{c.checkinType}</span> : MUTED_DASH) },
    {
      key: "duration",
      header: "Runtime",
      width: "96px",
      align: "right",
      cell: (c) => (c.durationMs ? <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">{formatDuration(c.durationMs)}</span> : MUTED_DASH),
    },
    { key: "time", header: "Checked in", width: "112px", cell: (c) => <Timestamp value={c.occurredAt} /> },
  ];
  const columns = environment
    ? baseColumns
    : [...baseColumns, { key: "env", header: "Environment", width: "118px", cell: (c: CronRow) => <EnvironmentBadge environment={c.environment} /> }];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Cron check-ins"
        description="Scheduled jobs reporting in. Each monitor's strip shows its recent runs, oldest on the left."
        actions={<TimeRangePicker />}
      />

      <SignalSheet cells={cells} loading={isLoading && !data} bars={timeline.bars} timelineLoading={timeline.isLoading} countLabel="Check-ins" errorLabel="Failed" />

      <Panel
        title="Monitors"
        description={monitors.length ? `${monitors.length} monitors from the latest ${board.data?.items.length ?? 0} check-ins` : undefined}
        flush
        action={query ? <button type="button" onClick={() => setQuery("")} className="text-[12px] text-[var(--text2)] hover:text-[var(--text)]">Show all</button> : undefined}
      >
        <MonitorBoard monitors={monitors} loading={board.isLoading && !board.data} onPick={(slug) => setQuery(`monitor:${slug}`)} />
      </Panel>

      <TableToolbar selectedCount={selectedCount} onClearSelection={clearSelection} onAskAi={() => setIsAiModalOpen(true)} resourceName="check-ins">
        <SearchInput key={query} placeholder="Search monitor:nightly-sync, status:failed…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect value={environment} onChange={setEnvironment} options={ENVIRONMENT_OPTIONS} />
        <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTS} />
      </TableToolbar>

      <InfiniteTable
        className="h-[560px]"
        loading={isLoading}
        items={rows}
        queryKey={["crons-page", activeProjectSlug, status, environment, query, timeRangeState, cursor]}
        columns={columns}
        getKey={(c) => c.publicId ?? c.id ?? c.eventId ?? ""}
        onRowClick={(c) => navigate(`/observability/crons/${encodeURIComponent(c.publicId ?? c.id ?? c.eventId ?? "")}`)}
        emptyTitle="No check-ins match"
        emptyIllustration="workflow"
        emptyMessage="Clear the filters or widen the time range."
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
        resource="crons"
        selectedIds={Array.from(selectedKeys)}
        filters={{ status, environment }}
        search={query}
      />
    </div>
  );
}

export default function CronsPage() {
  return (
    <SelectionProvider>
      <CronsPageContent />
    </SelectionProvider>
  );
}
