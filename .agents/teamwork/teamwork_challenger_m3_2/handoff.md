# Handoff Report — Milestone 3 Empirical Challenger

## 1. Observation

Direct observations from automated test execution, CDP headless browser instrumentation, and static lint analysis:

### A. Official Core Web Vitals Audit (`npm run test:cwv:quick`)
Command executed: `npm run test:cwv:quick`
Result: **15/15 PASS (100% compliance)**
- **Mean LCP**: 737 ms (threshold <= 2500 ms)
- **Mean CLS**: 0.0003 (threshold <= 0.1)
- **Peak INP**: 22 ms (threshold <= 200 ms)
- Specific Milestone 3 target route:
  - Route `/:orgSlug/p/:projectPublicId/overview` (`/acme/p/proj_1/overview`):
    - LCP: 996 ms
    - CLS: 0
    - INP: 0 ms

### B. Custom Empirical Stress Suite (`scripts/challenge-m3-waterfall-sync.mjs`)
Command executed: `node scripts/challenge-m3-waterfall-sync.mjs`
Targeting:
1. **Test 1 — Frame 1 Concurrent Shell & Outlet Mount**:
   - `ProjectHeaderBar` and child `<Outlet />` (`.scroll-region`) both mounted on Frame 1:
   - Frame 1 telemetry: `{ timestamp: 828.1, hasProjectHeader: true, hasScrollRegion: true, hasSkeleton: true }`
   - Result: **PASS**
2. **Test 2 — Legacy UUID / Identifier Redirect Without Bounce Loops**:
   - Navigated to `http://127.0.0.1:4173/projects/proj_1/overview`
   - Replaced to: `http://127.0.0.1:4173/acme/p/proj_1/overview`
   - Frame navigations count: 1
   - Redirect CLS: 0
   - Result: **PASS**
3. **Test 3 — UUID Regex Route Loop Protection**:
   - Navigated to `http://127.0.0.1:4173/acme/p/11111111-2222-3333-4444-555555555555/overview`
   - Clean bounce to `/acme/projects` without recursive router bounce loop (trail length 1)
   - Result: **PASS**
4. **Test 4 — Deep-Link Org Scope Synchronization with Out-Of-Sync State**:
   - Seeded `localStorage` with out-of-sync org state: `{ activeOrgId: 'org_mismatched_xyz', activeOrgSlug: 'other-slug' }`
   - Navigated to `http://127.0.0.1:4173/acme/p/proj_1/overview`
   - Observed ErrorLynk runtime catch:
     ```
     Runtime exception capturedErrorLynkTrace isolated an unhandled exception to prevent cascading failures. Diagnostic telemetry was recorded. Incident ID ERR-9UKG-KUDN Isolated Runtime Render Fault
     ```
   - Verbatim Exception Message:
     ```
     Minified React error #300; visit https://react.dev/errors/300 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
     ```
   - Persisted Org ID after render: `org_1` (synchronization logic fired correctly)
   - Deep-Link CLS: 0
   - Skeleton mounts: 1, unmounts: 1 (zero double-skeleton flash)
   - Result: **FAIL (Render Fault due to Rules of Hooks violation)**
5. **Test 5 — ProjectSwitcher Display & Layout Stability**:
   - Switcher rendered with stable width (91.67px)
   - Tab switch from `/acme/p/proj_1/overview` to `/acme/p/proj_1/analytics` incurred cumulative CLS: 0
   - Result: **PASS**

### C. Static Analysis & Lint Violations
Command executed: `npx eslint src/pages/workspaces/ProjectShellPage.tsx`
Verbatim output:
```
C:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\src\pages\workspaces\ProjectShellPage.tsx
   75:25  error  Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values  react-compiler/react-compiler
   75:82  error  Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values  react-compiler/react-compiler
  163:29  error  Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values  react-compiler/react-compiler

✖ 3 problems (3 errors, 0 warnings)
```

Direct source inspection of `src/pages/workspaces/ProjectShellPage.tsx`:
- Lines 102–116 contain multiple conditional early returns:
  - Line 102: `if (!projectPublicId || !orgSlug) return <Navigate to="/projects" replace />;`
  - Line 105: `if (safePublicId && UUID_REGEX.test(safePublicId)) return <Navigate to={`/projects/${safePublicId}`} replace />;`
  - Line 111: `if (isOrgResolving) return <RouteSkeleton framed />;`
  - Line 116: `if (error || (!projectLoading && !project && !cachedBootstrap)) return (...);`
