import { createContext, useContext } from "react";
import { Outlet, useParams, Navigate, Link } from "react-router";
import { useProject } from "@/modules/projects/hooks/useProjects";
import { DetailSkeleton } from "@/shared/observe";

interface ProjectContextValue {
  project: any;
  projectId: string;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useCurrentProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useCurrentProject must be used within ProjectShellPage");
  return ctx;
}



export function ProjectShellPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const safeProjectId = projectId ?? "";
  const { data: project, isLoading, error } = useProject(safeProjectId);

  if (!projectId) {
    return <Navigate to="/projects" replace />;
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-xl font-semibold text-[var(--text)]">Project Not Found</h2>
        <p className="text-[var(--text2)]">The project you are looking for does not exist or you do not have access.</p>
        <Link to="/projects" className="text-[var(--brand)] hover:underline">
          Return to Projects
        </Link>
      </div>
    );
  }

  return (
    <ProjectContext.Provider value={{ project, projectId: safeProjectId }}>
      <div className="flex-1 h-full w-full bg-[var(--bg)] overflow-auto p-6">
        <Outlet />
      </div>
    </ProjectContext.Provider>
  );
}
