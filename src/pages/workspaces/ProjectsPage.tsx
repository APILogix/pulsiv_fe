import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { projectPath } from "@/modules/projects/navigation/project-routes";
import {
  Archive,
  FolderOpen,
  KeyRound,
  Layers,
  Package,
  Pause,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useProjects } from "@/modules/projects/hooks/useProjects";
import type { ListProjectsQuery, ProjectListItem, ProjectStatus } from "@/modules/projects/api/types";
import {
  HeroFacts,
  IconChip,
  PageHero,
  Pill,
  SegmentedControl,
  Toolbar,
  fieldInputClass,
  type HeroFact,
  type SegmentOption,
} from "@/shared/ui/pulse";
import { Timestamp, formatCompact } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { AsyncPanel } from "@/modules/projects/components/project-ui";
import { PROJECT_STATUS_TONE } from "./ProjectShellPage";

// ── module-level constants (rules.md §1.2) ───────────────────

type StatusFilter = "all" | ProjectStatus;

const STATUS_OPTIONS: SegmentOption<StatusFilter>[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
];

const SORT_OPTIONS: SegmentOption<"created_at" | "updated_at" | "name">[] = [
  { value: "created_at", label: "Newest" },
  { value: "updated_at", label: "Recently updated" },
  { value: "name", label: "Name" },
];

// ── project card ─────────────────────────────────────────────

function ProjectCard({ project, activeOrgSlug }: { project: ProjectListItem; activeOrgSlug: string | null }) {
  return (
    <Link
      to={activeOrgSlug ? projectPath(activeOrgSlug, project.publicId, "overview") : `/projects/${project.id}/overview`}
      className="pulse-lift group flex flex-col gap-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-colors duration-150 hover:border-[var(--border2)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconChip icon={FolderOpen} tone="brand" />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-[var(--text)] group-hover:text-[var(--brand)]">
              {project.name}
            </p>
            <code className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">{project.slug}</code>
          </div>
        </div>
        <Pill tone={PROJECT_STATUS_TONE[project.status]} dot>
          {project.status}
        </Pill>
      </div>

      <p className="line-clamp-2 min-h-[34px] text-[12px] leading-[1.5] text-[var(--text2)]">
        {project.description || "No description provided."}
      </p>

      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--bg2)] px-2 py-0.5 font-[family-name:var(--mono)] text-[10px] font-medium text-[var(--text3)] ring-1 ring-inset ring-[var(--border)]"
            >
              {tag}
            </span>
          ))}
          {project.tags.length > 4 && (
            <span className="font-[family-name:var(--mono)] text-[10px] text-[var(--text3)]">+{project.tags.length - 4}</span>
          )}
        </div>
      )}

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--border)]">
        <div className="flex flex-col gap-0.5 bg-[var(--bg1)] px-3 py-2">
          <dt className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">Keys</dt>
          <dd className="font-[family-name:var(--mono)] text-[13px] font-medium tabular-nums text-[var(--text)]">{project.apiKeysCount}</dd>
        </div>
        <div className="flex flex-col gap-0.5 bg-[var(--bg1)] px-3 py-2">
          <dt className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">Active</dt>
          <dd className="font-[family-name:var(--mono)] text-[13px] font-medium tabular-nums text-[var(--green)]">
            {project.activeApiKeysCount}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 bg-[var(--bg1)] px-3 py-2">
          <dt className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">Visibility</dt>
          <dd className="truncate text-[13px] font-medium capitalize text-[var(--text)]">{project.visibility}</dd>
        </div>
      </dl>

      <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 text-[11px] text-[var(--text3)]">
        <span>
          Created <Timestamp value={project.createdAt} />
        </span>
        <span className="font-[family-name:var(--mono)]">{project.timezone}</span>
      </div>
    </Link>
  );
}

