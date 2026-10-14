import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";

import { lazy } from "react";
import { cn } from "@/lib/utils";
import { stripOrgSlug } from "@/shared/skeletons/slug";
import { countBlockingQueries, hasPendingCandidates, navigationEpoch } from "./page-ready";

const RouteSkeleton = lazy(() =>
  import("@/shared/skeletons/RouteSkeleton").then((m) => ({ default: m.RouteSkeleton }))
);

export type BoundaryScope = "module" | "page";

/**
 * Collapse a pathname to its module identity, accounting for organization scopes.
 *
 * `/alerts/rules/abc` → `/alerts`
 * `/acme/observability/traces` → `/observability`
 * `/acme/dashboards/overview` → `/dashboards`
 * `/acme/p/prj_1/api-keys` → `/p/prj_1`  (project shell keeps its state)
 * `/acme/projects` → `/projects`
 */
export function moduleKey(pathname: string): string {
  const stripped = stripOrgSlug(pathname);
  const segments = stripped.split("/").filter(Boolean);
  if (segments.length === 0) return "/";
  if (segments[0] === "p") return `/p/${segments[1] ?? ""}`;
  if (segments[0] === "projects") return `/projects`;
  return `/${segments[0]}`;
}

/* ─────────────────────────────── timing ─────────────────────────────── */

/** Quiet window after the last blocking query settles, so a dependent query
 *  that starts on the next commit keeps the page behind the same skeleton. */
const SETTLE_MS = 60;
/** Upper bound on holding a page back. Past this the page shows its own
 *  loading state rather than an indefinite skeleton on a hung request. */
const MAX_HOLD_MS = 1_200;
/** Skeleton fade-out. Shorter than the content entrance so the two overlap
 *  briefly and read as the data filling in, not as two screens. */
const OVERLAY_EXIT_MS = 140;
/** Content entrance (matches `route-gate-in` in index.css). */
const REVEAL_MS = 220;

/* ─────────────────────────────── boundary ───────────────────────────── */

type Flags = { chunk: string | null; hold: string | null };
type SetFlag = (kind: keyof Flags, key: string, on: boolean) => void;

/**
 * RouteBoundary — one skeleton per page load.
 *
 * The page goes through two waits: its code chunk, then its first data. Before
 * this boundary each wait painted its own skeleton (route skeleton from
 * Suspense, then every section's in-page skeleton), which read as the page
 * loading twice. Now:
 *
 *  - The skeleton lives *outside* Suspense as an overlay, so the same element
 *    stays mounted across both waits instead of being swapped.
 *  - `scope="page"` boundaries hold the mounted page hidden (inert, CSS
 *    animations paused) until the queries this navigation created have
 *    produced their first result, then crossfade skeleton → content.
 *  - Cached navigations never see a skeleton: the check runs in a layout
 *    effect, before the first paint.
 *
 * `scope="module"` boundaries (the app shell) only cover the chunk wait and
 * render the skeleton inside the destination layout's frame, so it does not
 * jump when the module layout takes over.
 */
