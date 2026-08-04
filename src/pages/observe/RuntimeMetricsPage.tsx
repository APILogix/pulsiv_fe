import { useState } from "react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import { seededSeries } from "@/pages/dashboards/lib";
import { MultiLineChart, CHART_COLORS } from "@/pages/dashboards/widgets";
import {
  PageHeader, KpiCard, SectionCard, FilterBar, SearchInput,
  EnvironmentBadge, AskAiButton, Timestamp, InfiniteTable,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { RuntimeMetricSample } from "@/lib/dummy-data";

export default function RuntimeMetricsPage() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useObservabilityList<any>("metrics", { metricType: "runtime", search: query });

  const rows = data?.items ?? [];
  const summary = data?.summary ?? {};

  const avgHeapUsed = Number(summary.avgHeapUsed ?? (rows.length ? Math.round(rows.reduce((s: number, r: any) => s + (r.heapUsedMb ?? 0), 0) / rows.length) : 0));
  const avgHeapTotal = Number(summary.avgHeapTotal ?? (rows.length ? Math.round(rows.reduce((s: number, r: any) => s + (r.heapTotalMb ?? 0), 0) / rows.length) : 0));
  const avgHandles = Number(summary.avgHandles ?? (rows.length ? Math.round(rows.reduce((s: number, r: any) => s + (r.activeHandles ?? 0), 0) / rows.length) : 0));

  const columns: Column<RuntimeMetricSample>[] = [
    { key: "service", header: "Service", width: "160px", cell: (r: any) => <span className="truncate text-[12px] text-[var(--text)]">{r.service ?? r.metadata?.service}</span> },
    { key: "heapUsed", header: "Heap used", width: "100px", align: "right", cell: (r: any) => <span className="tabular-nums">{r.heapUsedMb ?? 0} MB</span> },
    { key: "heapTotal", header: "Heap total", width: "100px", align: "right", cell: (r: any) => <span className="tabular-nums">{r.heapTotalMb ?? 0} MB</span> },
    { key: "external", header: "External", width: "90px", align: "right", cell: (r: any) => <span className="tabular-nums">{r.externalMb ?? 0} MB</span> },
    { key: "rss", header: "RSS", width: "90px", align: "right", cell: (r: any) => <span className="tabular-nums">{r.rssMb ?? 0} MB</span> },
    { key: "handles", header: "Handles", width: "90px", align: "right", cell: (r: any) => <span className="tabular-nums">{r.activeHandles ?? 0}</span> },
    { key: "time", header: "Sampled", width: "110px", cell: (r: any) => <Timestamp value={r.timestamp} /> },
    { key: "env", header: "Environment", width: "120px", cell: (r: any) => <EnvironmentBadge environment={r.environment ?? r.metadata?.environment} /> },
    { key: "ai", header: "", width: "90px", cell: (r: any) => <AskAiButton question={`Is this memory usage normal for ${r.service ?? r.metadata?.service}? Heap used ${r.heapUsedMb}MB of ${r.heapTotalMb}MB, RSS ${r.rssMb}MB, ${r.activeHandles} active handles.`} /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Runtime Metrics" description="V8 / Node.js internals: heap usage, external memory, and active handles." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Avg heap used" value={`${avgHeapUsed} MB`} />
        <KpiCard label="Avg heap total" value={`${avgHeapTotal} MB`} />
        <KpiCard label="Avg active handles" value={avgHandles} />
        <KpiCard label="Samples" value={rows.length} />
      </div>

      <SectionCard title="Heap usage trend">
        <MultiLineChart
          series={[
            { label: "Heap used", color: CHART_COLORS[0], data: seededSeries("heap-used", 24, avgHeapUsed, avgHeapUsed * 0.15) },
            { label: "Heap total", color: CHART_COLORS[1], data: seededSeries("heap-total", 24, avgHeapTotal, avgHeapTotal * 0.05) },
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
        queryKey={["runtime-metrics-page", query]}
        columns={columns as any}
        getKey={(r: any) => r.id ?? r.eventId ?? Math.random().toString()}
      />
    </div>
  );
}