// ── page ─────────────────────────────────────────────────────

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
  const [sortBy, setSortBy] = useState<"created_at" | "updated_at" | "name">("created_at");
  const [search, setSearch] = useState("");

  const query: ListProjectsQuery = {
    ...(status !== "all" ? { status } : {}),
    ...(search ? { search } : {}),
    sortBy,
    sortOrder: sortBy === "name" ? "asc" : "desc",
    limit: 100,
  };

  const { data, isLoading, error } = useProjects(query);
  const projects = data?.data ?? [];

  const active = projects.filter((project) => project.status === "active").length;
  const paused = projects.filter((project) => project.status === "paused").length;
  const archived = projects.filter((project) => project.status === "archived").length;
  const activeKeys = projects.reduce((sum, project) => sum + project.activeApiKeysCount, 0);

  const facts: HeroFact[] = [
    { label: "Projects", value: data?.total ?? projects.length, icon: Package },
    { label: "Active", value: active, tone: "green", icon: ShieldCheck },
    { label: "Paused", value: paused, tone: paused > 0 ? "amber" : "neutral", icon: Pause },
    { label: "Active keys", value: formatCompact(activeKeys), tone: "brand", icon: KeyRound },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Workspaces"
        title="Projects"
        description="Every organization-scoped project, its ingestion keys, and its lifecycle state. Open a project to manage environments, keys, members, and alerting."
        icon={Package}
        breadcrumbs={[{ label: "Workspaces" }, { label: "Projects" }]}
        actions={
          <UiButton size="lg" onClick={() => navigate(activeOrgSlug ? `/${activeOrgSlug}/projects/new` : "/projects/new")}>
            <Plus className="mr-1.5 size-4" /> New project
          </UiButton>
        }
      >
        <HeroFacts facts={facts} />
      </PageHero>

      <Toolbar
        trailing={
          <span className="font-[family-name:var(--mono)] text-[11px] tabular-nums text-[var(--text3)]">
            {projects.length} shown{archived > 0 ? ` · ${archived} archived` : ""}
          </span>
        }
      >
        <form
          className="relative min-w-[220px] flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem("project-search") as HTMLInputElement | null;
            setSearch(input?.value.trim() ?? "");
          }}
        >
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text3)]"
            aria-hidden="true"
          />
          <input
            id="project-search"
            name="project-search"
            type="search"
            defaultValue={search}
            placeholder="Search projects, then press Enter"
            aria-label="Search projects"
            className={`${fieldInputClass} pl-9`}
          />
        </form>
        <SegmentedControl
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          ariaLabel="Filter projects by status"
        />
        <SegmentedControl value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} ariaLabel="Sort projects" />
      </Toolbar>

      <AsyncPanel
        loading={isLoading}
        error={error}
        isEmpty={projects.length === 0}
        emptyIcon={search || status !== "all" ? Search : Layers}
        emptyTitle={search || status !== "all" ? "No projects match these filters" : "Create your first project"}
        emptyDescription={
          search || status !== "all"
            ? "Try a different search term or clear the status filter."
            : "A project groups environments, ingestion keys, members, and alert routing for one application."
        }
        emptyAction={
          search || status !== "all" ? (
            <UiButton
              variant="outline"
              size="lg"
              onClick={() => {
                setSearch("");
                setStatus("all");
              }}
            >
              Clear filters
            </UiButton>
          ) : (
            <UiButton size="lg" onClick={() => navigate(activeOrgSlug ? `/${activeOrgSlug}/projects/new` : "/projects/new")}>
              <Plus className="mr-1.5 size-4" /> New project
            </UiButton>
          )
        }
        bodyClassName="p-0"
      >
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} activeOrgSlug={activeOrgSlug} />
          ))}
        </div>
      </AsyncPanel>

      {archived > 0 && status === "all" && (
        <p className="flex items-center gap-1.5 text-[12px] text-[var(--text3)]">
          <Archive className="size-3.5" aria-hidden="true" />
          Archived projects stop ingesting but keep their data until retention expires.
        </p>
      )}
    </div>
  );
}
