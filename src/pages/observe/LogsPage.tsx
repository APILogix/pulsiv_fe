import { useState } from "react";
import { useNavigate } from "react-router";
import { useLogEvents } from "@/hooks/useDummyData";
import {
  PageHeader, FillPage, FilterBar, SearchInput, FilterSelect,
  SeverityBadge, Timestamp, InfiniteTable,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { LogEvent, LogLevel } from "@/types/events";

const LEVEL_OPTS = [
  { value: "", label: "All levels" },
  { value: "error", label: "Error" }, { value: "warn", label: "Warn" },
  { value: "info", label: "Info" }, { value: "debug", label: "Debug" },
];

export default function LogsPage() {
  const navigate = useNavigate();
  const [level, setLevel] = useState("");
  const [query, setQuery] = useState("");
  const { data, isLoading } = useLogEvents({ level: (level || undefined) as LogLevel | undefined, query: query || undefined });
  const logs = data ?? [];

  const columns: Column<LogEvent>[] = [
    { key: "level", header: "Level", width: "84px", cell: (l) => <SeverityBadge severity={l.level} /> },
    { key: "time", header: "Time", width: "110px", cell: (l) => <Timestamp value={l.timestamp} /> },
    { key: "service", header: "Service", width: "150px", cell: (l) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">{l.metadata.service}</span> },
    { key: "message", header: "Message", width: "1fr", cell: (l) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{l.message}</span> },
  ];

  return (
    <FillPage>
      <PageHeader title="Logs" description="Searchable, tailing log stream across services." />

      <FilterBar onClear={() => { setLevel(""); setQuery(""); }}>
        <SearchInput placeholder="Search log messages…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect value={level} onChange={setLevel} options={LEVEL_OPTS} />
      </FilterBar>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={logs}
        queryKey={["logs", level, query]}
        columns={columns}
        getKey={(l) => l.eventId}
        onRowClick={(l) => navigate(`/observability/logs/${l.eventId}`)}
      />
    </FillPage>
  );
}
