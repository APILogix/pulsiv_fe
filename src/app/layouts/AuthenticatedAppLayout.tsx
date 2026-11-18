import { Navigate } from "react-router";
import { useAuthStore } from "@/modules/auth/store/auth.store";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { useBootstrapEffect } from "@/modules/bootstrap";
import { AppLayout } from "./AppLayout";
import { RouteSkeleton } from "@/shared/skeletons/RouteSkeleton";
import { MotionProvider } from "@/shared/motion/MotionProvider";

export function AuthenticatedAppLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const { organizations, isLoading } = useOrganizations();

  // Initialize global authenticated application bootstrap revalidation
  useBootstrapEffect();

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (isLoading && !organizations.length && !activeOrgId) {
    return <RouteSkeleton framed />;
  }

  if (!activeOrgId && !organizations.length) {
    return <Navigate to="/onboarding/organization" replace />;
  }

  // Render the full app layout shell with the Outlet for child routes, wrapped with MotionProvider
  return (
    <MotionProvider>
      <AppLayout />
    </MotionProvider>
  );
}
