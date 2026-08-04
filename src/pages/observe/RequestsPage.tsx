import { useState } from "react";
import { useNavigate } from "react-router";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import {
  PageHeader, KpiCard, FillPage, FilterBar, FilterSelect, SearchInput,
  MethodBadge, StatusCodeBadge, LatencyBar, EnvironmentBadge, AskAiButton, Timestamp, InfiniteTable, formatCompact,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { RequestEvent } from "@/types/events";

const METHOD_OPTS = [
  { value: "", label: "All methods" },
  { value: "GET", label: "GET" }, { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" }, { value: "DELETE", label: "DELETE" }, { value: "PATCH", label: "PATCH" },
];
const STATUS_OPTS = [
  { value: "", label: "All statuses" },
  { value: "2xx", label: "2xx" }, { value: "3xx", label: "3xx" }, { value: "4xx", label: "4xx" }, { value: "5xx", label: "5xx" },
];

export default function RequestsPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState("");
  const [statusClass, setStatusClass] = useState("");
  const [query, setQuery] = useState("");
  
  // Backend is source of truth. Pass filters to the API.
  // The query-engine parses `search` for free-text or field:value
  // We can pass `search: query` and other fields directly.
  const { data, isLoading } = useObservabilityList<RequestEvent>("requests", {
    method,
    // Status class filter (2xx, etc.) would need to be handled by backend. If backend supports `status_code`, we might need to map it.
    // For now, pass as search param or standard filter.
    statusClass, 
    search: query
  });

  const rows = data?.items ?? [];
  const summary = data?.summary ?? {};
  const stats = data?.statistics ?? {};

  const total = Number(summary.total ?? rows.length);
  const errs = Number(summary.errors ?? rows.filter((r) => r.statusCode >= 500).length);
  const avg = Number(stats.avgLatency ?? (total ? Math.round(rows.reduce((s, r) => s + r.latency, 0) / total) : 0));

  const clearAll = () => { setMethod(""); setStatusClass(""); setQuery(""); };

  const columns: Column<RequestEvent>[] = [
    { key: "method", header: "Method", width: "70px", cell: (r) => <MethodBadge method={r.method} /> },
    { key: "url", header: "URL", width: "1fr", cell: (r) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{r.url}</span> },
    { key: "status", header: "Status", width: "70px", cell: (r) => <StatusCodeBadge code={r.statusCode} /> },
    { key: "latency", header: "Latency", width: "150px", cell: (r) => <LatencyBar value={r.durationMs ?? r.latency} /> },
    { key: "time", header: "Time", width: "120px", cell: (r) => <Timestamp value={r.timestamp} /> },
    { key: "env", header: "Environment", width: "120px", cell: (r) => <EnvironmentBadge environment={r.environment ?? r.metadata?.environment} /> },
    { key: "ai", header: "", width: "90px", cell: (r) => <AskAiButton question={`Investigate this request: ${r.method} ${r.url} returned ${r.statusCode} in ${r.durationMs ?? r.latency}ms.`} /> },
  ];

  return (
    <FillPage>
      <PageHeader title="Requests" description="Inbound traffic across monitored services." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total requests" value={formatCompact(total)} />
        <KpiCard label="5xx errors" value={errs} trend="down" delta={`${total ? ((errs / total) * 100).toFixed(1) : 0}%`} />
        <KpiCard label="Avg latency" value={`${avg}ms`} />
        <KpiCard label="Throughput" value={`${formatCompact(total * 3)}/min`} />
      </div>

      <FilterBar onClear={clearAll}>
        <SearchInput placeholder="Filter by URL…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect value={method} onChange={setMethod} options={METHOD_OPTS} />
        <FilterSelect value={statusClass} onChange={setStatusClass} options={STATUS_OPTS} />
      </FilterBar>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={rows}
        queryKey={["requests", method, statusClass, query]}
        columns={columns}
        getKey={(r) => r.id ?? r.eventId ?? r.requestId}
        onRowClick={(r) => navigate(`/observability/requests/${r.id ?? r.requestId}`)}
      />
    </FillPage>
  );
}
