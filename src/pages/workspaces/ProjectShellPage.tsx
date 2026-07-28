import { createContext, useContext, useState } from "react";
import { Link, Navigate, Outlet, useParams } from "react-router";
import { FolderOpen, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { useProject } from "@/modules/projects/hooks/useProjects";
import type { Project, ProjectStatus } from "@/modules/projects/api/types";
import { ProjectHeaderBar } from "@/modules/projects/components/ProjectHeaderBar";
import { ProjectSidebar } from "@/modules/projects/components/ProjectSidebar";
import { DetailSkeleton } from "@/shared/observe";
import { IconChip, type SurfaceTone } from "@/shared/ui/pulse";
import { cn } from "@/lib/utils";

// ── project context ──────────────────────────────────────────

interface ProjectContextValue {
  project: Project;
  projectId: string;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useCurrentProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useCurrentProject must be used within ProjectShellPage");
  return ctx;
}

// ── module-level constants (rules.md) ────────────────────────

export const PROJECT_STATUS_TONE: Record<ProjectStatus, SurfaceTone> = {
  active: "green",
  paused: "amber",
  archived: "neutral",
};

// ── shell ────────────────────────────────────────────────────

/**
 * Project shell with split-pane layout.
 *
 * Desktop: sticky sidebar nav + scrollable content area.
 * Mobile: collapsible sidebar drawer + full-width content.
 */
export function ProjectShellPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const safeProjectId = projectId ?? "";
  const { data: project, isLoading, error } = useProject(safeProjectId);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!projectId) return <Navigate to="/projects" replace />;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="w-full max-w-2xl px-6 py-12">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-[var(--red)]/10 blur-xl" />
          <IconChip icon={FolderOpen} tone="red" size="lg" />
        </div>
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--text)]">
          Project not found
        </h2>
        <p className="max-w-[46ch] text-[14px] leading-relaxed text-[var(--text2)]">
          This project does not exist, was deleted, or your account does not have access to it.
        </p>
        <Link
          to="/projects"
          className="mt-2 inline-flex h-10 items-center gap-2 rounded-[10px] bg-[var(--brand)] px-5 text-[13px] font-medium text-white transition-all hover:opacity-90"
        >
          Back to all projects
        </Link>
      </div>
    );
  }

  return (
    <ProjectContext.Provider value={{ project, projectId: safeProjectId }}>
      <div className="flex h-full min-h-0 w-full overflow-hidden bg-[var(--bg)]">
        {/* ── sidebar navigation ── */}
        <aside
          className={cn(
            "hidden h-full shrink-0 border-r border-[var(--border)] transition-[width] duration-200 lg:block",
            sidebarCollapsed ? "w-[52px]" : "w-[240px]",
          )}
        >
          <ProjectSidebar
            project={project}
            collapsed={sidebarCollapsed}
            showRailToggle={false}
          />
          {/* custom collapse toggle at sidebar bottom */}
          <div className="absolute bottom-0 left-0 border-t border-[var(--border)] p-2" style={{ width: sidebarCollapsed ? 52 : 240 }}>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
              className={cn(
                "flex h-8 w-full items-center gap-2 rounded-[7px] px-2 text-[12px] text-[var(--text3)] transition-colors",
                "hover:bg-[var(--bg2)] hover:text-[var(--text2)]",
                sidebarCollapsed && "justify-center",
              )}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="size-4" aria-hidden="true" />
              ) : (
                <>
                  <PanelLeftClose className="size-4" aria-hidden="true" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* ── main content ── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <ProjectHeaderBar project={project} />
          <main className="sidebar-scroll min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ProjectContext.Provider>
  );
}

export default ProjectShellPage;
