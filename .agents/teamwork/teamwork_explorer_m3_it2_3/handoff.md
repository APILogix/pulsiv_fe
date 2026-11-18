# Handoff Report — Milestone 3 Iteration 2 (Explorer Investigation)

## 1. Observation

Direct observations from empirical test execution, static AST / ESLint analysis, and code inspection across all Milestone 3 files:

### A. Empirical Reproduction via `scripts/challenge-m3-waterfall-sync.mjs`
Command executed: `node scripts/challenge-m3-waterfall-sync.mjs`
Target: Test suite covering Features F10 and F11.

Results:
- **Test 1 — F10 Frame 1 Concurrent Shell & Outlet Mount**: **PASS**
  - ProjectHeaderBar and child `<Outlet />` mounted concurrently on Frame 1 (`timestamp: 838.4ms`, `hasProjectHeader: true`, `hasScrollRegion: true`).
- **Test 2 — F11 Legacy Redirect Clean Resolution & CLS**: **PASS**
  - Navigated from `/projects/proj_1/overview` to `/acme/p/proj_1/overview` cleanly with 1 navigation step and CLS = 0.
- **Test 3 — F10 UUID Regex Route Loop Protection**: **PASS**
  - Navigated to `/acme/p/11111111-2222-3333-4444-555555555555/overview` with clean bounce to `/acme/projects` and no infinite router loop.
- **Test 4 — F11 Org Scope Sync & Zero Double-Skeleton Flash**: **FAIL**
  - LocalStorage seeded with mismatched state: `{ activeOrgId: 'org_mismatched_xyz', activeOrgSlug: 'other-slug' }`.
  - Navigated to `http://127.0.0.1:4173/acme/p/proj_1/overview`.
  - Synchronous org state alignment succeeded: `persistedOrgId: 'org_1'`, `persistedOrgSlug: 'acme'`.
  - Skeleton stability succeeded: `skeletonMounts: 1`, `skeletonUnmounts: 1` (`noDoubleSkeletonFlash: true`).
  - Layout stability succeeded: `deepLinkCls: 0` (`cls <= 0.1: true`).
  - **FATAL RUNTIME RENDER CRASH**:
    - `hasProjectHeader: false`, `shellMountedOk: false`.
    - Main DOM Content captured:
      ```
      Runtime exception capturedErrorLynkTrace isolated an unhandled exception to prevent cascading failures. Diagnostic telemetry was recorded. Incident ID ERR-4XCX-K3L5 Isolated Runtime Render Fault
      ```
    - Verbatim Exception Message:
      ```
      Minified React error #300; visit https://react.dev/errors/300 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
      ```
    - Official React Error #300 Specification:
      > *"Rendered fewer hooks than expected. This may be caused by an accidental early return statement."*
- **Test 5 — F10 & F11 ProjectSwitcher Stability & CLS**: **PASS**
  - Stable width (`91.67px`), tab transition to `/analytics` incurred CLS = 0.

### B. Static Code Inspection & ESLint Audit Across Milestone 3 Files
Command executed:
```bash
npx eslint src/pages/workspaces/ProjectShellPage.tsx src/app/router/protected-route-guards.tsx src/pages/workspaces/ProjectUuidRedirect.tsx src/shared/motion/page-ready.ts src/shared/motion/LoadingBoundary.tsx src/pages/observe/ExecutiveDashboard.tsx src/pages/observe/LatencyPage.tsx
```
Audit Results by File:

1. **`src/pages/workspaces/ProjectShellPage.tsx`**:
   - **Rules of Hooks Violation**:
     - Lines 61–100 declare hooks: `useParams`, `useOrganizations`, `useBootstrapProjects`, `useOrgStore` selectors (x5), `useEffect`, `useMemo` (`cachedBootstrap`), `useProjectByPublicId`, `useRef`, `useScrollRestoration`.
     - Lines 102–116 execute 4 conditional return statements:
       - Line 102: `if (!projectPublicId || !orgSlug) return <Navigate to="/projects" replace />;`
       - Line 105: `if (safePublicId && UUID_REGEX.test(safePublicId)) return <Navigate to={`/projects/${safePublicId}`} replace />;`
       - Line 111: `if (isOrgResolving) return <RouteSkeleton framed />;`
       - Line 116: `if (error || (!projectLoading && !project && !cachedBootstrap)) return (...);`
     - Line 169 declares a hook **AFTER** all four conditional returns:
       ```tsx
       // Memoize ProjectContext value to eliminate cascading child re-renders (F13)
       const contextValue = useMemo<ProjectContextValue>(
         () => ({
           project: effectiveProject,
           projectId: effectiveProjectId,
           publicId: safePublicId,
           orgSlug,
         }),
         [effectiveProject, effectiveProjectId, safePublicId, orgSlug]
       );
       ```
   - **React Compiler Lint Violations (3 errors)**:
     - Lines 75:25, 75:82, 163:29:
       ```
       error Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values react-compiler/react-compiler
       ```
     - Caused by calling `useOrgStore.getState()` inside the component render body.

