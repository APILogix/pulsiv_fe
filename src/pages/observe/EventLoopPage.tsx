import { useState } from "react";
import { useEventLoopSamples } from "@/hooks/useDummyData";
import { seededSeries, percentile } from "@/pages/dashboards/lib";
import { MultiLineChart, CHART_COLORS } from "@/pages/dashboards/widgets";
import {
  PageHeader, KpiCard, SectionCard, FilterBar, SearchInput,
  EnvironmentBadge, AskAiButton, Timestamp, InfiniteTable,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { EventLoopSample } from "@/lib/dummy-data";

export default function EventLoopPage() {
  const [query, setQuery] = useState("");
  const { data } = useEventLoopSamples();

  let rows = data ?? [];
  if (query) rows = rows.filter((r) => r.metadata.service.toLowerCase().includes(query.toLowerCase()));

  const lagValues = rows.map((r) => r.lagMs);
  const p50 = percentile(lagValues, 50);
  const p95 = percentile(lagValues, 95);
  const p99 = percentile(lagValues, 99);
  const avgUtil = rows.length ? Math.round(rows.reduce((s, r) => s + r.utilizationPercent, 0) / rows.length) : 0;

  const columns: Column<EventLoopSample>[] = [
    { key: "service", header: "Service", width: "160px", cell: (r) => <span className="truncate text-[12px] text-[var(--text)]">{r.metadata.service}</span> },
    { key: "lag", header: "Lag", width: "90px", align: "right", cell: (r) => <span className="tabular-nums">{r.lagMs.toFixed(1)}ms</span> },
    { key: "p95", header: "p95 lag", width: "90px", align: "right", cell: (r) => <span className="tabular-nums">{r.p95LagMs.toFixed(1)}ms</span> },
    { key: "util", header: "Utilization", width: "110px", align: "right", cell: (r) => <span className="tabular-nums">{r.utilizationPercent}%</span> },
    { key: "time", header: "Sampled", width: "110px", cell: (r) => <Timestamp value={r.timestamp} /> },
    { key: "env", header: "Environment", width: "120px", cell: (r) => <EnvironmentBadge environment={r.metadata.environment} /> },
    { key: "ai", header: "", width: "90px", cell: (r) => <AskAiButton question={`Why is event loop lag ${r.lagMs.toFixed(1)}ms on ${r.metadata.service}? Utilization is ${r.utilizationPercent}%.`} /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Event Loop Monitoring" description="Event loop lag and utilization for Node.js services." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="p50 lag" value={`${p50.toFixed(1)}ms`} />
        <KpiCard label="p95 lag" value={`${p95.toFixed(1)}ms`} trend={p95 > 100 ? "down" : "neutral"} />
        <KpiCard label="p99 lag" value={`${p99.toFixed(1)}ms`} trend={p99 > 100 ? "down" : "neutral"} />
        <KpiCard label="Avg utilization" value={`${avgUtil}%`} />
      </div>

      <SectionCard title="Event loop lag trend">
        <MultiLineChart
          series={[
            { label: "p50", color: CHART_COLORS[2], data: seededSeries("el-p50", 24, p50, Math.max(1, p50 * 0.3)) },
            { label: "p95", color: CHART_COLORS[3], data: seededSeries("el-p95", 24, p95, Math.max(1, p95 * 0.3)) },
          ]}
        />
      </SectionCard>

      <FilterBar onClear={() => setQuery("")}>
        <SearchInput placeholder="Filter by service…" onSearch={setQuery} defaultValue={query} />
      </FilterBar>

      <InfiniteTable
        className="h-[440px]"
        items={rows}
        queryKey={["event-loop-page", query]}
        columns={columns}
        getKey={(r) => r.eventId}
      />
    </div>
  );
}
