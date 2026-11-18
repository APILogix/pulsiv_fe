# Project: Frontend LCP & Speed Optimization

## Architecture
- **Framework & Routing**: React 19 (`@vitejs/plugin-react` + `babel-plugin-react-compiler`), React Router v7 (`createBrowserRouter`).
- **Data & State Architecture**: TanStack Query v5 with normalized cache, Zustand stores (`auth.store`, `org.store`, `bootstrap.store`).
- **Render & Transition Architecture**: Route-level code splitting via `React.lazy`, guarded by `LoadingBoundary` and `RouteSkeleton`.
- **Optimization Strategy**:
  1. Prune render-blocking fonts and critical path stylesheets in HTML.
  2. Eliminate root modulepreload leakage by decoupling `GlobalStepUpModal` and `RouteSkeleton` from entry chunks.
  3. Decouple non-critical secondary widget queries from the route gate and remove artificial gate delays.
  4. Flatten sequential deep-link and workspace query waterfalls.
  5. Harden CLS and INP runtime hot spots (scroll throttling, context memoization, image sizing).
  6. Automated dual-track verification: E2E Testing Track for automated Playwright/Lighthouse CWV verification across all 140 routes.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Consolidate Web Fonts & Eliminate Render-Blocking | Remove `@fontsource/jetbrains-mono` duplicate imports; optimize Google Fonts in `index.html` with `display=swap`; prevent FOIT and font swap reflows | M1 | Survey (E1, E2, E3) |
| F2 | Static Asset Hygiene & Dead Asset Removal | Delete unreferenced 695KB `public/auth-bg.png` and clean legacy unreferenced auth assets; remove unused `"shadcn"` runtime dependency | M1 | Survey (E1, E2) |
| F3 | HTTP Cache Directives Optimization | Update `public/_headers` with caching rules for `/auth/*`, `/data/*`, and static icons | M1 | Survey (E2) |
| F4 | HTML Boot Skeleton Neutralization | Replace auth-card-specific skeleton in `index.html` with layout-neutral skeleton to prevent CLS on direct dashboard visits | M1 | Survey (E3) |
| F5 | Decouple GlobalStepUpModal from Root Entry | Decouple `GlobalStepUpModal` from `src/app/App.tsx` so modal dependencies do not get pulled into root bundle | M2 | Survey (E2) |
| F6 | Manual Chunking & Bundle Isolation in Vite | Refactor `vite.config.ts` `manualChunks`: remove monolithic `auth-profile`, isolate `RouteSkeleton` into a shared chunk, break down oversized chunks | M2 | Survey (E1, E2) |
| F7 | Module Preload Pruning | Configure `modulePreload.resolveDependencies` in `vite.config.ts` to exclude non-entry vendor chunks from `index.html` `<link rel="modulepreload">` tags | M2 | Survey (E1, E2) |
| F8 | LoadingBoundary & Gate Delay Optimization | Eliminate artificial 30ms settle delay and 220ms crossfade entrance for cached/ready content in `LoadingBoundary.tsx` | M3 | Survey (E1) |
| F9 | Dashboard Multi-Query Gate Decoupling | Decouple secondary widget queries on `ExecutiveDashboard` (9 queries) and `LatencyPage` (7 queries) so LCP renders immediately on primary data | M3 | Survey (E1) |
| F10 | ProjectShellPage Sequential Waterfall Flattening | Render project shell chrome and mount child `<Outlet />` without blocking on full project metadata in `ProjectShellPage.tsx` | M3 | Survey (E1) |
| F11 | Deep-Link Org Scope Gating Resolution | Prevent premature skeleton unmounting on deep links when `activeOrgId` is synchronizing | M3 | Survey (E3) |
| F12 | VirtualList Scroll INP Optimization | Throttle / schedule scroll events with `requestAnimationFrame` in `src/shared/observe/VirtualList.tsx` to prevent main-thread jank | M4 | Survey (E3) |
| F13 | Context Provider Value Memoization | Memoize context values in `ThemeProvider.tsx` and `ProjectShellPage.tsx` to prevent cascading component re-renders | M4 | Survey (E3) |
| F14 | Image Explicit Sizing for CLS Prevention | Add explicit `width` and `height` attributes to all images (e.g. `AddDeviceDialog.tsx`) | M4 | Survey (E3) |
| F15 | In-App Core Web Vitals Instrumentation | Extend `src/infrastructure/web-vitals.ts` with CLS and INP observers and expose `window.__getWebVitalsReport()` | M4 | Survey (E3) |
| F16 | Automated E2E CWV Audit Harness | Create automated Node/Playwright test script (`scripts/audit-cwv.mjs`) auditing all 140 routes for LCP < 2.5s, CLS < 0.1, INP < 200ms | E2E-Track | Survey (E3) |
| F17 | 100% E2E CWV Verification & Adversarial Hardening | Verify all 140 routes pass LCP < 2.5s, CLS < 0.1, INP < 200ms under Fast 3G / CPU throttling; adversarial stress testing | M5 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Design & implement automated CWV audit harness, test runner, and test cases covering all 140 routes (Tiers 1-4) | none | DONE |
| M1 | Font, Asset & Cache Optimization | F1 (font consolidation), F2 (dead asset removal), F3 (cache headers), F4 (boot skeleton) | none | DONE |
| M2 | Bundle Splitting & Preload Optimization | F5 (decouple step-up modal), F6 (manualChunks refactor), F7 (prune module preloads) | M1 | DONE |
| M3 | Waterfall Flattening & LCP Gating Optimization | F8 (gate delay elimination), F9 (multi-query decoupling), F10 (project shell waterfall), F11 (deep-link gating) | M2 | PLANNED |
| M4 | Runtime CWV (CLS & INP) Hardening & Telemetry | F12 (VirtualList scroll throttle), F13 (context memoization), F14 (image sizing), F15 (web-vitals.ts extension) | M3 | PLANNED |
| M5 | Final E2E Pass & Adversarial Hardening | F17 (100% pass on Tiers 1-4 tests, Tier 5 adversarial coverage hardening, clean forensic audit) | E2E, M4 | PLANNED |

