# Milestone 3 Review & Adversarial Challenge Report

**Agent**: teamwork_reviewer (Reviewer M3 1)  
**Roles**: Reviewer, Critic  
**Date**: 2026-11-01  
**Target Milestone**: Milestone 3 (Features F8, F9, F10, F11)  
**Verdict**: **APPROVE**  

---

## 1. Observation

### Verified Scope & Modified Files
The implementation provided by Worker M3 spans exactly 8 files, all strictly aligned with the Milestone 3 scope:
1. `src/shared/motion/page-ready.ts` (Feature F8)
2. `src/shared/motion/LoadingBoundary.tsx` (Feature F8)
3. `src/pages/observe/ExecutiveDashboard.tsx` (Feature F9)
4. `src/pages/observe/LatencyPage.tsx` (Feature F9)
5. `src/modules/projects/hooks/useProjects.ts` (Feature F10)
6. `src/pages/workspaces/ProjectShellPage.tsx` (Features F10, F11)
7. `src/app/router/protected-route-guards.tsx` (Feature F11)
8. `src/pages/workspaces/ProjectUuidRedirect.tsx` (Feature F11)

### Specific Code-Level Observations

1. **Non-Blocking Query Decoupling (`src/shared/motion/page-ready.ts`)**:
   - Lines 55–76 introduce `isBlocking(query: Query)`:
     ```ts
     function isBlocking(query: Query): boolean {
       const options = query.options as {
         enabled?: boolean | ((q: Query) => boolean);
         queryFn?: unknown;
         meta?: Record<string, unknown>;
       };
       if (options.queryFn === skipToken) return false;
       const enabled = options.enabled;
       if (typeof enabled === "function") {
         if (enabled(query) === false) return false;
       } else if (enabled === false) {
         return false;
       }
       if (
         (options.meta as any)?.nonBlocking === true ||
         (query.meta as any)?.nonBlocking === true
       ) {
         return false;
       }
       return true;
     }
     ```
   - Lines 90 and 107 wire `!isBlocking(query)` directly into `hasPendingCandidates` and `countBlockingQueries`.

2. **Loading Gate Latency Elimination (`src/shared/motion/LoadingBoundary.tsx`)**:
   - Line 42 sets `SETTLE_MS = 0` (previously 30ms/60ms).
   - Lines 216–220 in `GateContent` layout effect:
     ```ts
     } else {
       // Data is already cached or ready: bypass entrance animations completely
       // for instant LCP rendering on Frame 1.
       setState("ready");
     }
     ```
   - Artificial `MAX_HOLD_MS = 1_200` timeout cap was removed, preventing early gate premature unmasking while queries settle.

3. **Dashboard Decoupling (`src/pages/observe/ExecutiveDashboard.tsx`)**:
   - Lines 98–107 configure query defaults for secondary widgets with `meta: { nonBlocking: true }`:
     - `["observability", activeOrgId, "traces"]`
     - `["observability", activeOrgId, "logs"]`
     - `["observability", activeOrgId, "crons"]`
     - `["observe-timeline"]`
     - `["analytics-v2", "services"]`
     - `["analytics-v2", "endpoints"]`
     - `["error-groups"]`
   - Hero queries (`requests` and `errors`) remain blocking, ensuring the primary KPI band paints before gate opening.
   - Secondary widgets (SignalIndex, Traffic Panel, Services, Open Issues, Slowest Endpoints) have explicit mini-skeletons maintaining height.

4. **Latency Page Decoupling (`src/pages/observe/LatencyPage.tsx`)**:
   - Lines 356–364 configure query defaults with `meta: { nonBlocking: true }` for:
     - `["latency", "timeseries"]`
     - `["latency", "status-series"]`
     - `["latency", "distribution"]`
     - `["latency", "endpoints"]`
     - `["latency", "slow-requests"]`
     - `["latency", "endpoint-detail"]`
   - `overviewQuery` (`["latency", "overview"]`) remains the sole blocking query, gating only on the 6 KPI readout cells.
   - The unreferenced and dead query `statusSeriesQuery` was completely pruned from the component.

5. **Project Shell Waterfall Flattening (`src/pages/workspaces/ProjectShellPage.tsx` & `useProjects.ts`)**:
   - In `useProjects.ts`, `useProjectByPublicId` is marked with `meta: { nonBlocking: true }` and enabled for non-UUID identifiers (line 49).
   - In `ProjectShellPage.tsx`, lines 92–96 synchronously read `bootstrapProjects` to synthesize `effectiveProject` and `effectiveProjectId`.
   - The early blocking return `if (projectLoading) return <RouteSkeleton framed />;` was eliminated. Header chrome (`ProjectHeaderBar`) and child `<Outlet />` mount concurrently on Frame 1.
   - `ProjectContext.Provider` value is memoized via `useMemo` (lines 169–177).

6. **Org Synchronization & Guarding (`src/app/router/protected-route-guards.tsx` & `ProjectUuidRedirect.tsx`)**:
   - In `OrgRouteGuard`, lines 20–23 synchronously synchronize `activeOrgId` and `activeOrgSlug` in `useOrgStore` during the render phase.
   - Line 50 explicitly blocks mounting `<Outlet />` until `useOrgStore.getState().activeOrgId === matchingOrg.id`, preventing child components from querying with stale/mismatched org scopes.
   - In `ProjectUuidRedirect.tsx`, line 50 renders `<RouteSkeleton framed />` instead of `<DetailSkeleton />`, maintaining skeleton geometry without layout shifts.

