import { useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, KpiCard, FillPage, TableToolbar, SearchInput, FilterSelect,
  EnvironmentBadge, AskAiModal, Timestamp, InfiniteTable, formatDuration,
  SelectionProvider, useSelection, TimeRangePicker, useTimeRangeParams,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { CronCheckInEvent, CronStatus } from "@/types/events";

const STATUS_OPTS = [
  { value: "", label: "All statuses" },
  { value: "ok", label: "OK" },
  { value: "error", label: "Error" },
  { value: "in_progress", label: "In progress" },
];

const STATUS_ICON: Record<CronStatus, React.ReactNode> = {
  ok: <CheckCircle2 className="size-3.5 text-[var(--green)]" />,
  error: <XCircle className="size-3.5 text-[var(--red)]" />,
  in_progress: <Loader2 className="size-3.5 animate-spin text-[var(--amber)]" />,
};

function CronsPageContent() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const { timeRangeState } = useTimeRangeParams();
  const { selectedKeys, toggleSelect, selectAll, clearSelection, selectedCount } = useSelection();

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

  const { data, isLoading } = useObservabilityList<any>("crons", {
    status: status || undefined,
    search: query || undefined,
    range: timeRangeState.mode === "preset" ? timeRangeState.range : undefined,
    from: timeRangeState.from,
    to: timeRangeState.to,
    cursor,
  });

  const rows = data?.items ?? [];
  const summary = data?.summary ?? {};

  const ok = Number(summary.ok ?? rows.filter((c: any) => c.status === "ok").length);
  const failing = Number(summary.failed ?? summary.error ?? rows.filter((c: any) => c.status === "error" || c.status === "failed").length);
  const monitors = Number(summary.uniqueMonitors ?? summary.monitors ?? new Set(rows.map((c: any) => c.monitorSlug)).size);
  const total = Number(summary.total ?? rows.length);

  const columns: Column<CronCheckInEvent>[] = [
    { key: "status", header: "Status", width: "90px", cell: (c) => <span className="inline-flex items-center gap-1.5 text-[12px] capitalize text-[var(--text2)]">{STATUS_ICON[c.status]}{(c.status || "").replace("_", " ")}</span> },
    { key: "slug", header: "Monitor", width: "1fr", cell: (c) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{c.monitorSlug ?? (c as any).name}</span> },
    { key: "duration", header: "Duration", width: "100px", align: "right", cell: (c) => <span className="tabular-nums">{c.duration ? formatDuration(c.duration) : "—"}</span> },
    { key: "time", header: "Check-in", width: "120px", cell: (c) => <Timestamp value={(c as any).occurredAt ?? c.timestamp} /> },
    { key: "env", header: "Environment", width: "120px", cell: (c) => <EnvironmentBadge environment={c.environment ?? (c as any).metadata?.environment} /> },
  ];

  return (
    <FillPage>
      <PageHeader
        title="Crons"
        description="Scheduled job check-ins and missed-execution monitoring."
        actions={<TimeRangePicker />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Monitors" value={monitors} />
        <KpiCard label="OK check-ins" value={ok} trend="up" />
        <KpiCard label="Failing" value={failing} trend={failing > 0 ? "down" : "neutral"} />
        <KpiCard label="Total check-ins" value={total} />
      </div>

      <TableToolbar
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        onAskAi={() => setIsAiModalOpen(true)}
        resourceName="crons"
      >
        <SearchInput placeholder="Search monitor slug…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTS} />
      </TableToolbar>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={rows}
        queryKey={["crons-page", status, query, timeRangeState, cursor]}
        columns={columns}
        getKey={(c) => (c as any).publicId ?? (c as any).id ?? c.eventId}
        onRowClick={(c) => navigate(`/observability/crons/${encodeURIComponent((c as any).publicId ?? (c as any).id ?? c.eventId)}`)}
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
        resource="crons"
        selectedIds={Array.from(selectedKeys)}
        filters={{ status }}
        search={query}
      />
    </FillPage>
  );
}

export default function CronsPage() {
  return (
    <SelectionProvider>
      <CronsPageContent />
    </SelectionProvider>
  );
}
