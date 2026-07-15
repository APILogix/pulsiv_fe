import { useState } from "react";
import { PageHeader, KpiCard, SectionCard, MetricSparkline } from "@/shared/observe";

const LIMITS = [
  { name: "Event ingestion", used: 620_000, limit: 1_000_000, unit: "events/day" },
  { name: "API requests", used: 42_000, limit: 60_000, unit: "req/min" },
  { name: "Trace storage", used: 380_000, limit: 500_000, unit: "spans/day" },
  { name: "Log lines", used: 910_000, limit: 1_000_000, unit: "lines/day" },
];

export default function RateLimitsPage() {
  const [sparklineData] = useState(() => Array.from({ length: 30 }, (_, i) => 300 + i * 18 + Math.random() * 30));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Rate Limits" description="Operational rate-limit visibility for ingest traffic." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Throttled (24h)" value="0" trend="up" />
        <KpiCard label="Peak usage" value="91%" />
        <KpiCard label="Burst capacity" value="2x" />
        <KpiCard label="Forecast breach" value="14 days" />
      </div>

      <SectionCard title="Consumption against quotas">
        <div className="flex flex-col gap-4">
          {LIMITS.map((l) => {
            const pct = (l.used / l.limit) * 100;
            const tone = pct > 90 ? "var(--red)" : pct > 70 ? "var(--amber)" : "var(--green)";
            return (
              <div key={l.name}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span className="text-[var(--text)]">{l.name}</span>
                  <span className="tabular-nums text-[var(--text3)]">{l.used.toLocaleString()} / {l.limit.toLocaleString()} {l.unit}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg3)]"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone }} /></div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Quota forecast (30d)">
        <MetricSparkline data={sparklineData} color="var(--amber)" width={760} height={120} />
      </SectionCard>
    </div>
  );
}
