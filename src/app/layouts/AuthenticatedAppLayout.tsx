/**
 * AuthenticatedAppLayout – combines RequireAuth guard + AppLayout shell into a
 * single route element. This avoids nested pathless layout routes which can
 * cause route matching issues in React Router v7's data router.
 */
import { Navigate } from "react-router";
import { useAuthStore } from "@/modules/auth/store/auth.store";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { AppLayout } from "./AppLayout";

export function AuthenticatedAppLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const activeOrgId = useOrgStore((state) => state.activeOrgId);

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!activeOrgId) {
    return <Navigate to="/onboarding/organization" replace />;
  }

  // Render the full app layout shell with the Outlet for child routes
  return <AppLayout />;
}
