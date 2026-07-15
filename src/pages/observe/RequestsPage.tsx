import { useState } from "react";
import { useNavigate } from "react-router";
import { useRequestEvents } from "@/hooks/useDummyData";
import {
  PageHeader, KpiCard, FillPage, FilterBar, FilterSelect, SearchInput,
  MethodBadge, StatusCodeBadge, LatencyBar, Timestamp, InfiniteTable, formatCompact,
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
  const { data, isLoading } = useRequestEvents(method ? { method } : undefined);

  let rows = data ?? [];
  if (statusClass) rows = rows.filter((r) => Math.floor(r.statusCode / 100) === Number(statusClass[0]));
  if (query) rows = rows.filter((r) => r.url.toLowerCase().includes(query.toLowerCase()));

  const total = rows.length;
  const errs = rows.filter((r) => r.statusCode >= 500).length;
  const avg = total ? Math.round(rows.reduce((s, r) => s + r.latency, 0) / total) : 0;

  const clearAll = () => { setMethod(""); setStatusClass(""); setQuery(""); };

  const columns: Column<RequestEvent>[] = [
    { key: "method", header: "Method", width: "70px", cell: (r) => <MethodBadge method={r.method} /> },
    { key: "url", header: "URL", width: "1fr", cell: (r) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{r.url}</span> },
    { key: "status", header: "Status", width: "70px", cell: (r) => <StatusCodeBadge code={r.statusCode} /> },
    { key: "latency", header: "Latency", width: "150px", cell: (r) => <LatencyBar value={r.latency} /> },
    { key: "time", header: "Time", width: "120px", cell: (r) => <Timestamp value={r.timestamp} /> },
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
        getKey={(r) => r.eventId}
        onRowClick={(r) => navigate(`/observability/requests/${r.requestId}`)}
      />
    </FillPage>
  );
}
