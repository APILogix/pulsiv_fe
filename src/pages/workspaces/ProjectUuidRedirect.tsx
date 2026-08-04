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
import { useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { useProject } from "@/modules/projects/hooks/useProjects";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { projectPath } from "@/modules/projects/navigation/project-routes";
import { DetailSkeleton } from "@/shared/observe";

export function ProjectUuidRedirect() {
  const { projectId = "", "*": rest = "" } = useParams<{ projectId: string; "*": string }>();
  const { organizations, isLoading: orgsLoading } = useOrganizations();
  const { activeOrgId, activeOrgSlug } = useOrgStore();
  const { data: project, isLoading: projectLoading, error } = useProject(projectId);
  const navigate = useNavigate();

  const resolvedOrgSlug = activeOrgSlug || (organizations.length > 0 ? organizations[0].slug : null);

  useEffect(() => {
    if (!project || !resolvedOrgSlug) return;
    const segment = rest || "overview";
    navigate(projectPath(resolvedOrgSlug, project.publicId, segment), { replace: true });
  }, [project, resolvedOrgSlug, rest, navigate]);

  const isLoading = orgsLoading || projectLoading || (!activeOrgId && organizations.length === 0);

  if (isLoading) {
    return (
      <div className="sidebar-scroll h-full w-full overflow-y-auto">
        <div className="px-6 py-6">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  if (error || !project || !resolvedOrgSlug) {
    // If we can't resolve, fall back to the projects list.
    return <Navigate to="/projects" replace />;
  }

  // navigate() above handles the redirect; render nothing while it fires.
  return null;
}
