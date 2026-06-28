import { useEndpoints } from "@/hooks/useDummyData";
import { PageHeader, KpiCard, SectionCard, StatusBadge, MetricSparkline, formatCompact } from "@/shared/observe";

const SDK_VERSIONS = [
  { v: "1.5.0", pct: 62, color: "var(--brand)" },
  { v: "1.4.2", pct: 21, color: "var(--blue)" },
  { v: "1.3.8", pct: 11, color: "var(--amber)" },
  { v: "< 1.3", pct: 6, color: "var(--red)" },
];

export default function ConnectionsOverview() {
  const { data } = useEndpoints();
  const endpoints = data ?? [];
  const totalReq = endpoints.reduce((s, e) => s + e.requests24h, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Connections Overview" description="Platform ingestion summary and pipeline health." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Ingested / 24h" value={formatCompact(totalReq)} delta="+6.2%" trend="up" />
        <KpiCard label="Healthy endpoints" value={`${endpoints.filter((e) => e.status === "healthy").length}/${endpoints.length}`} />
        <KpiCard label="Avg p95" value={`${Math.round(endpoints.reduce((s, e) => s + e.p95Latency, 0) / (endpoints.length || 1))}ms`} />
        <KpiCard label="Drop rate" value="0.04%" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Route health">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {endpoints.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-2">
                <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{e.path}</span>
                <StatusBadge status={e.status} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="SDK version distribution">
          <div className="flex flex-col gap-3">
            {SDK_VERSIONS.map((s) => (
              <div key={s.v}>
                <div className="mb-1 flex justify-between text-[12px]"><span className="font-[family-name:var(--mono)] text-[var(--text2)]">{s.v}</span><span className="text-[var(--text3)]">{s.pct}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--bg3)]"><div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-4"><MetricSparkline data={Array.from({ length: 30 }, () => Math.random() * 50 + 20)} width={420} height={60} /></div>
        </SectionCard>
      </div>
    </div>
  );
}
