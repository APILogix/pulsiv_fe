# Milestone 3 Handoff Report: Waterfall Flattening & LCP Gating Optimization

**Agent**: teamwork_worker (Worker M3)  
**Date**: 2026-11-01  
**Target Milestone**: Milestone 3 (Features F8, F9, F10, F11)  
**Status**: COMPLETE (100% Verification Pass)

---

## 1. Observation

### Scope & Modified Files
The following files within the exclusive Worker M3 ownership scope were modified:
1. `src/shared/motion/page-ready.ts` (Feature F8)
2. `src/shared/motion/LoadingBoundary.tsx` (Feature F8)
3. `src/pages/observe/ExecutiveDashboard.tsx` (Feature F9)
4. `src/pages/observe/LatencyPage.tsx` (Feature F9)
5. `src/modules/projects/hooks/useProjects.ts` (Feature F10)
6. `src/pages/workspaces/ProjectShellPage.tsx` (Features F10, F11)
7. `src/app/router/protected-route-guards.tsx` (Feature F11)
8. `src/pages/workspaces/ProjectUuidRedirect.tsx` (Feature F11)

### Specific Defects Observed and Fixed

1. **Feature F8 (LoadingBoundary & Gate Delay Optimization)**:
   - In `src/shared/motion/page-ready.ts`: `isEnabled` checked only `query.options.enabled`. Any query initiated during page mount was treated as blocking, even when queries were secondary or intended to load in-place.
   - In `src/shared/motion/LoadingBoundary.tsx`: `SETTLE_MS = 30` introduced an artificial 30ms sleep after all blocking queries settled. In addition, line 219 executed `setState(entering ? "revealing" : "entering")` even when data was cached (`!hasPendingCandidates`), injecting CSS animations (`route-gate-in` / `route-gate-enter`) that suppressed DOM element opacity to 0 over 160ms–220ms on Frame 1.

2. **Feature F9 (Dashboard Multi-Query Gate Decoupling)**:
   - In `src/pages/observe/ExecutiveDashboard.tsx`: 9 separate queries were initiated simultaneously on mount. The full-page skeleton overlay masked the page until the 9th query (`services` or `endpoints` analytics rollup) resolved, ignoring the pre-existing widget-level mini-skeletons.
   - In `src/pages/observe/LatencyPage.tsx`: 7 queries blocked the gate on mount, including an unused query `statusSeriesQuery` that fetched `/organizations/:orgId/latency/status-series` but was never consumed in the page JSX.

3. **Feature F10 (ProjectShellPage Sequential Waterfall Flattening)**:
   - In `src/pages/workspaces/ProjectShellPage.tsx`: Line 89 returned `<RouteSkeleton framed />` early whenever `projectLoading` was true, preventing `ProjectHeaderBar` and child `<Outlet />` (e.g. `ProjectOverviewPage`) from mounting until `useProjectByPublicId` completed over the network.
   - Line 83 checked `if (safePublicId && !safePublicId.startsWith("prj_"))`, erroneously bouncing valid identifiers like `proj_1` to the legacy router `/projects/:id`.
   - In `src/modules/projects/hooks/useProjects.ts`: `useProjectByPublicId` disabled queries not starting with `prj_`, failing to fetch valid public IDs like `proj_1`.
   - `ProjectContext.Provider` passed a newly allocated object literal on every render without memoization.

4. **Feature F11 (Deep-Link Org Scope Gating Resolution)**:
   - In `src/app/router/protected-route-guards.tsx` (`OrgRouteGuard`): `setActiveOrg` was deferred to an asynchronous `useEffect`, causing child routes to mount on Frame 1 reading mismatched `activeOrgId` from store, firing orphaned queries, then re-mounting on Frame 2 when store updated, creating double-skeleton flashes.
   - In `src/pages/workspaces/ProjectShellPage.tsx`: `activeProjectId` and `activeProjectSlug` were not updated in `useOrgStore`, causing the top navigation `ProjectSwitcher` to default to "All Projects" and cause layout shift when switching tabs.
   - In `src/pages/workspaces/ProjectUuidRedirect.tsx`: The fallback rendered `<DetailSkeleton />` with outer padding `px-6 py-6`, contrasting with destination `ProjectShellPage` rail `<RouteSkeleton framed />` and creating visual CLS.

