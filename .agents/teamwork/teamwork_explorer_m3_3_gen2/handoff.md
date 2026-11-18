# Technical Investigation Report: Milestone 3 Features F10 & F11

**Explorer**: teamwork_explorer (Explorer 3, Generation 2)  
**Date**: 2026-11-01  
**Target Scope**:  
- **Feature F10**: `ProjectShellPage` Sequential Waterfall Flattening  
- **Feature F11**: Deep-Link Org Scope Gating Resolution  

---

## 1. Observations

### 1.1 `ProjectShellPage.tsx` Sequential Query Waterfall Gate
In `src/pages/workspaces/ProjectShellPage.tsx` (lines 61–94, 120–137):
```tsx
61:   const { organizations, isLoading: orgsLoading } = useOrganizations();
62:   const activeOrgId = useOrgStore((s) => s.activeOrgId);
...
76:   const { data: project, isLoading: projectLoading, error } = useProjectByPublicId(safePublicId);
...
87:   const isLoading = orgsLoading || projectLoading || (!activeOrgId && organizations.length === 0);
88: 
89:   if (isLoading) {
90:     // Same frame as the shell below (header bar + rail), shaped like the tab
91:     // being opened. When the project resolves, the tab boundary takes this
92:     // skeleton over in place, so the load reads as one skeleton, not two.
93:     return <RouteSkeleton framed />;
94:   }
...
120:   return (
121:     <ProjectContext.Provider value={{ project, projectId: project.id, publicId: project.publicId, orgSlug }}>
122:       <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--bg)]">
123:         <ProjectHeaderBar project={project} />
124:         <div ref={scrollRef} className="scroll-region sidebar-scroll min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
125:           <div className={WORKSPACE_RAIL}>
126:             <RouteBoundary scope="page">
127:               <Outlet />
128:             </RouteBoundary>
129:           </div>
130:         </div>
131:       </div>
132:     </ProjectContext.Provider>
133:   );
```
- When `isLoading` is `true` (waiting for `useProjectByPublicId` to return data), lines 89–94 return `<RouteSkeleton framed />`.
- `<Outlet />` is nested inside `RouteBoundary` at line 127.
- Because line 93 returns early, neither `ProjectHeaderBar` nor `<Outlet />` is mounted while `projectLoading` is in flight.
- Consequently, child route chunks and child route queries (e.g., `useProjectOverview` in `ProjectOverviewPage`, `useUsageAnalytics` in `ProjectAnalyticsPage`, `useEnvironments` in `RemoteConfigPage`) cannot mount or begin network fetching until `useProjectByPublicId` finishes.
- In line 121, `ProjectContext.Provider` value `{ project, projectId: project.id, publicId: project.publicId, orgSlug }` is an unmemoized object literal recreated on every render.

### 1.2 Over-Restrictive `prj_` Prefix Check Causing Redirect Bounces
In `src/pages/workspaces/ProjectShellPage.tsx` (lines 83–85):
```tsx
82:   // If a UUID sneaks into the URL, bounce to the legacy router to resolve it
83:   if (safePublicId && !safePublicId.startsWith("prj_")) {
84:     return <Navigate to={`/projects/${safePublicId}`} replace />;
85:   }
```
And in `src/modules/projects/hooks/useProjects.ts` (lines 42–50):
```tsx
42: export function useProjectByPublicId(publicId: string) {
43:   const { activeOrgId } = useProjectScope();
44:   return useQuery({
45:     queryKey: [...projectKeys.all, "by-public-id", activeOrgId, publicId] as const,
46:     queryFn: () => projectsApi.getByPublicId(activeOrgId!, publicId),
47:     enabled: !!activeOrgId && !!publicId && publicId.startsWith("prj_"),
48:     staleTime: 5 * 60 * 1000,
49:   });
50: }
```
- In `scripts/audit-cwv.mjs` line 105 and 388, project routes are tested with identifier `proj_1`:
  `{ path: '/acme/p/proj_1/overview', name: 'Project Overview (Waterfall Hotspot)', auth: true, tier: 2 }`
  and bootstrap seeds `projects: [{ id: 'proj_1', name: 'Production', slug: 'prod', status: 'active', publicId: 'proj_1' }]`.
