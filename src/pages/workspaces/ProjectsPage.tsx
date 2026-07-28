import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Archive,
  Clock,
  FolderOpen,
  Grid3X3,
  KeyRound,
  Layers,
  List,
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
import { formatCompact } from "@/shared/observe";
import { formatRelativeTime } from "@/shared/observe/format";
import { Button as UiButton } from "@/components/ui/button";
import { AsyncPanel } from "@/modules/projects/components/project-ui";
import { PROJECT_STATUS_TONE } from "./ProjectShellPage";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md - no inline objects in JSX) ──

type StatusFilter = "all" | ProjectStatus;
type ViewMode = "grid" | "list";

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

const VIEW_OPTIONS: SegmentOption<ViewMode>[] = [
  { value: "grid", label: "Grid", icon: Grid3X3 },
  { value: "list", label: "List", icon: List },
];

const SKELETON_ITEMS = [0, 1, 2, 3, 4, 5] as const;

// ── skeleton card ────────────────────────────────────────────

function ProjectCardSkeleton() {
  return (
    <div className="flex flex-col gap-3.5 rounded-[14px] border border-[var(--border)] bg-[var(--bg1)] p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-[10px] bg-[var(--bg2)]" />
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-32 rounded-[6px] bg-[var(--bg2)]" />
            <div className="h-3 w-20 rounded-[4px] bg-[var(--bg2)]" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full bg-[var(--bg2)]" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-3 w-full rounded-[4px] bg-[var(--bg2)]" />
        <div className="h-3 w-3/4 rounded-[4px] bg-[var(--bg2)]" />
      </div>
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--border)]">
        <div className="flex flex-col gap-1.5 bg-[var(--bg1)] px-3 py-2.5">
          <div className="h-2.5 w-8 rounded-[3px] bg-[var(--bg2)]" />
          <div className="h-4 w-6 rounded-[4px] bg-[var(--bg2)]" />
        </div>
        <div className="flex flex-col gap-1.5 bg-[var(--bg1)] px-3 py-2.5">
          <div className="h-2.5 w-10 rounded-[3px] bg-[var(--bg2)]" />
          <div className="h-4 w-6 rounded-[4px] bg-[var(--bg2)]" />
        </div>
        <div className="flex flex-col gap-1.5 bg-[var(--bg1)] px-3 py-2.5">
          <div className="h-2.5 w-14 rounded-[3px] bg-[var(--bg2)]" />
          <div className="h-4 w-12 rounded-[4px] bg-[var(--bg2)]" />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
        <div className="h-3 w-24 rounded-[3px] bg-[var(--bg2)]" />
        <div className="h-3 w-16 rounded-[3px] bg-[var(--bg2)]" />
      </div>
    </div>
  );
}

// ── project card (grid view) ─────────────────────────────────

function ProjectCard({ project }: { project: ProjectListItem }) {
  const keyUtilization = project.apiKeysCount > 0
    ? Math.round((project.activeApiKeysCount / project.apiKeysCount) * 100)
    : 0;

  return (
    <Link
      to={`/projects/${project.id}/overview`}
      className="pulse-edge pulse-lift group relative flex flex-col gap-3.5 rounded-[14px] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-all duration-200 hover:border-[var(--border2)] hover:shadow-[0_0_20px_-4px_var(--brand-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      {/* Top accent line */}
      <span
        className="absolute inset-x-0 top-0 h-px rounded-t-[14px] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: "linear-gradient(90deg, var(--brand), transparent)" }}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconChip icon={FolderOpen} tone="brand" />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-[var(--text)] transition-colors group-hover:text-[var(--brand)]">
              {project.name}
            </p>
            <code className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">{project.slug}</code>
          </div>
        </div>
        <Pill tone={PROJECT_STATUS_TONE[project.status]} dot>
          {project.status}
        </Pill>
      </div>

      <p className="line-clamp-2 min-h-[34px] text-[12.5px] leading-relaxed text-[var(--text2)]">
        {project.description || "No description provided."}
      </p>

      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--bg2)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--text3)] ring-1 ring-inset ring-[var(--border)]"
            >
              {tag}
            </span>
          ))}
          {project.tags.length > 4 && (
            <span className="text-[10.5px] text-[var(--text3)]">+{project.tags.length - 4}</span>
          )}
        </div>
      )}

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--border)]">
        <div className="flex flex-col gap-1 bg-[var(--bg1)] px-3 py-2">
          <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Keys</dt>
          <dd className="flex items-center gap-2">
            <span className="text-[13px] font-semibold tabular-nums text-[var(--text)]">{project.apiKeysCount}</span>
          </dd>
        </div>
        <div className="flex flex-col gap-1 bg-[var(--bg1)] px-3 py-2">
          <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Active</dt>
          <dd className="flex items-center gap-2">
            <span className="text-[13px] font-semibold tabular-nums text-[var(--green)]">
              {project.activeApiKeysCount}
            </span>
            {project.apiKeysCount > 0 && (
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--bg3)]">
                <div
                  className="h-full rounded-full bg-[var(--green)]"
                  style={{ width: `${keyUtilization}%` }}
                />
              </div>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-1 bg-[var(--bg1)] px-3 py-2">
          <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Visibility</dt>
          <dd className="truncate text-[13px] font-semibold capitalize text-[var(--text)]">{project.visibility}</dd>
        </div>
      </dl>

      <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 text-[11.5px] text-[var(--text3)]">
        <span className="flex items-center gap-1">
          <Clock className="size-3" aria-hidden="true" />
          Last active {formatRelativeTime(project.updatedAt)}
        </span>
        <span className="font-[family-name:var(--mono)]">{project.timezone}</span>
      </div>
    </Link>
  );
}

