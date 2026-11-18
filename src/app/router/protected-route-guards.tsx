import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router";

import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { RouteSkeleton } from "@/shared/skeletons/RouteSkeleton";

/** Validates and selects the organization for organization-scoped routes. */
export function OrgRouteGuard() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { organizations, activeOrgId, activeOrgSlug, isLoading } = useOrganizations();
  const setActiveOrg = useOrgStore((state) => state.setActiveOrg);

  const matchingOrg = orgSlug && organizations.length > 0
    ? organizations.find((organization) =>
        organization.slug?.toLowerCase() === orgSlug.toLowerCase(),
      )
    : null;

  // Synchronous URL-to-Store synchronization during render phase to eliminate async state gap
  if (matchingOrg && (activeOrgId !== matchingOrg.id || activeOrgSlug !== matchingOrg.slug)) {
    setActiveOrg({ id: matchingOrg.id, slug: matchingOrg.slug });
  }

  useEffect(() => {
    if (!orgSlug || isLoading || !organizations.length) return;

    const matchingOrg = organizations.find((organization) =>
      organization.slug?.toLowerCase() === orgSlug.toLowerCase(),
    );
    if (matchingOrg && (activeOrgId !== matchingOrg.id || activeOrgSlug !== matchingOrg.slug)) {
      setActiveOrg({ id: matchingOrg.id, slug: matchingOrg.slug });
    }
  }, [orgSlug, organizations, activeOrgId, activeOrgSlug, setActiveOrg, isLoading]);

  if (isLoading && !organizations.length) {
    return <RouteSkeleton framed />;
  }

  if (orgSlug && organizations.length > 0) {
    if (!matchingOrg) {
      const fallbackSlug = activeOrgSlug ?? organizations[0]?.slug;
      return fallbackSlug
        ? <Navigate to={`/${fallbackSlug}/dashboard`} replace />
        : <Navigate to="/onboarding/organization" replace />;
    }
  }

  // Ensure children are never mounted while activeOrgId is out of sync with the URL orgSlug
  if (matchingOrg && activeOrgId !== matchingOrg.id) {
    return <RouteSkeleton framed />;
  }

  return <Outlet />;
}

/** Resolves legacy unscoped routes to the active organization. */
export function OrgScopedRedirect({
  target = "dashboard",
  wildcard = false,
}: {
  target?: string;
  wildcard?: boolean;
}) {
  const activeOrgSlug = useOrgStore((state) => state.activeOrgSlug);
  const { organizations, isLoading } = useOrganizations();
  const location = useLocation();

  if (isLoading && !activeOrgSlug) {
    return <RouteSkeleton framed />;
  }

  const orgSlug = activeOrgSlug ?? organizations[0]?.slug ?? null;
  if (!orgSlug) return <Navigate to="/onboarding/organization" replace />;

  if (wildcard) {
    const pathname = location.pathname.replace(/^\/+/, "");
    return <Navigate to={`/${orgSlug}/${pathname}`} replace />;
  }

  const destination = target ? `/${orgSlug}/${target.replace(/^\//, "")}` : `/${orgSlug}/dashboard`;
  return <Navigate to={destination} replace />;
}
