import { useNavigate } from "react-router";
import { Plus, FolderOpen } from "lucide-react";
import { useProjects } from "@/hooks/useDummyData";
import { PageHeader, KpiCard, FillPage, InfiniteCards, StatusBadge, Button, MetricSparkline, Timestamp, demoAction, formatCompact } from "@/shared/observe";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useProjects();
  const projects = data ?? [];
  const active = projects.filter((p) => p.status === "active").length;
  const totalVolume = projects.reduce((s, p) => s + p.eventVolume24h, 0);

  return (
    <FillPage>
      <PageHeader
        title="All Projects"
        description="Organization-scoped project inventory."
        actions={<Button variant="primary" onClick={() => demoAction("Create project")}><Plus className="size-4" /> New project</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Projects" value={projects.length} icon={FolderOpen} />
        <KpiCard label="Active" value={active} />
        <KpiCard label="Events / 24h" value={formatCompact(totalVolume)} />
        <KpiCard label="Avg health" value={`${Math.round(projects.reduce((s, p) => s + p.healthScore, 0) / (projects.length || 1))}`} />
      </div>

      <InfiniteCards
        className="flex-1"
        loading={isLoading}
        items={projects}
        queryKey={["projects"]}
        getKey={(p) => p.id}
        renderCard={(p) => {
          const tone = p.healthScore > 85 ? "var(--green)" : p.healthScore > 70 ? "var(--amber)" : "var(--red)";
          return (
            <div
              onClick={() => navigate(`/projects/${p.id}`)}
              className="cursor-pointer rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-colors hover:border-[var(--input)]"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-[var(--text)]">{p.name}</div>
                  <code className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">{p.slug}</code>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="mt-2 line-clamp-2 text-[13px] text-[var(--text2)]">{p.description}</p>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-[12px] text-[var(--text3)]">Health</div>
                  <div className="text-lg font-semibold tabular-nums" style={{ color: tone }}>{p.healthScore}</div>
                </div>
                <MetricSparkline data={Array.from({ length: 14 }, () => 40 + Math.random() * 50)} color={tone} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2 text-[12px] text-[var(--text3)]">
                <span>{formatCompact(p.eventVolume24h)} events</span>
                <span>{p.errorRate}% errors</span>
                <span>updated <Timestamp value={p.lastActivityAt} /></span>
              </div>
            </div>
          );
        }}
      />
    </FillPage>
  );
}
