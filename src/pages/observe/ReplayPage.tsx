import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, KpiCard, FillPage, FilterBar, SearchInput,
  EnvironmentBadge, AskAiButton, Timestamp, InfiniteTable,
  TimeRangePicker, useTimeRangeParams,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { ReplayEvent } from "@/types/events";

export default function ReplayPage() {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const { timeRangeState } = useTimeRangeParams();

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

  const { data, isLoading } = useObservabilityList<any>("replays", {
    search: query || undefined,
    range: timeRangeState.mode === "preset" ? timeRangeState.range : undefined,
    from: timeRangeState.from,
    to: timeRangeState.to,
    cursor,
  });

  const rows = data?.items ?? [];
  const summary = data?.summary ?? {};
  const stats = data?.statistics ?? {};

  const sessions = Number(summary.uniqueSessions ?? summary.sessions ?? new Set(rows.map((r: any) => r.sessionId)).size);
  const total = Number(summary.total ?? rows.length);
  const users = Number(summary.uniqueUsers ?? summary.users ?? 0);
  const avgDuration = Number(stats.avgDuration ?? 0);

  const columns: Column<ReplayEvent>[] = [
    { key: "play", header: "", width: "40px", cell: () => <PlayCircle className="size-4 text-[var(--brand)]" /> },
    { key: "session", header: "Session", width: "1fr", cell: (r) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{r.sessionId}</span> },
    { key: "segment", header: "Segment", width: "90px", align: "right", cell: (r) => <span className="tabular-nums">{r.segmentId ?? (r as any).segment_id ?? 0}</span> },
    { key: "duration", header: "Duration", width: "100px", align: "right", cell: (r) => <span className="tabular-nums font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">{(r.durationMs ?? (r as any).duration_ms ?? 0)}ms</span> },
    { key: "time", header: "Recorded", width: "120px", cell: (r) => <Timestamp value={(r as any).occurredAt ?? r.timestamp} /> },
    { key: "env", header: "Environment", width: "120px", cell: (r) => <EnvironmentBadge environment={r.environment ?? (r as any).metadata?.environment} /> },
    { key: "ai", header: "", width: "90px", cell: (r) => <AskAiButton question={`Summarize what happened in session replay ${r.sessionId} (segment ${r.segmentId}, ${(r as any).durationMs ?? 0}ms).`} /> },
  ];

  return (
    <FillPage>
      <PageHeader
        title="Session Replay"
        description="Recorded browser sessions with DOM, network, and console capture."
        actions={<TimeRangePicker />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Recorded sessions" value={sessions} />
        <KpiCard label="Total replays" value={total} />
        <KpiCard label="Unique users" value={users} />
        <KpiCard label="Avg duration" value={`${avgDuration}ms`} />
      </div>

      <FilterBar onClear={() => setQuery("")}>
        <SearchInput placeholder="Search session ID…" onSearch={setQuery} defaultValue={query} />
      </FilterBar>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={rows}
        queryKey={["replay-page", query, timeRangeState, cursor]}
        columns={columns}
        getKey={(r) => (r as any).publicId ?? r.id ?? r.eventId ?? String(Math.random())}
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
    </FillPage>
  );
}
