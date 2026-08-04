import { useState } from "react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
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
  const { data, isLoading } = useObservabilityList<any>("metrics", { metricType: "event-loop", search: query });

  const rows = data?.items ?? [];
  const summary = data?.summary ?? {};

  const lagValues = rows.map((r: any) => r.lagMs ?? 0);
  const p50 = Number(summary.p50Lag ?? percentile(lagValues, 50));
  const p95 = Number(summary.p95Lag ?? percentile(lagValues, 95));
  const p99 = Number(summary.p99Lag ?? percentile(lagValues, 99));
  const avgUtil = Number(summary.avgUtil ?? (rows.length ? Math.round(rows.reduce((s: number, r: any) => s + (r.utilizationPercent ?? 0), 0) / rows.length) : 0));

  const columns: Column<EventLoopSample>[] = [
    { key: "service", header: "Service", width: "160px", cell: (r: any) => <span className="truncate text-[12px] text-[var(--text)]">{r.service ?? r.metadata?.service}</span> },
    { key: "lag", header: "Lag", width: "90px", align: "right", cell: (r: any) => <span className="tabular-nums">{(r.lagMs ?? 0).toFixed(1)}ms</span> },
    { key: "p95", header: "p95 lag", width: "90px", align: "right", cell: (r: any) => <span className="tabular-nums">{(r.p95LagMs ?? r.p95 ?? 0).toFixed(1)}ms</span> },
    { key: "util", header: "Utilization", width: "110px", align: "right", cell: (r: any) => <span className="tabular-nums">{r.utilizationPercent ?? 0}%</span> },
    { key: "time", header: "Sampled", width: "110px", cell: (r: any) => <Timestamp value={r.timestamp} /> },
    { key: "env", header: "Environment", width: "120px", cell: (r: any) => <EnvironmentBadge environment={r.environment ?? r.metadata?.environment} /> },
    { key: "ai", header: "", width: "90px", cell: (r: any) => <AskAiButton question={`Why is event loop lag ${(r.lagMs ?? 0).toFixed(1)}ms on ${r.service ?? r.metadata?.service}? Utilization is ${r.utilizationPercent ?? 0}%.`} /> },
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
        loading={isLoading}
        items={rows}
        queryKey={["event-loop-page", query]}
        columns={columns as any}
        getKey={(r: any) => r.id ?? r.eventId ?? Math.random().toString()}
      />
    </div>
  );
}
