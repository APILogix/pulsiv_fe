# Handoff Report — Explorer M3 Iteration 2 (Hook Structure & Compiler Analysis)

## 1. Observation

### A. Static ESLint & React Compiler Errors
Command executed:
```bash
npx eslint src/pages/workspaces/ProjectShellPage.tsx
```
Verbatim result (Exit code 1):
```
C:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\src\pages\workspaces\ProjectShellPage.tsx
   75:25  error  Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values  react-compiler/react-compiler
   75:82  error  Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values  react-compiler/react-compiler
  163:29  error  Hooks may not be referenced as normal values, they must be called. See https://react.dev/reference/rules/react-calls-components-and-hooks#never-pass-around-hooks-as-regular-values  react-compiler/react-compiler

✖ 3 problems (3 errors, 0 warnings)
```

### B. Runtime Render Fault in Empirical Challenger Suite
Command executed in Milestone 3 Iteration 1 (`scripts/challenge-m3-waterfall-sync.mjs`, Test 4):
```
Runtime exception captured ErrorLynkTrace isolated an unhandled exception to prevent cascading failures. Diagnostic telemetry was recorded. Incident ID ERR-9UKG-KUDN Isolated Runtime Render Fault
```
Verbatim Exception Message:
```
Minified React error #300; visit https://react.dev/errors/300 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
```
React Error #300 definition: "Rendered fewer hooks than expected. This may be caused by an accidental early return statement."

### C. Source Code Inspection (`src/pages/workspaces/ProjectShellPage.tsx`)
1. **Conditional Early Returns**:
   - Line 102: `if (!projectPublicId || !orgSlug) return <Navigate to="/projects" replace />;`
   - Line 105: `if (safePublicId && UUID_REGEX.test(safePublicId)) return <Navigate to={`/projects/${safePublicId}`} replace />;`
   - Line 111: `if (isOrgResolving) return <RouteSkeleton framed />;`
   - Line 116: `if (error || (!projectLoading && !project && !cachedBootstrap)) return (...);`
2. **Hook Invocations Placed AFTER Early Returns**:
   - Line 169:
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
3. **Direct Invocations of `useOrgStore.getState()` in Render Body**:
   - Line 75: `if (matchingOrg && (useOrgStore.getState().activeOrgId !== matchingOrg.id || useOrgStore.getState().activeOrgSlug !== matchingOrg.slug))`
   - Line 84: `if (matchingOrg && (useOrgStore.getState().activeOrgId !== matchingOrg.id || useOrgStore.getState().activeOrgSlug !== matchingOrg.slug))` (inside `useEffect`)
   - Line 163: `if (effectiveProjectId && useOrgStore.getState().activeProjectId !== effectiveProjectId)`
4. **Missing Hook Selectors**:
   - Lines 66–70 currently only select `activeOrgId`:
     ```tsx
     const activeOrgId = useOrgStore((s) => s.activeOrgId);
     const setActiveOrgId = useOrgStore((s) => s.setActiveOrgId);
     const setActiveOrgSlug = useOrgStore((s) => s.setActiveOrgSlug);
     const setActiveProjectId = useOrgStore((s) => s.setActiveProjectId);
     const setActiveProjectSlug = useOrgStore((s) => s.setActiveProjectSlug);
     ```
     `activeOrgSlug` and `activeProjectId` are not selected as reactive hook state.

---

## 2. Logic Chain

1. **Rules of Hooks Violation**:
   - According to React's Rules of Hooks, hooks must be called at the top level and in the exact same order on every render pass. They must NEVER be called inside loops, conditions, or after early returns.
   - In `ProjectShellPage.tsx`, `useMemo` for `contextValue` on line 169 occurs after conditional early returns on lines 102, 105, 111, and 116.
   - When navigating to `/acme/p/proj_1/overview` under cold conditions or out-of-sync org state, the first render pass hits line 111 (`if (isOrgResolving) return <RouteSkeleton framed />;`), executing 13 hooks.
   - On the subsequent render pass when org state is synchronized or project data resolves, `isOrgResolving` is false, and execution continues past line 116 down to line 169, executing hook #14 (`useMemo`).
   - React detects a mismatch in the hook count between render passes and immediately aborts rendering with `Minified React error #300`.
   - **Resolution**: Lift `effectiveProjectId`, `effectiveProject` (memoized), and `contextValue` (memoized) unconditionally above line 102 before any conditional return statements.