// ── project list row (compact view) ──────────────────────────

function ProjectListRow({ project }: { project: ProjectListItem }) {
  return (
    <Link
      to={`/projects/${project.id}/overview`}
      className="group flex items-center gap-4 rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] px-4 py-3 transition-all duration-150 hover:border-[var(--border2)] hover:bg-[var(--bg2)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      <IconChip icon={FolderOpen} tone="brand" size="sm" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-semibold text-[var(--text)] transition-colors group-hover:text-[var(--brand)]">
            {project.name}
          </p>
          <Pill tone={PROJECT_STATUS_TONE[project.status]} dot className="hidden sm:inline-flex">
            {project.status}
          </Pill>
        </div>
        <code className="truncate font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">{project.slug}</code>
      </div>

      {project.tags.length > 0 && (
        <div className="hidden items-center gap-1.5 lg:flex">
          {project.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--bg2)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--text3)] ring-1 ring-inset ring-[var(--border)]"
            >
              {tag}
            </span>
          ))}
          {project.tags.length > 2 && (
            <span className="text-[10.5px] text-[var(--text3)]">+{project.tags.length - 2}</span>
          )}
        </div>
      )}

      <div className="hidden items-center gap-4 text-[12px] tabular-nums text-[var(--text2)] sm:flex">
        <span className="flex items-center gap-1" title="API keys">
          <KeyRound className="size-3 text-[var(--text3)]" aria-hidden="true" />
          {project.activeApiKeysCount}/{project.apiKeysCount}
        </span>
        <span className="capitalize">{project.visibility}</span>
      </div>

      <span className="hidden items-center gap-1 text-[11px] text-[var(--text3)] md:flex">
        <Clock className="size-3" aria-hidden="true" />
        {formatRelativeTime(project.updatedAt)}
      </span>
    </Link>
  );
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<"created_at" | "updated_at" | "name">("created_at");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounced search with 300ms delay
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value.trim());
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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
          <UiButton size="lg" onClick={() => navigate("/projects/new")}>
            <Plus className="mr-1.5 size-4" /> New project
          </UiButton>
        }
      >
        <HeroFacts facts={facts} />
      </PageHero>

      <Toolbar
        trailing={
          <span className="text-[12px] tabular-nums text-[var(--text3)]">
            {projects.length} shown{archived > 0 ? ` · ${archived} archived` : ""}
          </span>
        }
      >
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text3)]"
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            name="project-search"
            type="search"
            defaultValue={search}
            onChange={handleSearchChange}
            placeholder="Search projects..."
            aria-label="Search projects"
            className={`${fieldInputClass} pl-9`}
          />
        </div>
        <SegmentedControl
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          ariaLabel="Filter projects by status"
        />
        <SegmentedControl value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} ariaLabel="Sort projects" />
        <SegmentedControl value={viewMode} onChange={setViewMode} options={VIEW_OPTIONS} ariaLabel="View mode" />
      </Toolbar>

      {isLoading ? (
        <div className={cn(
          "grid gap-4 p-4 rounded-[14px] border border-[var(--border)] bg-[var(--bg1)]",
          viewMode === "grid"
            ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
            : "grid-cols-1"
        )}>
          {SKELETON_ITEMS.map((i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <AsyncPanel
          loading={false}
          error={error}
          isEmpty={projects.length === 0}
          emptyIcon={search || status !== "all" ? Search : Layers}
          emptyTitle={search || status !== "all" ? "No projects match these filters" : "Create your first project"}
          emptyDescription={
            search || status !== "all"
              ? "Try a different search term or clear the status filter."
              : "A project groups environments, ingestion keys, members, and alert routing for one application. Get started by creating your first project."
          }
          emptyAction={
            search || status !== "all" ? (
              <UiButton
                variant="outline"
                size="lg"
                onClick={() => {
                  setSearch("");
                  setStatus("all");
                  // Reset uncontrolled input value via ref
                  if (searchInputRef.current) searchInputRef.current.value = "";
                }}
              >
                Clear filters
              </UiButton>
            ) : (
              <UiButton size="lg" onClick={() => navigate("/projects/new")}>
                <Plus className="mr-1.5 size-4" /> New project
              </UiButton>
            )
          }
          bodyClassName="p-0"
        >
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-4">
              {projects.map((project) => (
                <ProjectListRow key={project.id} project={project} />
              ))}
            </div>
          )}
        </AsyncPanel>
      )}

      {archived > 0 && status === "all" && (
        <p className="flex items-center gap-1.5 text-[12px] text-[var(--text3)]">
          <Archive className="size-3.5" aria-hidden="true" />
          Archived projects stop ingesting but keep their data until retention expires.
        </p>
      )}
    </div>
  );
}
