import { useProjects } from "@/modules/projects/hooks/useProjects";
import { PageHeader, KpiCard, SectionCard, MetricSparkline, Table, Tr, Td, formatCompact } from "@/shared/observe";

export default function ProjectsUsagePage() {
  const { data: allProjects } = useProjects();
  const list = allProjects ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Usage" description="Project usage, key activity, and consumption trends." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="API keys" value={formatCompact(list.reduce((s, p) => s + p.apiKeysCount, 0))} delta="+8.1%" trend="up" />
        <KpiCard label="Projects in scope" value={list.length} />
        <KpiCard label="Active keys" value={list.reduce((s, p) => s + p.activeApiKeysCount, 0)} />
        <KpiCard label="Default envs" value={list.map((p) => p.defaultEnvironment).join(", ") || "None"} />
      </div>

      <SectionCard title="Consumption (30d)">
        <MetricSparkline data={Array.from({ length: 30 }, (_, i) => 200 + i * 6 + Math.random() * 40)} color="var(--brand)" width={760} height={120} />
      </SectionCard>

      <SectionCard title="Breakdown by environment" className="p-0">
        <Table headers={["Environment", "Projects", "% of total", "Trend"]}>
          {[
            { t: "Production", v: list.filter((p) => p.defaultEnvironment === "production").length, p: `${Math.round((list.filter((p) => p.defaultEnvironment === "production").length / (list.length || 1)) * 100)}%` },
            { t: "Development", v: list.filter((p) => p.defaultEnvironment === "development").length, p: `${Math.round((list.filter((p) => p.defaultEnvironment === "development").length / (list.length || 1)) * 100)}%` },
          ].map((r) => (
            <Tr key={r.t}>
              <Td>{r.t}</Td>
              <Td className="tabular-nums">{formatCompact(r.v)}</Td>
              <Td className="text-[var(--text2)]">{r.p}</Td>
              <Td><MetricSparkline data={Array.from({ length: 12 }, () => Math.random() * 4 + r.v)} /></Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>
    </div>
  );
}