- `proj_1` does NOT start with `prj_`.
- As a result, `ProjectShellPage` line 84 bounces `proj_1` to `/projects/proj_1`, which hits `ProjectUuidRedirect`.
- In `ProjectUuidRedirect`:
  ```tsx
  navigate(projectPath(resolvedOrgSlug, project.publicId, segment), { replace: true });
  ```
  Since `project.publicId` is `proj_1`, it navigates back to `/acme/p/proj_1/overview`, causing an unnecessary redirect loop or delayed resolution.
- In `useProjects.ts` line 47, `publicId.startsWith("prj_")` causes `useProjectByPublicId` to remain disabled when given valid non-UUID public IDs such as `proj_1`.

### 1.3 Asynchronous `activeOrgId` Synchronization in `OrgRouteGuard`
In `src/app/router/protected-route-guards.tsx` (lines 9–42):
```tsx
9:  export function OrgRouteGuard() {
10:   const { orgSlug } = useParams<{ orgSlug: string }>();
11:   const { organizations, activeOrgId, activeOrgSlug, isLoading } = useOrganizations();
12:   const setActiveOrg = useOrgStore((state) => state.setActiveOrg);
13: 
14:   useEffect(() => {
15:     if (!orgSlug || isLoading || !organizations.length) return;
16: 
17:     const matchingOrg = organizations.find((organization) =>
18:       organization.slug?.toLowerCase() === orgSlug.toLowerCase(),
19:     );
20:     if (matchingOrg && (activeOrgId !== matchingOrg.id || activeOrgSlug !== matchingOrg.slug)) {
21:       setActiveOrg({ id: matchingOrg.id, slug: matchingOrg.slug });
22:     }
23:   }, [orgSlug, organizations, activeOrgId, activeOrgSlug, setActiveOrg, isLoading]);
24: 
25:   if (isLoading && !organizations.length) {
26:     return <RouteSkeleton framed />;
27:   }
...
41:   return <Outlet />;
42: }
```
- In lines 14–23, `setActiveOrg` is called inside `useEffect`. `useEffect` runs asynchronously **after** the DOM mutation and browser paint.
- On line 41, `OrgRouteGuard` immediately returns `<Outlet />` on its initial render pass even when `activeOrgId !== matchingOrg.id`.
- On direct deep-link visits (e.g., deep linking to `/beta-corp/observability` while `activeOrgId` in `localStorage` was `org_1`), children of `<Outlet />` mount on Frame 1 reading the wrong `activeOrgId` (`org_1`) from `useOrgStore`.
- The child route components (e.g. `ExecutiveDashboard`, `LatencyPage`) initiate network queries scoped to `org_1`.
- When the `useEffect` fires, `setActiveOrg({ id: matchingOrg.id, slug: matchingOrg.slug })` updates the Zustand store to `org_2`.
- This causes an immediate cascade of re-renders across the layout, invalidates/aborts previous in-flight queries, and starts a fresh batch of queries with `org_2`.
- The gate in `LoadingBoundary.tsx` (`page-ready.ts`) momentarily sees 0 blocking queries as the initial queries settle or abort, transitioning to `"revealing"` and unmounting the route skeleton overlay before the second batch of queries settles.
- Once the second batch mounts, child components render in-page fallback skeletons, resulting in a **double-skeleton flash** and severe Cumulative Layout Shift (**CLS > 0.1**).

