import { useProjects } from "@/hooks/useDummyData";
import { PageHeader, KpiCard, SectionCard, MetricSparkline, StatusBadge, Table, Tr, Td, formatCompact } from "@/shared/observe";

export default function ProjectOverviewPage() {
  const { data } = useProjects();
  const projects = data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Project Overview" description="Summary of project state and SDK status." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total events" value={formatCompact(projects.reduce((s, p) => s + p.eventVolume24h, 0))} />
        <KpiCard label="Avg error rate" value={`${(projects.reduce((s, p) => s + Number(p.errorRate), 0) / (projects.length || 1)).toFixed(2)}%`} />
        <KpiCard label="SDKs reporting" value={projects.length} />
        <KpiCard label="Healthy" value={projects.filter((p) => p.healthScore > 80).length} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Event volume (24h)">
          <MetricSparkline data={Array.from({ length: 48 }, (_, i) => 100 + Math.sin(i / 4) * 50 + Math.random() * 30)} color="var(--brand)" width={520} height={120} />
        </SectionCard>
        <SectionCard title="Error rate trend">
          <MetricSparkline data={Array.from({ length: 48 }, () => Math.random() * 40 + 5)} color="var(--red)" width={520} height={120} />
        </SectionCard>
      </div>

      <SectionCard title="SDK status" className="p-0">
        <Table headers={["Project", "SDK", "Version", "Status"]}>
          {projects.map((p) => (
            <Tr key={p.id}>
              <Td>{p.name}</Td>
              <Td className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">pulse-node</Td>
              <Td className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">1.5.0</Td>
              <Td><StatusBadge status={p.status === "active" ? "healthy" : "archived"} /></Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>
    </div>
  );
}