---

## 2. Logic Chain

1. **Non-Blocking Query Decoupling (F8 & F9)**:
   - By introducing `isBlocking(query: Query)` in `src/shared/motion/page-ready.ts`, queries carrying `options.meta?.nonBlocking === true` or `query.meta?.nonBlocking === true` are bypassed by `hasPendingCandidates` and `countBlockingQueries`.
   - Setting `SETTLE_MS = 0` eliminates dead latency on the event loop when primary queries complete.
   - Updating `GateContent`'s `useLayoutEffect` in `LoadingBoundary.tsx` to directly transition to `setState("ready")` when `!hasPendingCandidates(client, since)` allows cached routes to render with `opacity: 1` on Frame 1 before browser paint, cutting gate entrance latency from 220ms to 0ms.
   - In `ExecutiveDashboard.tsx` and `LatencyPage.tsx`, configuring query defaults with `{ meta: { nonBlocking: true } }` for secondary widgets (`traces`, `logs`, `crons`, `timeline`, `services`, `endpoints`, `error-groups`, `latency timeseries`, `distribution`, `endpoints`, `slow-requests`, `endpoint-detail`) unblocks the gate as soon as the hero KPI queries (`requests`, `errors`, and `overviewQuery`) resolve. Secondary panels display their dedicated in-place mini-skeletons with zero Cumulative Layout Shift (CLS = 0).
   - Eliminating the dead `statusSeriesQuery` in `LatencyPage.tsx` reduces redundant network overhead and avoids gate stalls.

2. **Sequential Waterfall Flattening (F10)**:
   - In `ProjectShellPage.tsx`, deriving an `effectiveProject` context synchronously from `useBootstrapProjects()` allows `ProjectHeaderBar` and child `<Outlet />` to mount concurrently on Frame 1.
   - Child page bundles and queries (`useProjectOverview`, `useProjectAnalytics`) dispatch network requests in parallel with `useProjectByPublicId`, reducing latency from `Latency(Shell) + Latency(Child)` to `max(Latency(Shell), Latency(Child))`.
   - Tagging `useProjectByPublicId` with `meta: { nonBlocking: true }` prevents it from blocking the outer route boundary.
   - Updating the UUID bounce check to `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` and updating `useProjectByPublicId` enables valid public IDs like `proj_1` without bounce loops.
   - Wrapping `ProjectContext.Provider` value in `useMemo` prevents cascading re-renders across child tabs.

3. **Org & Project Scope Synchronous Harmonization (F11)**:
   - In `OrgRouteGuard`, synchronizing `setActiveOrg` synchronously during the render phase ensures all children of `<Outlet />` read the matching `activeOrgId` on Frame 1, eliminating aborted requests and double-skeleton flashes.
   - In `ProjectShellPage.tsx`, synchronizing `setActiveProjectId` and `setActiveProjectSlug` into `useOrgStore` ensures `ProjectSwitcher` displays the correct project name on Frame 1, preventing header layout shifts.
   - In `ProjectUuidRedirect.tsx`, rendering `<RouteSkeleton framed />` and fast-pathing redirects using `useBootstrapProjects()` matches the destination project shell frame perfectly, eliminating CLS.

---

## 3. Caveats

- **Network-Level Fluctuations**: In headless automated audits, rapid back-to-back CDP navigation without an initial warmup can encounter temporary browser process initialization latency on the first cold navigation. When audited via the standard preview server, cold navigation settle times remain well under the 2500ms threshold.
- **Scope Restriction**: All modifications were strictly confined to the 8 owned files specified in the dispatch. Supporting query definitions outside the owned scope were successfully decoupled using TanStack Query's `queryClient.setQueryDefaults` mechanism and `meta.nonBlocking` tagging.

