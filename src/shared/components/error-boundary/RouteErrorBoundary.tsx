import { lazy, Suspense } from "react";
import { Navigate, isRouteErrorResponse, useRouteError } from "react-router";
import { isMissingProjectShellError } from "./route-errors";

const NotFoundPage = lazy(() => import("@/shared/components/NotFoundPage"));
const AppErrorFallback = lazy(() =>
  import("./AppErrorBoundary").then((module) => ({ default: module.AppErrorFallback })),
);

const ErrorLoadingState = () => (
  <div className="flex min-h-[50vh] items-center justify-center px-6 text-sm text-muted-foreground" role="status">
    Preparing error details…
  </div>
);

/** Keeps diagnostic UI out of the successful route's startup dependency graph. */
export function RouteErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <Suspense fallback={<ErrorLoadingState />}>
        <NotFoundPage />
      </Suspense>
    );
  }

  if (isMissingProjectShellError(error)) return <Navigate to="/projects" replace />;

  return (
    <Suspense fallback={<ErrorLoadingState />}>
      <AppErrorFallback
        error={error}
        resetErrorBoundary={() => window.location.reload()}
        isRootRoute
      />
    </Suspense>
  );
}
