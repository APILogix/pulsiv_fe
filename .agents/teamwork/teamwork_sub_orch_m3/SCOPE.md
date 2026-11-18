# Scope: Milestone 3 (Waterfall Flattening & LCP Gating Optimization)

## Architecture & Objective
Milestone 3 focuses on eliminating runtime render waterfalls, artificial gate delays, and multi-query blocking across primary dashboard, analytics, and workspace shell routes.
The primary goal is to ensure Largest Contentful Paint (LCP) elements render without waiting for secondary or off-screen widgets, nested metadata waterfalls, or cosmetic fade delays.

## Feature Inventory
| # | Feature | Description | Milestone | Status |
|---|---------|-------------|-----------|--------|
| F8 | LoadingBoundary & Gate Delay Optimization | In `src/shared/observe/LoadingBoundary.tsx`, eliminate the artificial 30ms settle delay and 220ms crossfade delay when content is already resolved/cached or on cold fast transitions | M3 | PLANNED |
| F9 | Dashboard Multi-Query Gate Decoupling | In `src/modules/dashboard/ExecutiveDashboard.tsx` and `src/modules/analytics/LatencyPage.tsx`, decouple secondary widget queries from blocking the hero/summary KPI metrics so LCP fires immediately | M3 | PLANNED |
| F10 | ProjectShellPage Sequential Waterfall Flattening | In `src/pages/workspaces/ProjectShellPage.tsx`, render the project navigation chrome and mount `<Outlet />` concurrently rather than sequentially blocking child routes on project metadata | M3 | PLANNED |
| F11 | Deep-Link Org Scope Gating Resolution | Prevent premature layout shifts or fallback thrashing on deep-link routes when `activeOrgId` is resolving from route parameters | M3 | PLANNED |

## Interface Contracts & Constraints
- Visual regression free: Must not break dashboard layout, widget rendering, or project navigation.
- Fallback preservation: Skeletons must still display when data is legitimately fetching on cold network cache misses.
- Metric requirements: LCP < 2.5s across all dashboard and workspace routes; CLS < 0.1, INP < 200ms.
- Production build: `npm run build` must compile cleanly with exit code 0.
- E2E Quick Suite: `npm run test:cwv:quick` must pass 15/15 routes with 100% compliance.
