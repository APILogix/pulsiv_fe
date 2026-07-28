import { useNavigate } from "react-router";
import { Check, ChevronsUpDown, FolderOpen, Plus } from "lucide-react";

import { useProjects } from "@/modules/projects/hooks/useProjects";
import type { Project } from "@/modules/projects/api/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<Project["status"], string> = {
  active: "bg-[var(--green)]",
  paused: "bg-[var(--amber)]",
  archived: "bg-[var(--text3)]",
};

/**
 * Current-project affordance at the top of the project sidebar.
 *
 * Answers "which project am I in?" and "how do I leave?" in one control, which
 * is what removes the need for a project row inside the global flyout.
 */
export function ProjectSwitcher({
  project,
  collapsed = false,
}: {
  project: Project;
  collapsed?: boolean;
}) {
  const navigate = useNavigate();
  const { data } = useProjects({ limit: 100, sortBy: "updated_at", sortOrder: "desc" });
  const projects = data?.data ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)]/60 text-left transition-colors",
          "hover:border-[var(--border2)] hover:bg-[var(--bg2)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          collapsed ? "justify-center p-2" : "px-2.5 py-2",
        )}
        aria-label={`Current project: ${project.name}. Switch project`}
        title={collapsed ? project.name : undefined}
      >
        <span
          aria-hidden="true"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-[var(--brand-bg)] text-[var(--brand)] ring-1 ring-inset ring-[var(--brand)]/25"
        >
          <FolderOpen className="size-3.5" />
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold leading-tight text-[var(--text)]">
                {project.name}
              </span>
              <span className="block truncate font-[family-name:var(--mono)] text-[10.5px] leading-tight text-[var(--text3)]">
                {project.slug}
              </span>
            </span>
            <ChevronsUpDown
              className="size-3.5 shrink-0 text-[var(--text3)] transition-colors group-hover:text-[var(--text2)]"
              aria-hidden="true"
            />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[248px]">
        <DropdownMenuLabel className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)]">
          Switch project
        </DropdownMenuLabel>
        <div className="max-h-[280px] overflow-y-auto">
          {projects.map((candidate) => {
            const isCurrent = candidate.id === project.id;
            return (
              <DropdownMenuItem
                key={candidate.id}
                onSelect={() => navigate(`/projects/${candidate.id}/overview`)}
                className="gap-2"
              >
                <span
                  aria-hidden="true"
                  className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[candidate.status])}
                />
                <span className="min-w-0 flex-1 truncate text-[13px]">{candidate.name}</span>
                {isCurrent && <Check className="size-3.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />}
              </DropdownMenuItem>
            );
          })}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/projects")} className="text-[13px]">
          All projects
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/projects/new")} className="gap-2 text-[13px]">
          <Plus className="size-3.5" aria-hidden="true" /> New project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
