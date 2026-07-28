import { Link, useLocation } from "react-router";
import {
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

import { useProjectMutations } from "@/modules/projects/hooks/useProjects";
import { useEnvironmentScope } from "@/modules/projects/hooks/useEnvironmentScope";
import type { Project, ProjectStatus } from "@/modules/projects/api/types";
import { resolveActiveProjectNav, projectNavCrumb } from "@/modules/projects/navigation/project-nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button as UiButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md) ────────────────────────

const STATUS_CONFIG: Record<ProjectStatus, { class: string; dot: string; label: string }> = {
  active: {
    class: "bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20",
    dot: "bg-[var(--green)]",
    label: "Live",
  },
  paused: {
    class: "bg-[var(--amber)]/10 text-[var(--amber)] border-[var(--amber)]/20",
    dot: "bg-[var(--amber)]",
    label: "Paused",
  },
  archived: {
    class: "bg-[var(--bg2)] text-[var(--text3)] border-[var(--border)]",
    dot: "bg-[var(--text3)]",
    label: "Archived",
  },
};

// ── environment selector ─────────────────────────────────────

function EnvironmentSelector({ projectId }: { projectId: string }) {
  const { environments, environment, isLoading, select } = useEnvironmentScope(projectId);

  if (isLoading) {
    return <span className="h-7 w-24 animate-pulse rounded-full bg-[var(--bg2)]" aria-hidden="true" />;
  }

  if (environments.length === 0) {
    return (
      <Link
        to={`/projects/${projectId}/environments`}
        className="inline-flex h-7 items-center gap-1.5 rounded-full border border-dashed border-[var(--border2)] px-3 text-[11.5px] text-[var(--text3)] transition-all hover:border-[var(--brand)]/40 hover:text-[var(--brand)]"
      >
        <Layers className="size-3" aria-hidden="true" />
        Add env
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-7 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg1)]/80 px-3 backdrop-blur-sm transition-all hover:border-[var(--border2)] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        aria-label={`Environment: ${environment?.name ?? "none"}`}
      >
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full ring-1 ring-white/20"
          style={{ background: environment?.color ?? "var(--text3)" }}
        />
        <span className="max-w-[100px] truncate text-[11.5px] font-medium text-[var(--text)]">
          {environment?.name}
        </span>
        <ChevronDown className="size-3 text-[var(--text3)]" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text3)]">
          Environment scope
        </DropdownMenuLabel>
        {environments.map((candidate) => (
          <DropdownMenuItem key={candidate.id} onSelect={() => select(candidate.id)} className="gap-2">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/5"
              style={{ background: candidate.color }}
            />
            <span className="min-w-0 flex-1 truncate text-[13px]">{candidate.name}</span>
            {candidate.isDefault && (
              <span className="rounded-full bg-[var(--bg2)] px-1.5 py-px text-[9px] font-bold uppercase text-[var(--text3)]">
                default
              </span>
            )}
            {candidate.id === environment?.id && (
              <Check className="size-3.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={`/projects/${projectId}/environments`} className="text-[12.5px]">
            Manage environments
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── lifecycle menu ───────────────────────────────────────────

function LifecycleMenu({ project }: { project: Project }) {
  const { transition } = useProjectMutations(project.id);
  const busy = transition.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <UiButton variant="ghost" size="icon-sm" aria-label="Project actions" disabled={busy}>
          <MoreHorizontal className="size-4" />
        </UiButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {project.status === "active" && (
          <DropdownMenuItem onSelect={() => transition.mutate({ id: project.id, action: "pause" })}>
            <Pause className="mr-2 size-4 text-[var(--amber)]" /> Pause ingestion
          </DropdownMenuItem>
        )}
        {project.status === "paused" && (
          <DropdownMenuItem onSelect={() => transition.mutate({ id: project.id, action: "resume" })}>
            <Play className="mr-2 size-4 text-[var(--green)]" /> Resume ingestion
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {project.status === "archived" ? (
          <DropdownMenuItem onSelect={() => transition.mutate({ id: project.id, action: "unarchive" })}>
            <RotateCcw className="mr-2 size-4" /> Unarchive project
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => transition.mutate({ id: project.id, action: "archive" })}>
            <Archive className="mr-2 size-4 text-[var(--red)]" /> Archive project
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => transition.mutate({ id: project.id, action: "restore" })}>
          <RotateCcw className="mr-2 size-4" /> Restore soft-deleted
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── header bar ───────────────────────────────────────────────

export function ProjectHeaderBar({ project }: { project: Project }) {
  const location = useLocation();
  const active = resolveActiveProjectNav(location.pathname, project.id);
  const crumb = active ? projectNavCrumb(active.segment) : null;
  const statusCfg = STATUS_CONFIG[project.status];

  return (
    <header className="sticky top-0 z-20 flex h-[52px] shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg1)]/80 px-4 backdrop-blur-md sm:px-6">
      {/* breadcrumb trail */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1 text-[13px]">
        <Link
          to="/projects"
          className="hidden shrink-0 text-[var(--text3)] transition-colors hover:text-[var(--text)] sm:inline"
        >
          Projects
        </Link>
        <ChevronRight className="hidden size-3 text-[var(--text3)]/50 sm:inline" aria-hidden="true" />
        <Link
          to={`/projects/${project.id}/overview`}
          className="min-w-0 shrink truncate font-semibold text-[var(--text)] transition-colors hover:text-[var(--brand)]"
        >
          {project.name}
        </Link>
        {crumb && (
          <>
            <ChevronRight className="size-3 text-[var(--text3)]/50" aria-hidden="true" />
            <span className="shrink-0 text-[var(--text2)]" aria-current="page">
              {crumb.page}
            </span>
          </>
        )}
      </nav>

      {/* right side controls */}
      <div className="flex shrink-0 items-center gap-2">
        {/* status badge */}
        <span
          className={cn(
            "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide sm:inline-flex",
            statusCfg.class,
          )}
        >
          <span className={cn("size-1.5 rounded-full", statusCfg.dot)} aria-hidden="true" />
          {statusCfg.label}
        </span>

        {/* timezone */}
        <span className="hidden items-center gap-1 text-[11px] text-[var(--text3)] xl:inline-flex">
          <Clock className="size-3" aria-hidden="true" />
          {project.timezone}
        </span>

        <EnvironmentSelector projectId={project.id} />
        <LifecycleMenu project={project} />
      </div>
    </header>
  );
}
