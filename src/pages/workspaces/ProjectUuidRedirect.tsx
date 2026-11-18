/**
 * ProjectUuidRedirect
 *
 * Catches old-format URLs like /projects/:uuid/overview and redirects to
 * the new format /:orgSlug/p/:publicId/overview.
 *
 * This component is mounted at the legacy route and resolves the project
 * by its UUID (using the existing GET /:projectId endpoint), then builds
 * the new URL and navigates there with `replace` so the old URL is not
 * kept in browser history.
 */
import { useEffect, useMemo } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { useProject } from "@/modules/projects/hooks/useProjects";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { useBootstrapProjects } from "@/modules/bootstrap";
import { projectPath } from "@/modules/projects/navigation/project-routes";
import { RouteSkeleton } from "@/shared/skeletons/RouteSkeleton";

export function ProjectUuidRedirect() {
  const { projectId = "", "*": rest = "" } = useParams<{ projectId: string; "*": string }>();
  const { organizations, isLoading: orgsLoading } = useOrganizations();
  const bootstrapProjects = useBootstrapProjects();
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);
  const navigate = useNavigate();

  const resolvedOrgSlug = activeOrgSlug || (organizations.length > 0 ? organizations[0].slug : null);

  // Fast-path: Check bootstrap store for immediate synchronous redirect
  const cachedProject = useMemo(() => {
    return bootstrapProjects.find((p) => p.id === projectId || p.publicId === projectId || p.slug === projectId);
  }, [bootstrapProjects, projectId]);

  const { data: project, isLoading: projectLoading, error } = useProject(cachedProject ? "" : projectId);

  useEffect(() => {
    const targetProject = cachedProject ?? project;
    if (!targetProject || !resolvedOrgSlug) return;
    const publicId =
      "publicId" in targetProject && typeof targetProject.publicId === "string" && targetProject.publicId
        ? targetProject.publicId
        : targetProject.id;
    const segment = rest || "overview";
    navigate(projectPath(resolvedOrgSlug, publicId, segment), { replace: true });
  }, [cachedProject, project, resolvedOrgSlug, rest, navigate]);

  const isLoading = !cachedProject && (orgsLoading || projectLoading || (!activeOrgId && organizations.length === 0));

  if (isLoading) {
    // Render framed RouteSkeleton to match destination ProjectShellPage frame exactly
    return <RouteSkeleton framed />;
  }

  if ((error || (!project && !cachedProject)) && !isLoading) {
    // If we can't resolve, fall back to the projects list.
    return <Navigate to="/projects" replace />;
  }

  // navigate() above handles the redirect; render nothing while it fires.
  return null;
}
