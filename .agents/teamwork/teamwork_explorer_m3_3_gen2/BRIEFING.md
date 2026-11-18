# BRIEFING — 2026-11-01T02:27:00Z

## Mission
Investigate F10 (ProjectShellPage Sequential Waterfall Flattening) and F11 (Deep-Link Org Scope Gating Resolution) to produce concrete recommendations and code modifications for Worker M3.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m3_3_gen2
- Original parent: ada9a12f-ab2f-447c-a83a-8c4bf9d9bdd7
- Milestone: Milestone 3 (F10 Waterfall Flattening & F11 Deep-Link Org Scope Gating)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Focus on F10 (ProjectShellPage Sequential Waterfall Flattening) and F11 (Deep-Link Org Scope Gating Resolution)
- Ensure findings support zero layout shifts (CLS < 0.1) and seamless gating

## Current Parent
- Conversation ID: ada9a12f-ab2f-447c-a83a-8c4bf9d9bdd7
- Updated: 2026-11-01T02:16:25Z

## Investigation State
- **Explored paths**:
  - `src/pages/workspaces/ProjectShellPage.tsx`
  - `src/app/router/protected-route-guards.tsx` (`OrgRouteGuard`, `OrgScopedRedirect`)
  - `src/pages/workspaces/ProjectUuidRedirect.tsx`
  - `src/modules/projects/hooks/useProjects.ts`, `useProjectScope.ts`, `useEnvironments.ts`, `useEnvironmentScope.ts`
  - `src/modules/organizations/store/org.store.ts`
  - `src/modules/bootstrap/store/bootstrap.store.ts`, `services/bootstrap.service.ts`
  - `src/app/layouts/AppHeader/ProjectSwitcher.tsx`, `OrgSwitcher.tsx`
  - `src/app/layouts/AppDualSidebar.tsx`, `QuotaCardWidget.tsx`, `AuthenticatedAppLayout.tsx`
  - `src/shared/skeletons/RouteSkeleton.tsx`
  - `src/shared/motion/page-ready.ts`, `LoadingBoundary.tsx`
  - `scripts/audit-cwv.mjs`
- **Key findings**:
  1. `ProjectShellPage.tsx` blocks the entire shell and `<Outlet />` on `isLoading = orgsLoading || projectLoading || (!activeOrgId && organizations.length === 0)` returning `<RouteSkeleton framed />`. This blocks `ProjectHeaderBar`, `ProjectContext.Provider`, and child pages from mounting, causing a sequential waterfall of shell metadata query -> child queries.
  2. Child pages only need `projectId` to begin querying their data; `projectId` can be derived synchronously from `useBootstrapProjects()` or fallback to `safePublicId`. Shell chrome and child `<Outlet />` can render concurrently on Frame 1.
  3. `useProjectByPublicId` should be marked with `meta: { nonBlocking: true }` and given `placeholderData` from bootstrap projects so it doesn't block route gates.
  4. `safePublicId.startsWith("prj_")` check bounced valid project IDs like `proj_1` to `/projects/:id`, creating redirect loops. It should only bounce genuine UUIDs (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`).
  5. `OrgRouteGuard` synchronizes `activeOrgId` via asynchronous `useEffect`. This mounts `<Outlet />` with stale or null `activeOrgId` on Frame 1, causing aborted queries, re-fetching, and double-skeleton flashing. Synchronous gating in the render phase eliminates this state gap.
  6. `ProjectShellPage` fails to synchronize `activeProjectId`, causing `ProjectSwitcher` to render "All Projects" and layout shift when updated. Synchronous `activeProjectId` sync eliminates this shift.
  7. `ProjectUuidRedirect` renders `<DetailSkeleton />` with different padding/dimensions than `<RouteSkeleton framed />`, creating CLS on legacy redirects. Replacing it with `<RouteSkeleton framed />` and checking bootstrap projects ensures zero layout shift.
- **Unexplored areas**: None. Complete evidence chains established.

## Key Decisions Made
- Formulated zero-delay concurrent mounting for `ProjectShellPage.tsx`.
- Formulated synchronous render-phase gating for `OrgRouteGuard`.
- Formulated frame unification for `ProjectUuidRedirect.tsx`.
- Formulated exact diffs and line numbers for Worker M3.

## Artifact Index
- `DISPATCH.md` — incoming dispatch records
- `BRIEFING.md` — persistent working memory
- `progress.md` — liveness heartbeat
- `handoff.md` — final 5-component handoff report