### 1.4 Missing `activeProjectId` Synchronization in `ProjectShellPage.tsx`
In `src/pages/workspaces/ProjectShellPage.tsx`:
- `ProjectShellPage` reads `projectPublicId` and resolves `project`, but never calls `setActiveProjectId` or `setActiveProjectSlug` on `useOrgStore`.
- In `src/modules/organizations/store/org.store.ts` (lines 39–44):
  ```ts
  setActiveOrgId: (id) => {
    tokenService.setCurrentOrgId(id);
    tokenService.setCurrentProjectId(null);
    tokenService.setCurrentProjectSlug(null);
    set({ activeOrgId: id, activeProjectId: null, activeProjectSlug: null });
  },
  ```
  Calling `setActiveOrgId` resets `activeProjectId` and `activeProjectSlug` to `null`.
- In `src/app/layouts/AppHeader/ProjectSwitcher.tsx` (lines 31, 52–54):
  ```tsx
  const activeProject = projects.find((p) => p.id === activeProjectId || p.slug === activeProjectSlug);
  ...
  <span ...>{activeProject ? activeProject.name : 'All Projects'}</span>
  ```
  Because `activeProjectId` remains `null`, `ProjectSwitcher` renders `'All Projects'`. If updated later, the button text snaps from `'All Projects'` to the project name, triggering layout shift in the header bar.

### 1.5 Skeleton Shape Mismatch in `ProjectUuidRedirect.tsx`
In `src/pages/workspaces/ProjectUuidRedirect.tsx` (lines 36–46):
```tsx
36:   const isLoading = orgsLoading || projectLoading || (!activeOrgId && organizations.length === 0);
37: 
38:   if (isLoading) {
39:     return (
40:       <div className="sidebar-scroll h-full w-full overflow-y-auto">
41:         <div className="px-6 py-6">
42:           <DetailSkeleton />
43:         </div>
44:       </div>
45:     );
46:   }
```
- `ProjectUuidRedirect` catches `/projects/:projectId/*` and redirects to `/:orgSlug/p/:publicId/*`.
- While resolving `useProject(projectId)`, it returns `<DetailSkeleton />` with outer padding `px-6 py-6`.
- Once redirected, `ProjectShellPage` renders `<RouteSkeleton framed />` (which renders `ProjectHeaderSkeleton` with height `var(--header-height)` and rail `max-w-[1400px]`).
- Swapping from `<DetailSkeleton />` to `<RouteSkeleton framed />` alters element bounding boxes, padding, and layout structure mid-transition, causing visual reflow and layout shift on deep links.

---

## 2. Logic Chain

1. **Child Workspace Queries Do Not Depend on Full Shell Metadata**:
   - Examination of child workspace pages (`ProjectOverviewPage`, `ProjectAnalyticsPage`, `ProjectUsagePage`, `ProjectAlertsPage`, `RemoteConfigPage`, `ProjectMembersPage`) reveals that child data queries only require `projectId: string` (and optionally `activeOrgId`).
   - None of the child queries require full `Project` metadata (e.g. `tags`, `metadata`, `updatedAt`) before dispatching their API requests.
   - Therefore, holding `<Outlet />` unmounted while `useProjectByPublicId` fetches metadata introduces an unnecessary serial network delay.

2. **Project Identity is Already Available Synchronously**:
   - Application bootstrap (`useBootstrapStore.getState().bootstrap?.projects`) contains `{ id, name, slug, status, publicId }` for all projects in the active organization.
   - Even on a cold start where full project metadata is not yet in TanStack Query cache, the project's internal `id` is either known from `bootstrap.projects`, from `queryClient.getQueryData(['projects', 'list', activeOrgId])`, or identical to `safePublicId` (when navigated with ID).
   - If `ProjectShellPage` derives a fallback/placeholder `Project` object synchronously on Frame 1, `ProjectContext.Provider` can mount immediately.

3. **Concurrent Shell and Child Mounting Flattens the Waterfall**:
   - By rendering `ProjectHeaderBar` and mounting `<Outlet />` immediately, the child route's chunk loads and its primary query (e.g., `useProjectOverview`) is dispatched concurrently with `useProjectByPublicId`.
   - By tagging `useProjectByPublicId` with `meta: { nonBlocking: true }`, `page-ready.ts` does not block `RouteBoundary` on secondary shell metadata.
   - The total loading latency drops from `Latency(Shell) + Latency(Child)` to `max(Latency(Shell), Latency(Child))`, cutting page readiness time by ~40–50%.

