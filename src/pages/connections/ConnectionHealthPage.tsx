import { PageHeader, KpiCard, SectionCard, StatusBadge, Table, Tr, Td } from "@/shared/observe";

const QUEUES = [
  { name: "errors.ingest", depth: 1240, max: 50000 },
  { name: "requests.ingest", depth: 8800, max: 50000 },
  { name: "spans.ingest", depth: 320, max: 50000 },
  { name: "logs.ingest", depth: 22400, max: 50000 },
  { name: "metrics.ingest", depth: 90, max: 50000 },
];
const POOLS = [
  { name: "PostgreSQL", active: 18, max: 40 },
  { name: "Redis", active: 6, max: 20 },
  { name: "ClickHouse", active: 24, max: 50 },
];
const GATES = [
  { name: "Schema validation", status: "healthy" },
  { name: "Rate limiter", status: "healthy" },
  { name: "Deduplication", status: "healthy" },
  { name: "PII scrubbing", status: "degraded" },
  { name: "Enrichment", status: "healthy" },
];

export default function ConnectionHealthPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Health" description="Ingestion health, readiness, and queue state." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Pipeline status" value="Healthy" trend="up" />
        <KpiCard label="Total queue depth" value="32.8k" />
        <KpiCard label="Throughput" value="2.4k/s" />
        <KpiCard label="Backpressure" value="None" />
      </div>

      <SectionCard title="Queue depth">
        <div className="flex flex-col gap-3">
          {QUEUES.map((q) => {
            const pct = (q.depth / q.max) * 100;
            const tone = pct > 60 ? "var(--amber)" : pct > 85 ? "var(--red)" : "var(--green)";
            return (
              <div key={q.name}>
                <div className="mb-1 flex justify-between text-[12px]"><span className="font-[family-name:var(--mono)] text-[var(--text2)]">{q.name}</span><span className="text-[var(--text3)] tabular-nums">{q.depth.toLocaleString()} / {q.max.toLocaleString()}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--bg3)]"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone }} /></div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Connection pools" className="p-0">
          <Table headers={["Pool", "Active", "Max", "Utilization"]}>
            {POOLS.map((p) => (
              <Tr key={p.name}>
                <Td>{p.name}</Td>
                <Td className="tabular-nums">{p.active}</Td>
                <Td className="tabular-nums text-[var(--text2)]">{p.max}</Td>
                <Td className="tabular-nums">{Math.round((p.active / p.max) * 100)}%</Td>
              </Tr>
            ))}
          </Table>
        </SectionCard>

        <SectionCard title="Pipeline gates" className="p-0">
          <Table headers={["Gate", "Status"]}>
            {GATES.map((g) => (
              <Tr key={g.name}><Td>{g.name}</Td><Td><StatusBadge status={g.status} /></Td></Tr>
            ))}
          </Table>
        </SectionCard>
      </div>
    </div>
  );
}
