import { Link, useLocation } from "react-router";
import { ChevronRight, FolderOpen } from "lucide-react";

import { useProjectByPublicId, useProjects } from "@/modules/projects/hooks/useProjects";
import {
  PROJECT_NAV,
  resolveActiveProjectNav,
} from "@/modules/projects/navigation/project-nav";
import { projectPath, publicIdFromPath, orgSlugFromPath } from "@/modules/projects/navigation/project-routes";
import { useProjectNavStore } from "@/stores/projectNavStore";
import { useOrgStore } from "@/modules/organizations/store/org.store";
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
export function ActiveProjectNav({ publicId, orgSlug }: { publicId: string; orgSlug: string }) {
  const location = useLocation();
  const { data: project } = useProjectByPublicId(publicId);
  const { collapsedGroups, toggleGroup } = useProjectNavStore();

  const active = resolveActiveProjectNav(location.pathname, publicId, orgSlug);

  return (
    <section aria-label="Active project navigation" className="mt-1 flex flex-col">
      {/* section divider + eyebrow */}
      <div className="mx-1 mb-2 mt-1 h-px bg-[var(--border)]" aria-hidden="true" />
      <p className="px-3 pb-1 font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">
        Active project
      </p>

      {/* project identity — click returns to the project's landing page */}
      <Link
        to={projectPath(orgSlug, publicId, "overview")}
        className={cn(
          "mx-1 mb-1 flex items-center gap-2 rounded-[var(--radius)] px-2 py-1.5 transition-colors duration-150",
          "hover:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)]",
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
                  "w-full flex items-center justify-between px-3 h-[34px] rounded-[var(--radius)] cursor-pointer font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] transition-colors duration-150 hover:bg-[var(--bg2)] hover:text-[var(--text2)]",
                  !isCollapsed ? "text-[var(--text2)]" : "text-[var(--text3)]"
                )}
              >
                <div className="flex items-center gap-2.5">{group.label}</div>
                <ChevronRight
                  size={14}
                  className={cn(
                    "transition-transform duration-200",
                    !isCollapsed && "rotate-90",
                  )}
                  aria-hidden="true"
                />
              </button>

              <ul
                id={panelId}
                hidden={isCollapsed}
                className={cn(
                  "nav-group-children pl-3",
                  !isCollapsed && "open"
                )}
              >
                {group.items.map((item) => {
                  const isActive = groupIsActive && active?.segment === item.segment;
                  return (
                    <li key={item.segment}>
                      <Link
                        to={projectPath(orgSlug, publicId, item.segment)}
                        aria-current={isActive ? "page" : undefined}
                        title={item.description}
                        className={cn(
                          "flex items-center h-[34px] px-3 pl-6 my-0.5 rounded-[var(--radius)] cursor-pointer text-[13px] no-underline relative transition-colors duration-150",
                          isActive
                            ? "text-[var(--brand)] font-medium bg-[var(--brand-bg)]"
                            : "text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]",
                        )}
                      >
                        <div className="absolute left-2 top-0 bottom-0 w-[1px] bg-[var(--border)]" />
                        {item.label}
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

/** Legacy compat for the parent shell — pulls from new URL format or legacy. */
export function activeProjectIdFromPath(pathname: string): { publicId: string; orgSlug: string } | null {
  const publicId = publicIdFromPath(pathname);
  const orgSlug = orgSlugFromPath(pathname);
  if (publicId && orgSlug) return { publicId, orgSlug };
  
  // Legacy fallback for transition period
  const match = pathname.match(/^\/projects\/([a-zA-Z0-9_-]+)(?:\/|$)/);
  if (match && match[1] !== "new") return { publicId: match[1], orgSlug: "legacy" };
  
  return null;
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
  const activeOrgSlug = useOrgStore((state) => state.activeOrgSlug);
  const projects = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="ml-[17px] mr-1 flex flex-col gap-1 border-l border-[var(--border)] pl-1.5">
        {[0, 1, 2].map((row) => (
          <span key={row} className="loading-skeleton h-[30px] rounded-[var(--radius)] bg-[var(--bg2)]" />
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
            to={activeOrgSlug ? projectPath(activeOrgSlug, project.publicId, "overview") : `/projects/${project.id}/overview`}
            title={project.name}
            className="flex h-[30px] items-center gap-2 rounded-[var(--radius)] px-2 text-[12px] text-[var(--text2)] transition-colors duration-150 hover:bg-[var(--bg2)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)]"
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
