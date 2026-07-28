import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Archive,
  ArrowUpRight,
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
  Sparkles,
  Zap,
} from "lucide-react";
import { useProjects } from "@/modules/projects/hooks/useProjects";
import type { ListProjectsQuery, ProjectListItem, ProjectStatus } from "@/modules/projects/api/types";
import {
  IconChip,
  Pill,
  SegmentedControl,
  Toolbar,
  fieldInputClass,
  type SegmentOption,
} from "@/shared/ui/pulse";
import { Timestamp, formatCompact } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { PROJECT_STATUS_TONE } from "./ProjectShellPage";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md) ────────────────────────

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
  { value: "updated_at", label: "Updated" },
  { value: "name", label: "Name" },
];

// ── stat counter (animated feel) ─────────────────────────────

function StatCounter({ value, label, tone, icon: Icon }: {
  value: number | string;
  label: string;
  tone: string;
  icon: typeof Package;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div className={cn("inline-flex size-10 items-center justify-center rounded-xl", tone)}>
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <span className="font-[family-name:var(--display)] text-[28px] font-bold tabular-nums leading-none tracking-tight text-[var(--text)]">
        {value}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text3)]">{label}</span>
    </div>
  );
}

// ── project card (glassmorphism) ─────────────────────────────

function ProjectCard({ project }: { project: ProjectListItem }) {
  return (
    <Link
      to={`/projects/${project.id}/overview`}
      className="group relative flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg1)]/70 p-5 backdrop-blur-sm transition-all duration-200 hover:border-[var(--brand)]/30 hover:shadow-lg hover:shadow-[var(--brand)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      {/* colored left accent bar */}
      <span
        className="absolute left-0 top-4 h-8 w-[3px] rounded-r-full transition-all duration-200 group-hover:h-12"
        style={{ background: project.status === "active" ? "var(--green)" : project.status === "paused" ? "var(--amber)" : "var(--text3)" }}
        aria-hidden="true"
      />

      {/* header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="relative shrink-0">
            <IconChip icon={FolderOpen} tone="brand" />
            {project.status === "active" && (
              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-[var(--green)] ring-2 ring-[var(--bg1)]" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[var(--text)] transition-colors group-hover:text-[var(--brand)]">
              {project.name}
            </p>
            <code className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">{project.slug}</code>
          </div>
        </div>
        <Pill tone={PROJECT_STATUS_TONE[project.status]} dot>
          {project.status}
        </Pill>
      </div>

      {/* description */}
      <p className="line-clamp-2 text-[12.5px] leading-relaxed text-[var(--text2)]">
        {project.description || "No description provided."}
      </p>

      {/* tags */}
      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-[var(--brand)]/5 px-2 py-0.5 text-[10.5px] font-medium text-[var(--brand)] ring-1 ring-inset ring-[var(--brand)]/10"
            >
              {tag}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="text-[10.5px] text-[var(--text3)]">+{project.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* stats row */}
      <div className="flex items-center gap-4 border-t border-[var(--border)] pt-3">
        <div className="flex items-center gap-1.5">
          <KeyRound className="size-3 text-[var(--text3)]" aria-hidden="true" />
          <span className="text-[12px] font-semibold tabular-nums text-[var(--text)]">{project.apiKeysCount}</span>
          <span className="text-[11px] text-[var(--text3)]">keys</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="size-3 text-[var(--green)]" aria-hidden="true" />
          <span className="text-[12px] font-semibold tabular-nums text-[var(--green)]">{project.activeApiKeysCount}</span>
          <span className="text-[11px] text-[var(--text3)]">active</span>
        </div>
        <span className="ml-auto text-[11px] capitalize text-[var(--text3)]">{project.visibility}</span>
      </div>

      {/* footer */}
      <div className="flex items-center justify-between text-[11px] text-[var(--text3)]">
        <span>
          Created <Timestamp value={project.createdAt} />
        </span>
        <ArrowUpRight className="size-3.5 text-[var(--text3)] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
      </div>
    </Link>
  );
}

// ── compact list row ─────────────────────────────────────────

