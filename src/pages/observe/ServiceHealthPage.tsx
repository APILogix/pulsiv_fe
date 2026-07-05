import { useErrorEvents, useRequestEvents } from "@/hooks/useDummyData";
import {
  PageHeader, KpiCard, SectionCard, Table, Tr, Td, StatusBadge, MetricSparkline,
} from "@/shared/observe";

const SERVICES = ["api-gateway", "user-service", "payment-service", "notification-service", "analytics-service"];
const DEPENDENCIES = [
  { name: "PostgreSQL", status: "healthy", latency: "4ms" },
  { name: "Redis", status: "healthy", latency: "1ms" },
  { name: "MongoDB", status: "degraded", latency: "82ms" },
  { name: "Kafka", status: "healthy", latency: "12ms" },
  { name: "S3", status: "healthy", latency: "28ms" },
];

export default function ServiceHealthPage() {
  const requests = useRequestEvents();
  const errors = useErrorEvents();
  const reqList = requests.data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Service Health" description="Project health plus platform readiness signals." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Healthy services" value="4 / 5" trend="up" delta="all SLOs met" />
        <KpiCard label="Uptime (30d)" value="99.94%" />
        <KpiCard label="Open incidents" value="3" trend="down" />
        <KpiCard label="Apdex" value="0.96" trend="up" />
      </div>

      <SectionCard title="Service grid">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((svc, i) => {
            const score = 99.9 - i * 0.7;
            const tone = score > 99 ? "var(--green)" : score > 97 ? "var(--amber)" : "var(--red)";
            const svcErrors = (errors.data ?? []).filter((e) => e.metadata.service === svc).length;
            return (
              <div key={svc} className="rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--text)]">{svc}</span>
                  <span className="size-2.5 rounded-full pulse-dot" style={{ background: tone }} />
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-semibold tabular-nums text-[var(--text)]">{score.toFixed(2)}%</div>
                    <div className="text-[12px] text-[var(--text3)]">{svcErrors} errors · {reqList.length} req</div>
                  </div>
                  <MetricSparkline data={Array.from({ length: 16 }, () => 50 + Math.random() * 40)} color={tone} />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Readiness checks" className="p-0">
          <Table headers={["Check", "Status", "Latency"]}>
            {DEPENDENCIES.map((d) => (
              <Tr key={d.name}>
                <Td>{d.name}</Td>
                <Td><StatusBadge status={d.status} /></Td>
                <Td className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{d.latency}</Td>
              </Tr>
            ))}
          </Table>
        </SectionCard>

        <SectionCard title="Dependency map">
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
            <div className="grid grid-cols-3 gap-2">
              {DEPENDENCIES.map((d) => (
                <div key={d.name} className="rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-[12px] text-[var(--text2)]">{d.name}</div>
              ))}
            </div>
            <p className="text-[12px] text-[var(--text3)]">Interactive topology graph renders here with live edge latencies.</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