export function RouteBoundary({
  children,
  scope = "page",
  padded = false,
  fallback,
  className,
  transition = true,
  hold,
}: {
  children: ReactNode;
  scope?: BoundaryScope;
  /** Add the module gutter to the skeleton (layouts with no padding). */
  padded?: boolean;
  /** Override the resolved skeleton. */
  fallback?: ReactNode;
  className?: string;
  /** Set false where an ancestor already animates the entrance. */
  transition?: boolean;
  /** Hold the page behind the skeleton until its first data settles.
   *  Defaults to true for page scope, false for module scope. */
  hold?: boolean;
}) {
  const location = useLocation();
  const key = scope === "module" ? moduleKey(location.pathname) : stripOrgSlug(location.pathname);
  const holdForData = hold ?? scope === "page";

  const [flags, setFlags] = useState<Flags>({ chunk: null, hold: null });
  const setFlag = useCallback<SetFlag>((kind, flagKey, on) => {
    setFlags((prev) => {
      if (on) return prev[kind] === flagKey ? prev : { ...prev, [kind]: flagKey };
      return prev[kind] === flagKey ? { ...prev, [kind]: null } : prev;
    });
  }, []);

  const visible = flags.chunk === key || flags.hold === key;

  // Keep the overlay mounted for its exit fade. Derived during render (not in
  // an effect) so the element is never unmounted and remounted mid-handoff.
  const [prev, setPrev] = useState({ visible, key });
  const [exitKey, setExitKey] = useState<string | null>(null);
  if (prev.visible !== visible || prev.key !== key) {
    setPrev({ visible, key });
    setExitKey(prev.visible && !visible && prev.key === key ? key : null);
  }

  useEffect(() => {
    if (!exitKey) return;
    const timer = window.setTimeout(() => setExitKey(null), OVERLAY_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [exitKey]);

  const leaving = !visible && exitKey === key;
  const skeleton = fallback ?? (
    <Suspense fallback={null}>
      <RouteSkeleton pathname={location.pathname} framed={scope === "module"} padded={padded} />
    </Suspense>
  );

  return (
    <div className={cn("relative min-h-0 w-full", className)}>
      <Suspense fallback={<SuspenseMarker routeKey={key} setFlag={setFlag} />}>
        <GateContent
          key={key}
          routeKey={key}
          hold={holdForData}
          // Page boundaries own the entrance. A module boundary often hands
          // over to a layout that is itself still a skeleton (project shell
          // resolving its project); animating that would visibly jolt one
          // skeleton into another, so module content appears in place while
          // the overlay fades off it.
          animate={transition && scope === "page"}
          entering={visible}
          setFlag={setFlag}
          className={className}
        >
          {children}
        </GateContent>
      </Suspense>
      {(visible || leaving) && (
        <div
          key={key}
          className="route-skeleton-overlay"
          data-state={leaving ? "leaving" : "visible"}
          aria-hidden={leaving || undefined}
        >
          {skeleton}
        </div>
      )}
    </div>
  );
}

/** Rendered as the Suspense fallback: flags the chunk wait for the overlay. */
function SuspenseMarker({ routeKey, setFlag }: { routeKey: string; setFlag: SetFlag }) {
  useLayoutEffect(() => {
    setFlag("chunk", routeKey, true);
    return () => setFlag("chunk", routeKey, false);
  }, [routeKey, setFlag]);
  return null;
}

/**
 * checking  — first render; hidden until the layout effect decides (never painted)
 * waiting   — hidden behind the route skeleton until first data settles
 * revealing — crossfading in over the leaving skeleton
 * entering  — cached navigation: short entrance, no skeleton was shown
 * ready     — at rest; no transform or opacity left on the wrapper
 */
type GateState = "checking" | "waiting" | "revealing" | "entering" | "ready";

function GateContent({
  routeKey,
  hold,
  animate,
  entering,
  setFlag,
  className,
  children,
}: {
  routeKey: string;
  hold: boolean;
  animate: boolean;
  /** The chunk skeleton was on screen when this content first rendered. */
  entering: boolean;
  setFlag: SetFlag;
  className?: string;
  children: ReactNode;
}) {
  const client = useQueryClient();
  const location = useLocation();
  const since = navigationEpoch(location.key);

  const [state, setState] = useState<GateState>(() => {
    if (hold) return "checking";
    return entering && animate ? "revealing" : "ready";
  });

  // Decide before the first paint whether this page needs to wait. The page's
  // queries were created during render, so they are already in the cache.
  useLayoutEffect(() => {
    if (state !== "checking") return;
    if (hasPendingCandidates(client, since)) {
      setFlag("hold", routeKey, true);
      setState("waiting");
    } else if (!animate) {
      setState("ready");
    } else {
      // Chunk skeleton was up: crossfade out of it. Otherwise a short entrance.
      setState(entering ? "revealing" : "entering");
    }
    // Runs once per mount by design: the gate never re-engages for filter or
    // pagination changes; those use the page's own in-place loading states.
  }, [state, client, since, routeKey, setFlag, animate, entering]);

  // Wait for the first result of every query this navigation started.
  useEffect(() => {
    if (state !== "waiting") return;
    const cache = client.getQueryCache();
    let frame = 0;
    let settle: number | undefined;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      setFlag("hold", routeKey, false);
      setState(animate ? "revealing" : "ready");
    };
    const evaluate = () => {
      frame = 0;
      if (countBlockingQueries(client, since) > 0) {
        window.clearTimeout(settle);
        settle = undefined;
        return;
      }
      if (settle !== undefined) return;
      settle = window.setTimeout(() => {
        settle = undefined;
        if (countBlockingQueries(client, since) === 0) finish();
      }, SETTLE_MS);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(evaluate);
    };

    const unsubscribe = cache.subscribe(schedule);
    schedule();
    const cap = window.setTimeout(finish, MAX_HOLD_MS);

    return () => {
      done = true;
      unsubscribe();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.clearTimeout(cap);
    };
  }, [state, client, since, routeKey, setFlag, animate]);

  useEffect(() => {
    if (state !== "revealing" && state !== "entering") return;
    const timer = window.setTimeout(() => setState("ready"), REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  // Release the overlay if this page unmounts while still holding it.
  useEffect(() => () => setFlag("hold", routeKey, false), [routeKey, setFlag]);

  const hidden = state === "checking" || state === "waiting";

  return (
    <div
      className={cn("route-gate min-h-0 w-full", className)}
      data-gate={hidden ? "hidden" : state === "ready" ? undefined : state}
      inert={hidden || undefined}
      aria-busy={hidden || undefined}
    >
      {children}
    </div>
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
