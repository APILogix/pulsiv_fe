import { useEffect, createContext, useContext, useRef } from "react";
import { Navigate, Outlet, useParams } from "react-router";

import { useProjectByPublicId } from "@/modules/projects/hooks/useProjects";
import type { Project, ProjectStatus } from "@/modules/projects/api/types";
import { ProjectHeaderBar } from "@/modules/projects/components/ProjectHeaderBar";
import { TextLink, WORKSPACE_RAIL } from "@/modules/projects/components/project-page";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { RouteBoundary, useScrollRestoration } from "@/shared/motion";
import { RouteSkeleton } from "@/shared/skeletons";
import type { SurfaceTone } from "@/shared/ui/pulse";

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
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const setActiveOrgId = useOrgStore((s) => s.setActiveOrgId);
  const setActiveOrgSlug = useOrgStore((s) => s.setActiveOrgSlug);

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
    // Same frame as the shell below (header bar + rail), shaped like the tab
    // being opened. When the project resolves, the tab boundary takes this
    // skeleton over in place, so the load reads as one skeleton, not two.
    return <RouteSkeleton framed />;
  }

  if (error || !project) {
    // Same anatomy as every other workspace page: the title states the
    // outcome, one line explains it, the next step is a link.
    return (
      <div className="sidebar-scroll h-full w-full overflow-y-auto px-4 py-6 sm:px-6">
        <div className={`${WORKSPACE_RAIL} flex flex-col gap-4 pt-10`}>
          <div className="max-w-[640px]">
            <h1 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.025em] text-[var(--text)]">
              Project not found
            </h1>
            <p className="mt-2 text-[13px] leading-[1.6] text-[var(--text2)]">
              Nothing matched{" "}
              <code className="break-all font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">
                {safePublicId}
              </code>{" "}
              in this organization. The project may have been deleted, or your account does not have access to it.
            </p>
          </div>
          <TextLink to={`/${orgSlug}/projects`}>Back to all projects</TextLink>
        </div>
      </div>
    );
  }

  return (
    <ProjectContext.Provider value={{ project, projectId: project.id, publicId: project.publicId, orgSlug }}>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--bg)]">
        <ProjectHeaderBar project={project} />
        <div ref={scrollRef} className="scroll-region sidebar-scroll min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {/* One rail for every tab, applied here so no tab sets its own outer
              width and the page title never shifts between tabs. Each tab is
              its own lazy chunk with a tab-shaped skeleton; the shell (scope
              bar, project query) stays mounted across tab switches. */}
          <div className={WORKSPACE_RAIL}>
            <RouteBoundary scope="page">
              <Outlet />
            </RouteBoundary>
          </div>
        </div>
      </div>
    </ProjectContext.Provider>
  );
}

export default ProjectShellPage;
