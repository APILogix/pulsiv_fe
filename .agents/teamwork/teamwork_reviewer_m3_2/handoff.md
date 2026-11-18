# Milestone 3 Independent & Adversarial Review Report

**Agent**: teamwork_reviewer (Reviewer M3 2)  
**Date**: 2026-11-01  
**Target Milestone**: Milestone 3 (Waterfall Flattening & LCP Gating Optimization)  
**Verdict**: **APPROVE**

---

## 1. Observation

### Scope & Modified Files Verified
The following 8 files modified in Milestone 3 were inspected in detail:
1. `src/shared/motion/page-ready.ts` (lines 55–76, 83–96, 102–120)
2. `src/shared/motion/LoadingBoundary.tsx` (lines 39–47, 211–224, 226–264)
3. `src/pages/observe/ExecutiveDashboard.tsx` (lines 98–108, 118–163)
4. `src/pages/observe/LatencyPage.tsx` (lines 356–364, 697–704)
5. `src/modules/projects/hooks/useProjects.ts` (lines 42–53)
6. `src/pages/workspaces/ProjectShellPage.tsx` (lines 72–90, 92–96, 104–107, 140–178)
7. `src/app/router/protected-route-guards.tsx` (lines 20–24, 49–53)
8. `src/pages/workspaces/ProjectUuidRedirect.tsx` (lines 31–45, 48–52)

### Direct Observations of Code Implementation

1. **Non-Blocking Query Decoupling (`src/shared/motion/page-ready.ts`)**:
   - `isBlocking(query: Query)` excludes queries whose options or metadata specify `(options.meta as any)?.nonBlocking === true || (query.meta as any)?.nonBlocking === true` (lines 69–74).
   - In both `hasPendingCandidates` (line 89) and `countBlockingQueries` (line 106), queries with `query.state.status === "error"` do not block the page gate.
   - Lifecycle tracking stores query references in `WeakMap<Query, number>` (lines 17–18), preventing memory leaks when queries are pruned from cache. Navigation epoch timestamps in `navigationStart` are capped to 64 items FIFO (lines 47–50).

2. **Gate Delay Elimination (`src/shared/motion/LoadingBoundary.tsx`)**:
   - `SETTLE_MS` is set to `0` (line 42), eliminating artificial sleep once blocking queries complete.
   - In `GateContent`, `useLayoutEffect` directly sets `setState("ready")` before the initial browser paint when `!hasPendingCandidates(client, since)` (lines 216–220), removing the previous 220ms animation gate delay on cached routes.

3. **Multi-Query Decoupling (`src/pages/observe/ExecutiveDashboard.tsx` & `src/pages/observe/LatencyPage.tsx`)**:
   - In `ExecutiveDashboard.tsx` (lines 98–108), `setQueryDefaults` tags secondary queries (`traces`, `logs`, `crons`, `observe-timeline`, `services`, `endpoints`, `error-groups`) with `meta: { nonBlocking: true }`. The gate opens as soon as the hero requests/errors data resolves. All secondary panels contain dedicated pulse skeletons and safe fallbacks.
   - In `LatencyPage.tsx` (lines 356–364), secondary queries (`timeseries`, `distribution`, `endpoints`, `slow-requests`, `endpoint-detail`) are marked `nonBlocking: true`. The unconsumed `statusSeriesQuery` was completely removed, saving a dead network round-trip.

4. **Waterfall Flattening & Context Memoization (`src/pages/workspaces/ProjectShellPage.tsx`)**:
   - `useProjectByPublicId` is configured with `meta: { nonBlocking: true }` and enabled for valid identifiers like `proj_1` without requiring a `prj_` prefix (lines 44–53 in `useProjects.ts`).
   - `ProjectShellPage` derives project context from `useBootstrapProjects()` on Frame 1, synchronizing `effectiveProjectId` and `effectiveProjectSlug` into `useOrgStore` synchronously (lines 162–166), which prevents `ProjectSwitcher` layout shifts.
   - `ProjectContext.Provider` value is memoized via `useMemo` (lines 169–177), preventing cascading re-renders across child tabs.

5. **Deep Linking & Scope Gating (`src/app/router/protected-route-guards.tsx` & `src/pages/workspaces/ProjectUuidRedirect.tsx`)**:
   - In `OrgRouteGuard`, `setActiveOrg` is synchronized during render (lines 21–23) and guarded so children are never rendered while `activeOrgId` is out of sync with the URL parameter (lines 50–52).
   - In `ProjectUuidRedirect`, fast-path redirects use `useBootstrapProjects()`, and the fallback renders `<RouteSkeleton framed />` to eliminate CLS when redirecting to `ProjectShellPage`.

### Verification Commands & Results

1. **Production Build**:
   ```bash
   npm run build
   ```
   - **Exit code**: `0`
   - **Log snippet**: `✓ 3028 modules transformed. rendering chunks... ✓ built in 6m 4s`
   - **Errors / Warnings**: Zero TypeScript errors, zero bundler errors.

