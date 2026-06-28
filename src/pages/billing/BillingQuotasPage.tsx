import { useQuotaRequests } from "@/hooks/useDummyData";
import { PageHeader, SectionCard, Button, formatNumber, demoAction } from "@/shared/observe";

const QUOTAS = [
  { name: "Event ingestion", used: 3_200_000, limit: 5_000_000, unit: "events/mo" },
  { name: "Data retention", used: 90, limit: 90, unit: "days" },
  { name: "Team seats", used: 25, limit: 50, unit: "seats" },
  { name: "API rate limit", used: 42_000, limit: 60_000, unit: "req/min" },
  { name: "Projects", used: 12, limit: 999, unit: "projects" },
];

export default function BillingQuotasPage() {
  useQuotaRequests();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Quotas"
        description="Quota overview and increase requests."
        actions={<Button variant="primary" onClick={() => demoAction("Request increase")}>Request increase</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {QUOTAS.map((q) => {
          const pct = (q.used / q.limit) * 100;
          const tone = pct > 90 ? "var(--red)" : pct > 70 ? "var(--amber)" : "var(--green)";
          return (
            <SectionCard key={q.name}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--text)]">{q.name}</span>
                <span className="text-[12px] tabular-nums text-[var(--text3)]">{formatNumber(q.used)} / {formatNumber(q.limit)} {q.unit}</span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--bg3)]"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone }} /></div>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
