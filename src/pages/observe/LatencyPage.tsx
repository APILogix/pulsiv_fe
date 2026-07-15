import { useState } from "react";
import { MultiLineChart, CHART_COLORS } from "@/pages/dashboards/widgets";
import { seededSeries, percentile } from "@/pages/dashboards/lib";
import { useRequestEvents } from "@/hooks/useDummyData";
import { useTimeRangeStore, TIME_RANGES } from "@/stores/timeRangeStore";
import {
  PageHeader, KpiCard, SectionCard, Table, Tr, Td, LatencyBar, StatusCodeBadge, formatLatency, FilterSelect
} from "@/shared/observe";
import { cn } from "@/lib/utils";

const DIMENSIONS = ["route", "service", "method"] as const;
const METHOD_OPTIONS = [
  { value: "all", label: "All methods" },
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "DELETE", label: "DELETE" },
];
const TIME_OPTIONS = TIME_RANGES.map((r) => ({ value: r, label: r }));

export default function LatencyPage() {
  const [dimension, setDimension] = useState<(typeof DIMENSIONS)[number]>("route");
  const [methodFilter, setMethodFilter] = useState("all");
  const timeRange = useTimeRangeStore((s) => s.timeRange);
  const setTimeRange = useTimeRangeStore((s) => s.setTimeRange);

  const { data } = useRequestEvents(methodFilter !== "all" ? { method: methodFilter } : undefined);
  const reqs = data ?? [];

  const lat = reqs.map((r) => r.latency);
  const p50 = percentile(lat, 50), p90 = percentile(lat, 90), p95 = percentile(lat, 95), p99 = percentile(lat, 99);

  const grouped = new Map<string, number[]>();
  for (const r of reqs) {
    const key = dimension === "route" ? r.route : dimension === "service" ? r.metadata.service : r.method;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r.latency);
  }
  const rows = Array.from(grouped.entries())
    .map(([key, vals]) => ({ key, p95: percentile(vals, 95), avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length), count: vals.length }))
    .sort((a, b) => b.p95 - a.p95);

  const slowest = [...reqs].sort((a, b) => b.latency - a.latency).slice(0, 10);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Latency"
        description="Percentile breakdown and slow-request analysis."
        actions={
          <div className="flex items-center gap-2">
            <FilterSelect label="Method" value={methodFilter} onChange={setMethodFilter} options={METHOD_OPTIONS} />
            <FilterSelect label="Range" value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="p50" value={formatLatency(p50)} />
        <KpiCard label="p90" value={formatLatency(p90)} />
        <KpiCard label="p95" value={formatLatency(p95)} trend="down" delta="+22ms" />
        <KpiCard label="p99" value={formatLatency(p99)} trend="down" delta="+58ms" />
      </div>

      <SectionCard title="Latency trends (24h)">
        <MultiLineChart
          series={[
            { label: "p50", color: CHART_COLORS[2], data: seededSeries("lat-p50", 24, p50, p50 * 0.2) },
            { label: "p90", color: CHART_COLORS[3], data: seededSeries("lat-p90", 24, p90, p90 * 0.2) },
            { label: "p95", color: CHART_COLORS[4], data: seededSeries("lat-p95", 24, p95, p95 * 0.2) },
          ]}
        />
      </SectionCard>

      <SectionCard
        title="By dimension"
        action={
          <div className="flex gap-1">
            {DIMENSIONS.map((d) => (
              <button type="button" key={d} onClick={() => setDimension(d)}
                className={cn("rounded-[6px] px-2.5 py-1 text-[12px] capitalize", dimension === d ? "bg-[var(--brand-bg)] text-[var(--brand)]" : "text-[var(--text3)] hover:text-[var(--text)]")}>
                {d}
              </button>
            ))}
          </div>
        }
        className="p-0"
      >
        <Table headers={[dimension, "p95", "avg", "requests"]}>
          {rows.map((r) => (
            <Tr key={r.key}>
              <Td className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{r.key}</Td>
              <Td><LatencyBar value={r.p95} /></Td>
              <Td className="tabular-nums">{r.avg}ms</Td>
              <Td className="tabular-nums text-[var(--text2)]">{r.count}</Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>

      <SectionCard title="Slowest requests" className="p-0">
        <Table headers={["Status", "Route", "Latency"]}>
          {slowest.map((r) => (
            <Tr key={r.eventId}>
              <Td><StatusCodeBadge code={r.statusCode} /></Td>
              <Td className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{r.url}</Td>
              <Td><LatencyBar value={r.latency} /></Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>
    </div>
  );
}


