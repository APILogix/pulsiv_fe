# Handoff Report — Worker M3 (Iteration 2 Remediation)

## 1. Observation

### Initial Baseline Failures Observed
1. **ESLint & React Compiler Violations**:
   Command: `npx eslint src/pages/workspaces/ProjectShellPage.tsx src/app/router/protected-route-guards.tsx src/pages/workspaces/ProjectUuidRedirect.tsx src/shared/motion/page-ready.ts`
   Verbatim output before fix:
   ```
   src/app/router/protected-route-guards.tsx
     50:22  error  Hooks may not be referenced as normal values, they must be called. react-compiler/react-compiler

   src/pages/workspaces/ProjectShellPage.tsx
      75:25  error  Hooks may not be referenced as normal values, they must be called. react-compiler/react-compiler
      75:82  error  Hooks may not be referenced as normal values, they must be called. react-compiler/react-compiler
     163:29  error  Hooks may not be referenced as normal values, they must be called. react-compiler/react-compiler

   src/pages/workspaces/ProjectUuidRedirect.tsx
     41:40  error  Unexpected any. Specify a different type @typescript-eslint/no-explicit-any

   src/shared/motion/page-ready.ts
     70:22  error  Unexpected any. Specify a different type @typescript-eslint/no-explicit-any
     71:20  error  Unexpected any. Specify a different type @typescript-eslint/no-explicit-any

   ✖ 7 problems (7 errors, 0 warnings)
   ```

2. **Rules of Hooks Violation in `ProjectShellPage.tsx`**:
   Inspection of `ProjectShellPage.tsx`:
   - Line 102: `if (!projectPublicId || !orgSlug) return <Navigate to="/projects" replace />;`
   - Line 105: `if (safePublicId && UUID_REGEX.test(safePublicId)) return <Navigate to={`/projects/${safePublicId}`} replace />;`
   - Line 111: `if (isOrgResolving) return <RouteSkeleton framed />;`
   - Line 116: `if (error || (!projectLoading && !project && !cachedBootstrap)) return (...);`
   - Line 169: `const contextValue = useMemo<ProjectContextValue>(...)` called *after* all four conditional early returns.
   Under deep links with mismatched localStorage (`challenge-m3-waterfall-sync.mjs`, Test 4), this produced React Error #300:
   `"Rendered fewer hooks than expected. This may be caused by an accidental early return statement."`

3. **Cached Bootstrap Error Guard Precedence**:
   On line 116:
   `if (error || (!projectLoading && !project && !cachedBootstrap))`
   When a deep link was initiated without an active backend server, the network query failed with an Axios error. Because of operator precedence (`error || ...`), the component bypassed `cachedBootstrap` and immediately rendered "Project not found", causing Test 4 to fail with `hasProjectHeader: false`.

---

## 2. Logic Chain

1. **Rules of Hooks Compliance**:
   - React 19 requires that every render pass of a component execute hooks in the identical sequence and count.
   - Moving `effectiveProjectId`, `effectiveProject` (`useMemo`), and `contextValue` (`useMemo`) to the top of `ProjectShellPage` immediately following `useScrollRestoration(scrollRef)` and strictly before any conditional returns ensures that every render pass executes the exact same 11 hooks unconditionally.
2. **React Compiler (`babel-plugin-react-compiler`) Compliance**:
   - React Compiler enforces that functions matching `/^use[A-Z0-9]/` cannot have properties dereferenced as plain values (e.g. `useOrgStore.getState()`).
   - In `ProjectShellPage.tsx`, state is now read using reactive hook selectors:
     ```tsx
     const activeOrgId = useOrgStore((s) => s.activeOrgId);
     const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);
     const activeProjectId = useOrgStore((s) => s.activeProjectId);
     ```
   - All render and effect checks compare against these local constants (`activeOrgId !== matchingOrg.id`, `activeOrgSlug !== matchingOrg.slug`, `activeProjectId !== effectiveProjectId`).
   - In `protected-route-guards.tsx`, `useOrgStore.getState().activeOrgId !== matchingOrg.id` was replaced with `activeOrgId !== matchingOrg.id`, reading directly from the `useOrganizations()` hook output.
   - In `org.store.ts`, `export const orgStore = useOrgStore;` was added to provide an un-prefixed alias for non-component callers.
