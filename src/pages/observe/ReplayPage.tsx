import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, KpiCard, FillPage, FilterBar, SearchInput,
  EnvironmentBadge, AskAiButton, Timestamp, InfiniteTable,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { ReplayEvent } from "@/types/events";

export default function ReplayPage() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useObservabilityList<any>("replays", { search: query });

  const rows = data?.items ?? [];
  const summary = data?.summary ?? {};

  const totalEvents = Number(summary.totalEvents ?? rows.reduce((s: number, r: any) => s + (r.events?.length ?? r.eventCount ?? 0), 0));
  const sessions = Number(summary.sessions ?? new Set(rows.map((r: any) => r.sessionId)).size);
  const total = Number(summary.total ?? rows.length);

  const columns: Column<ReplayEvent>[] = [
    { key: "play", header: "", width: "40px", cell: () => <PlayCircle className="size-4 text-[var(--brand)]" /> },
    { key: "session", header: "Session", width: "1fr", cell: (r) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{r.sessionId}</span> },
    { key: "segment", header: "Segment", width: "90px", align: "right", cell: (r) => <span className="tabular-nums">{r.segmentId}</span> },
    { key: "events", header: "DOM events", width: "110px", align: "right", cell: (r) => <span className="tabular-nums">{r.events?.length ?? (r as any).eventCount ?? 0}</span> },
    { key: "time", header: "Recorded", width: "120px", cell: (r) => <Timestamp value={r.timestamp} /> },
    { key: "env", header: "Environment", width: "120px", cell: (r) => <EnvironmentBadge environment={r.environment ?? (r as any).metadata?.environment} /> },
    { key: "ai", header: "", width: "90px", cell: (r) => <AskAiButton question={`Summarize what happened in session replay ${r.sessionId} (segment ${r.segmentId}, ${r.events?.length ?? (r as any).eventCount ?? 0} captured events).`} /> },
  ];

  return (
    <FillPage>
      <PageHeader title="Session Replay" description="Recorded browser sessions with DOM, network, and console capture." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Recorded sessions" value={sessions} />
        <KpiCard label="Segments" value={total} />
        <KpiCard label="Captured events" value={totalEvents.toLocaleString()} />
        <KpiCard label="Avg events / segment" value={total ? Math.round(totalEvents / total) : 0} />
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
        getKey={(r) => r.id ?? r.eventId ?? Math.random().toString()}
      />
    </FillPage>
  );
}
