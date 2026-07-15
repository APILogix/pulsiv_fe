import { useNavigate } from "react-router";
import { Plus, FolderOpen } from "lucide-react";
import { useProjects } from "@/modules/projects/hooks/useProjects";
import { PageHeader, KpiCard, FillPage, InfiniteCards, StatusBadge, Button, Timestamp, formatCompact } from "@/shared/observe";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useProjects();
  const projects = data ?? [];
  const active = projects.filter((p) => p.status === "active").length;
  const totalKeys = projects.reduce((s, p) => s + p.apiKeysCount, 0);
  const productionDefaults = projects.filter((p) => p.defaultEnvironment === "production").length;

  return (
    <FillPage>
      <PageHeader
        title="All Projects"
        description="Organization-scoped project inventory."
        actions={
          <Button variant="primary" onClick={() => navigate("/projects/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Projects" value={projects.length} icon={FolderOpen} />
        <KpiCard label="Active" value={active} />
        <KpiCard label="API Keys" value={formatCompact(totalKeys)} />
        <KpiCard label="Prod Default" value={productionDefaults} />
      </div>

      <InfiniteCards
        className="flex-1"
        loading={isLoading}
        items={projects}
        queryKey={["projects"]}
        getKey={(p) => p.id}
        renderCard={(p) => {
          // const tone = p.status === "active" ? "var(--green)" : p.status === "suspended" ? "var(--amber)" : "var(--red)";
          return (
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/projects/${p.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/projects/${p.id}`); } }}
              className="cursor-pointer rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-colors hover:border-[var(--input)]"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-[var(--text)]">{p.name}</div>
                  <code className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">{p.slug}</code>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="mt-2 line-clamp-2 text-[13px] text-[var(--text2)]">{p.description || "No description provided."}</p>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-[11px] text-[var(--text3)]">Default environment</div>
                  <div className="font-semibold capitalize text-[14px] text-[var(--text)]">{p.defaultEnvironment}</div>
                </div>
              </div>
              <div className="mt-3 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--text3)]">
                Created <Timestamp value={p.createdAt} />
              </div>
            </div>
          );
        }}
      />
    </FillPage>
  );
}