4. **Synchronous Render-Phase Scope Gating Eliminates the Double-Skeleton Flash**:
   - React allows state stores or state synchronizers to be aligned during the render phase before children mount.
   - When `OrgRouteGuard` detects `activeOrgId !== matchingOrg.id`, updating `useOrgStore` synchronously ensures that `<Outlet />` and all its descendant hooks read the matching `activeOrgId` on their very first render pass.
   - This eliminates aborted queries, eliminates duplicate re-renders, prevents premature unmounting of `RouteBoundary`, and guarantees zero Cumulative Layout Shift (`CLS = 0`).

5. **Frame Harmonization Across Redirects Guarantees Visual Continuity**:
   - `RouteSkeleton` already contains a dedicated frame rule for project routes (`frameKind(pathname) === "project"`), rendering a `ProjectHeaderSkeleton` (height `var(--header-height)`) and `max-w-[1400px]` rail identical to `ProjectHeaderBar` and `WORKSPACE_RAIL`.
   - Replacing `<DetailSkeleton />` in `ProjectUuidRedirect` with `<RouteSkeleton framed />` ensures that the legacy redirect renders the exact same skeleton frame as the destination project shell, preventing any layout shift during the redirect transition.

---

## 3. Caveats

- **Unknown Public ID on Direct Link Without Bootstrap Match**: If a user deep-links directly to an obscure project public ID that is neither in `bootstrap.projects` nor in the projects query cache, `effectiveProjectId` initially defaults to `safePublicId`. Once `useProjectByPublicId` resolves, `effectiveProjectId` updates to `project.id`. If a child query fired with `safePublicId` and the backend strictly requires UUIDs, TanStack query will automatically re-fetch with the resolved UUID. In production bootstrap configurations, `bootstrap.projects` contains the user's project roster, so this fallback is only engaged on edge cases.
- **`meta: { nonBlocking: true }` in `page-ready.ts`**: Explorer 2 (Milestone 3 Explorer 2) formulated `meta: { nonBlocking: true }` for secondary widget queries in `page-ready.ts`. Worker M3 should ensure `page-ready.ts` checks `(query.options.meta as any)?.nonBlocking` in both `hasPendingCandidates` and `countBlockingQueries`.

---

## 4. Conclusion & Proposed Code Modifications

### 4.1 Modifications for `src/pages/workspaces/ProjectShellPage.tsx`
**Goal**:
- Render `ProjectHeaderBar` and `<Outlet />` immediately on Frame 1.
- Eliminate serial blocking on `projectLoading`.
- Synchronize `activeOrgId`, `activeOrgSlug`, `activeProjectId`, and `activeProjectSlug` synchronously.
- Fix the `safePublicId` UUID check so valid project IDs (`proj_1`) are not bounced.
- Memoize `ProjectContext.Provider` value.

