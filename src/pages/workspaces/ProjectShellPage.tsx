import { useEffect, createContext, useContext, useRef } from "react";
import { Link, Navigate, Outlet, useParams } from "react-router";
import { FolderOpen } from "lucide-react";

import { useProjectByPublicId } from "@/modules/projects/hooks/useProjects";
import type { Project, ProjectStatus } from "@/modules/projects/api/types";
import { ProjectHeaderBar } from "@/modules/projects/components/ProjectHeaderBar";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { RouteBoundary, useScrollRestoration } from "@/shared/motion";
import { RouteSkeleton } from "@/shared/skeletons";
import { IconChip, type SurfaceTone } from "@/shared/ui/pulse";

// ── project context ──────────────────────────────────────────

interface ProjectContextValue {
  project: Project;
  /** Internal UUID — used for all backend API calls. Never put in the URL. */
  projectId: string;
  /** Public immutable identifier — used in URL routing. */
  publicId: string;
  /** Organization slug — used in URL routing. */
  orgSlug: string;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useCurrentProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useCurrentProject must be used within ProjectShellPage");
  return ctx;
}

export function useOptionalCurrentProject(): ProjectContextValue | null {
  return useContext(ProjectContext);
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
 * Reads `:orgSlug` and `:projectPublicId` from the URL (new format).
 * Resolves the project via its public ID, then exposes the internal UUID
 * via ProjectContext for all child pages. Child pages are unchanged —
 * they continue calling APIs with the UUID.
 *
 * URL format: /:orgSlug/p/:projectPublicId/*
 */
export function ProjectShellPage() {
  const { orgSlug, projectPublicId } = useParams<{ orgSlug: string; projectPublicId: string }>();
  const safePublicId = projectPublicId ?? "";
  const { organizations, isLoading: orgsLoading } = useOrganizations();
  const { activeOrgId, setActiveOrgId, setActiveOrgSlug } = useOrgStore();

  useEffect(() => {
    if (orgSlug && organizations.length > 0) {
      const matchingOrg = organizations.find((o) => o.slug === orgSlug);
      if (matchingOrg && (useOrgStore.getState().activeOrgId !== matchingOrg.id || useOrgStore.getState().activeOrgSlug !== matchingOrg.slug)) {
        setActiveOrgId(matchingOrg.id);
        setActiveOrgSlug(matchingOrg.slug);
      }
    }
  }, [orgSlug, organizations, setActiveOrgId, setActiveOrgSlug]);

  const { data: project, isLoading: projectLoading, error } = useProjectByPublicId(safePublicId);
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollRestoration(scrollRef);

  if (!projectPublicId || !orgSlug) return <Navigate to="/projects" replace />;
  
  // If a UUID sneaks into the URL, bounce to the legacy router to resolve it
  if (safePublicId && !safePublicId.startsWith("prj_")) {
    return <Navigate to={`/projects/${safePublicId}`} replace />;
  }

  const isLoading = orgsLoading || projectLoading || (!activeOrgId && organizations.length === 0);

  if (isLoading) {
    // Shape the wait like the tab being opened, not like a generic detail page:
    // the header bar is still resolving, so the skeleton is all the user has.
    return (
      <div className="sidebar-scroll h-full w-full overflow-y-auto">
        <div className="px-6 py-6">
          <RouteSkeleton />
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
          to={`/${orgSlug}/projects`}
          className="mt-1 text-[13px] font-medium text-[var(--brand)] hover:underline"
        >
          Back to all projects
        </Link>
      </div>
    );
  }

  return (
    <ProjectContext.Provider value={{ project, projectId: project.id, publicId: project.publicId, orgSlug }}>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--bg)]">
        <ProjectHeaderBar project={project} />
        <div
          ref={scrollRef}
          className="scroll-region sidebar-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6"
        >
          {/* Each project tab is its own lazy chunk, so it gets its own
              tab-shaped skeleton. The shell (header bar, project query) stays
              mounted across tab switches. */}
          <RouteBoundary scope="page">
            <Outlet />
          </RouteBoundary>
        </div>
      </div>
    </ProjectContext.Provider>
  );
}

export default ProjectShellPage;
