import { Navigate, useParams } from "react-router";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { newProjectPath } from "@/modules/projects/navigation/project-routes";

/**
 * Legacy project creation wizard route handler.
 *
 * Enterprise standard: Project creation is handled via the spacious
 * CreateProjectDialog modal on the Projects page rather than a fragmented
 * multi-column page.
 *
 * Redirects seamlessly to the projects list with the creation dialog open.
 */
export default function CreateProjectWizardPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const storeOrgSlug = useOrgStore((s) => s.activeOrgSlug);
  const activeOrgSlug = orgSlug || storeOrgSlug;

  const target = activeOrgSlug ? newProjectPath(activeOrgSlug) : "/projects?create=true";

  return <Navigate to={target} replace />;
}