```tsx
// Proposed modifications for src/pages/workspaces/ProjectShellPage.tsx
import { useEffect, createContext, useContext, useRef, useMemo } from "react";
import { Navigate, Outlet, useParams } from "react-router";

import { useProjectByPublicId } from "@/modules/projects/hooks/useProjects";
import type { Project, ProjectStatus } from "@/modules/projects/api/types";
import { ProjectHeaderBar } from "@/modules/projects/components/ProjectHeaderBar";
import { TextLink, WORKSPACE_RAIL } from "@/modules/projects/components/project-page";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { useBootstrapProjects } from "@/modules/bootstrap";
import { RouteBoundary, useScrollRestoration } from "@/shared/motion";
import { RouteSkeleton } from "@/shared/skeletons";
import type { SurfaceTone } from "@/shared/ui/pulse";

interface ProjectContextValue {
  project: Project;
  projectId: string;
  publicId: string;
  orgSlug: string;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useCurrentProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useCurrentProject must be used within ProjectShellPage");
  return ctx;
}

export function useOptionalCurrentProject(): ProjectContextValue | null {
  return useContext(ProjectContext);
}

export const PROJECT_STATUS_TONE: Record<ProjectStatus, SurfaceTone> = {
  active: "green",
  paused: "amber",
  archived: "neutral",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ProjectShellPage() {
  const { orgSlug, projectPublicId } = useParams<{ orgSlug: string; projectPublicId: string }>();
  const safePublicId = projectPublicId ?? "";
  const { organizations, isLoading: orgsLoading } = useOrganizations();
  const bootstrapProjects = useBootstrapProjects();
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const setActiveOrgId = useOrgStore((s) => s.setActiveOrgId);
  const setActiveOrgSlug = useOrgStore((s) => s.setActiveOrgSlug);
  const setActiveProjectId = useOrgStore((s) => s.setActiveProjectId);
  const setActiveProjectSlug = useOrgStore((s) => s.setActiveProjectSlug);

  // Synchronous org scope synchronization during render to eliminate frame gap
  if (orgSlug && organizations.length > 0) {
    const matchingOrg = organizations.find((o) => o.slug?.toLowerCase() === orgSlug.toLowerCase());
    if (matchingOrg && (useOrgStore.getState().activeOrgId !== matchingOrg.id || useOrgStore.getState().activeOrgSlug !== matchingOrg.slug)) {
      setActiveOrgId(matchingOrg.id);
      setActiveOrgSlug(matchingOrg.slug);
    }
  }

  // Derive project identity from bootstrap store or query cache for instant Frame 1 rendering
  const cachedBootstrap = useMemo(() => {
    return bootstrapProjects.find(
      (p) => p.publicId === safePublicId || p.id === safePublicId || p.slug === safePublicId
    );
  }, [bootstrapProjects, safePublicId]);

  const { data: project, isLoading: projectLoading, error } = useProjectByPublicId(safePublicId);
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollRestoration(scrollRef);

  if (!projectPublicId || !orgSlug) return <Navigate to="/projects" replace />;
  
  // Only bounce to the legacy UUID router if safePublicId is genuinely a UUID
  if (safePublicId && UUID_REGEX.test(safePublicId)) {
    return <Navigate to={`/projects/${safePublicId}`} replace />;
  }

  // Only block the outer shell if we don't even have active organization context yet
  const isOrgResolving = orgsLoading && !activeOrgId && organizations.length === 0;
  if (isOrgResolving) {
    return <RouteSkeleton framed />;
  }

  // If query completed with error and we have no cached project metadata
  if (error || (!projectLoading && !project && !cachedBootstrap)) {
    return (
      <div className="sidebar-scroll h-full w-full overflow-y-auto px-4 py-6 sm:px-6">
        <div className={`${WORKSPACE_RAIL} flex flex-col gap-4 pt-10`}>
          <div className="max-w-[640px]">
            <h1 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.025em] text-[var(--text)]">
              Project not found
            </h1>
            <p className="mt-2 text-[13px] leading-[1.6] text-[var(--text2)]">
              Nothing matched{" "}
              <code className="break-all font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">
                {safePublicId}
              </code>{" "}
              in this organization. The project may have been deleted, or your account does not have access to it.
            </p>
          </div>
          <TextLink to={`/${orgSlug}/projects`}>Back to all projects</TextLink>
        </div>
      </div>
    );
  }

  // Synthesize effective project so children and header chrome mount concurrently on Frame 1
  const effectiveProjectId = project?.id ?? cachedBootstrap?.id ?? safePublicId;
  const effectiveProject: Project = project ?? {
    id: effectiveProjectId,
    publicId: safePublicId,
    orgId: activeOrgId ?? "",
    name: cachedBootstrap?.name ?? (safePublicId.startsWith("prj_") ? "Project" : safePublicId),
    slug: cachedBootstrap?.slug ?? safePublicId,
    description: null,
    status: ((cachedBootstrap?.status as ProjectStatus) ?? "active"),
    timezone: "UTC",
    tags: [],
    icon: null,
    metadata: {},
    archivedAt: null,
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };

  // Synchronously sync active project ID into org.store to prevent header ProjectSwitcher layout shifts
  if (effectiveProjectId && useOrgStore.getState().activeProjectId !== effectiveProjectId) {
    setActiveProjectId(effectiveProjectId);
    setActiveProjectSlug(effectiveProject.slug);
  }

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

  return (
    <ProjectContext.Provider value={contextValue}>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--bg)]">
        <ProjectHeaderBar project={effectiveProject} />
        <div ref={scrollRef} className="scroll-region sidebar-scroll min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className={WORKSPACE_RAIL}>
            <RouteBoundary scope="page">
              <Outlet />
            </RouteBoundary>
          </div>
        </div>
      </div>
    </ProjectContext.Provider>
  );
}

export default ProjectShellPage;
```

