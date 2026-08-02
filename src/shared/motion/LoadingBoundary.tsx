import { Suspense, type ReactNode } from "react";
import { useLocation } from "react-router";

import { RouteSkeleton } from "@/shared/skeletons";
import { PageTransition } from "./PageTransition";

/**
 * LoadingBoundary / RouteBoundary — Phase 3 + Phase 7 glue.
 *
 * Why the Suspense boundary is *keyed*:
 *   React Router v7 wraps navigation in `startTransition`. During a transition
 *   React keeps the previous UI on screen instead of showing a Suspense
 *   fallback — great for tiny waits, but it means clicking a sidebar item to a
 *   not-yet-downloaded route chunk looks like nothing happened. Changing the
 *   Suspense `key` unmounts the old subtree, so the fallback renders on the very
 *   next frame. Combined with `RouteSkeleton` the user sees the *shape* of the
 *   destination immediately.
 *
 * Scope controls how aggressively we remount:
 *   "module" — key on the top-level module (`/alerts`, `/admin`, or a specific
 *              project shell). Used at the app shell level so navigating inside
 *              a module never tears down that module's layout/state.
 *   "page"   — key on the full pathname. Used inside module layouts so every
 *              page swap gets its own skeleton.
 */

export type BoundaryScope = "module" | "page";

function normalize(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/**
 * Collapse a pathname to its module identity.
 *
 * `/alerts/rules/abc` → `/alerts`
 * `/acme/p/prj_1/api-keys` → `/acme/p/prj_1`  (project shell keeps its state)
 * `/acme/projects` → `/acme/projects`
 */
export function moduleKey(pathname: string): string {
  const segments = normalize(pathname).split("/").filter(Boolean);
  if (segments.length === 0) return "/";
  if (segments[1] === "p") return `/${segments[0]}/p/${segments[2] ?? ""}`;
  if (segments[1] === "projects") return `/${segments[0]}/projects`;
  return `/${segments[0]}`;
}

export function RouteBoundary({
  children,
  scope = "page",
  padded = false,
  fallback,
  className,
  transition = true,
}: {
  children: ReactNode;
  scope?: BoundaryScope;
  /** Add the module gutter to the fallback (use inside layouts with no padding). */
  padded?: boolean;
  /** Override the resolved skeleton. */
  fallback?: ReactNode;
  className?: string;
  /** Set false where an ancestor already animates the entrance. */
  transition?: boolean;
}) {
  const location = useLocation();
  const key = scope === "module" ? moduleKey(location.pathname) : normalize(location.pathname);

  const content = transition ? (
    <PageTransition transitionKey={key} className={className}>
      {children}
    </PageTransition>
  ) : (
    children
  );

  return (
    <Suspense key={key} fallback={fallback ?? <RouteSkeleton padded={padded} />}>
      {content}
    </Suspense>
  );
}

/**
 * AnimatedRoute — drop-in wrapper for a single route element, for cases where a
 * route needs its own boundary rather than inheriting its layout's.
 */
export function AnimatedRoute({
  children,
  padded = false,
  fallback,
}: {
  children: ReactNode;
  padded?: boolean;
  fallback?: ReactNode;
}) {
  return (
    <RouteBoundary scope="page" padded={padded} fallback={fallback}>
      {children}
    </RouteBoundary>
  );
}

/**
 * LoadingBoundary — a non-route Suspense boundary (heavy widget, lazy chart,
 * lazy editor). `resetKey` lets a caller force the fallback back on when the
 * inputs change.
 */
export function LoadingBoundary({
  children,
  fallback,
  resetKey,
}: {
  children: ReactNode;
  fallback: ReactNode;
  resetKey?: string;
}) {
  return (
    <Suspense key={resetKey} fallback={fallback}>
      {children}
    </Suspense>
  );
}
