import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, FillPage, TableToolbar, SearchInput, FilterSelect,
  SeverityBadge, EnvironmentBadge, AskAiModal, Timestamp, InfiniteTable, SelectionProvider, useSelection,
  TimeRangePicker, useTimeRangeParams,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { LogEvent } from "@/types/events";
import { useOrgStore } from "@/modules/organizations/store/org.store";

const LEVEL_OPTS = [
  { value: "", label: "All levels" },
  { value: "error", label: "Error" },
  { value: "warn", label: "Warn" },
  { value: "info", label: "Info" },
  { value: "debug", label: "Debug" },
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

function LogsPageContent() {
  const navigate = useNavigate();
  const activeProjectSlug = useOrgStore((s) => s.activeProjectSlug);
  const [level, setLevel] = useState("");
  const [environment, setEnvironment] = useState("");
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
  }, [activeProjectSlug, level, environment, duration, timeRangeState, query]);

  const { data, isLoading } = useObservabilityList<LogEvent>("logs", {
    project: activeProjectSlug ?? undefined,
    severity: level || undefined,
    environment: environment || undefined,
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

  const logs = data?.items ?? [];

  const baseColumns: Column<LogEvent>[] = [
    { key: "level", header: "LEVEL", width: "84px", cell: (l) => <SeverityBadge severity={l.severity ?? l.level} /> },
    { key: "time", header: "TIME", width: "110px", cell: (l) => <Timestamp value={l.occurredAt ?? l.timestamp} /> },
    { key: "service", header: "SERVICE", width: "150px", cell: (l) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">{l.service ?? l.metadata?.service}</span> },
    { key: "message", header: "MESSAGE", width: "1fr", cell: (l) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{l.message}</span> },
  ];

  const columns = environment
    ? baseColumns
    : [
        ...baseColumns,
        { key: "env", header: "ENV", width: "120px", cell: (l: LogEvent) => <EnvironmentBadge environment={l.environment ?? l.metadata?.environment} /> },
      ];

  return (
    <FillPage>
      <PageHeader
        title="Logs"
        description="Searchable, tailing log stream across services."
        actions={<TimeRangePicker />}
      />

      <TableToolbar
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        onAskAi={() => setIsAiModalOpen(true)}
        resourceName="logs"
      >
        <SearchInput placeholder="Search log messages…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect value={environment} onChange={setEnvironment} options={ENV_OPTS} />
        <FilterSelect value={level} onChange={setLevel} options={LEVEL_OPTS} />
        <FilterSelect value={duration} onChange={setDuration} options={DURATION_OPTS} />
      </TableToolbar>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={logs}
        queryKey={["logs", activeProjectSlug, level, environment, duration, timeRangeState, query, cursor]}
        columns={columns}
        getKey={(l) => l.id ?? l.eventId}
        onRowClick={(l) => navigate(`/observability/logs/${l.id ?? l.eventId}`)}
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
        resource="logs"
        selectedIds={Array.from(selectedKeys)}
        filters={{ severity: level, environment }}
        search={query}
      />
    </FillPage>
  );
}

export default function LogsPage() {
  return (
    <SelectionProvider>
      <LogsPageContent />
    </SelectionProvider>
  );
}
