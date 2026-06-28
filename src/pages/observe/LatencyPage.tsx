import { useState } from "react";
import { useRequestEvents } from "@/hooks/useDummyData";
import {
  PageHeader, KpiCard, SectionCard, Table, Tr, Td, LatencyBar, StatusCodeBadge, formatLatency,
} from "@/shared/observe";
import { cn } from "@/lib/utils";

const DIMENSIONS = ["route", "service", "method"] as const;

export default function LatencyPage() {
  const [dimension, setDimension] = useState<(typeof DIMENSIONS)[number]>("route");
  const { data } = useRequestEvents();
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
      <PageHeader title="Latency" description="Percentile breakdown and slow-request analysis." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="p50" value={formatLatency(p50)} />
        <KpiCard label="p90" value={formatLatency(p90)} />
        <KpiCard label="p95" value={formatLatency(p95)} trend="down" delta="+22ms" />
        <KpiCard label="p99" value={formatLatency(p99)} trend="down" delta="+58ms" />
      </div>

      <SectionCard title="Latency heatmap">
        <div className="grid grid-cols-12 gap-1">
          {Array.from({ length: 72 }, (_, i) => {
            const v = Math.random();
            const tone = v > 0.8 ? "var(--red)" : v > 0.5 ? "var(--amber)" : "var(--green)";
            return <div key={i} className="h-6 rounded-[3px]" style={{ background: tone, opacity: 0.3 + v * 0.7 }} title={`${Math.round(v * 1000)}ms`} />;
          })}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-[var(--text3)]"><span>24h ago</span><span>now</span></div>
      </SectionCard>

      <SectionCard
        title="By dimension"
        action={
          <div className="flex gap-1">
            {DIMENSIONS.map((d) => (
              <button key={d} onClick={() => setDimension(d)}
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

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}
