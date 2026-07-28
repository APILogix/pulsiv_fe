import { Link, useLocation } from "react-router";
import { ChevronRight, FolderOpen } from "lucide-react";

import { useProject, useProjects } from "@/modules/projects/hooks/useProjects";
import {
  PROJECT_NAV,
  resolveActiveProjectNav,
} from "@/modules/projects/navigation/project-nav";
import { useProjectNavStore } from "@/stores/projectNavStore";
import { cn } from "@/lib/utils";

/**
 * "Active project" section of the workspace sidebar.
 *
 * Project navigation has no sidebar of its own — it is a section *inside* the
 * workspace flyout, directly under "All projects". Two permanent sidebars only:
 * the global icon rail and this contextual panel.
 *
 * Renders nothing unless the current URL is inside a project, so switching to
 * a non-project surface collapses the section away automatically.
 */
export function ActiveProjectNav({ projectId }: { projectId: string }) {
  const location = useLocation();
  const { data: project } = useProject(projectId);
  const { collapsedGroups, toggleGroup } = useProjectNavStore();

  const active = resolveActiveProjectNav(location.pathname, projectId);

  return (
    <section aria-label="Active project navigation" className="mt-1 flex flex-col">
      {/* section divider + eyebrow */}
      <div className="mx-1 mb-2 mt-1 h-px bg-[var(--border)]" aria-hidden="true" />
      <p className="px-3 pb-1 font-[family-name:var(--mono)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)]">
        Active project
      </p>

      {/* project identity — click returns to the project's landing page */}
      <Link
        to={`/projects/${projectId}/overview`}
        className={cn(
          "mx-1 mb-1 flex items-center gap-2 rounded-[6px] px-2 py-1.5 transition-colors",
          "hover:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        )}
        title={project?.name}
      >
        <span
          aria-hidden="true"
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-[5px] bg-[var(--brand-bg)] text-[var(--brand)] ring-1 ring-inset ring-[var(--brand)]/25"
        >
          <FolderOpen className="size-3" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold leading-tight text-[var(--text)]">
            {project?.name ?? "Loading…"}
          </span>
          {project?.slug && (
            <span className="block truncate font-[family-name:var(--mono)] text-[10px] leading-tight text-[var(--text3)]">
              {project.slug}
            </span>
          )}
        </span>
      </Link>

      {/* grouped project pages */}
      <div className="flex flex-col">
        {PROJECT_NAV.map((group) => {
          const isCollapsed = collapsedGroups.includes(group.id);
          const groupIsActive = active?.groupId === group.id;
          const panelId = `workspace-project-nav-${group.id}`;

          return (
            <div key={group.id} className="flex flex-col">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={!isCollapsed}
                aria-controls={panelId}
                className={cn(
                  "mx-1 flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-left transition-colors",
                  "hover:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                )}
              >
                <ChevronRight
                  className={cn(
                    "size-3 shrink-0 text-[var(--text3)] transition-transform duration-150",
                    !isCollapsed && "rotate-90",
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-[11.5px] font-medium",
                    groupIsActive ? "text-[var(--text)]" : "text-[var(--text2)]",
                  )}
                >
                  {group.label}
                </span>
                {isCollapsed && groupIsActive && (
                  <span
                    aria-hidden="true"
                    className="ml-auto size-1.5 rounded-full bg-[var(--brand)]"
                    title="Current page is in this group"
                  />
                )}
              </button>

              <ul
                id={panelId}
                hidden={isCollapsed}
                className={cn(
                  // The class has to carry the collapse too: an author
                  // display:flex rule outranks the UA [hidden] rule.
                  "ml-[17px] mr-1 flex-col gap-px border-l border-[var(--border)] pb-1 pl-1.5",
                  isCollapsed ? "hidden" : "flex",
                )}
              >
                {group.items.map((item) => {
                  const isActive = groupIsActive && active?.segment === item.segment;
                  return (
                    <li key={item.segment}>
                      <Link
                        to={`/projects/${projectId}/${item.segment}`}
                        aria-current={isActive ? "page" : undefined}
                        title={item.description}
                        className={cn(
                          "relative flex h-[30px] items-center gap-2 rounded-[6px] px-2 text-[12.5px] transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                          isActive
                            ? "bg-[var(--bg2)] font-medium text-[var(--brand)]"
                            : "text-[var(--text3)] hover:bg-[var(--bg2)] hover:text-[var(--text2)]",
                        )}
                      >
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="absolute -left-[7px] top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-[var(--brand)]"
                          />
                        )}
                        <item.icon
                          className={cn(
                            "size-[13px] shrink-0 stroke-[1.6]",
                            isActive ? "text-[var(--brand)]" : "text-[var(--text3)]",
                          )}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** `/projects/<id>/...` → id, or null when the URL is not inside a project. */
export function activeProjectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([a-zA-Z0-9_-]+)(?:\/|$)/);
  if (!match) return null;
  const candidate = match[1];
  // `/projects/new` is the create wizard, not a project id.
  return candidate === "new" ? null : candidate;
}

// ── project list (no project selected) ───────────────────────

const PROJECT_LIST_LIMIT = 8;

const STATUS_DOT: Record<string, string> = {
  active: "bg-[var(--green)]",
  paused: "bg-[var(--amber)]",
  archived: "bg-[var(--text3)]",
};

/**
 * Recent projects, listed directly under "All projects" while no project is
 * open. Selecting one swaps this list for the `ActiveProjectNav` section — the
 * flyout never grows a second column.
 */
export function WorkspaceProjectList() {
  const { data, isLoading } = useProjects({
    limit: PROJECT_LIST_LIMIT,
    sortBy: "updated_at",
    sortOrder: "desc",
  });
  const projects = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="ml-[17px] mr-1 flex flex-col gap-1 border-l border-[var(--border)] pl-1.5">
        {[0, 1, 2].map((row) => (
          <span key={row} className="h-[30px] animate-pulse rounded-[6px] bg-[var(--bg2)]" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) return null;

  return (
    <ul
      aria-label="Recent projects"
      className="ml-[17px] mr-1 flex flex-col gap-px border-l border-[var(--border)] pb-1 pl-1.5"
    >
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            to={`/projects/${project.id}/overview`}
            title={project.name}
            className="flex h-[30px] items-center gap-2 rounded-[6px] px-2 text-[12.5px] text-[var(--text3)] transition-colors hover:bg-[var(--bg2)] hover:text-[var(--text2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <span
              aria-hidden="true"
              className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[project.status])}
            />
            <span className="truncate">{project.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