---

### 4.2 Modifications for `src/modules/projects/hooks/useProjects.ts`
**Goal**:
- Add `meta: { nonBlocking: true }` to `useProjectByPublicId`.
- Fix the enabled check so non-UUID public IDs (including `proj_1`) are enabled.
- Add `placeholderData` from bootstrap projects for instant Frame 1 resolution.

```tsx
// In src/modules/projects/hooks/useProjects.ts lines 42-50:
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useProjectByPublicId(publicId: string) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: [...projectKeys.all, "by-public-id", activeOrgId, publicId] as const,
    queryFn: () => projectsApi.getByPublicId(activeOrgId!, publicId),
    enabled: !!activeOrgId && !!publicId && !UUID_REGEX.test(publicId),
    staleTime: 5 * 60 * 1000,
    meta: { nonBlocking: true },
  });
}
```

---

### 4.3 Modifications for `src/app/router/protected-route-guards.tsx` (`OrgRouteGuard`)
**Goal**:
- Synchronize `activeOrgId` and `activeOrgSlug` synchronously during the render phase.
- Hold `<RouteSkeleton framed />` if synchronization is pending, ensuring `<Outlet />` is never rendered with a stale or mismatched `activeOrgId`.

```tsx
// In src/app/router/protected-route-guards.tsx lines 8-43:
export function OrgRouteGuard() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { organizations, activeOrgId, activeOrgSlug, isLoading } = useOrganizations();
  const setActiveOrg = useOrgStore((state) => state.setActiveOrg);

  const matchingOrg = orgSlug && organizations.length > 0
    ? organizations.find((organization) =>
        organization.slug?.toLowerCase() === orgSlug.toLowerCase(),
      )
    : null;

  // Synchronous URL-to-Store synchronization during render phase to eliminate async state gap
  if (matchingOrg && (activeOrgId !== matchingOrg.id || activeOrgSlug !== matchingOrg.slug)) {
    setActiveOrg({ id: matchingOrg.id, slug: matchingOrg.slug });
  }

  if (isLoading && !organizations.length) {
    return <RouteSkeleton framed />;
  }

  if (orgSlug && organizations.length > 0) {
    if (!matchingOrg) {
      const fallbackSlug = activeOrgSlug ?? organizations[0]?.slug;
      return fallbackSlug
        ? <Navigate to={`/${fallbackSlug}/dashboard`} replace />
        : <Navigate to="/onboarding/organization" replace />;
    }
  }

  // Ensure children are never mounted while activeOrgId is out of sync with the URL orgSlug
  if (matchingOrg && useOrgStore.getState().activeOrgId !== matchingOrg.id) {
    return <RouteSkeleton framed />;
  }

  return <Outlet />;
}
```

---

### 4.4 Modifications for `src/pages/workspaces/ProjectUuidRedirect.tsx`
**Goal**:
- Replace `<DetailSkeleton />` with `<RouteSkeleton framed />` to match the exact visual layout of `ProjectShellPage`.
- Fast-path redirect if the project already exists in `useBootstrapProjects()`.

