# Handoff Report: Survey Explorer 3
**Focus Area**: Runtime Performance, Network Waterfalls, State Management, Core Web Vitals (CLS/INP), and Audit Infrastructure
**Milestone**: M1 — Architecture Survey & Discovery

---

## 1. Observation

### 1.1 State Management & Network Architecture
- **Framework & Libraries**:
  - `package.json` lines 12–38 directly specify:
    ```json
    "@tanstack/react-query": "^5.62.7",
    "axios": "^1.7.9",
    "zustand": "^5.0.2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router": "^7.0.2"
    ```
- **TanStack Query Configuration**:
  - `src/lib/query-client.ts` lines 25–37 configure the module singleton `queryClient`:
    ```ts
    export const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
          gcTime: 30 * 60 * 1000,
          retry: (failureCount, error) => !(error instanceof ApiError) && failureCount < 1,
          refetchOnWindowFocus: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
    ```
  - `src/lib/query-client.ts` line 39 invokes `trackQueryLifecycle(queryClient)`.
- **Client State Management (Zustand)**:
  - `useAuthStore` (`src/modules/auth/store/auth.store.ts` lines 27–95) uses `sessionStorage` with key `auth-storage` to persist `user`, `isAuthenticated`, `isAdmin`, `mfaVerified`.
  - `useOrgStore` (`src/modules/organizations/store/org.store.ts` lines 18–75) uses `localStorage` with key `org-storage` and syncs with `tokenService` for `activeOrgId`, `activeOrgSlug`, `activeProjectId`, `activeProjectSlug`.
  - `useBootstrapStore` (`src/modules/bootstrap/store/bootstrap.store.ts` lines 7, 32) manages an in-memory snapshot of `BootstrapData` with `STALE_THRESHOLD_MS = 5 * 60 * 1000`.
- **Sequential Network Waterfall on Protected Routes**:
  - `src/app/router/protected-routes.tsx` lines 237–242 wrap organization routes under `OrgRouteGuard`:
    ```tsx
    {
      path: ":orgSlug",
      element: <OrgRouteGuard />,
      children: [
        { index: true, element: <Navigate to="dashboard" replace /> },
        { path: "dashboard", element: <AnimatedRoute><DashboardPage /></AnimatedRoute> },
        ...
    ```
  - `src/modules/organizations/hooks/useOrganizations.ts` lines 40–45 fetch the organization list:
    ```ts
    const query = useQuery({
      queryKey: orgQueryKeys.lists(),
      queryFn: () => orgApi.listOrganizations({ limit: 100 }),
      staleTime: 5 * 60 * 1000,
      enabled: isAuthenticated && bootstrapOrgs.length === 0,
    });
    ```
  - `src/modules/projects/hooks/useProjects.ts` lines 21–29 gate all project list queries:
    ```ts
    export function useProjects(query: ListProjectsQuery = DEFAULT_PROJECTS_QUERY) {
      const { activeOrgId } = useProjectScope();
      return useQuery({
        queryKey: projectKeys.list(activeOrgId, query),
        queryFn: () => projectsApi.list(activeOrgId!, query),
        enabled: !!activeOrgId,
        staleTime: 5 * 60 * 1000,
        placeholderData: keepPreviousData,
      });
    }
    ```
  - Over 200 hook locations (in `useAlerting.ts`, `useAutomation.ts`, `useSdkConfigs.ts`, `signal.tsx`, `QuotaCardWidget.tsx`, etc.) gate queries with `enabled: !!activeOrgId`.
- **Skeleton Gate Early Release Mechanism**:
  - `src/shared/motion/page-ready.ts` lines 55–61 define:
    ```ts
    function isEnabled(query: Query): boolean {
      const options = query.options as { enabled?: boolean | ((q: Query) => boolean); queryFn?: unknown };
      if (options.queryFn === skipToken) return false;
      const enabled = options.enabled;
      if (typeof enabled === "function") return enabled(query) !== false;
      return enabled !== false;
    }
    ```
  - `src/shared/motion/page-ready.ts` lines 68–81:
    ```ts
    export function hasPendingCandidates(client: QueryClient, since: number): boolean {
      return client
        .getQueryCache()
        .getAll()
        .some((query) => {
          if (query.state.data !== undefined) return false;
          if (query.state.status === "error") return false;
          if (!isEnabled(query)) return false;
          ...
        });
    }
    ```
  - `src/shared/motion/LoadingBoundary.tsx` lines 210–223: On first layout effect, `GateContent` checks `hasPendingCandidates`. When `activeOrgId` is not yet populated, all page queries have `enabled: false`, causing `hasPendingCandidates` to return `false`, which immediately sets `state` to `revealing` or `entering` and unmounts the skeleton.