function ProjectRow({ project }: { project: ProjectListItem }) {
  return (
    <Link
      to={`/projects/${project.id}/overview`}
      className="group flex items-center gap-4 rounded-xl border border-transparent px-4 py-3 transition-all hover:border-[var(--border)] hover:bg-[var(--bg1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ background: project.status === "active" ? "var(--green)" : project.status === "paused" ? "var(--amber)" : "var(--text3)" }}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <span className="truncate text-[13.5px] font-semibold text-[var(--text)] group-hover:text-[var(--brand)]">
          {project.name}
        </span>
      </div>
      <code className="hidden font-[family-name:var(--mono)] text-[11px] text-[var(--text3)] sm:inline">
        {project.slug}
      </code>
      <div className="hidden items-center gap-3 sm:flex">
        <span className="w-16 text-right text-[12px] tabular-nums text-[var(--text2)]">{project.apiKeysCount} keys</span>
        <span className="w-20 text-[11px] capitalize text-[var(--text3)]">{project.visibility}</span>
      </div>
      <span className="hidden text-[11px] text-[var(--text3)] md:inline">
        <Timestamp value={project.createdAt} />
      </span>
      <Pill tone={PROJECT_STATUS_TONE[project.status]} className="text-[10px]">
        {project.status}
      </Pill>
    </Link>
  );
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<"created_at" | "updated_at" | "name">("created_at");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("grid");

  const query: ListProjectsQuery = {
    ...(status !== "all" ? { status } : {}),
    ...(search ? { search } : {}),
    sortBy,
    sortOrder: sortBy === "name" ? "asc" : "desc",
    limit: 100,
  };

  const { data, isLoading, error } = useProjects(query);
  const projects = data?.data ?? [];

  const active = projects.filter((p) => p.status === "active").length;
  const paused = projects.filter((p) => p.status === "paused").length;
  const archived = projects.filter((p) => p.status === "archived").length;
  const activeKeys = projects.reduce((sum, p) => sum + p.activeApiKeysCount, 0);

  return (
    <div className="flex flex-col gap-8">
      {/* ── gradient mesh hero section ── */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg1)]">
        {/* mesh gradient background */}
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
          <div className="absolute -left-1/4 -top-1/4 size-[600px] rounded-full bg-[var(--brand)]/20 blur-[120px]" />
          <div className="absolute -bottom-1/4 -right-1/4 size-[400px] rounded-full bg-[var(--ai)]/15 blur-[100px]" />
          <div className="absolute left-1/2 top-1/3 size-[300px] rounded-full bg-[var(--green)]/10 blur-[80px]" />
        </div>

        <div className="relative z-10 flex flex-col gap-8 p-8 sm:p-10">
          {/* hero header */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[var(--brand)]" aria-hidden="true" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">
                  Workspace
                </span>
              </div>
              <h1 className="font-[family-name:var(--display)] text-[36px] font-bold leading-tight tracking-[-0.03em] text-[var(--text)]">
                Projects
              </h1>
              <p className="max-w-[52ch] text-[14px] leading-relaxed text-[var(--text2)]">
                Manage your organization projects, ingestion keys, environments, and alert routing from one place.
              </p>
            </div>
            <UiButton size="lg" onClick={() => navigate("/projects/new")} className="shrink-0">
              <Plus className="mr-1.5 size-4" /> New project
            </UiButton>
          </div>

          {/* stat counters in a row */}
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <StatCounter
              value={data?.total ?? projects.length}
              label="Total"
              tone="bg-[var(--brand)]/10 text-[var(--brand)]"
              icon={Package}
            />
            <StatCounter
              value={active}
              label="Active"
              tone="bg-[var(--green)]/10 text-[var(--green)]"
              icon={ShieldCheck}
            />
            <StatCounter
              value={paused}
              label="Paused"
              tone="bg-[var(--amber)]/10 text-[var(--amber)]"
              icon={Pause}
            />
            <StatCounter
              value={formatCompact(activeKeys)}
              label="Live keys"
              tone="bg-[var(--ai)]/10 text-[var(--ai)]"
              icon={KeyRound}
            />
          </div>
        </div>
      </section>

      {/* ── toolbar with real-time search ── */}
      <Toolbar
        trailing={
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] tabular-nums text-[var(--text3)]">
              {projects.length} project{projects.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center rounded-lg border border-[var(--border)] p-0.5">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  view === "grid" ? "bg-[var(--bg3)] text-[var(--text)]" : "text-[var(--text3)] hover:text-[var(--text2)]",
                )}
                aria-label="Grid view"
              >
                <Grid3X3 className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  view === "list" ? "bg-[var(--bg3)] text-[var(--text)]" : "text-[var(--text3)] hover:text-[var(--text2)]",
                )}
                aria-label="List view"
              >
                <List className="size-3.5" />
              </button>
            </div>
          </div>
        }
      >
        <div className="relative min-w-[200px] flex-1 sm:max-w-[280px]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text3)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
      </Toolbar>

      {/* ── content area ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[220px] animate-pulse rounded-2xl bg-[var(--bg1)] ring-1 ring-[var(--border)]" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--red)]/20 bg-[var(--red)]/5 py-12 text-center">
          <IconChip icon={Layers} tone="red" size="lg" />
          <p className="text-[14px] font-medium text-[var(--text)]">Could not load projects</p>
          <p className="text-[13px] text-[var(--text2)]">{(error as Error)?.message ?? "Unexpected error"}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-dashed border-[var(--border)] py-20 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[var(--brand)]/10 blur-xl" aria-hidden="true" />
            <div className="relative inline-flex size-16 items-center justify-center rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)]">
              {search || status !== "all" ? (
                <Search className="size-7" />
              ) : (
                <Package className="size-7" />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-[18px] font-semibold text-[var(--text)]">
              {search || status !== "all" ? "No matches found" : "Create your first project"}
            </h3>
            <p className="max-w-[44ch] text-[14px] text-[var(--text2)]">
              {search || status !== "all"
                ? "Try adjusting your search or clearing the filters."
                : "Projects group environments, API keys, members, and alert routing for your applications."}
            </p>
          </div>
          {search || status !== "all" ? (
            <UiButton
              variant="outline"
              size="lg"
              onClick={() => { setSearch(""); setStatus("all"); }}
            >
              Clear filters
            </UiButton>
          ) : (
            <UiButton size="lg" onClick={() => navigate("/projects/new")}>
              <Plus className="mr-1.5 size-4" /> New project
            </UiButton>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1 rounded-2xl border border-[var(--border)] bg-[var(--bg1)] p-2">
          {projects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* ── footer note ── */}
      {archived > 0 && status === "all" && (
        <p className="flex items-center gap-2 text-[12px] text-[var(--text3)]">
          <Archive className="size-3.5" aria-hidden="true" />
          {archived} archived project{archived !== 1 ? "s" : ""} stop ingesting but retain data until expiry.
        </p>
      )}
    </div>
  );
}