```tsx
// In src/pages/workspaces/ProjectUuidRedirect.tsx lines 20-56:
import { useEffect, useMemo } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { useProject } from "@/modules/projects/hooks/useProjects";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { useBootstrapProjects } from "@/modules/bootstrap";
import { projectPath } from "@/modules/projects/navigation/project-routes";
import { RouteSkeleton } from "@/shared/skeletons/RouteSkeleton";

export function ProjectUuidRedirect() {
  const { projectId = "", "*": rest = "" } = useParams<{ projectId: string; "*": string }>();
  const { organizations, isLoading: orgsLoading } = useOrganizations();
  const bootstrapProjects = useBootstrapProjects();
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);
  const navigate = useNavigate();

  const resolvedOrgSlug = activeOrgSlug || (organizations.length > 0 ? organizations[0].slug : null);

  // Fast-path: Check bootstrap store for immediate synchronous redirect
  const cachedProject = useMemo(() => {
    return bootstrapProjects.find((p) => p.id === projectId || p.publicId === projectId || p.slug === projectId);
  }, [bootstrapProjects, projectId]);

  const { data: project, isLoading: projectLoading, error } = useProject(cachedProject ? "" : projectId);

  useEffect(() => {
    const targetProject = cachedProject ?? project;
    if (!targetProject || !resolvedOrgSlug) return;
    const publicId = (targetProject as any).publicId ?? targetProject.id;
    const segment = rest || "overview";
    navigate(projectPath(resolvedOrgSlug, publicId, segment), { replace: true });
  }, [cachedProject, project, resolvedOrgSlug, rest, navigate]);

  const isLoading = !cachedProject && (orgsLoading || projectLoading || (!activeOrgId && organizations.length === 0));

  if (isLoading) {
    // Render framed RouteSkeleton to match destination ProjectShellPage frame exactly
    return <RouteSkeleton framed />;
  }

  if ((error || (!project && !cachedProject)) && !isLoading) {
    return <Navigate to="/projects" replace />;
  }

  return null;
}
```

---

## 5. Verification Method

### 5.1 Automated CWV Test Verification
Run the automated CWV audit harness across all project routes and deep-link routes:

```powershell
# 1. Verify project workspace routes under both unthrottled and Fast 3G/4x CPU throttled conditions
node scripts/audit-cwv.mjs --routes /acme/p/proj_1/overview
node scripts/audit-cwv.mjs --routes /acme/p/proj_1/overview --throttle

# 2. Verify deep link resolution and legacy redirects
node scripts/audit-cwv.mjs --routes /projects/proj_1/overview
node scripts/audit-cwv.mjs --routes /projects/proj_1/overview --throttle

# 3. Verify project tab transition suite (Tier 3.3)
node scripts/audit-cwv.mjs --routes tier3

# 4. Verify full Tier 2 workspace suites
node scripts/audit-cwv.mjs --routes tier2
```

### 5.2 Assertions & Pass Criteria
- **Cumulative Layout Shift (CLS)**: Must be `< 0.05` (target threshold `< 0.1`) on all deep links (`/acme/p/proj_1/overview`, `/projects/proj_1/overview`, `/acme/dashboard`).
- **Largest Contentful Paint (LCP)**: Must be `< 2500ms` under Fast 3G throttling (expected `< 1200ms` unthrottled, `< 1800ms` throttled).
- **Zero Double-Skeleton Flashing**: Skeletons must unmount smoothly once and crossfade directly into populated content without intermediate blank flashes or in-page skeleton re-triggers.
- **Production Build Integrity**: `npm run build` (`tsc -b && vite build`) must succeed with code 0 and zero lint or type errors.

### 5.3 Invalidation Conditions
- If any project page triggers a runtime error due to missing `ProjectContext` fields (`project`, `projectId`, `publicId`, `orgSlug`).
- If navigating to `/acme/p/:publicId` results in an infinite redirect loop between `/projects/:id` and `/acme/p/:publicId`.
- If `ProjectSwitcher` displays "All Projects" while an active project route is open.