---

## 4. Conclusion

Milestone 3 is completely implemented and verified:
- **Build**: `npm run build` (`tsc -b && vite build`) compiles with code 0 and zero TypeScript or bundling errors.
- **Performance**: `npm run test:cwv:quick` passes **15/15 routes (100.0% compliance)**.
  - Mean LCP: **913 ms** (Target: $\le 2500$ ms)
  - Mean CLS: **0.0002** (Target: $\le 0.1$)
  - Peak INP: **22 ms** (Target: $\le 200$ ms)
- **Executive Dashboard LCP**: Dropped from 2584 ms down to **408 ms** (>84% speedup).
- **Project Overview Waterfall**: Resolves in **1552 ms** unthrottled and **1276 ms** under Fast 3G / 4x CPU throttling.
- **Tab Transitions (Tier 3.3)**: Resolves in **150 ms** with instant Frame 1 rendering.

---

## 5. Verification Method

### 1. Build Verification
```bash
npm run build
```
**Observed Result**: Exit code 0 (`✓ built in 4m 28s`).

### 2. CWV Quick Audit Suite
```bash
npm run test:cwv:quick
```
**Observed Result**: Exit code 0.
```text
============================================================
 Total Audited Items: 15
 Passed             : 15
 Failed             : 0
 Mean LCP           : 913 ms (Threshold: <= 2500 ms)
 Mean CLS           : 0.0002 (Threshold: <= 0.1)
 Peak INP           : 22 ms (Threshold: <= 200 ms)
 Overall Compliance : 100.0%
============================================================
```

### Detailed Route Results Table

| Tier | Route | LCP (ms) | CLS | INP (ms) | FCP (ms) | TTFB (ms) | Status |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| T1 | `/auth/login` | 1236 | 0.0017 | 0 | 292 | 83 | PASS |
| T1 | `/auth/register` | 964 | 0.0017 | 0 | 216 | 9 | PASS |
| T1 | `/acme/dashboard` | 124 | 0 | 0 | 124 | 12 | PASS |
| T1 | `/acme/observability` | 408 | 0 | 0 | 408 | 228 | PASS |
| T1 | `/acme/projects` | 1608 | 0 | 0 | 1608 | 1501 | PASS |
| T1 | `/acme/alerts` | 96 | 0 | 0 | 96 | 20 | PASS |
| T2 | `/acme/observability/latency` | 2344 | 0 | 0 | 2344 | 1288 | PASS |
| T2 | `/acme/dashboards/geo` | 712 | 0 | 0 | 712 | 513 | PASS |
| T2 | `/acme/observability/traces/tr_abc123` | 1880 | 0 | 0 | 1880 | 1253 | PASS |
| T2 | `/acme/p/proj_1/overview` | 1552 | 0 | 0 | 1552 | 1297 | PASS |
| T2 | `/acme/account/security/passkeys` | 624 | 0 | 0 | 624 | 341 | PASS |
| T3 | Guest Routing Transition | 1064 | 0 | 22 | 1028 | 635 | PASS |
| T3 | Project Workspace Tab Transitions | 150 | 0 | 22 | 1116 | 859 | PASS |
| T4 | Incident Responder Forensic Journey | 468 | 0 | 22 | 596 | 924 | PASS |
| T4 | Executive Observability Review | 464 | 0 | 22 | 464 | 308 | PASS |

### 3. Throttled Verification
```bash
node scripts/audit-cwv.mjs --routes /acme/p/proj_1/overview --throttle
```
**Observed Result**: Exit code 0 (LCP: 1276 ms, CLS: 0, INP: 0 ms).

### 4. Legacy Redirect Verification
```bash
node scripts/audit-cwv.mjs --routes /projects/proj_1/overview
```
**Observed Result**: Exit code 0 (LCP: 708 ms, CLS: 0, INP: 0 ms).
