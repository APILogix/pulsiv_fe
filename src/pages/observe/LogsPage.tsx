import { useState } from "react";
import { useNavigate } from "react-router";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, FillPage, FilterBar, SearchInput, FilterSelect,
  SeverityBadge, EnvironmentBadge, AskAiButton, Timestamp, InfiniteTable,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { LogEvent } from "@/types/events";

const LEVEL_OPTS = [
  { value: "", label: "All levels" },
  { value: "error", label: "Error" }, { value: "warn", label: "Warn" },
  { value: "info", label: "Info" }, { value: "debug", label: "Debug" },
];

export default function LogsPage() {
  const navigate = useNavigate();
  const [level, setLevel] = useState("");
  const [query, setQuery] = useState("");
  
  const { data, isLoading } = useObservabilityList<LogEvent>("logs", { 
    severity: level, // Backend maps 'level' to 'severity'
    search: query 
  });
  
  const logs = data?.items ?? [];

  const columns: Column<LogEvent>[] = [
    { key: "level", header: "Level", width: "84px", cell: (l) => <SeverityBadge severity={l.severity ?? l.level} /> },
    { key: "time", header: "Time", width: "110px", cell: (l) => <Timestamp value={l.timestamp} /> },
    { key: "service", header: "Service", width: "150px", cell: (l) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">{l.service ?? l.metadata?.service}</span> },
    { key: "message", header: "Message", width: "1fr", cell: (l) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{l.message}</span> },
    { key: "env", header: "Environment", width: "120px", cell: (l) => <EnvironmentBadge environment={l.environment ?? l.metadata?.environment} /> },
    { key: "ai", header: "", width: "90px", cell: (l) => <AskAiButton question={`Explain this log message and its likely cause: "${l.message}" (service ${l.service ?? l.metadata?.service}).`} /> },
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
        getKey={(l) => l.id ?? l.eventId}
        onRowClick={(l) => navigate(`/observability/logs/${l.id ?? l.eventId}`)}
      />
    </FillPage>
  );
}
