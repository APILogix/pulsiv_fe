import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { projectPath } from "@/modules/projects/navigation/project-routes";
import {
  Archive,
  ArrowUpRight,
  FolderOpen,
  Plus,
  Search,
} from "lucide-react";
import { useProjects } from "@/modules/projects/hooks/useProjects";
import type { ListProjectsQuery, ProjectListItem, ProjectStatus } from "@/modules/projects/api/types";
import { Timestamp, formatCompact } from "@/shared/observe";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | ProjectStatus;

const STATUS_FILTERS: Array<{ label: string; value: StatusFilter }> = [
  { label: "ALL", value: "all" },
  { label: "ACTIVE", value: "active" },
  { label: "PAUSED", value: "paused" },
  { label: "ARCHIVED", value: "archived" },
];

function ProjectCard({ project, activeOrgSlug }: { project: ProjectListItem; activeOrgSlug: string | null }) {
  const targetUrl = activeOrgSlug
    ? projectPath(activeOrgSlug, project.publicId, "overview")
    : `/projects/${project.id}/overview`;

  return (
    <Link
      to={targetUrl}
      className="group relative flex flex-col justify-between rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 transition-all duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]/60"
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-secondary)] group-hover:border-[var(--brand-border)] group-hover:text-[var(--brand)] transition-colors">
              <FolderOpen className="size-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors font-[family-name:var(--display)]">
                {project.name}
              </h3>
              <div className="flex items-center gap-1.5 font-[family-name:var(--mono)] text-[11px] text-[var(--text-tertiary)]">
                <code>{project.slug}</code>
              </div>
            </div>
          </div>

          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-wider",
              project.status === "active"
                ? "bg-[var(--success-muted)] text-[var(--success)]"
                : project.status === "paused"
                ? "bg-[var(--warning-muted)] text-[var(--warning)]"
                : "bg-[var(--surface-3)] text-[var(--text-tertiary)]"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                project.status === "active"
                  ? "bg-[var(--success)]"
                  : project.status === "paused"
                  ? "bg-[var(--warning)]"
                  : "bg-[var(--text-tertiary)]"
              )}
            />
            {project.status}
          </span>
        </div>

        {/* Description */}
        <p className="mt-3.5 line-clamp-2 text-[12px] leading-relaxed text-[var(--text-secondary)]">
          {project.description || "Production service endpoint and telemetry collection target."}
        </p>

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-[4px] bg-[var(--surface-2)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] text-[var(--text-tertiary)] border border-[var(--border-subtle)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Metrics Footer */}
      <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
        <div className="grid grid-cols-2 gap-2 font-[family-name:var(--mono)]">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">API Keys</span>
            <span className="mt-0.5 text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">
              {project.apiKeysCount} <span className="text-[10.5px] font-normal text-[var(--success)]">({project.activeApiKeysCount} active)</span>
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Timezone</span>
            <span className="mt-0.5 text-[12px] font-medium text-[var(--text-secondary)] truncate">
              {project.timezone || "UTC"}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
          <span>Created <Timestamp value={project.createdAt} /></span>
          <span className="flex items-center gap-1 text-[var(--brand)] opacity-0 group-hover:opacity-100 transition-opacity">
            Open project <ArrowUpRight className="size-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { orgSlug: paramOrgSlug } = useParams<{ orgSlug: string }>();
  const storeOrgSlug = useOrgStore((state) => state.activeOrgSlug);
  const activeOrgSlug = paramOrgSlug || storeOrgSlug;
  const { organizations } = useOrganizations();

  const setActiveOrgId = useOrgStore((s) => s.setActiveOrgId);
  const setActiveOrgSlug = useOrgStore((s) => s.setActiveOrgSlug);

  useEffect(() => {
    if (paramOrgSlug && organizations.length > 0) {
      const matchingOrg = organizations.find((o) => o.slug === paramOrgSlug);
      if (matchingOrg && (useOrgStore.getState().activeOrgId !== matchingOrg.id || useOrgStore.getState().activeOrgSlug !== matchingOrg.slug)) {
        setActiveOrgId(matchingOrg.id);
        setActiveOrgSlug(matchingOrg.slug);
      }
    }
  }, [paramOrgSlug, organizations, setActiveOrgId, setActiveOrgSlug]);

  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const query: ListProjectsQuery = {
    ...(status !== "all" ? { status } : {}),
    ...(search ? { search } : {}),
    limit: 100,
  };

  const { data, isLoading } = useProjects(query);
  const projects = data?.data ?? [];

  const activeCount = projects.filter((p) => p.status === "active").length;
  const pausedCount = projects.filter((p) => p.status === "paused").length;
  const archivedCount = projects.filter((p) => p.status === "archived").length;
  const totalKeys = projects.reduce((sum, p) => sum + (p.activeApiKeysCount || 0), 0);

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 font-sans">
      
      {/* ── 1. Page Command Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            <span className="inline-block size-1.5 rounded-full bg-[var(--brand)]" />
            <span>Workspaces</span>
            <span>/</span>
            <span className="text-[var(--text-secondary)]">Fleet Directory</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] font-[family-name:var(--display)]">
            Monitored Projects
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Organization applications, microservices, ingestion keys, and environment health states.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(activeOrgSlug ? `/${activeOrgSlug}/projects/new` : "/projects/new")}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--brand-border)] bg-[var(--brand)] px-3 py-1.5 text-[12px] font-medium text-white shadow-sm hover:bg-[var(--brand)]/90 transition-all"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>Create Project</span>
          </button>
        </div>
      </div>

      {/* ── 2. Unified Hero Telemetry Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] divide-x divide-y md:divide-y-0 divide-[var(--border-subtle)]">
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Total Projects</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {projects.length}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Registered workspaces</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Active</span>
            <span className="size-2 rounded-full bg-[var(--success)]" />
          </div>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--success)] font-[family-name:var(--mono)] tabular-nums">
            {activeCount}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Live streaming telemetry</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Paused</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--warning)] font-[family-name:var(--mono)] tabular-nums">
            {pausedCount}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Telemetry suspended</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Active API Keys</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--brand)] font-[family-name:var(--mono)] tabular-nums">
            {formatCompact(totalKeys)}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Ingestion credentials</div>
        </div>
      </div>

      {/* ── 3. High-Density Filter Toolbar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-3">
        {/* Left: Search + Status Pills */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[240px] max-w-[340px] flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search projects by name or slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] pl-8 pr-3 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
            />
          </div>

          {/* Status Pills */}
          <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] p-0.5 text-[11px] font-[family-name:var(--mono)]">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setStatus(s.value)}
                className={cn(
                  "rounded-[4px] px-2.5 py-0.5 transition-colors font-medium",
                  status === s.value
                    ? "bg-[var(--surface-4)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <span className="font-[family-name:var(--mono)] text-[11px] text-[var(--text-tertiary)]">
          {projects.length} workspace{projects.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* ── 4. Project Card Grid ── */}
      {isLoading ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-12 text-center text-[12px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
          Loading fleet projects…
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-default)] bg-[var(--surface-1)] p-12 text-center">
          <FolderOpen className="mx-auto size-8 text-[var(--text-tertiary)] opacity-60" />
          <p className="mt-2 text-[14px] font-semibold text-[var(--text-primary)]">No projects found</p>
          <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
            {search || status !== "all"
              ? "Try adjusting your search criteria or status filter."
              : "Create your first project to begin ingesting telemetry."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} activeOrgSlug={activeOrgSlug} />
          ))}
        </div>
      )}

      {archivedCount > 0 && status === "all" && (
        <p className="flex items-center gap-1.5 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
          <Archive className="size-3.5" />
          Archived projects stop ingesting telemetry but preserve history until retention expires.
        </p>
      )}
    </div>
  );
}

