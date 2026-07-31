import { useState } from "react";
import { useProfileEvents } from "@/hooks/useDummyData";
import {
  PageHeader, KpiCard, FillPage, FilterBar, SearchInput,
  EnvironmentBadge, AskAiButton, Timestamp, InfiniteTable, formatDuration,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { ProfileEvent } from "@/types/events";

export default function ProfilingPage() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useProfileEvents();

  let rows = data ?? [];
  if (query) rows = rows.filter((p) => p.metadata.service.toLowerCase().includes(query.toLowerCase()));

  const avgDuration = rows.length ? Math.round(rows.reduce((s, p) => s + p.duration, 0) / rows.length) : 0;
  const totalSamples = rows.reduce((s, p) => s + p.profile.samples.length, 0);

  const hottestFn = (p: ProfileEvent) => {
    const byHits = [...p.profile.nodes].sort((a, b) => b.hitCount - a.hitCount)[0];
    return byHits?.callFrame.functionName ?? "—";
  };

  const columns: Column<ProfileEvent>[] = [
    { key: "service", header: "Service", width: "150px", cell: (p) => <span className="truncate text-[12px] text-[var(--text)]">{p.metadata.service}</span> },
    { key: "type", header: "Type", width: "80px", cell: (p) => <span className="text-[12px] uppercase text-[var(--text2)]">{p.profileType}</span> },
    { key: "hot", header: "Hottest function", width: "1fr", cell: (p) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{hottestFn(p)}</span> },
    { key: "duration", header: "Duration", width: "100px", align: "right", cell: (p) => <span className="tabular-nums">{formatDuration(p.duration)}</span> },
    { key: "time", header: "Captured", width: "120px", cell: (p) => <Timestamp value={p.timestamp} /> },
    { key: "env", header: "Environment", width: "120px", cell: (p) => <EnvironmentBadge environment={p.metadata.environment} /> },
    { key: "ai", header: "", width: "90px", cell: (p) => <AskAiButton question={`Analyze this CPU profile from ${p.metadata.service}: hottest function is ${hottestFn(p)}, captured over ${formatDuration(p.duration)}.`} /> },
  ];

  return (
    <FillPage>
      <PageHeader title="Profiling" description="CPU and memory profiles captured from running processes." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Profiles captured" value={rows.length} />
        <KpiCard label="Avg duration" value={formatDuration(avgDuration)} />
        <KpiCard label="Total samples" value={totalSamples.toLocaleString()} />
        <KpiCard label="Services profiled" value={new Set(rows.map((p) => p.metadata.service)).size} />
      </div>

      <FilterBar onClear={() => setQuery("")}>
        <SearchInput placeholder="Filter by service…" onSearch={setQuery} defaultValue={query} />
      </FilterBar>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={rows}
        queryKey={["profiling-page", query]}
        columns={columns}
        getKey={(p) => p.eventId}
      />
    </FillPage>
  );
}
