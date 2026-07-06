import { useParams } from "react-router";
import { useProjects, useProject, useApiKeys, useProjectUsage } from "@/modules/projects/hooks/useProjects";
import { PageHeader, KpiCard, SectionCard, MetricSparkline, Table, Tr, Td, formatCompact } from "@/shared/observe";

export default function ProjectUsagePage() {
  const { projectId } = useParams();
  const { data: allProjects } = useProjects();
  const { data: project } = useProject(projectId || "");
  const { data: keys } = useApiKeys(projectId || "");
  useProjectUsage(projectId || "");
  const list = projectId ? (project ? [project] : []) : (allProjects ?? []);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Usage" description="Project usage, key activity, and consumption trends." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Events / 24h" value={formatCompact(list.reduce((s, p) => s + p.eventVolume24h, 0))} delta="+8.1%" trend="up" />
        <KpiCard label="Ingest rate" value="2.4k/s" />
        <KpiCard label="Active keys" value={(keys ?? []).filter((k) => k.status === "active").length} />
        <KpiCard label="Quota used" value="62%" />
      </div>

      <SectionCard title="Consumption (30d)">
        <MetricSparkline data={Array.from({ length: 30 }, (_, i) => 200 + i * 6 + Math.random() * 40)} color="var(--brand)" width={760} height={120} />
      </SectionCard>

      <SectionCard title="Breakdown by event type" className="p-0">
        <Table headers={["Event type", "Volume", "% of total", "Trend"]}>
          {[
            { t: "Requests", v: 1_240_000, p: "48%" },
            { t: "Logs", v: 820_000, p: "32%" },
            { t: "Errors", v: 180_000, p: "7%" },
            { t: "Spans", v: 290_000, p: "11%" },
            { t: "Metrics", v: 52_000, p: "2%" },
          ].map((r) => (
            <Tr key={r.t}>
              <Td>{r.t}</Td>
              <Td className="tabular-nums">{formatCompact(r.v)}</Td>
              <Td className="text-[var(--text2)]">{r.p}</Td>
              <Td><MetricSparkline data={Array.from({ length: 12 }, () => Math.random() * 40)} /></Td>
            </Tr>
          ))}
        </Table>
      </SectionCard>
    </div>
  );
}