2. **React Compiler Lint Violations**:
   - Babel plugin React Compiler (`babel-plugin-react-compiler`) enforces that any identifier starting with `use` (e.g. `useOrgStore`) is treated as a React Hook and must only be called as a function, never referenced as a regular object property (`useOrgStore.getState()`).
   - Referencing `.getState()` in the render body (lines 75 and 163) triggers `react-compiler/react-compiler`: "Hooks may not be referenced as normal values, they must be called".
   - **Resolution**: Read store values using standard Zustand hook selectors at the top of the component:
     ```tsx
     const activeOrgId = useOrgStore((s) => s.activeOrgId);
     const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);
     const activeProjectId = useOrgStore((s) => s.activeProjectId);
     ```
     Then compare against these local hook variables (`activeOrgId !== matchingOrg.id`, `activeOrgSlug !== matchingOrg.slug`, `activeProjectId !== effectiveProjectId`).

3. **Reactivity and Layout Stability Preservation**:
   - Synchronous org scope synchronization during render must be preserved so that Frame 1 renders with the correct org scope, preventing double-skeleton flashes.
   - Synchronous project ID synchronization before returning the shell JSX must be preserved so that `ProjectHeaderBar` and `ProjectSwitcher` display the project immediately without layout shift (CLS = 0).
   - Context value memoization (Feature F13) must be preserved using `useMemo` so child routes and outlet consumers do not suffer cascading re-renders.

---

## 3. Caveats

- `effectiveProject` contains fallback metadata when data is still loading from the network. Wrapping `effectiveProject` in `useMemo` prevents reference instability from creating a new object literal on every render pass, ensuring `contextValue` remains referentially stable.
- The synchronous project ID sync on line 163 should remain right before returning JSX (after early returns) so that redirects (e.g. UUID bounce or project not found) do not inappropriately mutate the active project in `org.store`.

---

## 4. Conclusion

### Fix Strategy for Worker M3

1. **Select all needed state properties at the top of `ProjectShellPage`**:
   Add `activeOrgSlug` and `activeProjectId` alongside `activeOrgId`:
   ```tsx
   const activeOrgId = useOrgStore((s) => s.activeOrgId);
   const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);
   const activeProjectId = useOrgStore((s) => s.activeProjectId);
   const setActiveOrgId = useOrgStore((s) => s.setActiveOrgId);
   const setActiveOrgSlug = useOrgStore((s) => s.setActiveOrgSlug);
   const setActiveProjectId = useOrgStore((s) => s.setActiveProjectId);
   const setActiveProjectSlug = useOrgStore((s) => s.setActiveProjectSlug);
   ```

2. **Eliminate `useOrgStore.getState()`**:
   - On line 75: Replace `useOrgStore.getState().activeOrgId !== matchingOrg.id || useOrgStore.getState().activeOrgSlug !== matchingOrg.slug` with `activeOrgId !== matchingOrg.id || activeOrgSlug !== matchingOrg.slug`.
   - On line 84: Replace `useOrgStore.getState().activeOrgId !== matchingOrg.id || useOrgStore.getState().activeOrgSlug !== matchingOrg.slug` with `activeOrgId !== matchingOrg.id || activeOrgSlug !== matchingOrg.slug`, and include `activeOrgId` and `activeOrgSlug` in the `useEffect` dependency array.
   - On line 163: Replace `useOrgStore.getState().activeProjectId !== effectiveProjectId` with `activeProjectId !== effectiveProjectId`.

