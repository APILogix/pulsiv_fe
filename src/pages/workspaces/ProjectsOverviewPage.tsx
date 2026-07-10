import { useProjects } from "@/modules/projects/hooks/useProjects";
import { PageHeader, KpiCard, SectionCard, MetricSparkline, StatusBadge, Table, Tr, Td, formatCompact } from "@/shared/observe";

export default function ProjectsOverviewPage() {
  const { data } = useProjects();
  const projects = data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Project Overview" description="Summary of overall project state, event volumes, and health." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total API keys" value={formatCompact(projects.reduce((s, p) => s + p.apiKeysCount, 0))} />
        <KpiCard label="Active API keys" value={formatCompact(projects.reduce((s, p) => s + p.activeApiKeysCount, 0))} />
        <KpiCard label="Active Projects" value={projects.filter((p) => p.status === "active").length} />
        <KpiCard label="Prod Default" value={projects.filter((p) => p.defaultEnvironment === "production").length} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="API Key Distribution">
          <MetricSparkline data={projects.map((p) => p.apiKeysCount)} color="var(--brand)" width={520} height={120} />
        </SectionCard>
        <SectionCard title="Active Key Distribution">
          <MetricSparkline data={projects.map((p) => p.activeApiKeysCount)} color="var(--red)" width={520} height={120} />
        </SectionCard>
      </div>

      <SectionCard title="Project Status & Keys" className="p-0">
        <Table headers={["Project", "Default Environment", "Active Keys", "Total Keys", "Status"]}>
          {projects.map((p) => (
            <Tr key={p.id}>
              <Td className="font-medium text-[var(--text)]">{p.name}</Td>
              <Td className="capitalize text-[var(--text2)]">{p.defaultEnvironment}</Td>
              <Td className="tabular-nums text-[var(--text2)]">{formatCompact(p.activeApiKeysCount)}</Td>
              <Td className="tabular-nums text-[var(--text2)]">{formatCompact(p.apiKeysCount)}</Td>
              <Td><StatusBadge status={p.status} /></Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>
    </div>
  );
}