### 1.2 Core Web Vitals Risks (CLS & INP)
- **Cumulative Layout Shift (CLS)**:
  - **Inlined `#root` Skeleton Mismatch**:
    - `index.html` lines 35–142 inline a hardcoded auth card skeleton `<div class="boot-status">` inside `<div id="root">` with max-width `440px` (`boot-shell`), `boot-card-box`, and `boot-line-input`.
    - When React mounts on protected routes (e.g. `/acme/dashboard`), the entire content inside `#root` is replaced with `AuthenticatedAppLayout` and `RouteSkeleton` (full-screen desktop sidebar + top nav + wide data grid).
  - **Font Preload & Duplicate Import Overload**:
    - `index.html` lines 22–30 load Google Fonts:
      ```html
      <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" />
      ```
    - `src/app/index.css` lines 3–5 also import `@fontsource/jetbrains-mono/400.css`, `500.css`, and `600.css`.
    - The build output bundles 12 separate font files (`latin`, `latin-ext`, `cyrillic`, `greek`, `vietnamese` in both `.woff` and `.woff2`), adding ~150KB of font assets while simultaneously fetching Google Fonts with `display: swap`. Fallback font metric overrides (`size-adjust`, `ascent-override`, `descent-override`) are absent, risking text reflow layout shifts upon swap.
  - **Images Missing Explicit Dimensions**:
    - `src/modules/auth/components/profile/AddDeviceDialog.tsx` line 211 renders:
      `<img src={totpQrCodeUrl} alt="TOTP QR code" className="size-44 object-contain" />`
      without explicit HTML `width={176}` and `height={176}` attributes.
- **Interaction to Next Paint (INP)**:
  - **Unthrottled Scroll Event in VirtualList**:
    - `src/shared/observe/VirtualList.tsx` lines 54–60:
      ```ts
      const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        setScrollTop(el.scrollTop);
        if (onEndReached && el.scrollHeight - el.scrollTop - el.clientHeight < rowHeight * 6) {
          onEndReached();
        }
      };
      ```
      This triggers synchronous React state updates on every scroll tick without `requestAnimationFrame` scheduling, risking main-thread jank during concurrent user interactions.
  - **Unmemoized Context Value Objects**:
    - `src/theme/ThemeProvider.tsx` line 101:
      ```tsx
      <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, resolvedTheme: 'dark' }}>
      ```
      Re-creates the context object on every provider render.
    - `src/pages/workspaces/ProjectShellPage.tsx` lines 121–123:
      ```tsx
      <ProjectContext.Provider value={{ project, projectId: project.id, publicId: project.publicId, orgSlug }}>
      ```
      Passes a freshly instantiated object literal to `ProjectContext.Provider` on every render of `ProjectShellPage`, forcing re-render of all downstream consumers of `useCurrentProject()` whenever the shell updates.
  - **Heavy Geo Projection Processing**:
    - `src/pages/dashboards/WorldChoropleth.tsx` lines 32–60 renders a world map via `react-simple-maps`, parsing `/data/countries-110m.json` and rendering hundreds of SVG paths synchronously on the main thread.

### 1.3 Measurement and Audit Infrastructure
- **Available Scripts in `package.json`**:
  - Lines 6–11:
    ```json
    "scripts": {
      "dev": "vite",
      "build": "tsc -b && vite build",
      "lint": "eslint .",
      "preview": "vite preview"
    }
    ```
  - Zero test scripts (`test`, `test:e2e`, `test:cwv`, `audit`). Zero testing frameworks installed in dependencies/devDependencies (no vitest, playwright, puppeteer, cypress, or lighthouse).
- **Existing Telemetry in `src/infrastructure/web-vitals.ts`**:
  - Lines 28–87 observe:
    1. `paint` entries (`first-contentful-paint`)
    2. `largest-contentful-paint` (LCP)
    3. Exposes `window.__getLcpReport()`.
  - **Gaps**: Does NOT observe or report Cumulative Layout Shift (CLS via `layout-shift`) or Interaction to Next Paint (INP via `event` or `long-animation-frame`).