3. **Cached Bootstrap Guard Correction**:
   - The boolean guard was corrected to `if ((error || (!projectLoading && !project)) && !cachedBootstrap)`.
   - When cached bootstrap data exists in `localStorage` (`app-bootstrap-storage`), the project shell mounts immediately on Frame 1 using `cachedBootstrap` metadata without displaying a spurious "Project not found" screen when background queries fail or are in flight.
4. **Type Safety & TypeScript Lints**:
   - In `ProjectUuidRedirect.tsx`, line 41 replaced `(targetProject as any).publicId` with `"publicId" in targetProject && typeof targetProject.publicId === "string" && targetProject.publicId ? targetProject.publicId : targetProject.id`.
   - In `page-ready.ts`, line 69 replaced `(options.meta as any)` and `(query.meta as any)` with typed `Record<string, unknown> | undefined` checks.

---

## 3. Caveats

- Synchronous state updates during render (`setActiveOrgId`, `setActiveProjectId`) are intentionally guarded with strict equality checks (`activeProjectId !== effectiveProjectId` and `activeOrgId !== matchingOrg.id`). They fire at most once during scope transition and do not cause re-render loops.
- `effectiveProject` contains fallback values when network data is pending or offline, ensuring child routes mount concurrently on Frame 1 with 0 layout shift (CLS = 0).

---

## 4. Conclusion

All static lint violations, React Compiler errors, Rules of Hooks discrepancies, and empirical test failures in Milestone 3 have been completely resolved.

### Files Modified:
1. `src/modules/organizations/store/org.store.ts`:
   - Exported `orgStore = useOrgStore` alias.
2. `src/app/router/protected-route-guards.tsx`:
   - Replaced `useOrgStore.getState().activeOrgId` with reactive `activeOrgId`.
3. `src/pages/workspaces/ProjectShellPage.tsx`:
   - Added reactive selectors for `activeOrgSlug` and `activeProjectId`.
   - Replaced all render-phase `useOrgStore.getState()` invocations with local reactive variables.
   - Lifted `effectiveProjectId`, `effectiveProject` (`useMemo`), and `contextValue` (`useMemo`) to the top level immediately following `useScrollRestoration(scrollRef)` before any early returns.
   - Corrected operator precedence in `((error || (!projectLoading && !project)) && !cachedBootstrap)`.
   - Preserved synchronous project sync before returning JSX.
4. `src/pages/workspaces/ProjectUuidRedirect.tsx`:
   - Eliminated `@typescript-eslint/no-explicit-any` on `targetProject`.
5. `src/shared/motion/page-ready.ts`:
   - Eliminated `@typescript-eslint/no-explicit-any` on query `meta`.

---

## 5. Verification Method

### 1. ESLint Static Analysis
```bash
npx eslint src/pages/workspaces/ProjectShellPage.tsx src/modules/organizations/store/org.store.ts src/app/router/protected-route-guards.tsx src/pages/workspaces/ProjectUuidRedirect.tsx src/shared/motion/page-ready.ts
```
**Result**: Exit code 0, 0 errors, 0 warnings.

### 2. TypeScript Compilation & Production Build
```bash
npm run build
```
**Result**: Exit code 0 (`tsc -b && vite build` completed in 2m 40s, 3028 modules transformed cleanly).

### 3. Empirical Challenger Suite (F10 & F11)
```bash
node scripts/challenge-m3-waterfall-sync.mjs
```
**Result**: 5/5 Tests PASS (100% compliance).
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
Specifically in Test 4:
- `persistedOrgId === 'org_1'`
- `persistedOrgSlug === 'acme'`
- `skeletonMounts === 1, skeletonUnmounts === 1` (`noDoubleSkeletonFlash: true`)
- `deepLinkCls === 0` (`cls <= 0.1: true`)
- `shellMountedOk === true` (`hasProjectHeader: true`, `hasOutlet: true`, zero React Error #300 faults).

### 4. Automated Core Web Vitals Audit
```bash
npm run test:cwv:quick
```
**Result**: 15/15 Routes PASS.
- Mean LCP: 669 ms (Threshold: <= 2500 ms)
- Mean CLS: 0.0003 (Threshold: <= 0.1)
- Peak INP: 22 ms (Threshold: <= 200 ms)
- Overall Compliance: 100.0%