3. **Lift all hooks before ANY early returns**:
   Compute `effectiveProjectId`, `effectiveProject` (`useMemo`), and `contextValue` (`useMemo`) immediately after `useScrollRestoration(scrollRef)`, BEFORE lines 102, 105, 111, and 116.

### Exact Proposed Patch for `src/pages/workspaces/ProjectShellPage.tsx`

```diff
--- a/src/pages/workspaces/ProjectShellPage.tsx
+++ b/src/pages/workspaces/ProjectShellPage.tsx
@@ -64,6 +64,8 @@ export function ProjectShellPage() {
   const { organizations, isLoading: orgsLoading } = useOrganizations();
   const bootstrapProjects = useBootstrapProjects();
   const activeOrgId = useOrgStore((s) => s.activeOrgId);
+  const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);
+  const activeProjectId = useOrgStore((s) => s.activeProjectId);
   const setActiveOrgId = useOrgStore((s) => s.setActiveOrgId);
   const setActiveOrgSlug = useOrgStore((s) => s.setActiveOrgSlug);
   const setActiveProjectId = useOrgStore((s) => s.setActiveProjectId);
@@ -72,7 +74,7 @@ export function ProjectShellPage() {
   // Synchronous org scope synchronization during render to eliminate frame gap
   if (orgSlug && organizations.length > 0) {
     const matchingOrg = organizations.find((o) => o.slug?.toLowerCase() === orgSlug.toLowerCase());
-    if (matchingOrg && (useOrgStore.getState().activeOrgId !== matchingOrg.id || useOrgStore.getState().activeOrgSlug !== matchingOrg.slug)) {
+    if (matchingOrg && (activeOrgId !== matchingOrg.id || activeOrgSlug !== matchingOrg.slug)) {
       setActiveOrgId(matchingOrg.id);
       setActiveOrgSlug(matchingOrg.slug);
     }
@@ -81,12 +83,12 @@ export function ProjectShellPage() {
   useEffect(() => {
     if (orgSlug && organizations.length > 0) {
       const matchingOrg = organizations.find((o) => o.slug?.toLowerCase() === orgSlug.toLowerCase());
-      if (matchingOrg && (useOrgStore.getState().activeOrgId !== matchingOrg.id || useOrgStore.getState().activeOrgSlug !== matchingOrg.slug)) {
+      if (matchingOrg && (activeOrgId !== matchingOrg.id || activeOrgSlug !== matchingOrg.slug)) {
         setActiveOrgId(matchingOrg.id);
         setActiveOrgSlug(matchingOrg.slug);
       }
     }
-  }, [orgSlug, organizations, setActiveOrgId, setActiveOrgSlug]);
+  }, [orgSlug, organizations, activeOrgId, activeOrgSlug, setActiveOrgId, setActiveOrgSlug]);
 
   // Derive project identity from bootstrap store or query cache for instant Frame 1 rendering
   const cachedBootstrap = useMemo(() => {
@@ -99,6 +101,45 @@ export function ProjectShellPage() {
   const scrollRef = useRef<HTMLDivElement>(null);
   useScrollRestoration(scrollRef);
 
+  // Synthesize effective project so children and header chrome mount concurrently on Frame 1
+  const effectiveProjectId = project?.id ?? cachedBootstrap?.id ?? safePublicId;
+  const effectiveProject: Project = useMemo(
+    () =>
+      project ?? {
+        id: effectiveProjectId,
+        publicId: safePublicId,
+        orgId: activeOrgId ?? "",
+        name: cachedBootstrap?.name ?? (safePublicId.startsWith("prj_") ? "Project" : safePublicId),
+        slug: cachedBootstrap?.slug ?? safePublicId,
+        description: null,
+        status: (cachedBootstrap?.status as ProjectStatus) ?? "active",
+        timezone: "UTC",
+        tags: [],
+        icon: null,
+        metadata: {},
+        archivedAt: null,
+        deletedAt: null,
+        deletedBy: null,
+        createdAt: "",
+        updatedAt: "",
+        version: 1,
+      },
+    [project, effectiveProjectId, safePublicId, activeOrgId, cachedBootstrap]
+  );
+
+  // Memoize ProjectContext value to eliminate cascading child re-renders (F13)
+  // MUST be called unconditionally before ANY early returns to satisfy Rules of Hooks
+  const contextValue = useMemo<ProjectContextValue>(
+    () => ({
+      project: effectiveProject,
+      projectId: effectiveProjectId,
+      publicId: safePublicId,
+      orgSlug: orgSlug ?? "",
+    }),
+    [effectiveProject, effectiveProjectId, safePublicId, orgSlug]
+  );
+
   if (!projectPublicId || !orgSlug) return <Navigate to="/projects" replace />;
   
   // Only bounce to the legacy UUID router if safePublicId is genuinely a UUID
@@ -138,44 +179,9 @@ export function ProjectShellPage() {
     );
   }
 
-  // Synthesize effective project so children and header chrome mount concurrently on Frame 1
-  const effectiveProjectId = project?.id ?? cachedBootstrap?.id ?? safePublicId;
-  const effectiveProject: Project = project ?? {
-    id: effectiveProjectId,
-    publicId: safePublicId,
-    orgId: activeOrgId ?? "",
-    name: cachedBootstrap?.name ?? (safePublicId.startsWith("prj_") ? "Project" : safePublicId),
-    slug: cachedBootstrap?.slug ?? safePublicId,
-    description: null,
-    status: ((cachedBootstrap?.status as ProjectStatus) ?? "active"),
-    timezone: "UTC",
-    tags: [],
-    icon: null,
-    metadata: {},
-    archivedAt: null,
-    deletedAt: null,
-    deletedBy: null,
-    createdAt: new Date().toISOString(),
-    updatedAt: new Date().toISOString(),
-    version: 1,
-  };
-
   // Synchronously sync active project ID into org.store to prevent header ProjectSwitcher layout shifts
-  if (effectiveProjectId && useOrgStore.getState().activeProjectId !== effectiveProjectId) {
+  if (effectiveProjectId && activeProjectId !== effectiveProjectId) {
     setActiveProjectId(effectiveProjectId);
     setActiveProjectSlug(effectiveProject.slug);
   }
-
-  // Memoize ProjectContext value to eliminate cascading child re-renders (F13)
-  const contextValue = useMemo<ProjectContextValue>(
-    () => ({
-      project: effectiveProject,
-      projectId: effectiveProjectId,
-      publicId: safePublicId,
-      orgSlug,
-    }),
-    [effectiveProject, effectiveProjectId, safePublicId, orgSlug]
-  );
 
   return (
     <ProjectContext.Provider value={contextValue}>
```

