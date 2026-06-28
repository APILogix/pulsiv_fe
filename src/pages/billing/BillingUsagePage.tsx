import { useProjects } from "@/hooks/useDummyData";
import { PageHeader, KpiCard, SectionCard, MetricSparkline, Table, Tr, Td, formatCompact } from "@/shared/observe";

export default function BillingUsagePage() {
  const { data } = useProjects();
  const projects = (data ?? []).slice(0, 8);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Usage" description="Consumption, history, export, and forecast." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Events (MTD)" value="3.2M" delta="+8%" trend="up" />
        <KpiCard label="Quota used" value="64%" />
        <KpiCard label="Overage" value="$0.00" />
        <KpiCard label="Forecast" value="4.8M" />
      </div>

      <SectionCard title="Usage trend (current cycle)">
        <MetricSparkline data={Array.from({ length: 30 }, (_, i) => 80 + i * 4 + Math.random() * 20)} color="var(--brand)" width={760} height={120} />
      </SectionCard>

      <SectionCard title="Breakdown by project" className="p-0">
        <Table headers={["Project", "Events", "% of total", "Cost"]}>
          {projects.map((p) => (
            <Tr key={p.id}>
              <Td className="font-medium">{p.name}</Td>
              <Td className="tabular-nums">{formatCompact(p.eventVolume24h * 30)}</Td>
              <Td className="text-[var(--text2)]">{Math.round((p.eventVolume24h / 500000) * 100)}%</Td>
              <Td className="font-semibold">${(p.eventVolume24h * 30 * 0.001).toFixed(2)}</Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>
    </div>
  );
}
