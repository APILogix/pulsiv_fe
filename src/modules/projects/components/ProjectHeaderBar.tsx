import { Link, useLocation } from "react-router";
import {
  Archive,
  Check,
  ChevronDown,
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
import { projectPath } from "@/modules/projects/navigation/project-routes";
import { useOrgStore } from "@/modules/organizations/store/org.store";
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

// ── module-level constants (rules.md §1.2) ───────────────────

const STATUS_STYLE: Record<ProjectStatus, string> = {
  active: "bg-[var(--green-bg)] text-[var(--green)] ring-[var(--green)]/25",
  paused: "bg-[var(--amber-bg)] text-[var(--amber)] ring-[var(--amber)]/25",
  archived: "bg-[var(--bg2)] text-[var(--text2)] ring-[var(--border)]",
};

// ── environment selector ─────────────────────────────────────
// The environment is a scope over every project page, so it lives here and
// never in the navigation tree.

function EnvironmentSelector({ projectId, publicId, orgSlug }: { projectId: string; publicId: string; orgSlug: string }) {
  const { environments, environment, isLoading, select } = useEnvironmentScope(projectId);

  if (isLoading) {
    return <span className="h-7 w-[104px] animate-pulse rounded-[7px] bg-[var(--bg2)]" aria-hidden="true" />;
  }

  if (environments.length === 0) {
    return (
      <Link
        to={projectPath(orgSlug, publicId, "environments")}
        className="inline-flex h-7 items-center gap-1.5 rounded-[7px] border border-dashed border-[var(--border2)] px-2 text-[12px] text-[var(--text3)] transition-colors hover:text-[var(--text2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <Layers className="size-3.5" aria-hidden="true" />
        Add environment
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-7 items-center gap-2 rounded-[7px] border border-[var(--border)] bg-[var(--bg2)]/70 px-2 transition-colors hover:border-[var(--border2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        aria-label={`Environment: ${environment?.name ?? "none"}. Change environment`}
      >
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ background: environment?.color ?? "var(--text3)" }}
        />
        <span className="max-w-[120px] truncate text-[12px] font-medium text-[var(--text)]">
          {environment?.name}
        </span>
        <ChevronDown className="size-3 shrink-0 text-[var(--text3)]" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        <DropdownMenuLabel className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)]">
          Environment
        </DropdownMenuLabel>
        {environments.map((candidate) => (
          <DropdownMenuItem key={candidate.id} onSelect={() => select(candidate.id)} className="gap-2">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ background: candidate.color }}
            />
            <span className="min-w-0 flex-1 truncate text-[13px]">{candidate.name}</span>
            {candidate.isDefault && (
              <span className="font-[family-name:var(--mono)] text-[10px] uppercase text-[var(--text3)]">
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
          <Link to={projectPath(orgSlug, publicId, "environments")} className="text-[13px]">
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

// ── header ───────────────────────────────────────────────────

export function ProjectHeaderBar({ project }: { project: Project }) {
  const location = useLocation();
  const activeOrgSlug = useOrgStore((state) => state.activeOrgSlug) ?? "legacy";
  const active = resolveActiveProjectNav(location.pathname, project.publicId, activeOrgSlug);
  const crumb = active ? projectNavCrumb(active.segment) : null;

  return (
    <header className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--bg1)] px-3 sm:px-4">
      {/* breadcrumb + identity */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-[12.5px]">
        <Link
          to={activeOrgSlug !== "legacy" ? `/${activeOrgSlug}/projects` : "/projects"}
          className="hidden shrink-0 rounded-sm text-[var(--text3)] transition-colors hover:text-[var(--text2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:inline"
        >
          Projects
        </Link>
        <span aria-hidden="true" className="hidden text-[var(--text3)]/60 sm:inline">
          /
        </span>
        <Link
          to={projectPath(activeOrgSlug, project.publicId, "overview")}
          className="min-w-0 shrink truncate rounded-sm text-[13px] font-semibold text-[var(--text)] transition-colors hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {project.name}
        </Link>
        {crumb && (
          <>
            <span aria-hidden="true" className="hidden text-[var(--text3)]/60 md:inline">
              /
            </span>
            <span className="hidden shrink-0 text-[var(--text3)] md:inline">{crumb.group}</span>
            <span aria-hidden="true" className="text-[var(--text3)]/60">
              /
            </span>
            <span className="shrink-0 truncate text-[var(--text2)]" aria-current="page">
              {crumb.page}
            </span>
          </>
        )}
      </nav>

      {/* scope + state + actions */}
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            "hidden items-center gap-1.5 rounded-full px-2 py-[3px] font-[family-name:var(--mono)] text-[10px] font-semibold uppercase tracking-[0.08em] ring-1 ring-inset sm:inline-flex",
            STATUS_STYLE[project.status],
          )}
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
          {project.status}
        </span>

        <span className="hidden items-center gap-1 font-[family-name:var(--mono)] text-[11px] text-[var(--text3)] xl:inline-flex">
          <Clock className="size-3" aria-hidden="true" />
          {project.timezone}
        </span>

        <EnvironmentSelector projectId={project.id} publicId={project.publicId} orgSlug={activeOrgSlug} />

        <LifecycleMenu project={project} />
      </div>
    </header>
  );
}