---

## 5. Verification Method

To independently verify the resolution after Worker M3 implements the change:

1. **Verify ESLint passes with 0 errors**:
   ```bash
   npx eslint src/pages/workspaces/ProjectShellPage.tsx
   ```
   *Expected*: Clean exit with 0 errors and 0 warnings.

2. **Verify TypeScript compilation**:
   ```bash
   npm run build
   ```
   *Expected*: `tsc -b && vite build` succeeds with exit code 0.

3. **Verify Empirical Challenge Suite**:
   ```bash
   node scripts/challenge-m3-waterfall-sync.mjs
   ```
   *Expected*: All 5 scenarios PASS (5/5 PASS, 100% compliance).
   - Test 1 (Frame 1 Concurrent Shell & Outlet Mount): PASS
   - Test 2 (Legacy UUID / Identifier Redirect Without Bounce Loops): PASS
   - Test 3 (UUID Regex Protection Against Infinite Route Oscillation): PASS
   - Test 4 (Deep-Link Org Scope Alignment & Double-Skeleton Flash): PASS (No React error #300, 0 render faults, zero double-skeleton flash, CLS <= 0.1)
   - Test 5 (ProjectSwitcher Immediate Display & Layout Shift): PASS

4. **Verify Quick Core Web Vitals Audit**:
   ```bash
   npm run test:cwv:quick
   ```
   *Expected*: 15/15 PASS across all audited routes.
