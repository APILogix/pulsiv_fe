import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link, useLocation } from "react-router";
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import type { Project } from "@/modules/projects/api/types";
import {
  PROJECT_NAV,
  resolveActiveProjectNav,
} from "@/modules/projects/navigation/project-nav";
import { useProjectNavStore } from "@/stores/projectNavStore";
import { cn } from "@/lib/utils";

import { useOrgStore } from "@/modules/organizations/store/org.store";
import { projectPath } from "@/modules/projects/navigation/project-routes";
import { ProjectSwitcher } from "./ProjectSwitcher";

/**
 * The project's only navigation surface.
 *
 * Grouped, collapsible, and persisted. Replaces both the horizontal tab strip
 * that used to live in the project shell and the project rows the global flyout
 * used to inject.
 *
 * Keyboard model: Tab reaches the nav once, then Arrow Up/Down walk the visible
 * rows, Home/End jump to the ends. Group headers participate in the same roving
 * order so a keyboard user can collapse a group without leaving the nav.
 */
export function ProjectSidebar({
  project,
  collapsed = false,
  onNavigate,
  showRailToggle = true,
  className,
}: {
  project: Project;
  collapsed?: boolean;
  /** Called after any nav activation — used to close the mobile drawer. */
  onNavigate?: () => void;
  showRailToggle?: boolean;
  className?: string;
}) {
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const { collapsedGroups, toggleGroup, expandGroup } = useProjectNavStore();
  // Rail collapse is no longer persisted in the shared nav store, so it is
  // local view state seeded from the caller's `collapsed` prop.
  const [railCollapsed, setRailCollapsed] = useState(collapsed);
  const toggleRail = () => setRailCollapsed((current) => !current);

  const activeOrgSlug = useOrgStore((state) => state.activeOrgSlug) ?? "legacy";
  const active = resolveActiveProjectNav(location.pathname, project.publicId, activeOrgSlug);

  // Landing inside a collapsed group (deep link, redirect, command palette)
  // must reveal the row that is now current — otherwise the active state is
  // invisible and the nav looks broken.
  useEffect(() => {
    if (active?.groupId) expandGroup(active.groupId);
  }, [active?.groupId, expandGroup]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;

    const rows = Array.from(
      navRef.current?.querySelectorAll<HTMLElement>("[data-nav-row]") ?? [],
    ).filter((row) => row.offsetParent !== null);
    if (rows.length === 0) return;

    const index = rows.indexOf(document.activeElement as HTMLElement);
    event.preventDefault();

    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? rows.length - 1
          : event.key === "ArrowDown"
            ? (index + 1) % rows.length
            : (index - 1 + rows.length) % rows.length;

    rows[next]?.focus();
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-[var(--bg1)]",
        collapsed ? "items-stretch" : "",
        className,
      )}
    >
      {/* current project ------------------------------------------------ */}
      <div className={cn("shrink-0 border-b border-[var(--border)]", collapsed ? "p-2" : "p-3")}>
        <ProjectSwitcher project={project} collapsed={collapsed} />
      </div>

      {/* navigation ----------------------------------------------------- */}
      <div
        ref={navRef}
        onKeyDown={handleKeyDown}
        className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <nav aria-label="Project navigation" className={cn("flex flex-col", collapsed ? "gap-1 p-2" : "gap-0.5 p-2")}>
          {PROJECT_NAV.map((group, groupIndex) => {
            const isCollapsed = collapsedGroups.includes(group.id);
            const groupIsActive = active?.groupId === group.id;
            const panelId = `project-nav-${group.id}`;

            // Collapsed rail: no group chrome, just a hairline between groups
            // and every destination one click away.
            if (collapsed) {
              return (
                <div key={group.id} className="flex flex-col gap-1">
                  {groupIndex > 0 && (
                    <span aria-hidden="true" className="mx-2 my-1 h-px bg-[var(--border)]" />
                  )}
                  <span className="sr-only">{group.label}</span>
                  {group.items.map((item) => {
                    const isActive = groupIsActive && active?.segment === item.segment;
                    return (
                      <Link
                        key={item.segment}
                        to={projectPath(activeOrgSlug, project.publicId, item.segment)}
                        data-nav-row
                        onClick={onNavigate}
                        aria-current={isActive ? "page" : undefined}
                        aria-label={`${group.label}: ${item.label}`}
                        title={`${group.label} · ${item.label}`}
                        className={cn(
                          "relative flex h-9 items-center justify-center rounded-[7px] transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                          isActive
                            ? "bg-[var(--brand-bg)] text-[var(--brand)]"
                            : "text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]",
                        )}
                      >
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-[var(--brand)]"
                          />
                        )}
                        <item.icon className="size-[15px] stroke-[1.6]" aria-hidden="true" />
                      </Link>
                    );
                  })}
                </div>
              );
            }

            return (
              <div key={group.id} className="flex flex-col">
                <button
                  type="button"
                  data-nav-row
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={!isCollapsed}
                  aria-controls={panelId}
                  className={cn(
                    "group flex h-8 items-center gap-2 rounded-[6px] px-2 text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                    "hover:bg-[var(--bg2)]",
                  )}
                >
                  <ChevronRight
                    className={cn(
                      "size-3 shrink-0 text-[var(--text3)] transition-transform duration-150",
                      !isCollapsed && "rotate-90",
                    )}
                    aria-hidden="true"
                  />
                  <group.icon
                    className={cn(
                      "size-[13px] shrink-0 stroke-[1.6]",
                      groupIsActive ? "text-[var(--brand)]" : "text-[var(--text3)]",
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase tracking-[0.1em]",
                      groupIsActive ? "text-[var(--text2)]" : "text-[var(--text3)]",
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
                    // `hidden` alone is not enough: an author `display:flex`
                    // rule outranks the UA [hidden] rule, so the class has to
                    // carry the collapse too.
                    "relative ml-[15px] flex-col gap-px border-l border-[var(--border)] pl-2 pt-0.5 pb-1.5",
                    isCollapsed ? "hidden" : "flex",
                  )}
                >
                  {group.items.map((item) => {
                    const isActive = groupIsActive && active?.segment === item.segment;
                    return (
                      <li key={item.segment}>
                        <Link
                          to={projectPath(activeOrgSlug, project.publicId, item.segment)}
                          data-nav-row
                          onClick={onNavigate}
                          aria-current={isActive ? "page" : undefined}
                          title={item.description}
                          className={cn(
                            "relative flex h-8 items-center gap-2 rounded-[6px] px-2 text-[13px] transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                            isActive
                              ? "bg-[var(--brand-bg)] font-medium text-[var(--brand)]"
                              : "text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]",
                          )}
                        >
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="absolute -left-[9px] top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[var(--brand)]"
                            />
                          )}
                          <item.icon
                            className={cn(
                              "size-[14px] shrink-0 stroke-[1.6]",
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
        </nav>
      </div>

      {/* rail toggle ---------------------------------------------------- */}
      {showRailToggle && (
        <div className="shrink-0 border-t border-[var(--border)] p-2">
          <button
            type="button"
            onClick={toggleRail}
            aria-label={railCollapsed ? "Expand project navigation" : "Collapse project navigation"}
            title={railCollapsed ? "Expand navigation" : "Collapse navigation"}
            className={cn(
              "flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-[12px] text-[var(--text3)] transition-colors",
              "hover:bg-[var(--bg2)] hover:text-[var(--text2)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
              collapsed && "justify-center px-0",
            )}
          >
            {railCollapsed ? (
              <PanelLeftOpen className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-4 shrink-0" aria-hidden="true" />
            )}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      )}
    </div>
  );
}