2. **`src/app/router/protected-route-guards.tsx`**:
   - Hooks lifecycle: Clean. All hooks (`useParams`, `useOrganizations`, `useOrgStore`, `useEffect`) called before conditional returns.
   - **React Compiler Lint Violation (1 error)**:
     - Line 50:22:
       ```
       error Hooks may not be referenced as normal values, they must be called. react-compiler/react-compiler
       ```
     - Caused by: `if (matchingOrg && useOrgStore.getState().activeOrgId !== matchingOrg.id)`

3. **`src/pages/workspaces/ProjectUuidRedirect.tsx`**:
   - Hooks lifecycle: Clean. All hooks (`useParams`, `useOrganizations`, `useBootstrapProjects`, `useOrgStore` selectors, `useNavigate`, `useMemo`, `useProject`, `useEffect`) called unconditionally before line 48.
   - **TypeScript Lint Violation (1 error)**:
     - Line 41:40: `error Unexpected any. Specify a different type @typescript-eslint/no-explicit-any` on `(targetProject as any).publicId`.

4. **`src/shared/motion/page-ready.ts`**:
   - Hooks lifecycle: N/A (utility module with pure functions).
   - **TypeScript Lint Violations (2 errors)**:
     - Lines 70:22, 71:20: `error Unexpected any. Specify a different type @typescript-eslint/no-explicit-any` on `(options.meta as any)` and `(query.meta as any)`.

5. **`src/shared/motion/LoadingBoundary.tsx`**:
   - Hooks lifecycle: Clean. Zero early return hook skipping.
   - ESLint: **0 errors, 0 warnings**.

6. **`src/pages/observe/ExecutiveDashboard.tsx`**:
   - Hooks lifecycle: Clean. All 21 hooks called unconditionally before JSX return.
   - ESLint: **0 errors, 0 warnings**.

7. **`src/pages/observe/LatencyPage.tsx`**:
   - Hooks lifecycle: Clean. All 21 hooks called unconditionally before JSX return.
   - ESLint: **0 errors**, 5 unused variable warnings (`Activity`, `AlertTriangle`, `Clock`, `EndpointPerformanceItem`, `activeProjectId`).

---

## 2. Logic Chain

1. **Premise 1**: In React 19, the Rules of Hooks require that every render pass of a component must execute the identical sequence and count of hooks. Calling a hook conditionally or placing an early return before a hook causes fiber hook linked list pointer discrepancies.
2. **Observation**: In `ProjectShellPage.tsx`, `useMemo` on line 169 occurs after conditional return statements on lines 102, 105, 111, and 116.
3. **Trigger Mechanism in Test 4**:
   - On Frame 1, deep-linking into `/acme/p/proj_1/overview` with mismatched `localStorage` (`activeOrgId: 'org_mismatched_xyz'`) initiates org synchronization via line 76 (`setActiveOrgId('org_1')`).
   - On the initial pass, `cachedBootstrap` is matched (`proj_1`), allowing execution to pass line 116 and execute `useMemo` on line 169 (Hook index 13).
   - Calling `setActiveOrgId` triggers a Zustand subscriber re-render.
   - During the subsequent render pass, when query states update or if `error` is populated, execution enters the early return at line 116 (`if (error || (!projectLoading && !project && !cachedBootstrap)) return (...)`).
   - Consequently, line 169 is skipped, reducing the hook count from 13 to 12.
   - React throws `Minified React error #300` (*"Rendered fewer hooks than expected. This may be caused by an accidental early return statement."*).
   - ErrorLynk's root error boundary isolates the fatal render fault (`ERR-4XCX-K3L5`), unmounting `ProjectHeaderBar` and failing Test 4 (`shellMountedOk: false`).
