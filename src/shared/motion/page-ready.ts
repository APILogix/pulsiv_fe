import { skipToken, type Query, type QueryCache, type QueryClient } from "@tanstack/react-query";

/**
 * Page-ready tracking — the data half of "one skeleton per page".
 *
 * A route boundary shows the route skeleton while the page chunk loads. Once
 * the page mounts, its queries start and every section would otherwise paint
 * its own in-page skeleton: that is the "second skeleton". The gate in
 * `LoadingBoundary` keeps the page hidden behind the *same* route skeleton
 * until the queries the page created have produced their first result.
 *
 * This module is the bookkeeping: when each query was created and when it was
 * last observed, so a gate can ask "which queries did this navigation start?"
 * without any page having to register anything.
 */

const createdAt = new WeakMap<Query, number>();
const observedAt = new WeakMap<Query, number>();
const trackedCaches = new WeakSet<QueryCache>();

/** Install once per QueryClient. Cheap: two WeakMap writes per cache event. */
export function trackQueryLifecycle(client: QueryClient) {
  const cache = client.getQueryCache();
  if (trackedCaches.has(cache)) return;
  trackedCaches.add(cache);

  cache.subscribe((event) => {
    if (event.type === "added") createdAt.set(event.query, performance.now());
    else if (event.type === "observerAdded") observedAt.set(event.query, performance.now());
  });
}

/* ── navigation epochs ────────────────────────────────────────────────────
   A gate needs "when did this navigation begin", and that must survive React
   discarding and retrying a render (Suspense does exactly that on first
   mount). Keying on the router's location key gives a stable timestamp per
   navigation no matter how many times the subtree re-renders. */

const navigationStart = new Map<string, number>();

export function navigationEpoch(locationKey: string): number {
  let start = navigationStart.get(locationKey);
  if (start === undefined) {
    start = performance.now();
    navigationStart.set(locationKey, start);
    // Bounded: keep the most recent entries only.
    if (navigationStart.size > 64) {
      const oldest = navigationStart.keys().next().value;
      if (oldest !== undefined) navigationStart.delete(oldest);
    }
  }
  return start;
}

function isEnabled(query: Query): boolean {
  const options = query.options as { enabled?: boolean | ((q: Query) => boolean); queryFn?: unknown };
  if (options.queryFn === skipToken) return false;
  const enabled = options.enabled;
  if (typeof enabled === "function") return enabled(query) !== false;
  return enabled !== false;
}

/**
 * Queries that have never produced data, are enabled, and will fetch.
 * Evaluated before the page subscribes (layout phase), so fetch status is not
 * yet meaningful; "enabled and empty" is the signal that a request is coming.
 */
export function hasPendingCandidates(client: QueryClient, since: number): boolean {
  return client
    .getQueryCache()
    .getAll()
    .some((query) => {
      if (query.state.data !== undefined) return false;
      if (query.state.status === "error") return false;
      if (!isEnabled(query)) return false;

      const created = createdAt.get(query) ?? -1;
      const observed = observedAt.get(query) ?? -1;
      return created >= since || observed >= since;
    });
}

/**
 * Queries started or observed by this navigation that are in flight with nothing to show.
 * Background refetches (data present) and disabled queries never block.
 */
export function countBlockingQueries(client: QueryClient, since: number): number {
  let count = 0;
  for (const query of client.getQueryCache().getAll()) {
    if (query.state.data !== undefined) continue;
    if (query.state.status === "error") continue;
    if (!isEnabled(query)) continue;
    if (query.getObserversCount() === 0) continue;

    // Only queries actively in-flight block the page
    if (query.state.fetchStatus !== "fetching") continue;

    const created = createdAt.get(query) ?? -1;
    const observed = observedAt.get(query) ?? -1;
    if (created >= since || observed >= since) {
      count += 1;
    }
  }
  return count;
}

