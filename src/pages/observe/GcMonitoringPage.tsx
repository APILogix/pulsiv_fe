import { useState } from "react";
import { useObservabilityList } from "./hooks/useObservabilityApi";
import { StackedBars } from "@/pages/dashboards/widgets";
import {
  PageHeader, KpiCard, SectionCard, FilterBar, SearchInput, FilterSelect,
  EnvironmentBadge, AskAiButton, Timestamp, InfiniteTable,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { GcPauseEvent } from "@/lib/dummy-data";
import type { GcType } from "@/types/events";

const GC_TYPE_OPTS = [
  { value: "", label: "All types" },
  { value: "scavenge", label: "Scavenge" },
  { value: "mark-sweep-compact", label: "Mark-sweep-compact" },
  { value: "incremental-marking", label: "Incremental marking" },
  { value: "weak-callback", label: "Weak callback" },
];

const GC_COLOR: Record<GcType, string> = {
  scavenge: "var(--green)",
  "mark-sweep-compact": "var(--red)",
  "incremental-marking": "var(--amber)",
  "weak-callback": "var(--blue)",
};

export default function GcMonitoringPage() {
  const [gcType, setGcType] = useState("");
  const [query, setQuery] = useState("");
  const { data, isLoading } = useObservabilityList<any>("metrics", { metricType: "gc", gcType, search: query });

  const rows = data?.items ?? [];
  const summary = data?.summary ?? {};

  const longPauses = Number(summary.longPauses ?? rows.filter((r: any) => (r.pauseDurationMs ?? 0) > 100).length);
  const avgPause = Number(summary.avgPause ?? (rows.length ? rows.reduce((s: number, r: any) => s + (r.pauseDurationMs ?? 0), 0) / rows.length : 0));
  const totalPauseMs = Number(summary.totalPauseMs ?? rows.reduce((s: number, r: any) => s + (r.pauseDurationMs ?? 0), 0));

  const byType = (["scavenge", "mark-sweep-compact", "incremental-marking", "weak-callback"] as GcType[]).map((t) => ({
    label: t,
    segments: [{ value: rows.filter((r: any) => r.gcType === t).length, color: GC_COLOR[t] }],
  }));

  const columns: Column<GcPauseEvent>[] = [
    { key: "type", header: "GC type", width: "170px", cell: (r: any) => <span className="text-[12px] capitalize text-[var(--text)]">{r.gcType}</span> },
    { key: "service", header: "Service", width: "150px", cell: (r: any) => <span className="truncate text-[12px] text-[var(--text2)]">{r.service ?? r.metadata?.service}</span> },
    { key: "pause", header: "Pause", width: "90px", align: "right", cell: (r: any) => <span className="tabular-nums" style={{ color: (r.pauseDurationMs ?? 0) > 100 ? "var(--red)" : "var(--text)" }}>{(r.pauseDurationMs ?? 0).toFixed(1)}ms</span> },
    { key: "before", header: "Heap before", width: "100px", align: "right", cell: (r: any) => <span className="tabular-nums">{r.heapBeforeMb ?? 0} MB</span> },
    { key: "after", header: "Heap after", width: "100px", align: "right", cell: (r: any) => <span className="tabular-nums">{r.heapAfterMb ?? 0} MB</span> },
    { key: "time", header: "Time", width: "110px", cell: (r: any) => <Timestamp value={r.timestamp} /> },
    { key: "env", header: "Environment", width: "120px", cell: (r: any) => <EnvironmentBadge environment={r.environment ?? r.metadata?.environment} /> },
    { key: "ai", header: "", width: "90px", cell: (r: any) => <AskAiButton question={`Is this ${r.gcType} pause of ${(r.pauseDurationMs ?? 0).toFixed(1)}ms on ${r.service ?? r.metadata?.service} a cause for concern? Heap went from ${r.heapBeforeMb}MB to ${r.heapAfterMb}MB.`} /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="GC Monitoring" description="V8 garbage collection pauses and long-running collection events." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="GC events" value={rows.length} />
        <KpiCard label="Avg pause" value={`${avgPause.toFixed(1)}ms`} />
        <KpiCard label="Long pauses (>100ms)" value={longPauses} trend={longPauses > 0 ? "down" : "neutral"} />
        <KpiCard label="Total pause time" value={`${(totalPauseMs / 1000).toFixed(1)}s`} />
      </div>

      <SectionCard title="Events by GC type">
        <StackedBars groups={byType} horizontal />
      </SectionCard>

      <FilterBar onClear={() => { setGcType(""); setQuery(""); }}>
        <SearchInput placeholder="Filter by service…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect value={gcType} onChange={setGcType} options={GC_TYPE_OPTS} />
      </FilterBar>

      <InfiniteTable
        className="h-[440px]"
        loading={isLoading}
        items={rows}
        queryKey={["gc-monitoring-page", gcType, query]}
        columns={columns as any}
        getKey={(r: any) => r.id ?? r.eventId ?? Math.random().toString()}
      />
    </div>
  );
}
