import { createContext, useContext } from "react";
import { Link, Navigate, Outlet, useParams } from "react-router";
import { FolderOpen } from "lucide-react";

import { useProject } from "@/modules/projects/hooks/useProjects";
import type { Project, ProjectStatus } from "@/modules/projects/api/types";
import { ProjectHeaderBar } from "@/modules/projects/components/ProjectHeaderBar";
import { DetailSkeleton } from "@/shared/observe";
import { IconChip, type SurfaceTone } from "@/shared/ui/pulse";

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

// ── module-level constants (rules.md §1.2) ───────────────────

export const PROJECT_STATUS_TONE: Record<ProjectStatus, SurfaceTone> = {
  active: "green",
  paused: "amber",
  archived: "neutral",
};

// ── shell ────────────────────────────────────────────────────

/**
 * Project shell — chrome only, no navigation.
 *
 * The app has exactly two sidebars: the global icon rail and the contextual
 * workspace flyout. Project pages are navigated from the flyout's "Active
 * project" section, so this shell owns only the context bar (breadcrumb,
 * status, environment scope, lifecycle actions) and the content area.
 */
export function ProjectShellPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const safeProjectId = projectId ?? "";
  const { data: project, isLoading, error } = useProject(safeProjectId);

  if (!projectId) return <Navigate to="/projects" replace />;

  if (isLoading) {
    return (
      <div className="sidebar-scroll h-full w-full overflow-y-auto">
        <div className="px-6 py-6">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <IconChip icon={FolderOpen} tone="red" size="lg" />
        <h2 className="text-[17px] font-semibold text-[var(--text)]">Project not found</h2>
        <p className="max-w-[46ch] text-[13px] text-[var(--text2)]">
          This project does not exist, was deleted, or your account does not have access to it.
        </p>
        <Link
          to="/projects"
          className="mt-1 text-[13px] font-medium text-[var(--brand)] hover:underline"
        >
          Back to all projects
        </Link>
      </div>
    );
  }

  return (
    <ProjectContext.Provider value={{ project, projectId: safeProjectId }}>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--bg)]">
        <ProjectHeaderBar project={project} />
        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <Outlet />
        </div>
      </div>
    </ProjectContext.Provider>
  );
}

export default ProjectShellPage;
