import { useProjects } from "@/modules/projects/hooks/useProjects";
import { PageHeader, KpiCard, SectionCard, MetricSparkline, StatusBadge, Table, Tr, Td, formatCompact } from "@/shared/observe";

export default function ProjectOverviewPage() {
  const { data } = useProjects();
  const projects = data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Project Overview" description="Summary of overall project state, event volumes, and health." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total events" value={formatCompact(projects.reduce((s, p) => s + p.eventVolume24h, 0))} />
        <KpiCard label="Avg error rate" value={`${(projects.reduce((s, p) => s + Number(p.errorRate), 0) / (projects.length || 1)).toFixed(2)}%`} />
        <KpiCard label="Active Projects" value={projects.filter((p) => p.status === "active").length} />
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

      <SectionCard title="Project Health & Activity" className="p-0">
        <Table headers={["Project", "Event Volume (24h)", "Error Rate", "Health Score", "Status"]}>
          {projects.map((p) => (
            <Tr key={p.id}>
              <Td className="font-medium text-[var(--text)]">{p.name}</Td>
              <Td className="tabular-nums text-[var(--text2)]">{formatCompact(p.eventVolume24h)}</Td>
              <Td className="tabular-nums text-[var(--text2)]">{Number(p.errorRate).toFixed(2)}%</Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--bg3)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, p.healthScore))}%`,
                        background: p.healthScore > 80 ? "var(--green)" : p.healthScore > 50 ? "var(--amber)" : "var(--red)"
                      }}
                    />
                  </div>
                  <span className="text-[12px] font-medium text-[var(--text2)] tabular-nums">{p.healthScore}</span>
                </div>
              </Td>
              <Td><StatusBadge status={p.status} /></Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>
    </div>
  );
}
