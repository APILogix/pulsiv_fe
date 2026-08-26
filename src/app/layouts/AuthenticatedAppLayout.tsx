import { Navigate } from "react-router";
import { useAuthStore } from "@/modules/auth/store/auth.store";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { useBootstrapEffect } from "@/modules/bootstrap";
import { AppLayout } from "./AppLayout";

export function AuthenticatedAppLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const { organizations, isLoading } = useOrganizations();

  // Initialize global authenticated application bootstrap revalidation
  useBootstrapEffect();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (isLoading && !activeOrgId) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" />
      </div>
    );
  }

  if (!activeOrgId && !organizations.length) {
    return <Navigate to="/onboarding/organization" replace />;
  }

  // Render the full app layout shell with the Outlet for child routes
  return <AppLayout />;
}