4. **Validation**: Test 4 telemetry confirmed:
   - `persistedOrgId: 'org_1'` (PASS)
   - `noDoubleSkeletonFlash: true` (PASS, mounts: 1, unmounts: 1)
   - `deepLinkCls: 0` (PASS, threshold <= 0.1)
   - `shellMountedOk: false` (ONLY failure, solely caused by Error #300 crash).
   - Therefore, eliminating the Rules of Hooks violation in `ProjectShellPage.tsx` directly restores `shellMountedOk: true` and yields 5/5 PASS on `scripts/challenge-m3-waterfall-sync.mjs`.
5. **Static Compiler Mechanism**: React Compiler treats any identifier beginning with `use...` as a hook function. Referencing `useOrgStore.getState()` in component render logic violates the compiler constraint against passing/referencing hooks as regular object values.

---

## 3. Caveats

- **Zustand Render-Phase Setters**: Calling store setter actions (`setActiveOrgId`, `setActiveProjectId`) directly in the render body is intentional in this codebase to achieve synchronous Frame 1 org/project alignment and eliminate a 1-frame skeleton gap. However, reading store state during render must be done via reactive hook selectors (`const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);`) rather than `useOrgStore.getState()`.
- **Pre-warmed Cache Masking**: In normal in-app navigations where `localStorage` already holds the target org (`org_1`), line 116 does not return early, which is why standard CWV quick tests (`npm run test:cwv:quick`) passed 15/15 while cold deep-links failed.

---

## 4. Conclusion

1. **Root Cause Confirmed**: The Challenger 2 veto is 100% valid and isolated to `src/pages/workspaces/ProjectShellPage.tsx`. No other Milestone 3 files violate the Rules of Hooks.
2. **Single Remediation Target**: Moving `effectiveProject` and `contextValue` (`useMemo`) above line 102 completely eliminates React Error #300 and resolves Test 4 with 0 layout shift and 0 render faults.
3. **Comprehensive Action Plan for Worker M3**:
   - **Step 1: Refactor `src/pages/workspaces/ProjectShellPage.tsx`**:
     - Compute `effectiveProjectId`, `effectiveProject` (memoized), and `contextValue` (memoized) unconditionally at the top of `ProjectShellPage`, immediately following `useScrollRestoration(scrollRef)`.
     - Move all 4 conditional returns (lines 102, 105, 111, 116) to follow ALL hook declarations.
     - Add selectors: `const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);` and `const activeProjectId = useOrgStore((s) => s.activeProjectId);`.
     - Replace `useOrgStore.getState().activeOrgId` with `activeOrgId`, `useOrgStore.getState().activeOrgSlug` with `activeOrgSlug`, and `useOrgStore.getState().activeProjectId` with `activeProjectId`.
   - **Step 2: Clean Up `src/app/router/protected-route-guards.tsx`**:
     - Replace `useOrgStore.getState().activeOrgId !== matchingOrg.id` with `activeOrgId !== matchingOrg.id` (or export non-hook store instance `orgStore` in `org.store.ts` for imperative checks).
   - **Step 3: Clean Up TypeScript `any` Lints**:
     - In `src/pages/workspaces/ProjectUuidRedirect.tsx` line 41: Replace `(targetProject as any).publicId` with safe property check `("publicId" in targetProject && targetProject.publicId ? String(targetProject.publicId) : targetProject.id)`.
     - In `src/shared/motion/page-ready.ts` lines 70–71: Replace `(options.meta as any)?.nonBlocking` with `(options.meta as Record<string, unknown> | undefined)?.nonBlocking`.
   - **Step 4: Clean Up Unused Imports**:
     - In `src/pages/observe/LatencyPage.tsx`: Remove unused imports `Activity`, `AlertTriangle`, `Clock`, `EndpointPerformanceItem`, and unused variable `activeProjectId`.

---

## 5. Verification Method

To independently verify the fix:

1. **Verify ESLint passes on all Milestone 3 files**:
   ```bash
   npx eslint src/pages/workspaces/ProjectShellPage.tsx src/app/router/protected-route-guards.tsx src/pages/workspaces/ProjectUuidRedirect.tsx src/shared/motion/page-ready.ts src/shared/motion/LoadingBoundary.tsx src/pages/observe/ExecutiveDashboard.tsx src/pages/observe/LatencyPage.tsx
   ```
   *Success Condition*: Exits with code 0 (zero errors).

2. **Verify Empirical Challenge Suite (Waterfall & Scope Sync)**:
   ```bash
   node scripts/challenge-m3-waterfall-sync.mjs
   ```
   *Success Condition*: Exits with code 0 and outputs:
   ```
   ============================================================
    EMPIRICAL CHALLENGE SUITE SUMMARY
   ============================================================
   [PASS] F10 Frame 1 Concurrent Shell & Outlet Mount
   [PASS] F11 Legacy Redirect Clean Resolution & CLS
   [PASS] F10 UUID Regex Route Loop Protection
   [PASS] F11 Org Scope Sync & Zero Double-Skeleton Flash
   [PASS] F10 & F11 ProjectSwitcher Stability & CLS
   ============================================================
   ```
   Specifically verifies Test 4:
   - `persistedOrgId === 'org_1'`
   - `skeletonMounts <= 1` (zero double-skeleton flash)
   - `cls <= 0.1` (measured 0)
   - `shellMountedOk === true` (zero render faults, ProjectHeaderBar & Outlet present).

3. **Verify Quick Core Web Vitals Audit**:
   ```bash
   npm run test:cwv:quick
   ```
   *Success Condition*: 15/15 PASS (100% compliance, Mean LCP < 2500ms, CLS < 0.1, INP < 200ms).

4. **Verify Production Build**:
   ```bash
   npm run build
   ```
   *Success Condition*: TypeScript checks pass (`tsc -b`), Vite bundle completes with code 0.
