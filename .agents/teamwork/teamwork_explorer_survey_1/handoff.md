# Route, Component, Layout & LCP Analysis Survey Report

**Explorer**: Survey Explorer 1 (Routes, Components, Pages & LCP Analysis)  
**Date**: 2026-10-31  
**Working Directory**: `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_survey_1`  
**Parent Conversation ID**: `9e64db92-a7c4-4556-b668-3209b9a2d3d0`

---

## 1. Observation

### 1.1 Project Architecture & Build Characteristics
- **Routing Engine**: React Router v7 (`"react-router": "^7.0.2"` in `package.json:29`), configured via `createBrowserRouter` in `src/app/router/routes.tsx:7-17`.
- **Bundler & Compiler**: Vite 6 (`"vite": "^6.0.3"`) with `@tailwindcss/vite` 4.3.1 and `babel-plugin-react-compiler` (19.1.0-rc.2 configured in `vite.config.ts:15-23` when `isProd` is true).
- **Production Build Results** (`npm run build` executed at 2026-10-31 23:17 UTC):
  - TypeScript compilation (`tsc -b`) passed with **0 errors**.
  - Total modules transformed: **3,028 modules**.
  - Built output in `dist/assets/`:
    - Entry HTML: `dist/index.html` (7.09 kB, gzip: 2.13 kB).
    - Entry CSS: `dist/assets/index-CowEpDmY.css` (**248.03 kB**, gzip: 55.08 kB).
    - Entry JS: `dist/assets/index-zD8Hs-0s.js` (70.10 kB, gzip: 19.02 kB).
    - React Core vendor: `dist/assets/react-core-DcVtC1FV.js` (216.28 kB, gzip: 69.30 kB).
    - Motion vendor: `dist/assets/motion-vendor-CDK1nRuk.js` (127.49 kB, gzip: 41.89 kB).
    - Map vendor: `dist/assets/map-vendor-aQck_uCj.js` (102.49 kB, gzip: 35.65 kB).
    - Router vendor: `dist/assets/router-vendor-wejczQWj.js` (90.52 kB, gzip: 30.62 kB).
    - Radix vendor: `dist/assets/radix-vendor-D3UjEnxe.js` (76.65 kB, gzip: 23.46 kB).
    - Auth Profile chunk: `dist/assets/auth-profile-BMnwhnYI.js` (**360.92 kB**, gzip: 88.15 kB).
    - Auth Shared chunk: `dist/assets/auth-shared-D3lEUR8-.js` (**145.49 kB**, gzip: 43.87 kB).
    - RemoteConfigPanel chunk: `dist/assets/RemoteConfigPanel-CK7gAKzo.js` (88.82 kB, gzip: 28.34 kB).
    - AuthenticatedAppLayout: `dist/assets/AuthenticatedAppLayout-CIH5Y5wU.js` (85.61 kB, gzip: 24.63 kB).

### 1.2 Initial HTML & Critical Rendering Path Observations
- **Render-Blocking External Stylesheet in `index.html:22-30`**:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    rel="preload"
    as="style"
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap"
  />
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap"
  />
  ```
  The `<link rel="stylesheet">` halts the browser's main thread and critical rendering path until Google Fonts responds, delaying First Contentful Paint (FCP) and the inline boot skeleton.
- **Redundant Font Delivery**:
  - `index.html` loads `JetBrains Mono` from Google Fonts.
  - Simultaneously, `src/app/index.css:3-5` imports `@fontsource/jetbrains-mono/400.css`, `500.css`, and `600.css`, producing 28 individual `.woff` and `.woff2` font files in `dist/assets/` (Latin, Latin-ext, Greek, Cyrillic, Vietnamese).
- **Module Preload Over-Eagerness in `dist/index.html:115-130`**:
  Vite's `modulePreload` emitted 15 `<link rel="modulepreload">` tags in `index.html`, including `auth-profile-BMnwhnYI.js` (360.92 kB), `auth-shared-D3lEUR8-.js` (145.49 kB), `motion-vendor` (127.49 kB), `router-vendor` (90.52 kB), `radix-vendor` (76.65 kB), `network-vendor` (45.43 kB), `icons-vendor` (44.56 kB), `query-vendor` (35.93 kB), `toast-vendor` (32.31 kB), and `form-vendor` (28.48 kB). On the very first visit to `/auth/login`, over **1.2 MB** of uncompressed JavaScript is preloaded ahead of the page's actual requirements.
- **Unreferenced Heavy Static Assets**:
  - `public/auth-bg.png`: **694,941 bytes** (~695 KB) raw uncompressed PNG in `public/` that is never referenced anywhere in `src/`.
  - `public/auth/auth-network.webp` (70.7 kB), `auth-observability.webp` (36.9 kB), `auth-security.webp` (86.1 kB): legacy unreferenced assets.

### 1.3 Skeleton & Transition Delay Mechanism
- **`src/shared/motion/LoadingBoundary.tsx`**:
  - Line 41: `const SETTLE_MS = 30;`
  - Line 44: `const OVERLAY_EXIT_MS = 140;`
  - Line 46: `const REVEAL_MS = 220;`
  - Lines 132-158: Wraps route content in `GateContent` and overlays `RouteSkeleton`.
  - Lines 210-224: `useLayoutEffect` checks `hasPendingCandidates(client, since)`. If any query was observed during mount that has no cached data, `state` is set to `"waiting"` and flag `"hold"` is set.
  - Lines 277-285: `hidden = state === "checking" || state === "waiting";`
  - Rendered wrapper: `<div className="route-gate" data-gate={hidden ? "hidden" : state === "ready" ? undefined : state} ...>`
- **`src/app/index.css:641-660`**:
  - Line 641-643: `.route-gate[data-gate="hidden"] { opacity: 0; }`
  - Lines 651-653: `.route-gate[data-gate="revealing"] { animation: route-gate-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both; }`
  - Direct consequence: When queries are pending, the page content has `opacity: 0` and is completely invisible. Even after the last query finishes, the page waits `SETTLE_MS` (30ms) before transitioning to `"revealing"` (220ms animation). Total artificial render delay added to LCP: **~250ms minimum** on top of the longest query.

### 1.4 Sequential Multi-Tier Query Waterfalls
- **Waterfall 1: Project Shell (`src/pages/workspaces/ProjectShellPage.tsx:76-135`)**:
  - Tier 1: `useOrganizations()` in `AuthenticatedAppLayout` checks bootstrap / orgs.
  - Tier 2: `ProjectShellPage` calls `useProjectByPublicId(safePublicId)`. If `isLoading` is true, line 93 renders `<RouteSkeleton framed />` and **does not mount `<Outlet />`**.
  - Tier 3: Only after `useProjectByPublicId` resolves does `ProjectShellPage` mount `<Outlet />`, which then mounts child tab pages (`ProjectOverviewPage`, `ProjectAnalyticsPage`, etc.).
  - Tier 4: Child page queries (`useProjectOverview`, `useProjectStats`, `useProjectActivity`) begin fetching.
  - Tier 5: `LoadingBoundary` waits for all Tier 4 queries to settle + 30ms settle + 220ms crossfade before LCP elements paint.
- **Waterfall 2: Observability Executive Dashboard (`src/pages/observe/ExecutiveDashboard.tsx:94-102`)**:
  - Fires **9 concurrent queries** on mount:
    1. `requests` (`useObservabilityList`)
    2. `errors` (`useObservabilityList`)
    3. `traces` (`useObservabilityList`)
    4. `logs` (`useObservabilityList`)
    5. `crons` (`useObservabilityList`)
    6. `traffic` (`useSignalTimeline`)
    7. `services` (`useServicesAnalytics`)
    8. `endpoints` (`useEndpointsAnalytics`)
    9. `groups` (`useErrorGroupsList`)
  - Because `countBlockingQueries(client, since) > 0` counts every active query without data, the slowest of these 9 queries dictates when the page becomes visible.
- **Waterfall 3: Latency Page (`src/pages/observe/LatencyPage.tsx:38-45`)**:
  - Fires **7 concurrent queries** on mount: `useLatencyOverview`, `useLatencyTimeSeries`, `useLatencyStatusSeries`, `useLatencyDistribution`, `useLatencyEndpoints`, `useLatencyEndpointDetail`, `useLatencySlowRequests`.

---

## 2. Logic Chain

```
Observation 1.2: index.html has render-blocking <link rel="stylesheet"> for Google Fonts
  → Logic Step 1: The browser cannot render the initial styled HTML (or the inline boot skeleton) until the external stylesheet is fetched and parsed.
  → Impact: Directly increases TTFB-to-FCP delay across all 130+ routes.

