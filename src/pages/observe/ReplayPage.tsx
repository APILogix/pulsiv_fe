import type { ExplorerPagination } from "./hooks/useObservabilityApi";
import { useState, useEffect } from "react";
import { PlayCircle } from "lucide-react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, FillPage, TableToolbar, SearchInput, FilterSelect, EnvironmentBadge,
  AskAiButton, Timestamp, InfiniteTable, TimeRangePicker, useTimeRangeParams,
  SignalSheet, useSignalTimeline, useTimeWindow, rangeParams, formatCompact, formatDuration,
  MUTED_DASH, NEUTRAL_CHIP, ENVIRONMENT_OPTIONS,
} from "@/shared/observe";
import type { Column, ReadoutCell } from "@/shared/observe";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useCursorPagination } from "./hooks/useCursorPagination";

interface ReplayRow {
  id?: string;
  publicId?: string;
  eventId?: string;
  occurredAt?: string;
  sessionId?: string;
  name?: string;
  service?: string;
  endpoint?: string;
  release?: string;
  environment?: string;
  durationMs?: number;
}

export default function ReplayPage() {
  const activeProjectSlug = useOrgStore((s) => s.activeProjectSlug);
  const [query, setQuery] = useState("");
  const [environment, setEnvironment] = useState("");
  const { timeRangeState } = useTimeRangeParams();
  const window = useTimeWindow(timeRangeState);
  const [activePagination, setActivePagination] = useState<ExplorerPagination | undefined>(undefined);

  const { cursor, paginationProps, onNextPage, onPreviousPage } = useCursorPagination(activePagination, {
    dependencies: [activeProjectSlug, environment, query, timeRangeState],
  });

  const filters = {
    project: activeProjectSlug ?? undefined,
    environment: environment || undefined,
    search: query || undefined,
    ...rangeParams(timeRangeState),
  };

  const { data, isLoading } = useObservabilityList<ReplayRow>("replays", { ...filters, cursor });
  const timeline = useSignalTimeline("replays", filters, window);

  useEffect(() => {
    if (data?.pagination) setActivePagination(data.pagination);
  }, [data?.pagination]);

  const rows = data?.items ?? [];
  const summary = data?.summary ?? {};
  const stats = data?.statistics ?? {};
  const total = Number(summary.total ?? rows.length);
  const sessions = Number(summary.uniqueSessions ?? new Set(rows.map((r) => r.sessionId)).size);
  const users = Number(summary.uniqueUsers ?? 0);

  const cells: ReadoutCell[] = [
    { label: "Sessions", value: formatCompact(sessions), sub: "recorded browser sessions" },
    { label: "Segments", value: formatCompact(total), sub: sessions ? `${(total / sessions).toFixed(1)} per session` : undefined },
    { label: "Users", value: formatCompact(users), sub: "identified users" },
    { label: "Avg segment", value: stats.avgDuration != null ? formatDuration(Number(stats.avgDuration)) : "—", sub: stats.maxDuration != null ? `longest ${formatDuration(Number(stats.maxDuration))}` : undefined },
  ];

  const baseColumns: Column<ReplayRow>[] = [
    { key: "time", header: "Recorded", width: "104px", cell: (r) => <Timestamp value={r.occurredAt} /> },
    {
      key: "session",
      header: "Session",
      width: "180px",
      cell: (r) =>
        r.sessionId ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setQuery(r.sessionId!); }}
            className={NEUTRAL_CHIP}
            title="Show every segment from this session"
          >
            <PlayCircle className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{r.sessionId}</span>
          </button>
        ) : MUTED_DASH,
    },
    {
      key: "page",
      header: "Page",
      width: "minmax(220px, 1fr)",
      cell: (r) => {
        const page = r.endpoint ?? r.name;
        return page ? <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]" title={page}>{page}</span> : MUTED_DASH;
      },
    },
    { key: "service", header: "App", width: "130px", cell: (r) => (r.service ? <span className="truncate text-[12px] text-[var(--text2)]">{r.service}</span> : MUTED_DASH) },
    { key: "release", header: "Release", width: "110px", cell: (r) => (r.release ? <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{r.release}</span> : MUTED_DASH) },
    {
      key: "ai",
      header: "",
      width: "96px",
      align: "right",
      cell: (r) => <AskAiButton question={`Summarize what happened in session replay ${r.sessionId ?? r.publicId} on ${r.endpoint ?? r.name ?? "an unknown page"}.`} />,
    },
  ];
  const columns = environment
    ? baseColumns
    : [...baseColumns.slice(0, -1), { key: "env", header: "Environment", width: "118px", cell: (r: ReplayRow) => <EnvironmentBadge environment={r.environment} /> }, baseColumns[baseColumns.length - 1]];

  return (
    <FillPage>
      <PageHeader
        title="Session replay"
        description="Recorded browser sessions with DOM, network, and console capture. Pick a session to line up all of its segments."
        actions={<TimeRangePicker />}
      />

      <SignalSheet cells={cells} loading={isLoading && !data} bars={timeline.bars} timelineLoading={timeline.isLoading} countLabel="Segments" errorLabel="With errors" />

      <TableToolbar>
        <SearchInput key={query} placeholder="Search session id, page, release…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect value={environment} onChange={setEnvironment} options={ENVIRONMENT_OPTIONS} />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="h-9 px-2 text-[12px] text-[var(--text2)] hover:text-[var(--text)]">
            Clear search
          </button>
        )}
      </TableToolbar>

      <InfiniteTable
        className="min-h-[320px] flex-1"
        loading={isLoading}
        items={rows}
        queryKey={["replay-page", activeProjectSlug, environment, query, timeRangeState, cursor]}
        columns={columns}
        getKey={(r) => r.publicId ?? r.id ?? r.eventId ?? ""}
        emptyTitle="No replays in this window"
        emptyIllustration="dashboard"
        emptyMessage="Enable session replay in the browser SDK to record DOM, network, and console activity."
        pagination={paginationProps}
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}
      />
    </FillPage>
  );
}