## Interface Contracts

### Telemetry Interface (`src/infrastructure/web-vitals.ts`)
```ts
export interface FullWebVitalsReport {
  fcp: number | null;
  lcp: {
    startTime: number;
    renderTime: number;
    elementTag: string | null;
    url: string | null;
  } | null;
  cls: number;
  inp: number | null;
  ttfb: number | null;
}

declare global {
  interface Window {
    __getLcpReport?: () => unknown;
    __getWebVitalsReport?: () => FullWebVitalsReport;
  }
}
```

### Audit Harness Interface (`scripts/audit-cwv.mjs`)
- Invocation: `node scripts/audit-cwv.mjs [--url http://localhost:4173] [--routes all|quick]`
- Exit codes: `0` on all metrics meeting thresholds (LCP < 2500ms, CLS < 0.1, INP < 200ms); `1` on threshold breach.
- Storage seeding:
  - `sessionStorage['auth-storage']`: Authenticated session state.
  - `localStorage['org-storage']`: Active organization (`org_1`) and project (`proj_1`).

### Bundler Configuration Contract (`vite.config.ts`)
- Production build command: `npm run build` (`tsc -b && vite build`) must succeed with code 0.
- `index.html` must NOT preload non-entry chunks (`motion-vendor`, `radix-vendor`, `authn-vendor`, `form-vendor`, `zod-vendor`, `map-vendor`).
- Total preloaded JS on initial HTML load must be < 450 kB.

## Code Layout
- `src/app/App.tsx` - Root app entry, modal providers
- `src/app/index.css` - Global styles, font imports, gate animations
- `src/app/router/` - Route definitions (`routes.tsx`, `public-routes.tsx`, `protected-routes.tsx`)
- `src/shared/motion/LoadingBoundary.tsx` - Route gate & transition logic
- `src/shared/motion/page-ready.ts` - Query tracking and settle logic
- `src/shared/observe/VirtualList.tsx` - Virtualized list with scroll listener
- `src/infrastructure/web-vitals.ts` - CWV telemetry observers
- `src/theme/ThemeProvider.tsx` - Theme context provider
- `src/pages/workspaces/ProjectShellPage.tsx` - Project workspace shell & context provider
- `public/_headers` - HTTP cache-control headers
- `public/` - Static assets
- `scripts/` - E2E audit & verification scripts
