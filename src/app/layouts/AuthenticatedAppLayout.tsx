/**
 * AuthenticatedAppLayout – combines RequireAuth guard + AppLayout shell into a
 * single route element. This avoids nested pathless layout routes which can
 * cause route matching issues in React Router v7's data router.
 */
import { Navigate } from "react-router";
import { useAuthStore } from "@/modules/auth/store/auth.store";
import { AppLayout } from "./AppLayout";

export function AuthenticatedAppLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }
  // Render the full app layout shell with the Outlet for child routes
  return <AppLayout />;
}
