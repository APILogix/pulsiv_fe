import { useState } from "react";
import { useMetricEvents } from "@/hooks/useDummyData";
import {
  PageHeader, KpiCard, FillPage, FilterBar, SearchInput, FilterSelect,
  EnvironmentBadge, AskAiButton, Timestamp, InfiniteTable, formatCompact,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { MetricEvent, MetricType } from "@/types/events";

const TYPE_OPTS = [
  { value: "", label: "All types" },
  { value: "counter", label: "Counter" },
  { value: "gauge", label: "Gauge" },
  { value: "histogram", label: "Histogram" },
];

export default function MetricsPage() {
  const [type, setType] = useState("");
  const [query, setQuery] = useState("");
  const { data, isLoading } = useMetricEvents();

  let rows = data ?? [];
  if (type) rows = rows.filter((m) => m.metricType === (type as MetricType));
  if (query) rows = rows.filter((m) => m.metricName.toLowerCase().includes(query.toLowerCase()));

  const counters = rows.filter((m) => m.metricType === "counter").length;
  const gauges = rows.filter((m) => m.metricType === "gauge").length;
  const histograms = rows.filter((m) => m.metricType === "histogram").length;

  const columns: Column<MetricEvent>[] = [
    { key: "name", header: "Metric", width: "1fr", cell: (m) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{m.metricName}</span> },
    { key: "type", header: "Type", width: "100px", cell: (m) => <span className="text-[12px] capitalize text-[var(--text2)]">{m.metricType}</span> },
    { key: "value", header: "Value", width: "110px", align: "right", cell: (m) => <span className="tabular-nums text-[var(--text)]">{m.value.toFixed(2)} {m.unit}</span> },
    { key: "service", header: "Service", width: "140px", cell: (m) => <span className="truncate text-[12px] text-[var(--text3)]">{m.tags.service}</span> },
    { key: "time", header: "Time", width: "110px", cell: (m) => <Timestamp value={m.timestamp} /> },
    { key: "env", header: "Environment", width: "120px", cell: (m) => <EnvironmentBadge environment={m.metadata.environment} /> },
    { key: "ai", header: "", width: "90px", cell: (m) => <AskAiButton question={`Explain the trend for metric "${m.metricName}" (${m.metricType}) on ${m.tags.service}, current value ${m.value.toFixed(2)} ${m.unit}.`} /> },
  ];

  return (
    <FillPage>
      <PageHeader title="Metrics" description="Custom counters, gauges, and histograms shipped from monitored services." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total metrics" value={formatCompact(rows.length)} />
        <KpiCard label="Counters" value={counters} />
        <KpiCard label="Gauges" value={gauges} />
        <KpiCard label="Histograms" value={histograms} />
      </div>

      <FilterBar onClear={() => { setType(""); setQuery(""); }}>
        <SearchInput placeholder="Search metric names…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect value={type} onChange={setType} options={TYPE_OPTS} />
      </FilterBar>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={rows}
        queryKey={["metrics-page", type, query]}
        columns={columns}
        getKey={(m) => m.eventId}
      />
    </FillPage>
  );
}
