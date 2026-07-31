import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { useReplayEvents } from "@/hooks/useDummyData";
import {
  PageHeader, KpiCard, FillPage, FilterBar, SearchInput,
  EnvironmentBadge, AskAiButton, Timestamp, InfiniteTable,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { ReplayEvent } from "@/types/events";

export default function ReplayPage() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useReplayEvents();

  let rows = data ?? [];
  if (query) rows = rows.filter((r) => r.sessionId.toLowerCase().includes(query.toLowerCase()));

  const totalEvents = rows.reduce((s, r) => s + r.events.length, 0);
  const sessions = new Set(rows.map((r) => r.sessionId)).size;

  const columns: Column<ReplayEvent>[] = [
    { key: "play", header: "", width: "40px", cell: () => <PlayCircle className="size-4 text-[var(--brand)]" /> },
    { key: "session", header: "Session", width: "1fr", cell: (r) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{r.sessionId}</span> },
    { key: "segment", header: "Segment", width: "90px", align: "right", cell: (r) => <span className="tabular-nums">{r.segmentId}</span> },
    { key: "events", header: "DOM events", width: "110px", align: "right", cell: (r) => <span className="tabular-nums">{r.events.length}</span> },
    { key: "time", header: "Recorded", width: "120px", cell: (r) => <Timestamp value={r.timestamp} /> },
    { key: "env", header: "Environment", width: "120px", cell: (r) => <EnvironmentBadge environment={r.metadata.environment} /> },
    { key: "ai", header: "", width: "90px", cell: (r) => <AskAiButton question={`Summarize what happened in session replay ${r.sessionId} (segment ${r.segmentId}, ${r.events.length} captured events).`} /> },
  ];

  return (
    <FillPage>
      <PageHeader title="Session Replay" description="Recorded browser sessions with DOM, network, and console capture." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Recorded sessions" value={sessions} />
        <KpiCard label="Segments" value={rows.length} />
        <KpiCard label="Captured events" value={totalEvents.toLocaleString()} />
        <KpiCard label="Avg events / segment" value={rows.length ? Math.round(totalEvents / rows.length) : 0} />
      </div>

      <FilterBar onClear={() => setQuery("")}>
        <SearchInput placeholder="Search session ID…" onSearch={setQuery} defaultValue={query} />
      </FilterBar>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={rows}
        queryKey={["replay-page", query]}
        columns={columns}
        getKey={(r) => r.eventId}
      />
    </FillPage>
  );
}