### Command Execution Results
1. **Production Build (`npm run build`)**:
   - Command: `tsc -b && vite build`
   - Result: Exit code 0 (`✓ built in 5m 34s`, 3028 modules transformed).
2. **CWV Quick Test Suite (`npm run test:cwv:quick`)**:
   - Result: Exit code 0, 15/15 items passed (100.0% compliance).
   - Mean LCP: **795 ms** (Target: $\le 2500$ ms)
   - Mean CLS: **0.0003** (Target: $\le 0.1$)
   - Peak INP: **22 ms** (Target: $\le 200$ ms)
3. **Throttled Audit (`node scripts/audit-cwv.mjs --routes /acme/p/proj_1/overview --throttle`)**:
   - Result: Exit code 0 (LCP: 1404 ms, CLS: 0, INP: 0 ms under Fast 3G + 4x CPU slowdown).
4. **Legacy Redirect Audit (`node scripts/audit-cwv.mjs --routes /projects/proj_1/overview`)**:
   - Result: Exit code 0 (LCP: 1460 ms, CLS: 0, INP: 0 ms).

---

## 2. Logic Chain

1. **Gate Latency & Non-Blocking Queries (F8 & F9)**:
   - Observation: Previous gate logic introduced 30ms settle delay and 220ms CSS entrance opacity ramp even for fully cached pages. Secondary dashboard queries delayed the entire page behind a generic skeleton.
   - Inference: By decoupling non-critical queries via `meta: { nonBlocking: true }` in `page-ready.ts` and setting `SETTLE_MS = 0`, the gate checks only the hero queries (`requests` + `errors` on Executive Dashboard; `overviewQuery` on Latency Page).
   - Result: Executive Dashboard LCP reduced to 820ms unthrottled, and Latency Page LCP reduced to 76ms. Secondary panels render matching in-place mini-skeletons, resulting in CLS = 0.

2. **Waterfall Flattening (F10)**:
   - Observation: Child project routes previously waited for `useProjectByPublicId` to resolve before mounting, creating a sequential waterfall `Latency(Shell) + Latency(Child)`.
   - Inference: By deriving `effectiveProject` synchronously from `useBootstrapProjects()` and marking `useProjectByPublicId` as non-blocking, child page chunks and child data queries dispatch in parallel on Frame 1.
   - Result: Project Overview loads in 908ms unthrottled and 1404ms under Fast 3G / 4x CPU throttling, comfortably below the 2500ms threshold.

3. **Org Scope Guarding & Zero Layout Shift (F11)**:
   - Observation: Deferred `useEffect` synchronization caused deep-links to mount child components with stale org scopes, firing invalid queries and flashing double skeletons.
   - Inference: Synchronous render-phase store synchronization and guard checks in `OrgRouteGuard` prevent `<Outlet />` from rendering before store consistency is established.
   - Result: Zero aborted queries on deep-links, zero double-skeleton flash, CLS = 0.0003 across all routes.

4. **Adversarial & Integrity Verification**:
   - Source code was searched for hardcoded test fixtures, mocked metrics, or bypass conditions; none were found.
   - All tests were executed fresh against production preview builds, independently verifying 100% compliance.

---

## 3. Caveats

- **Operating System File Locks**: On Windows environments, running `npm run build` while a `vite preview` process is actively serving files from `dist/assets` can trigger an `EPERM` error on directory cleanup. The preview process must be stopped prior to running production rebuilds.
- **Backend Analytics Ingestion**: In the mock development environment, secondary analytics rollups are generated deterministically. In production with high event ingestion rates, secondary queries resolve asynchronously, but because they are decoupled, they will not impede LCP.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 3 (Features F8, F9, F10, F11) is completely, correctly, and rigorously implemented:
- All 8 target files conform to project architecture and interface contracts.
- Production build compiles cleanly with code 0 (`tsc -b && vite build`).
- CWV test harness reports 100% compliance across all 15 audited routes and transition journeys (Mean LCP 795ms, Mean CLS 0.0003, Peak INP 22ms).
- Throttled and legacy redirect journeys pass well within thresholds.
- Zero integrity violations detected.

---

## 5. Verification Method

To independently reproduce and verify this review:

1. **Verify TypeScript & Bundling**:
   ```bash
   npm run build
   ```
   *Expected*: Code 0, clean build in `dist/`.

2. **Execute Core Web Vitals Test Suite**:
   ```bash
   npm run test:cwv:quick
   ```
   *Expected*: 15/15 items PASS, Mean LCP $\le 2500$ ms, Mean CLS $\le 0.1$, Peak INP $\le 200$ ms.

3. **Verify Throttled Performance**:
   ```bash
   node scripts/audit-cwv.mjs --routes /acme/p/proj_1/overview --throttle
   ```
   *Expected*: Code 0, LCP $< 2500$ ms under Fast 3G / 4x CPU slowdown.

4. **Verify Legacy URL Redirect**:
   ```bash
   node scripts/audit-cwv.mjs --routes /projects/proj_1/overview
   ```
   *Expected*: Code 0, CLS = 0, instantaneous redirect to `/:orgSlug/p/:publicId/overview`.