2. **Core Web Vitals Automated Audit Suite**:
   ```bash
   npm run test:cwv:quick
   ```
   - **Exit code**: `0`
   - **Audited routes**: 15/15 passed (100.0% compliance)
   - **Mean LCP**: `72 ms` (Target: $\le 2500$ ms)
   - **Mean CLS**: `0.0000` (Target: $\le 0.1$)
   - **Peak INP**: `22 ms` (Target: $\le 200$ ms)

3. **Adversarial Throttling Test (Fast 3G / 4x CPU Throttling)**:
   ```bash
   node scripts/audit-cwv.mjs --routes /acme/p/proj_1/overview --throttle
   ```
   - **Exit code**: `0`
   - **Observed Metrics**: LCP: `1376 ms` (Target: $\le 2500$ ms), CLS: `0.0002`, INP: `0 ms` (PASS)

4. **Legacy Deep-Link Redirect Test**:
   ```bash
   node scripts/audit-cwv.mjs --routes /projects/proj_1/overview
   ```
   - **Exit code**: `0`
   - **Observed Metrics**: LCP: `56 ms`, CLS: `0.0000`, INP: `0 ms` (PASS)

---

## 2. Logic Chain

1. **Integrity & Authenticity**:
   - Inspected `scripts/audit-cwv.mjs` and all source files for integrity violations.
   - The audit harness spawns an actual production preview server on port 4173, connects directly to headless Chrome via Chrome DevTools Protocol (CDP), injects W3C standard `PerformanceObserver` instances (`paint`, `largest-contentful-paint`, `layout-shift`, `event`), and records real measurements.
   - No mock performance metrics, hardcoded test overrides, facade classes, or test-bypass shortcuts were found.

2. **Waterfall Flattening Correctness**:
   - Prior to Milestone 3, `ProjectShellPage` returned `<RouteSkeleton />` until `useProjectByPublicId` completed, stalling child `<Outlet />` routes (`ProjectOverviewPage`, etc.) from executing their queries.
   - Marking `useProjectByPublicId` with `meta: { nonBlocking: true }` and utilizing `useBootstrapProjects()` enables `ProjectHeaderBar` and child routes to mount concurrently on Frame 1.
   - The sequential waterfall `T_shell + T_child` is successfully flattened to `max(T_shell, T_child)`.

3. **Subtle Regression & Edge Case Analysis**:
   - **Query Failure / Network Degradation**: If secondary queries fail (e.g. 500 on `traces` or `crons`), `page-ready.ts` checks `query.state.status === "error"` and unblocks the gate; individual panels display their dedicated empty/error fallback components without throwing unhandled exceptions.
   - **Stale Closures & Dependency Arrays**: Verified dependency arrays in `LoadingBoundary.tsx`, `ProjectShellPage.tsx`, `OrgRouteGuard`, and `useProjects.ts`. All reactive variables are properly captured.
   - **Memory Leaks**: `WeakMap` usage in `page-ready.ts` ensures query GC, and `navigationEpoch` employs a FIFO bounded eviction strategy.
   - **Deep Linking**: Direct visits to `/:orgSlug/p/:publicId/*` properly synchronize `org-storage` and `activeProjectId` before child queries fire, eliminating double-skeleton flashes.

4. **CWV Threshold Conformance**:
   - Every evaluated route fulfills the acceptance criteria with substantial margin:
     - LCP: 72ms unthrottled, 1376ms under Fast 3G / 4x CPU throttling ($\le 2500$ ms)
     - CLS: 0.0000 ($\le 0.1$)
     - INP: 22ms ($\le 200$ ms)

---

## 3. Caveats

- **Cold Browser Startup Variance**: The very first headless Chrome CDP connection on Windows may incur an initial process launch latency of ~200–400ms, which settles immediately on subsequent route audits.
- **Future Milestone Dependencies**: Runtime scroll throttling on `VirtualList.tsx` and image sizing attributes are allocated to Milestone 4 per `PROJECT.md`; their absence in M3 is expected and verified as compliant with project scheduling.

---

## 4. Conclusion

Milestone 3 (Waterfall Flattening & LCP Gating Optimization) has been rigorously inspected, stress-tested, and independently verified. All four target features (F8, F9, F10, F11) are correctly and robustly implemented. No integrity violations, regressions, or memory leaks were detected.

**Final Verdict**: **APPROVE**

---

## 5. Verification Method

To independently reproduce the review findings:

1. **Verify TypeScript & Production Build**:
   ```powershell
   npm run build
   ```
   *Expected outcome*: Exits with code 0 and compiles all bundles cleanly.

2. **Verify CWV Metrics (15 Core & Boundary Routes)**:
   ```powershell
   npm run test:cwv:quick
   ```
   *Expected outcome*: Exits with code 0; 15/15 items pass with Mean LCP < 2500ms, CLS < 0.1, INP < 200ms.

3. **Verify Throttled Performance on Project Overview**:
   ```powershell
   node scripts/audit-cwv.mjs --routes /acme/p/proj_1/overview --throttle
   ```
   *Expected outcome*: Exits with code 0; LCP under 2500ms (observed ~1376ms).

4. **Verify Legacy URL Redirect**:
   ```powershell
   node scripts/audit-cwv.mjs --routes /projects/proj_1/overview
   ```
   *Expected outcome*: Exits with code 0; LCP under 2500ms (observed ~56ms).