Observation 1.2: index.html also preloads 15 JS chunks totaling > 1.2MB, including auth-profile (360kB)
  → Logic Step 2: High bandwidth contention on initial load delays the arrival of the specific route chunk needed for the current URL.
  → Impact: Increases "Resource load delay" and "Resource load duration" for LCP chunks.

Observation 1.3: LoadingBoundary holds data-gate="hidden" (opacity: 0) while any navigation query is fetching
  → Logic Step 3: Candidate LCP elements (headings, cards, data tables) cannot paint or be recorded as LCP until ALL queries registered during mount complete.
  → Logic Step 4: The 30ms settle delay + 220ms crossfade animation (route-gate-in) adds an unavoidable ~250ms render delay even after fast queries return.
  → Impact: Makes LCP strictly dependent on the SLOWEST network query plus animation overhead.

Observation 1.4: Multi-query pages (ExecutiveDashboard has 9, LatencyPage has 7) and ProjectShellPage has a 3-tier sequential waterfall
  → Logic Step 5: For Project Shell tabs (/p/:projectPublicId/*), child queries cannot even initiate until the parent project query settles.
  → Logic Step 6: For dashboards with 7-9 queries, if a single secondary widget query (e.g., slow requests or service analytics) takes 1.5s, the primary LCP metric cards and header remain invisible at opacity: 0.
  → Conclusion: Addressing query waterfalls, decoupling non-critical queries from the route gate, eliminating external font render-blocking, and pruning eager module preloads will produce drastic reductions in LCP.
```

---

## 3. Comprehensive Route Inventory & Candidate LCP Elements

The application contains **140 route endpoints** organized into 17 logical surface modules. Every route has been surveyed below:

### 3.1 Public & Authentication Routes (Layout: `AuthLayout` via `public-routes.tsx`)
All auth routes are code-split via `lazy(() => import(...))`. On desktop (`lg+`), routes declaring `withAuthAside(...)` render a 2-column split with a descriptive aside figure; on mobile, they render a focused 400px column.

| Path | Component | Chunk / Split | Candidate LCP Element | Viewport Position | Bottlenecks & Notes |
|---|---|---|---|---|---|
| `/auth/login` | `LoginPage` | Lazy (`LoginPage.tsx`) | Desktop: `<h2>` in `SignalPanel` ("Know before your users do.")<br>Mobile: `<h1>` ("Sign in to LynkTrace") | Desktop: Left aside top 40%<br>Mobile: Centered form | Modulepreload contention (1.2MB JS preloaded in index.html). Google Fonts stylesheet blocking render. |
| `/auth/register` | `RegisterPage` | Lazy (`RegisterPage.tsx`) | Desktop: `<h2>` in `SetupPanel` ("From sign-up to first event.")<br>Mobile: `<h1>` ("Create your account") | Desktop: Left aside top 40%<br>Mobile: Centered form | Same initial bundle & font blocking overhead. |
| `/auth/login/sso` | `SsoLoginPage` | Lazy (`SsoLoginPage.tsx`) | Desktop: `<h2>` in `HandoffPanel` ("Single sign-on, without the mystery.")<br>Mobile: `<h1>` ("Single sign-on") | Desktop: Left aside<br>Mobile: Centered form | Same initial bundle overhead. |
| `/auth/forgot-password` | `ForgotPasswordPage` | Lazy | `<h1>` ("Reset your password") | Centered 400px column | Lazy loaded; light DOM; fast render once chunk loads. |
| `/auth/reset-password` | `ResetPasswordPage` | Lazy | `<h1>` ("Set a new password") | Centered 400px column | Token query in URL; no blocking API call on mount. |
| `/auth/verify-email` | `VerifyEmailPage` | Lazy | `<h1>` ("Verify your email address") | Centered 400px column | Verification status card / action button. |
| `/auth/login/mfa` | `LoginMfaPage` | Lazy | `<h1>` ("Two-factor authentication") | Centered 400px column | MFA code input block. |
| `/auth/login/backup-code` | `BackupCodesPage` | Lazy | `<h1>` ("Enter backup code") | Centered 400px column | Single input field and submit button. |
| `/auth/unlock` | `AccountUnlockRequestPage` | Lazy | `<h1>` ("Unlock your account") | Centered 400px column | Account unlock form. |
| `/auth/unlock/confirm` | `AccountUnlockConfirmPage` | Lazy | `<h1>` ("Account unlocked") | Centered 400px column | Confirmation notice card. |
| `/auth/callback` | `AuthCallbackPage` | Lazy | Status spinner / Wordmark card | Centered 400px column | OAuth callback resolution logic. |
| `/account/delete/confirm` | `AccountDeletionConfirmPage`| Lazy | `<h1>` ("Delete account") | Centered 400px column | Danger confirmation card. |
| `/accept-invite` | `AcceptInviteLandingPage` | Lazy | `<h1>` ("Join organization") | Centered 400px column | Org invite details card. |
| `/loading` | `LoadingScreen` | Lazy | Wordmark / pulsing spinner | Centered | Standalone fallback screen. |
| `/error-preview` | `ErrorPreviewPage` | Lazy | `<h1>` ("Error Preview") | Centered | Test/preview surface. |

---

### 3.2 Standalone Protected Flow Routes
Rendered outside the main dual-sidebar shell:

| Path | Component | Chunk / Split | Candidate LCP Element | Viewport Position | Bottlenecks & Notes |
|---|---|---|---|---|---|
| `/onboarding/organization` | `CreateOrganizationPage` | Lazy | `<h1>` ("Create your organization") or onboarding wizard card | Centered shell | Fast initial render; form inputs. |
| `/billing/checkout/success`| `CheckoutSuccessPage` | Lazy | `<h1>` ("Payment successful") & plan activation card | Centered shell | Stripe checkout callback; webhook sync. |
| `/billing/checkout/cancel` | `CheckoutCancelPage` | Lazy | `<h1>` ("Checkout canceled") & notice card | Centered shell | Immediate render. |

---

### 3.3 Root & Custom Dashboards (Layout: `AppLayout` -> `ModuleLayout`)
All wrapped with `RouteBoundary` (`LoadingBoundary.tsx`). Custom dashboards use synchronous fixture datasets from `board/fixtures.ts`:

| Path | Component | Chunk / Split | Candidate LCP Element | Viewport Position | Bottlenecks & Notes |
|---|---|---|---|---|---|
| `/:orgSlug/dashboard` | `DashboardPage` | Lazy (`dashboard/index.ts`) | `Ledger` departure board table (`SERVICES`) or `Readouts` band | Top 20% to 60% of viewport | Synchronous sample fixture data. Fast LCP once chunk and layout load. |
| `/:orgSlug/dashboards/overview` | `DashboardsOverview` | Lazy (`DashboardsOverview.tsx`) | Concourse board `Ledger` table of all 10 dashboards | Top 25% of viewport | Synchronous fixture data. Immediate render. |
| `/:orgSlug/dashboards/executive` | `ExecutiveCommandCenter` | Lazy (`ExecutiveCommandCenter.tsx`) | Availability readout card / SLO ledger table | Top 20% to 50% | Synchronous fixture data. |
| `/:orgSlug/dashboards/performance` | `PerformanceDeepDive` | Lazy (`PerformanceDeepDive.tsx`) | P99 SLO readout strip / latency heatmap panel | Top 20% to 45% | Synchronous fixture data. |
| `/:orgSlug/dashboards/errors` | `ErrorTriage` | Lazy (`ErrorTriage.tsx`) | Error triage ledger / issue classification card | Top 25% | Synchronous fixture data. |
| `/:orgSlug/dashboards/geo` | `GeoAnalytics` | Lazy (`GeoAnalytics.tsx`) | `WorldChoropleth` map container / country ledger | Upper-mid viewport | Loads `/data/countries-110m.json` asynchronously (107 kB) at runtime. Map SVG rendering delay. |
| `/:orgSlug/dashboards/realtime` | `RealtimeTraffic` | Lazy (`RealtimeTraffic.tsx`) | Live rps readout strip / traffic burst graph | Top 20% | Realtime simulation timers. |
| `/:orgSlug/dashboards/tracing` | `TracingDependencyMap` | Lazy (`TracingDependencyMap.tsx`) | Service topology node graph / dependency table | Mid viewport | Heavy SVG calculations (340 LOC, multiple bezier curves). |
| `/:orgSlug/dashboards/infrastructure`| `InfrastructureCost` | Lazy (`InfrastructureCost.tsx`) | Cost run-rate readout card / cluster ledger | Top 25% | Synchronous fixture data. |
| `/:orgSlug/dashboards/security` | `SecurityThreat` | Lazy (`SecurityThreat.tsx`) | Threat count readout strip / security event ledger | Top 20% | Synchronous fixture data. |
| `/:orgSlug/dashboards/releases` | `ReleaseQuality` | Lazy (`ReleaseQuality.tsx`) | Deploy quality index / service release ledger | Top 25% | Synchronous fixture data. |
| `/:orgSlug/dashboards/business` | `BusinessMetrics` | Lazy (`BusinessMetrics.tsx`) | Active tenants readout / billing tiers ledger | Top 20% | Synchronous fixture data. |
| `/:orgSlug/dashboards/reports` | `ScheduledReportsPage` | Lazy (`ScheduledReportsPage.tsx`) | Scheduled reports table / header card | Top 30% | Query for reports; small DOM. |
| `/:orgSlug/dashboards/reports/new` | `CreateReportPage` | Lazy (`CreateReportPage.tsx`) | Report creation wizard card & format selector | Centered rail | Interactive form. |

---

### 3.4 Pulse Observability Module (Layout: `AppLayout` -> `ModuleLayout`)

| Path | Component | Chunk / Split | Candidate LCP Element | Viewport Position | Bottlenecks & Notes |
|---|---|---|---|---|---|
| `/:orgSlug/observability` | `ExecutiveDashboard` | Lazy (`ExecutiveDashboard.tsx`) | `ReadoutBand` KPI cells (Requests, Error rate, p95) / `SignalHistogram` | Upper-mid viewport | **CRITICAL BOTTLENECK**: Fires **9 concurrent queries** on mount. `LoadingBoundary` keeps entire page at `opacity: 0` until the slowest query finishes. |
| `/:orgSlug/observability/requests` | `RequestsPage` | Lazy (`RequestsPage.tsx`) | `InfiniteTable` request stream rows or `PageHeader` | Mid viewport | Live query with cursor pagination; table body renders after API response. |
| `/:orgSlug/observability/requests/:requestId` | `RequestDetailPage` | Lazy (`RequestDetailPage.tsx`) | `StickyRequestHeader` / `SummaryCards` strip | Top 15% | Single-entity detail query (`requests/:id`). |
| `/:orgSlug/observability/errors` | `ErrorGroupsPage` | Lazy (`ErrorGroupsPage.tsx`) | `InfiniteTable` error events list | Mid viewport | Time window + severity queries. |
| `/:orgSlug/observability/errors/:fingerprint` | `ErrorDetailPage` | Lazy (`ErrorDetailPage.tsx`) | Error title card / stack trace container | Top 25% | Detail fetch for error fingerprint. |
| `/:orgSlug/observability/error-groups` | `ErrorGroupsListPage`| Lazy (`ErrorGroupsListPage.tsx`) | Error groups table / issue status badges | Mid viewport | Grouped aggregation query. |
| `/:orgSlug/observability/error-groups/:groupId` | `ErrorGroupDetailPage` | Lazy (`ErrorGroupDetailPage.tsx`) | Issue summary card / occurrences histogram | Top 25% | Detail query with occurrence history. |
| `/:orgSlug/observability/latency` | `LatencyPage` | Lazy (`LatencyPage.tsx`) | `ReadoutBand` strip / `TimeSeriesChart` | Upper viewport | **CRITICAL BOTTLENECK**: Fires **7 concurrent queries** on mount. All 7 must settle before `LoadingBoundary` crossfades to content. |
| `/:orgSlug/observability/traces` | `TracesPage` | Lazy (`TracesPage.tsx`) | `InfiniteTable` trace list / duration badges | Mid viewport | Trace search query. |
| `/:orgSlug/observability/traces/:traceId` | `TraceDetailPage` | Lazy (`TraceDetailPage.tsx`) | `StickyTraceHeader` / `SummaryCards` KPI strip / `SpanTreeWaterfall` | Upper viewport | Hierarchical span tree calculation (`buildSpanTree`) in `useMemo`. |
| `/:orgSlug/observability/traces/:traceId/spans/:spanId` | `SpanDetailPage` | Lazy (`SpanDetailPage.tsx`) | Span metadata card / timing bar | Mid viewport | Sub-span detail inspection. |
| `/:orgSlug/observability/logs` | `LogsPage` | Lazy (`LogsPage.tsx`) | Log stream console table / search bar | Mid viewport | Log query with streaming. |
| `/:orgSlug/observability/logs/:eventId` | `LogDetailPage` | Lazy (`LogDetailPage.tsx`) | Structured log entry JSON inspector card | Top 20% | Single event fetch. |
| `/:orgSlug/observability/metrics` | `MetricsPage` | Lazy (`MetricsPage.tsx`) | Metrics explorer grid of small multiples | Mid viewport | Metric catalog and time series query. |
| `/:orgSlug/observability/metrics/:metricId` | `MetricDetailPage` | Lazy (`MetricDetailPage.tsx`) | Metric deep-dive chart container | Top 30% | Granular time series. |
| `/:orgSlug/observability/profiling` | `ProfilingPage` | Lazy (`ProfilingPage.tsx`) | Flamegraph / CPU profile list table | Mid viewport | Profiling samples query. |
| `/:orgSlug/observability/profiling/:profileId` | `ProfileDetailPage` | Lazy (`ProfileDetailPage.tsx`) | Flamegraph SVG container / hot path tree | Upper-mid viewport | Canvas/SVG flamegraph rendering. |
| `/:orgSlug/observability/crons` | `CronsPage` | Lazy (`CronsPage.tsx`) | Cron monitor check-in status grid | Mid viewport | Monitor schedule status query. |
| `/:orgSlug/observability/crons/:checkinId` | `CronDetailPage` | Lazy (`CronDetailPage.tsx`) | Check-in timing execution card | Top 20% | Single check-in detail. |
| `/:orgSlug/observability/runtime-metrics` | `RuntimeMetricsPage` | Lazy (`RuntimeMetricsPage.tsx`) | Memory heap & CPU usage chart strip | Top 30% | Node.js/JVM runtime telemetry. |
| `/:orgSlug/observability/event-loop` | `EventLoopPage` | Lazy (`EventLoopPage.tsx`) | Event loop lag histogram / p99 bar | Top 25% | Microtask lag metrics. |
| `/:orgSlug/observability/gc-monitoring` | `GcMonitoringPage` | Lazy (`GcMonitoringPage.tsx`) | GC pause duration & frequency chart | Top 25% | Garbage collection telemetry. |

---

### 3.5 Services Module (Layout: `AppLayout` -> `ModuleLayout`)

| Path | Component | Chunk / Split | Candidate LCP Element | Viewport Position | Bottlenecks & Notes |
|---|---|---|---|---|---|
| `/:orgSlug/services` | `ServiceCatalogPage` | Lazy (`ServiceCatalogPage.tsx`) | Service catalog cards grid or `PageHeader` `<h1>` | Top 25% | `useServicesAnalytics` query blocks LCP. |
| `/:orgSlug/services/dependencies` | `ServiceDependenciesPage` | Lazy (`ServiceDependenciesPage.tsx`) | Service dependency graph / caller matrix | Mid viewport | Dependency matrix visualization. |
| `/:orgSlug/services/slos` | `ServiceSlosPage` | Lazy (`ServiceSlosPage.tsx`) | SLO burn rate card / objective cards grid | Top 30% | SLO calculation query. |

---

### 3.6 Workspaces & Project Shell Routes (Layout: `AppLayout` -> `ProjectShellPage`)

| Path | Component | Chunk / Split | Candidate LCP Element | Viewport Position | Bottlenecks & Notes |
|---|---|---|---|---|---|
| `/:orgSlug/projects` | `ProjectsPage` | Lazy (`ProjectsPage.tsx`) | `Readouts` band (Total, Active, Paused) / `SheetTable` | Top 25% | `useProjects` list query. |
| `/:orgSlug/projects/new` | `CreateProjectWizardPage`| Lazy | Wizard step card & template picker | Centered rail | Redirects/opens create modal. |
| `/:orgSlug/p/:projectPublicId/overview` | `ProjectOverviewPage` | Lazy (`ProjectOverviewPage.tsx`) | `ProjectPageHeader` / `Readouts` (24h events, error rate) / `HourlyBars` | Top 20% to 40% | **SEQUENTIAL WATERFALL**: Blocked by `useProjectByPublicId` in shell, then queries `useProjectOverview` + `useProjectStats`. |
| `/:orgSlug/p/:projectPublicId/analytics` | `ProjectAnalyticsPage` | Lazy (`ProjectAnalyticsPage.tsx`) | Telemetry charts panel / traffic volume strip | Top 30% | Blocked by project shell waterfall. |
| `/:orgSlug/p/:projectPublicId/usage` | `ProjectUsagePage` | Lazy (`ProjectUsagePage.tsx`) | Event quota meter / billable volume card | Top 25% | Blocked by project shell waterfall. |
| `/:orgSlug/p/:projectPublicId/activity` | `ProjectActivityPage` | Lazy (`ProjectActivityPage.tsx`) | Activity audit stream table | Mid viewport | Blocked by project shell waterfall. |
| `/:orgSlug/p/:projectPublicId/environments` | `ProjectEnvironmentsPage` | Lazy (`ProjectEnvironmentsPage.tsx`) | Environment cards grid (Production, Staging) | Top 30% | Blocked by project shell waterfall. |
| `/:orgSlug/p/:projectPublicId/api-keys` | `ProjectApiKeysPage` | Lazy (`ProjectApiKeysPage.tsx`) | API keys `SheetTable` / token prefix badges | Mid viewport | Blocked by project shell waterfall. |
| `/:orgSlug/p/:projectPublicId/remote-config` | `RemoteConfigPage` | Lazy (`RemoteConfigPage.tsx`) | Feature flag / config key table | Mid viewport | RemoteConfigPanel chunk is 88.8 kB. |
| `/:orgSlug/p/:projectPublicId/alerts` | `ProjectAlertsPage` | Lazy (`ProjectAlertsPage.tsx`) | Active project alerts list table | Mid viewport | Project-scoped alert queries. |
| `/:orgSlug/p/:projectPublicId/alert-rules` | `ProjectThresholdsPage`| Lazy (`ProjectThresholdsPage.tsx`) | Threshold rules table / metric criteria badges | Mid viewport | Alerting rule definitions query. |
| `/:orgSlug/p/:projectPublicId/alert-channels` | `ProjectAlertChannelsPage`| Lazy (`ProjectAlertChannelsPage.tsx`)| Notification destinations list table | Mid viewport | Destination channels query. |
| `/:orgSlug/p/:projectPublicId/routes` | `ProjectAlertRoutesPage`| Lazy (`ProjectAlertRoutesPage.tsx`)| Escalation routing policies table | Mid viewport | Routing trees query. |
| `/:orgSlug/p/:projectPublicId/routes/:routeId` | `AlertRouteWizardPage` | Lazy (`AlertRouteWizardPage.tsx`)| Route condition builder / quiet hours picker | Mid viewport | Complex wizard subtrees. |
| `/:orgSlug/p/:projectPublicId/connectors` | `ProjectConnectorsPage`| Lazy (`ProjectConnectorsPage.tsx`)| Connector integration tiles grid | Top 30% | External webhooks & connectors. |
| `/:orgSlug/p/:projectPublicId/deliveries` | `AlertDeliveryLogsPage` | Lazy (`AlertDeliveryLogsPage.tsx`)| Notification delivery audit table | Mid viewport | Webhook delivery logs. |
| `/:orgSlug/p/:projectPublicId/dlq` | `DeadLetterQueuePage` | Lazy (`DeadLetterQueuePage.tsx`) | Failed delivery replay table | Mid viewport | Dead letter queue table. |
| `/:orgSlug/p/:projectPublicId/preferences`| `MemberAlertPreferencesPage`| Lazy (`MemberAlertPreferencesPage.tsx`)| Notification preference toggles card | Top 30% | User preference settings. |
| `/:orgSlug/p/:projectPublicId/members` | `ProjectMembersPage` | Lazy (`ProjectMembersPage.tsx`) | Project team members table | Mid viewport | Member role bindings. |
| `/:orgSlug/p/:projectPublicId/settings/general`| `ProjectSettingsPage`| Lazy (`ProjectSettingsPage.tsx`)| Project metadata form card | Top 25% | General workspace settings. |

---

### 3.7 Alerting & Incident Management (Layout: `AppLayout` -> `ModuleLayout`)

| Path | Component | Chunk / Split | Candidate LCP Element | Viewport Position | Bottlenecks & Notes |
|---|---|---|---|---|---|
| `/:orgSlug/alerts` / `.../incidents` | `IncidentsPage` | Lazy (`IncidentsPage.tsx`) | `Readouts` band (Active, Triggered, Acknowledged) / `SheetTable` | Top 20% to 50% | `useIncidents` + `useIncidentSummary` queries. |
| `/:orgSlug/alerts/overview` | `AlertOverviewPage` | Lazy (`AlertOverviewPage.tsx`) | Alert summary cards / MTTR trend bar | Top 25% | Aggregated incident statistics. |
| `/:orgSlug/alerts/incidents/:incidentId` | `IncidentDetailPage` | Lazy (`IncidentDetailPage.tsx`) | Incident title card / timeline investigation log | Top 20% | Single incident forensic view. |
| `/:orgSlug/alerts/events` | `AlertEventsPage` | Lazy (`AlertEventsPage.tsx`) | Raw alert events stream table | Mid viewport | High-volume raw events query. |
| `/:orgSlug/alerts/events/:eventId` | `AlertEventDetailPage` | Lazy (`AlertEventDetailPage.tsx`) | Event payload inspector card | Top 25% | Event forensic inspection. |
| `/:orgSlug/alerts/rules` | `AlertRulesPage` | Lazy (`AlertRulesPage.tsx`) | Alert rules list table / threshold pills | Mid viewport | Organization-wide alerting rules. |
| `/:orgSlug/alerts/escalations` | `EscalationsPage` | Lazy (`EscalationsPage.tsx`) | Escalation policies list table | Mid viewport | Policy definitions query. |
| `/:orgSlug/alerts/escalations/:policyId` | `EscalationDetailPage` | Lazy (`EscalationDetailPage.tsx`) | Escalation ladder step diagram | Top 30% | Tier escalation steps. |
| `/:orgSlug/alerts/templates` | `AlertTemplatesPage` | Lazy (`ChannelsPage.tsx`) | Notification templates table | Mid viewport | Message template definitions. |
| `/:orgSlug/alerts/silences` | `SilencesPage` | Lazy (`SilencesPage.tsx`) | Active silence windows table | Mid viewport | Muted alert schedules. |
| `/:orgSlug/alerts/routing` | `RoutingRulesPage` | Lazy (`RoutingRulesPage.tsx`) | Routing matrix rules table | Mid viewport | Rule match criteria. |
| `/:orgSlug/alerts/metrics` | `AlertMetricsPage` | Lazy (`AlertMetricsPage.tsx`) | MTTR / MTTD reliability score cards | Top 30% | Incident analytics. |
| `/:orgSlug/alerts/dead-letters` | `AlertDeadLettersPage` | Lazy (`DeadLettersPage.tsx`) | Dead-letter queue table | Mid viewport | Failed delivery log. |

---

### 3.8 Automation & Workflows (Layout: `AppLayout` -> `ModuleLayout`)

| Path | Component | Chunk / Split | Candidate LCP Element | Viewport Position | Bottlenecks & Notes |
|---|---|---|---|---|---|
| `/:orgSlug/automation` | `AutomationOverviewPage` | Lazy (`AutomationOverviewPage.tsx`)| Automation KPI readout cards / workflow gallery | Top 25% | Active runs and trigger counts. |
| `/:orgSlug/automation/workflows` | `AutomationWorkflowsPage` | Lazy (`AutomationWorkflowsPage.tsx`)| Workflows table / trigger badges | Mid viewport | Workflow catalog query. |
| `/:orgSlug/automation/workflows/:workflowId` | `AutomationWorkflowDetailPage` | Lazy (`AutomationWorkflowDetailPage.tsx`)| Visual workflow graph canvas / step cards | Upper-mid viewport | DAG visual workflow layout. |
| `/:orgSlug/automation/runs` | `AutomationRunsPage` | Lazy (`AutomationRunsPage.tsx`) | Workflow runs execution table | Mid viewport | Execution status query. |
| `/:orgSlug/automation/runs/:runId` | `AutomationRunDetailPage` | Lazy (`AutomationRunDetailPage.tsx`)| Step execution log tree & duration bar | Top 25% | Single execution run logs. |
| `/:orgSlug/automation/approvals` | `AutomationApprovalsPage` | Lazy (`AutomationApprovalsPage.tsx`)| Pending human approvals card list | Top 30% | Approval requests query. |
| `/:orgSlug/automation/approvals/:approvalId` | `AutomationApprovalDetailPage` | Lazy (`AutomationApprovalDetailPage.tsx`)| Approval diff review card & action buttons | Top 25% | Change payload diff viewer. |
| `/:orgSlug/automation/templates` | `AutomationTemplatesPage` | Lazy (`AutomationTemplatesPage.tsx`)| Pre-built automation template cards grid | Top 30% | Template catalog. |
| `/:orgSlug/automation/events` | `AutomationEventsPage` | Lazy (`AutomationEventsPage.tsx`)| Event trigger stream table | Mid viewport | Ingested trigger events. |
| `/:orgSlug/automation/audit` | `AutomationAuditPage` | Lazy (`AutomationAuditPage.tsx`) | Action execution audit log table | Mid viewport | System audit logs. |

---

### 3.9 Ingestion & Connections (Layout: `AppLayout` -> `ModuleLayout`)

| Path | Component | Chunk / Split | Candidate LCP Element | Viewport Position | Bottlenecks & Notes |
|---|---|---|---|---|---|
| `/:orgSlug/ingestion` | `ConnectionsOverview` | Lazy (`ConnectionsOverview.tsx`) | Connection health summary card / throughput meter | Top 25% | Throughput and error rate. |
| `/:orgSlug/ingestion/endpoints` | `ApiEndpointsPage` | Lazy (`ApiEndpointsPage.tsx`) | Ingestion endpoints table / URL badges | Mid viewport | Endpoint registry query. |
| `/:orgSlug/ingestion/health` | `ConnectionHealthPage` | Lazy (`ConnectionHealthPage.tsx`)| Upstream gateway health indicators card | Top 30% | Health check latency metrics. |
| `/:orgSlug/ingestion/keys` | `KeysTokensPage` | Lazy (`KeysTokensPage.tsx`) | Ingestion tokens table | Mid viewport | Token list query. |
| `/:orgSlug/ingestion/replay` | `PipelinePage` | Lazy (`PipelinePage.tsx`) | Pipeline buffer lag graph / replay controls | Top 30% | Queue lag telemetry. |
| `/:orgSlug/ingestion/rate-limits` | `RateLimitsPage` | Lazy (`RateLimitsPage.tsx`) | Rate limit policy rules table | Mid viewport | Limit configurations query. |

---

### 3.10 AI Ops Module (Layout: `AppLayout` -> `ModuleLayout`)

| Path | Component | Chunk / Split | Candidate LCP Element | Viewport Position | Bottlenecks & Notes |
|---|---|---|---|---|---|
| `/:orgSlug/ai` | `AiOverviewPage` | Lazy (`AiOverviewPage.tsx`) | `PageHero` ("AI Ops") / AI credit meter StatCard | Top 25% | Credit usage query (`useAiCreditUsage`). |
| `/:orgSlug/ai/assistant` | `AiAssistantPage` | Lazy (`AiAssistantPage.tsx`) | Conversation message stream or prompt bar | Upper-mid viewport | Chat interface; message store. |
| `/:orgSlug/ai/investigations` | `AiInvestigationsPage` | Lazy (`AiInvestigationsPage.tsx`)| Automated postmortem investigation card list | Top 30% | Active investigations query. |
| `/:orgSlug/ai/reports` | `AiReportsPage` | Lazy (`AiReportsPage.tsx`) | Executive summary AI reports list | Mid viewport | Generated report history. |
| `/:orgSlug/ai/usage` | `AiUsagePage` | Lazy (`AiUsagePage.tsx`) | AI token consumption charts & cost breakdown | Top 25% | Billing & quota telemetry. |
| `/:orgSlug/ai/knowledge` | `AiKnowledgePage` | Lazy (`AiKnowledgePage.tsx`) | Grounding knowledge base document cards | Mid viewport | RAG document registry. |
| `/:orgSlug/ai/settings` | `AiSettingsPage` | Lazy (`AiSettingsPage.tsx`) | AI feature toggles & model provider settings card | Top 30% | Feature configuration. |

---

### 3.11 Organization Administration & Governance (Layout: `AppLayout` -> `ModuleLayout`)

| Path | Component | Chunk / Split | Candidate LCP Element | Viewport Position | Bottlenecks & Notes |
|---|---|---|---|---|---|
| `/:orgSlug/admin` | `OrgProfilePage` | Lazy (`OrgProfilePage.tsx`) | Org identity hero card (Slug, Name, Created) | Top 25% | Organization details query. |
| `/:orgSlug/admin/settings` | `OrgSettingsPage` | Lazy (`OrgSettingsPage.tsx`) | Security & policy preferences card | Top 30% | Organization settings form. |
| `/:orgSlug/admin/domains` | `DomainsPage` | Lazy (`DomainsPage.tsx`) | Verified custom domains table / DNS record badges| Mid viewport | Domain verification records. |
| `/:orgSlug/admin/team` | `TeamPage` | Lazy (`TeamPage.tsx`) | `Readouts` band / Member list `SheetTable` | Top 20% to 50% | `listMembers` + `listInvitations` queries. |
| `/:orgSlug/admin/members/:userId` | `MemberDetailPage` | Lazy (`MemberDetailPage.tsx`) | User profile card / role selector | Top 25% | Individual user profile. |
| `/:orgSlug/admin/sso` | `SsoPage` | Lazy (`SsoPage.tsx`) | SAML / OIDC IdP configuration cards | Top 30% | SSO metadata configuration. |
| `/:orgSlug/admin/scim` | `ScimPage` | Lazy (`ScimPage.tsx`) | SCIM token generator & provisioning status card | Top 30% | SCIM directory sync telemetry. |
| `/:orgSlug/admin/roles` | `RolesPermissionsPage` | Lazy (`RolesPermissionsPage.tsx`)| Role permission matrix table | Mid viewport | Role permission capabilities. |
| `/:orgSlug/admin/security-events`| `SecurityEventsPage` | Lazy (`SecurityEventsPage.tsx`)| Security event audit table | Mid viewport | Security log stream. |
| `/:orgSlug/admin/audit-logs` | `AuditLogsPage` | Lazy (`AuditLogsPage.tsx`) | Administrative audit log stream | Mid viewport | Org audit log query. |
| `/:orgSlug/admin/sdk-config` | `SdkConfigPage` | Lazy (`SdkConfigPage.tsx`) | Global SDK telemetry capture rules card | Top 30% | SDK config schema. |
| `/:orgSlug/admin/compliance` | `CompliancePage` | Lazy (`CompliancePage.tsx`) | SOC2 / GDPR compliance checklist card | Top 25% | Compliance reports. |

---

### 3.12 Super Admin & Billing Plans (Layout: `AppLayout` -> `ModuleLayout`)

| Path | Component | Chunk / Split | Candidate LCP Element | Viewport Position | Bottlenecks & Notes |
|---|---|---|---|---|---|
| `/:orgSlug/super-admin/billing` | `BillingPlansPage` | Lazy (`BillingPlansPage.tsx`) | Plan tier management table / feature matrix | Top 30% | Global billing plan CRUD. |

---

### 3.13 Organization Billing (Layout: `AppLayout` -> `ModuleLayout`)

| Path | Component | Chunk / Split | Candidate LCP Element | Viewport Position | Bottlenecks & Notes |
|---|---|---|---|---|---|
| `/:orgSlug/billing` | `PlanPage` | Lazy (`PlanPage.tsx`) | `PageHero` ("Subscription Plan") / `HeroFacts` / Plan card | Top 25% | Org subscription query. |
| `/:orgSlug/billing/usage` | `BillingUsagePage` | Lazy (`BillingUsagePage.tsx`) | Event quota progress meters & invoice estimate | Top 25% | Monthly usage telemetry. |
| `/:orgSlug/billing/invoices` | `InvoicesPage` | Lazy (`InvoicesPage.tsx`) | Invoices history `SheetTable` / PDF download link | Mid viewport | Invoice list query. |
| `/:orgSlug/billing/invoices/:invoiceId` | `InvoiceDetailPage` | Lazy (`InvoiceDetailPage.tsx`) | Line-item invoice receipt card | Top 25% | Detailed invoice breakdown. |
| `/:orgSlug/billing/payment-methods` | `PaymentMethodsPage` | Lazy (`PaymentMethodsPage.tsx`)| Credit card / payment method cards list | Top 30% | Stripe payment method query. |

---

### 3.14 Connectors & Settings (Layout: `AppLayout` -> `ModuleLayout`)

| Path | Component | Chunk / Split | Candidate LCP Element | Viewport Position | Bottlenecks & Notes |
|---|---|---|---|---|---|
| `/:orgSlug/connectors/webhooks` | `WebhooksPage` | Lazy (`WebhooksPage.tsx`) | Outbound webhook endpoints table | Mid viewport | Webhook registry query. |
| `/:orgSlug/connectors/webhooks/:webhookId` | `WebhookDetailPage` | Lazy (`WebhookDetailPage.tsx`)| Webhook endpoint URL & signing secret card | Top 25% | Webhook detail query. |
| `/:orgSlug/connectors/integrations` | `IntegrationsPage` | Lazy (`IntegrationsPage.tsx`) | `PageHero` / `HeroFacts` / Slack, PagerDuty cards | Top 25% | Connectors catalog query. |
| `/:orgSlug/connectors/integrations/:integrationId` | `IntegrationDetailPage` | Lazy (`IntegrationDetailPage.tsx`)| Connector configuration form card | Top 30% | Connector credentials. |
| `/:orgSlug/connectors/integrations/slack/success` | `SlackSuccessPage` | Lazy | Slack installation verified notice card | Centered | OAuth return card. |
| `/:orgSlug/connectors/integrations/slack/error` | `SlackErrorPage` | Lazy | Slack installation failure card | Centered | OAuth return card. |
| `/:orgSlug/connectors/audit` | `IntegrationsAuditPage` | Lazy (`IntegrationsAuditPage.tsx`)| Connector delivery audit logs table | Mid viewport | Delivery log query. |
| `/:orgSlug/developer/data-retention` | `DataRetentionPage` | Lazy (`DataRetentionPage.tsx`)| Telemetry retention days sliders card | Top 30% | Retention policy form. |
| `/:orgSlug/developer/custom-settings` | `SdkConfigPage` | Lazy (`SdkConfigPage.tsx`) | Custom SDK ingestion header overrides card | Top 30% | Custom schema settings. |

---

### 3.15 Account Settings & Security Panels (Layout: `AppLayout` -> `SettingsLayout`)
`SettingsLayout` provides a sticky 2-column layout (sidebar with identity card and navigation badges, and main canvas). All panels are lazy loaded:

| Path | Component | Chunk / Split | Candidate LCP Element | Viewport Position | Bottlenecks & Notes |
|---|---|---|---|---|---|
| `/:orgSlug/account/overview` | `AccountOverviewPanel` | Lazy (`auth-profile` chunk) | Profile identity card (Avatar, Name, Role) / Security posture score | Top 20% to 45% of right canvas | `auth-profile` chunk is **360.9 kB**; queries `accountApi.getOverview`. |
| `/:orgSlug/account/profile` | `PersonalDetailsPanel` | Lazy (`auth-profile` chunk) | Personal information form card | Top 25% | Personal info inputs. |
| `/:orgSlug/account/security/password` | `ChangePasswordPanel` | Lazy (`auth-profile` chunk) | Change password form card | Top 25% | Password update fields. |
| `/:orgSlug/account/security/mfa` | `MfaSecurityPanel` | Lazy (`auth-profile` chunk) | Authenticator app (TOTP) status & QR setup card | Top 30% | MFA enrollment status. |
| `/:orgSlug/account/security/passkeys` | `PasskeysPanel` | Lazy (`auth-profile` chunk) | Registered FIDO2/WebAuthn passkeys list | Mid viewport | Registered credentials query. |
| `/:orgSlug/account/security/recovery-codes` | `BackupCodesPanel` | Lazy (`auth-profile` chunk) | Backup codes remaining count card | Top 30% | Emergency recovery codes. |
| `/:orgSlug/account/activity/active-sessions` | `ActiveSessionsPanel` | Lazy (`auth-profile` chunk) | Active browser & device session cards list | Mid viewport | Revoke session actions. |
| `/:orgSlug/account/activity/login-history` | `AuditLogsPanel` | Lazy (`auth-profile` chunk) | Security login history audit table | Mid viewport | IP & device log query. |
| `/:orgSlug/account/connected/linked-accounts` | `LinkedAccountsPanel` | Lazy (`auth-profile` chunk) | Google / GitHub connected identity cards | Top 30% | OAuth identity links. |
| `/:orgSlug/settings/authentication-policy` | `EffectiveAuthPolicyPage`| Lazy (`auth-profile` chunk) | Effective auth policy rules card | Top 30% | Organization policy rules. |
| `/:orgSlug/settings/mfa-recovery` | `MfaRecoveryPanel` | Lazy (`auth-profile` chunk) | Account recovery request form card | Top 30% | Fallback recovery form. |
| `/:orgSlug/settings/privacy` | `PrivacyAndDeletionPanel` | Lazy (`auth-profile` chunk) | Data export & account deletion card | Top 30% | Data deletion triggers. |

---

## 4. Prioritized LCP Bottlenecks & Optimization Recommendations

### Priority 1: Eliminate External Font Render-Blocking & Redundant Loading (High Impact — Affects ALL Routes)
- **Problem**:
  In `index.html:27-30`, `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?...">` is a synchronous external stylesheet in `<head>`. The browser must establish DNS, TLS, and download Google Fonts CSS before the first paint can occur. Meanwhile, `src/app/index.css` also imports `@fontsource/jetbrains-mono`, bundling 28 woff/woff2 files.
- **Recommended Fix**:
  1. Self-host the needed subset of fonts (Latin woff2) or load Google Fonts with `media="print" onload="this.media='all'"` with standard font preloading (`<link rel="preload" as="font" type="font/woff2" crossorigin>`).
  2. Remove the duplicate `@fontsource/jetbrains-mono` imports in `src/app/index.css` to eliminate redundant font evaluation and shrink CSS bundle size.
  3. Ensure `font-display: swap` is applied consistently to prevent FOIT (Flash of Invisible Text) on candidate text LCP elements (`<h1>`, `<h2>`, `.readout-cell`).

### Priority 2: Optimize Route Gate & Query Wait Mechanism (High Impact — Affects All Data-Driven Routes)
- **Problem**:
  `LoadingBoundary.tsx` hides the page (`opacity: 0`) behind `RouteSkeleton` until `countBlockingQueries(client, since) === 0`, then enforces `SETTLE_MS = 30ms` and `route-gate-in = 220ms`.
  On pages like `ExecutiveDashboard` (9 queries) and `LatencyPage` (7 queries), LCP cannot paint until the slowest query returns.
- **Recommended Fix**:
  1. **Decouple LCP critical queries from secondary widget queries**: Only block the route gate on the primary above-the-fold query (e.g. `requests` summary on ExecutiveDashboard; `overview` on LatencyPage). Secondary widgets (e.g., slowest endpoints, detailed distributions) should load independently with localized skeleton states inside `LoadingBoundary` instead of holding the whole page hidden.
  2. **Shorten or eliminate artificial gate delays**: When cached or fast data is present, immediately show content (`state = "ready"`) without enforcing the 220ms crossfade entrance.

### Priority 3: Flatten the Sequential Waterfall in Project Shell (High Impact — Affects 18 Project Routes)
- **Problem**:
  In `src/pages/workspaces/ProjectShellPage.tsx:93`, `ProjectShellPage` returns `<RouteSkeleton framed />` while `projectLoading` is true, refusing to mount `<Outlet />`. Child tab components (`ProjectOverviewPage`, `ProjectAnalyticsPage`, etc.) cannot mount or begin fetching their queries until `useProjectByPublicId` finishes.
- **Recommended Fix**:
  1. Render the project chrome header and mount the child `<Outlet />` immediately, passing the public ID or a suspense-compatible promise.
  2. Or, prefetch project metadata during hover/route transitions so `useProjectByPublicId` resolves synchronously from the React Query cache upon navigation.

### Priority 4: Prune Unused Root Module Preloads & Refine Chunk Splitting (Medium Impact — Affects First Visit)
- **Problem**:
  `dist/index.html` has 15 `<link rel="modulepreload">` tags including `auth-profile` (360 kB), `auth-shared` (145 kB), `motion-vendor` (127 kB), and `map-vendor` (102 kB) due to static references in `App.tsx` and `routes.tsx`.
- **Recommended Fix**:
  1. In `vite.config.ts`, configure `build.modulePreload.resolveDependencies` to exclude non-entry chunks (like `auth-profile`, `map-vendor`, `RemoteConfigPanel`) from the initial `index.html` preload list.
  2. Subdivide the monolithic `auth-profile` chunk into granular panel chunks so a user browsing `/account/overview` downloads only ~25 kB instead of 360 kB of all 12 security and policy panels.

### Priority 5: Clean Up Unused Assets & Apply Image Optimization Standards (Medium Impact — Asset Hygiene)
- **Problem**:
  `public/auth-bg.png` (695 kB) is completely unused. `public/auth/*.webp` (193 kB total) are also unreferenced.
- **Recommended Fix**:
  1. Delete or archive `public/auth-bg.png` and unused webp files to reduce repository and deployment footprint.
  2. For any LCP images or decorative branding icons (like `LynkTraceLogo`), ensure `fetchpriority="high"` and explicit `width`/`height` are specified per `modern-web-guidance` (`optimize-image-priority`).

---

## 5. Caveats
1. **Network Throttling Lab vs Field**: In local development, APIs may respond in < 50ms, masking waterfall latency. Under standard Fast 3G or 4G mobile network throttling (as tested in Lighthouse audits), the 3-tier waterfall on `/p/:projectPublicId/overview` and the 9-query gate on `/observability` will easily breach the 2.5s LCP threshold.
2. **Read-Only Scope**: In accordance with the explorer archetype rules, no source code or configuration files were modified during this investigation. All findings were verified through source code inspection, AST tracing, and production build artifact analysis.
3. **Synthetic Dashboard Data**: The `/dashboards/*` suite currently renders synchronous sample fixtures (`getHomeBoard()`, `getPerformanceBoard()`). If live backend API endpoints are later wired up to these pages, they must follow the single-query recommendation to avoid inheriting the 9-query waterfall issue seen in `ExecutiveDashboard`.

---

## 6. Conclusion
The frontend application has a well-designed, comprehensive routing tree with extensive code-splitting boundaries at the route level. However, Largest Contentful Paint (LCP) performance across multiple key surfaces is throttled by:
1. **An external render-blocking font stylesheet** in `index.html`.
2. **Aggressive root-level module preloads** downloading over 1.2 MB of JavaScript on initial entry.
3. **The `LoadingBoundary` / `page-ready` gate** which artificially holds pages at `opacity: 0` until *all* concurrent queries complete plus a 250ms animation delay.
4. **A 3-tier sequential query waterfall** in the Project Shell (`ProjectShellPage`) affecting all 18 project workspace tabs.

Implementing the concrete recommendations in Section 4 will eliminate these bottlenecks, ensure instant skeleton-to-content transitions, and bring LCP comfortably below the 2.5s Core Web Vital threshold across every route.

---

## 7. Verification Method

To independently verify these findings:
1. **Verify Production Build & Chunk Sizes**:
   ```powershell
   npm run build
   ```
   Inspect `dist/index.html` to observe the emitted `<link rel="modulepreload">` tags and external stylesheet links. Inspect `dist/assets/` to confirm chunk sizes (`auth-profile-*.js` ~361 kB, `index-*.css` ~248 kB).
2. **Inspect Route Gate Hold Logic**:
   Examine `src/shared/motion/LoadingBoundary.tsx:132-285` and `src/app/index.css:641-660` to confirm that `.route-gate[data-gate="hidden"]` enforces `opacity: 0` while queries are pending, and that `countBlockingQueries` in `src/shared/motion/page-ready.ts:87-105` tracks all queries initiated by the navigation.
3. **Inspect Multi-Query Components**:
   Examine `src/pages/observe/ExecutiveDashboard.tsx:94-102` (9 queries) and `src/pages/observe/LatencyPage.tsx:38-45` (7 queries) to confirm the query multiplication.
4. **Inspect Project Shell Waterfall**:
   Examine `src/pages/workspaces/ProjectShellPage.tsx:76-94` to confirm that `<Outlet />` is unmounted while `useProjectByPublicId` is loading, preventing child queries from executing in parallel.
5. **Runtime LCP Audit Verification**:
   Run the dev server (`npm run dev`) or preview server (`npm run preview`), navigate to `http://localhost:5173/`, and in Chrome DevTools Console run:
   ```javascript
   window.__getLcpReport()
   ```
   This will output the live LCP entry, render time, and element details captured by `src/infrastructure/web-vitals.ts`.