- Line 169 contains a hook call after those early returns:
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

---

## 2. Logic Chain

1. **Premise**: In React, all hooks must be called unconditionally and in the identical sequence on every render pass (Rules of Hooks).
2. **Observation**: In `src/pages/workspaces/ProjectShellPage.tsx`, `useMemo` on line 169 is placed after four conditional return statements on lines 102, 105, 111, and 116.
3. **Mechanism**:
   - On initial load when an out-of-sync org state or cold cache triggers an early exit (e.g. line 111 `if (isOrgResolving) return <RouteSkeleton framed />;` or line 116), the component returns early without executing hook index 12 (`useMemo`).
   - Once data resolves and triggers a subsequent render pass, execution proceeds past line 116 to evaluate line 169 `useMemo`.
   - React compares hook invocation counts between render passes, detects an unexpected additional hook, and throws `Minified React error #300` ("Rendered fewer hooks than expected. This may be caused by an accidental early return statement.").
4. **Impact**: The error boundary catches the render exception (`Incident ID ERR-9UKG-KUDN Isolated Runtime Render Fault`), causing the project workspace to crash instead of rendering the project chrome.
5. **Additional Compiler Concern**: Calling `useOrgStore.getState()` on lines 75, 84, and 163 within the render body is flagged by `react-compiler` because `useOrgStore` is named like a hook (`use...`) and is being referenced as a regular object property rather than called.

---

## 3. Caveats

- In the happy path (where `localStorage` is already pre-warmed with the matching org ID and query cache contains cached project bootstrap metadata), the early returns are bypassed and the page renders without error, which is why `npm run test:cwv:quick` passed with 100% compliance.
- However, deep-linking directly into a project URL from cold cache, or after switching orgs in another tab, triggers this fatal runtime crash.

---

## 4. Conclusion

**VERDICT: REJECT**

Milestone 3 cannot be approved in its current state due to a reproducible **Rules of Hooks violation** (`Minified React error #300`) and **React Compiler lint errors** in `src/pages/workspaces/ProjectShellPage.tsx`.

### Required Worker Actions:
1. **Fix Rules of Hooks in `src/pages/workspaces/ProjectShellPage.tsx`**:
   - Either move all hook calls (including `useMemo` for `contextValue`) to the top of `ProjectShellPage` before ANY conditional returns, OR construct `contextValue` as a plain object if returning inside the shell JSX:
     ```tsx
     const contextValue: ProjectContextValue = {
       project: effectiveProject,
       projectId: effectiveProjectId,
       publicId: safePublicId,
       orgSlug,
     };
     ```
     *(Note: If memoization is desired, compute `effectiveProject` and `contextValue` before early returns, or memoize at the component boundary).*
2. **Fix React Compiler Lint Errors**:
   - Avoid calling `useOrgStore.getState()` in component render logic. Instead, read the state slice via the hook selector (e.g., `const activeOrgId = useOrgStore((s) => s.activeOrgId);`) already called at the top of the component.
3. **Verify Clean Pass**:
   - `npx eslint src/pages/workspaces/ProjectShellPage.tsx` must exit 0.
   - `node scripts/challenge-m3-waterfall-sync.mjs` must show 5/5 PASS.

---

## 5. Verification Method

To independently verify the bug and reproduction:
1. Run the static lint check:
   ```bash
   npx eslint src/pages/workspaces/ProjectShellPage.tsx
   ```
   *Expected*: Shows 3 errors regarding `react-compiler/react-compiler`.
2. Run the empirical challenge suite:
   ```bash
   node scripts/challenge-m3-waterfall-sync.mjs
   ```
   *Expected*: Test 4 reproduces `Minified React error #300` and ErrorLynk catch `ERR-9UKG-KUDN`.
3. Invalidation condition:
   - When the worker moves hooks above conditional returns and uses standard Zustand selectors, `node scripts/challenge-m3-waterfall-sync.mjs` will exit 0 with 5/5 PASS and `npx eslint` will exit 0.