- **Production Build Execution (`npm run build`)**:
  - Command: `tsc -b && vite build`
  - Output: Exited with code `0`, `3028 modules transformed`, built in `2m 55s`.
  - Total stylesheet size: `dist/assets/index-C3czgyoD.css` is `247.85 kB` (raw) / `55.06 kB` (gzipped).
  - Main vendor chunks: `react-core` (`216.28 kB` / `69.30 kB` gz), `auth-profile` (`360.92 kB` / `88.15 kB` gz), `motion-vendor` (`127.49 kB` / `41.89 kB` gz), `map-vendor` (`102.49 kB` / `35.65 kB` gz).

---

## 2. Logic Chain

1. **Premise 1**: On a cold visit or deep-link navigation to a protected URL (e.g. `/:orgSlug/observability/traces`), the user has not yet populated `useOrgStore.activeOrgId`.
2. **Step 1.1**: `OrgRouteGuard` and `useBootstrapEffect` trigger `/me/bootstrap` or `/organizations?limit=100`.
3. **Step 1.2**: All sub-queries on the destination route (traces, projects, alerts) check `enabled: !!activeOrgId`. Because `activeOrgId` is falsy, their `enabled` flag is false.
4. **Step 1.3**: When `RouteBoundary` (`LoadingBoundary.tsx:212`) calls `hasPendingCandidates`, `isEnabled(query)` evaluates to `false` for every pending page query.
5. **Step 1.4**: Therefore, `hasPendingCandidates` returns `false`, causing the route skeleton overlay to exit immediately.
6. **Step 1.5**: When the bootstrap response resolves 200–500ms later and sets `activeOrgId`, the queries are finally enabled and make their network requests.
7. **Conclusion 1 (Network Waterfall & CLS Risk)**: This creates a two-phase sequential network waterfall (Bootstrap -> Page Queries) and defeats the "one skeleton per page" invariant, dropping the skeleton prematurely and flashing empty or unpopulated UI before data arrives.
8. **Premise 2**: Core Web Vitals targets mandate LCP <= 2.5s, CLS <= 0.1, INP <= 200ms across all audited routes.
9. **Step 2.1**: The hardcoded `#root` skeleton in `index.html` is an auth modal card (max-width 440px), whereas the destination pages are multi-column data dashboards with sidebars. The replacement of `#root` on mount changes the visual layout drastically.
10. **Step 2.2**: Dual font loading (`index.html` Google Fonts + `index.css` `@fontsource/jetbrains-mono`) causes duplicate font network transfers and layout shifts during `font-display: swap` without metric overrides.
11. **Step 2.3**: `VirtualList` scrolls trigger unthrottled React state updates on every scroll tick, and `ProjectShellPage`'s unmemoized context value forces all child tabs to re-render, creating main-thread execution blocks that increase Interaction to Next Paint (INP).
12. **Conclusion 2 (CWV Vulnerabilities)**: The application is vulnerable to CLS from skeleton mismatch and font swapping, and INP degradation under rapid scrolling or project context updates.
13. **Premise 3**: Acceptance Criteria require automated verification of CWV thresholds across all audited routes, but `package.json` contains no test or audit runner, and `web-vitals.ts` only captures FCP and LCP.
14. **Conclusion 3 (Measurement Gap)**: An automated E2E audit harness (Playwright/CDP or Lighthouse CI) must be set up, and `src/infrastructure/web-vitals.ts` must be extended to report CLS and INP.

---

## 3. Caveats

1. **Dashboard Data Seam**: As documented in `PRODUCT.md` (lines 33–34), current dashboard pages render deterministic sample fixtures (`getHomeBoard()`, `fleetTotals()`) without live backend API calls. Real API waterfalls will emerge when live backend endpoints are wired into these dashboard seams.
2. **Production React Compiler**: React Compiler (`babel-plugin-react-compiler`) is enabled only in production (`isProd = process.env.NODE_ENV === "production"` in `vite.config.ts:16`). In development mode, unmemoized context values and hooks do not benefit from automatic compiler memoization.
3. **Network Constraints**: Remote API latency varies by environment. Caching mitigates repeat visits (`staleTime: 5 min`), but the cold-start waterfall remains on fresh browser sessions.

---

## 4. Conclusion

The application architecture has solid foundations (TanStack Query caching, route-level code splitting, dedicated route skeletons), but contains five critical bottlenecks for runtime performance, CWV compliance, and automated auditability:

1. **Sequential Deep-Link Waterfall**: Gating all page queries on `enabled: !!activeOrgId` serializes data fetching behind `/me/bootstrap` and prematurely unmounts the route skeleton.
2. **Font Loading & Asset Duplication**: Dual font delivery (`@fontsource/jetbrains-mono` 12 locale files in CSS + Google Fonts CDN in HTML) bloats bundle size and risks font-swap layout shift.
3. **INP Hotspots**: Synchronous `onScroll` state updates in `VirtualList` and unmemoized context providers (`ProjectShellPage`, `ThemeProvider`) introduce avoidable main-thread overhead.
4. **HTML Boot Skeleton Mismatch**: The login-shaped skeleton in `index.html` creates visual discontinuity when booting directly into authenticated dashboard routes.
5. **Missing Audit Infrastructure**: Zero automated testing or audit scripts exist in `package.json`, and `web-vitals.ts` lacks CLS and INP instrumentation.

---

## 5. Verification Method

### 5.1 Verification Commands
1. **Production Build Verification**:
   ```bash
   npm run build
   ```
   *Expected*: Passes with exit code 0 (`tsc -b && vite build`), no type errors.
2. **Production Preview Server**:
   ```bash
   npm run preview -- --port 4173
   ```
   *Expected*: Serves production build at `http://localhost:4173`.
3. **Chrome DevTools / Lighthouse CLI Performance Audit**:
   ```bash
   npx lighthouse http://localhost:4173/auth/login --view --only-categories=performance
   ```
   *Expected*: LCP < 2.5s, CLS < 0.1, Total Blocking Time < 150ms.

### 5.2 Automated Audit Harness Blueprint for E2E Testing Track

To fulfill Acceptance Criteria across all routes, implement the following harness:

#### Step 1: Extend In-App Metric Instrumentation (`src/infrastructure/web-vitals.ts`)
Add CLS and INP observers to `web-vitals.ts` and expose `window.__getWebVitalsReport()`:
```ts
export interface FullWebVitalsReport {
  fcp: number | null;
  lcp: { startTime: number; renderTime: number; elementTag: string | null; url: string | null } | null;
  cls: number;
  inp: number | null;
  ttfb: number | null;
}
```
- Observe `layout-shift`: Accumulate `entry.value` for shifts where `!entry.hadRecentInput` using 5-second maximum session windows.
- Observe `event`: Track interaction durations (click, keydown, pointerdown) where `durationThreshold: 16` and report the 98th percentile duration as INP.

#### Step 2: Automated Route Runner Script (`scripts/audit-cwv.mjs`)
Create a Node script using Playwright or Puppeteer that:
1. Spawns `vite preview` on `http://127.0.0.1:4173`.
2. Iterates over a defined route manifest:
   - Public: `/auth/login`, `/auth/register`, `/auth/forgot-password`
   - Authenticated: `/:orgSlug/dashboard`, `/:orgSlug/dashboards/overview`, `/:orgSlug/observability/traces`, `/:orgSlug/observability/logs`, `/:orgSlug/projects`, `/:orgSlug/alerts`
3. Pre-injects authenticated state into `sessionStorage` (`auth-storage`) and `localStorage` (`org-storage`) via `page.addInitScript()`:
   ```js
   sessionStorage.setItem('auth-storage', JSON.stringify({ state: { isAuthenticated: true, user: { id: 'u1', email: 'test@example.com' } }, version: 0 }));
   localStorage.setItem('org-storage', JSON.stringify({ state: { activeOrgId: 'org_1', activeOrgSlug: 'acme' }, version: 0 }));
   ```
4. Navigates to each route, waits for network idle / page ready, simulates standard interactions (click a tab, type in search), and reads `window.__getWebVitalsReport()`.
5. Asserts:
   - `lcp.startTime <= 2500` ms
   - `cls <= 0.1` (or `<= 0.02`)
   - `inp <= 200` ms
6. Outputs a formatted Markdown summary table and exits with non-zero code if any threshold fails.

#### Invalidation Conditions
- Any route audit where LCP exceeds 2500ms under Fast 3G / 4x CPU throttling.
- Any layout shift where CLS >= 0.1 during initial hydration or skeleton crossfade.
- Any interaction latency where INP >= 200ms during typing, filtering, or list scrolling.
