# Core Web Vitals E2E Test Infrastructure (TEST_INFRA.md)

## 1. Test Philosophy

The frontend Core Web Vitals (CWV) test infrastructure is designed under an **opaque-box, requirement-driven, progressive testability** philosophy.

1. **Opaque-Box Verification**: The test runner interacts strictly with the compiled, production-built frontend assets (`dist/`) running on a local HTTP preview server (`http://127.0.0.1:4173`). Tests observe external, user-perceived runtime metrics (LCP, CLS, INP, FCP, TTFB) via standard browser instrumentation rather than asserting internal React component state or mocking DOM elements.
2. **Requirement-Driven**: All assertion thresholds map directly to the authoritative acceptance criteria defined in `ORIGINAL_REQUEST.md`:
   - **R1 (LCP Optimization)**: Largest Contentful Paint must be under **2.5s** (2500ms) across all pages and routes.
   - **R2 (Runtime Speed & Core Web Vitals)**: Cumulative Layout Shift (CLS) must be under **0.1**, and Interaction to Next Paint (INP) must be under **200ms**.
3. **Four-Tiered Coverage**: Auditing is organized into four distinct testing tiers spanning all **140 route endpoints** identified in the project route inventory:
   - **Tier 1 (Feature Coverage)**: Public authentication flows and primary module landing views.
   - **Tier 2 (Boundary & Corner Cases)**: Heavy visualization dashboards, multi-query gate pages, project shell sequential waterfalls, deep links, and detail inspection views.
   - **Tier 3 (Cross-Feature Combinations & Transitions)**: Client-side routing transitions between surfaces, tab navigation, and virtualized list scroll stress.
   - **Tier 4 (Real-World Application Scenarios)**: Multi-step end-to-end user workflows (e.g., incident triage to trace flamegraph waterfall).
4. **Progressive Testability & Defect Escalation**: The test suite executes deterministically across milestones. Test results accurately report genuine breaches (e.g. initial Google Fonts blocking, boot skeleton layout shifts) without masking or cheating, escalating implementation defects to feature milestone agents.

---

## 2. Feature Inventory Mapping

| Feature ID | Feature Name | Test Tier / Verification Harness | Expected Observable Metric |
|---|---|---|---|
| **F1** | Font Consolidation & Unblocking | Tier 1 Public Routes & Tier 2 Dashboards | FCP < 1800ms, reduced TTFB-to-FCP delay, elimination of font-swap FOIT |
| **F2** | Static Asset Hygiene | Build verification & bundle size audits | Absence of 695KB unreferenced PNG, reduced transfer size |
| **F3** | HTTP Cache Directives | Preview server header inspection | `Cache-Control` header presence on static assets |
| **F4** | Boot Skeleton Neutralization | Tier 1 & Tier 2 authenticated direct visits | Initial hydration CLS reduced from > 0.27 to < 0.1 |
| **F5** | Decouple GlobalStepUpModal | Initial chunk analysis & bundle isolation | `index-*.js` and root bundle size < 250kB |
| **F6** | Manual Chunking & Bundle Isolation | Tier 2 `/acme/account/*` and `/dashboards/*` | Granular chunk downloads without monolithic 360kB `auth-profile` contention |
| **F7** | Module Preload Pruning | Tier 1 `/auth/login` initial network load | Module preloads < 450kB on initial HTML load |
| **F8** | LoadingBoundary Settle Optimization | Tier 2 `/acme/observability/latency` | Instant reveal without artificial 30ms settle + 220ms crossfade delay |
| **F9** | Multi-Query Gate Decoupling | Tier 1 & 2 `/acme/observability` (9 queries) | Primary KPI LCP render within 500-1200ms without blocking on secondary queries |
| **F10** | Project Shell Waterfall Flattening | Tier 2 `/acme/p/:projectPublicId/*` (18 routes) | Parallel mounting of child `<Outlet />`, LCP < 1500ms on project deep links |
| **F11** | Deep-Link Org Scope Gating | Tier 2 deep links (`/acme/observability/traces`) | One skeleton per page, no premature unmounting while org resolves |
| **F12** | VirtualList Scroll INP Optimization | Tier 3 T3.5 Scroll Stress (`/requests`, `/logs`) | Peak scroll INP < 50ms, zero main-thread dropped frames |
| **F13** | Context Provider Value Memoization | Tier 3 T3.3 Project Tab switching | Tab switch INP < 60ms, no cascading child tab re-renders |
| **F14** | Image Explicit Sizing for CLS | Tier 2 modals and media cards | Layout shift CLS = 0.000 on image load |
| **F15** | In-App CWV Instrumentation | Harness evaluation hook | Exposes `window.__getWebVitalsReport()` with FCP, LCP, CLS, INP, TTFB |
| **F16** | Automated E2E CWV Audit Harness | `scripts/audit-cwv.mjs` test runner | Standalone automated execution across all 140 routes with CLI summary table |
| **F17** | 100% E2E CWV Verification | Milestones 1–5 regression gates | 100% pass rate across all tiers under both unthrottled and throttled modes |

---

## 3. Test Architecture

The audit harness is implemented in `scripts/audit-cwv.mjs` as a zero-external-dependency Node.js ESM test runner powered by Chrome DevTools Protocol (CDP).

```
                       ┌────────────────────────────────────────┐
                       │        scripts/audit-cwv.mjs           │
                       │   (CLI Parser, Route Manifest, Tiers)  │
                       └───────────────────┬────────────────────┘
                                           │
                  ┌────────────────────────┴────────────────────────┐
                  ▼                                                 ▼
     ┌────────────────────────┐                        ┌────────────────────────┐
     │ PreviewServerManager   │                        │ ChromeRunner           │
     │ - Detects port 4173    │                        │ - Locates Chrome/Edge  │
     │ - Spawns `vite preview`│                        │ - Spawns headless      │
     │ - Polls until 200 OK   │                        │ - Port via ActivePort  │
     └────────────────────────┘                        └───────────┬────────────┘
                                                                   │
                                                                   ▼
                                                       ┌────────────────────────┐
                                                       │ CdpSession (WebSocket) │
                                                       │ - Page, Runtime, DOM   │
                                                       │ - Emulation & Network  │
                                                       └───────────┬────────────┘
                                                                   │
                                                                   ▼
     ┌──────────────────────────────────────────────────────────────────────────┐
     │ Page Context Pre-Seeding (Page.addScriptToEvaluateOnNewDocument)         │
     │ 1. sessionStorage['auth-storage']: Authenticated user session state      │
     │ 2. sessionStorage['pulse_*']: Access token, orgId, projectId             │
     │ 3. localStorage['org-storage']: Active org ('org_1') & project ('proj_1')│
     │ 4. localStorage['app-bootstrap-storage']: Bootstrap metadata & quotas    │
     │ 5. window.__cwv_harness: Injected PerformanceObserver for LCP, CLS, INP  │
     └──────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Pre-Authenticated Storage Injection
To audit protected routes without human interactive authentication, the runner injects storage values prior to document creation using `Page.addScriptToEvaluateOnNewDocument`:
- `sessionStorage['auth-storage']`: Zustand auth store with `isAuthenticated: true`, mock user identity, and verified MFA status.
- `sessionStorage['pulse_access_token']`: Valid mock access token and future expiration timestamp.
- `localStorage['org-storage']`: Current active organization (`org_1`, slug `acme`) and project (`proj_1`, slug `prod`).
- `localStorage['app-bootstrap-storage']`: Pre-hydrated bootstrap payload containing organizations, projects, enterprise billing tier, and quotas.

### 3.2 Performance Telemetry & Measurement Engine
Metrics are acquired through a dual-channel telemetry strategy:
1. **In-App Telemetry**: Checks for `window.__getWebVitalsReport()` (extended in F15) or `window.__getLcpReport()`.
2. **Injected PerformanceObserver Harness**: Monitors:
   - `largest-contentful-paint`: Reads the latest candidate entry, measuring `startTime`, `renderTime`, and `elementTag`.
   - `paint`: Reads `first-contentful-paint` (FCP).
   - `layout-shift`: Accumulates shift scores where `!entry.hadRecentInput` using standard 5-second maximum session windows to calculate final Cumulative Layout Shift (CLS).
   - `event`: Measures interaction durations with `durationThreshold: 16` across clicks, pointer events, and keyboard interactions to calculate Interaction to Next Paint (INP).
   - `navigation`: Extracts `responseStart` for Time to First Byte (TTFB) and `domContentLoadedEventEnd`.

### 3.3 Network & Hardware Simulation
When invoked with `--throttle`, the runner activates CDP network and emulation commands:
- **Network Throttling**: Fast 3G profile (1.6 Mbps download throughput, 750 kbps upload throughput, 150 ms additional latency).
- **CPU Throttling**: 4x slowdown rate via `Emulation.setCPUThrottlingRate`.

---

## 4. Coverage Tiers & Route Inventory (140 Routes)

The test suite covers the entire application surface across 4 tiers:

### Tier 1: Feature Coverage (31 Routes)
- **Public & Authentication (15 routes)**:
  - `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`, `/auth/login/sso`, `/auth/login/mfa`, `/auth/login/backup-code`, `/auth/unlock`, `/auth/unlock/confirm`, `/auth/callback`, `/account/delete/confirm`, `/accept-invite`, `/loading`, `/error-preview`.
- **Primary Module Landing Surfaces (16 routes)**:
  - `/acme/dashboard` (Root Departure Board)
  - `/acme/dashboards/overview` (Dashboards Matrix)
  - `/acme/observability` (Pulse Observability Executive)
  - `/acme/services` (Services Catalog)
  - `/acme/projects` (Workspaces Projects List)
  - `/acme/alerts` (Alerts & Incidents Master)
  - `/acme/automation` (Automation Overview)
  - `/acme/ingestion` (Connections Overview)
  - `/acme/ai` (AI Ops Overview)
  - `/acme/admin` (Org Admin Profile)
  - `/acme/billing` (Subscription & Billing)
  - `/acme/connectors/webhooks` (Webhooks List)
  - `/acme/account/overview` (Account Identity Overview)
  - `/onboarding/organization` (Org Creation Wizard)
  - `/billing/checkout/success` (Checkout Callback)
  - `/billing/checkout/cancel` (Checkout Cancellation)

### Tier 2: Boundary & Corner Cases (89 Routes)
- **Heavy Dashboards & Custom Visualizations (13 routes)**:
  - `/acme/observability/latency` (7 concurrent query waterfall gate)
  - `/acme/dashboards/geo` (Choropleth World Map SVG + 107KB GeoJSON download)
  - `/acme/dashboards/tracing` (Topology Dependency Graph SVG)
  - `/acme/dashboards/realtime` (Realtime Traffic Simulation Stream)
  - `/acme/dashboards/executive`, `.../performance`, `.../errors`, `.../infrastructure`, `.../security`, `.../releases`, `.../business`, `.../reports`, `.../reports/new`.
- **Observability Deep-Link Detail Views (21 routes)**:
  - `/acme/observability/requests`, `.../requests/:requestId`
  - `/acme/observability/errors`, `.../errors/:fingerprint`
  - `/acme/observability/error-groups`, `.../error-groups/:groupId`
  - `/acme/observability/traces`, `.../traces/:traceId`, `.../traces/:traceId/spans/:spanId`
  - `/acme/observability/logs`, `.../logs/:eventId`
  - `/acme/observability/metrics`, `.../metrics/:metricId`
  - `/acme/observability/profiling`, `.../profiling/:profileId`
  - `/acme/observability/crons`, `.../crons/:checkinId`
  - `/acme/observability/runtime-metrics`, `.../event-loop`, `.../gc-monitoring`
  - `/acme/services/dependencies`, `.../services/slos`
- **Project Workspace Shell Sequential Waterfall Surfaces (18 routes)**:
  - `/acme/projects/new`
  - `/acme/p/proj_1/overview` (3-tier waterfall: shell -> project metadata -> overview queries)
  - `/acme/p/proj_1/analytics`, `.../usage`, `.../activity`, `.../environments`, `.../api-keys`, `.../remote-config`, `.../alerts`, `.../alert-rules`, `.../alert-channels`, `.../routes`, `.../routes/:routeId`, `.../connectors`, `.../deliveries`, `.../dlq`, `.../preferences`, `.../members`, `.../settings/general`
- **Alerting & Incident Management Surfaces (11 routes)**:
  - `/acme/alerts/overview`, `.../incidents/:incidentId`, `.../events`, `.../events/:eventId`, `.../rules`, `.../escalations`, `.../escalations/:policyId`, `.../templates`, `.../silences`, `.../routing`, `.../metrics`, `.../dead-letters`
- **Automation & Ingestion Surfaces (15 routes)**:
  - `/acme/automation/workflows`, `.../workflows/:workflowId`, `.../runs`, `.../runs/:runId`, `.../approvals`, `.../approvals/:approvalId`, `.../templates`, `.../events`, `.../audit`
  - `/acme/ingestion/endpoints`, `.../health`, `.../keys`, `.../replay`, `.../rate-limits`
- **AI Ops Surfaces (6 routes)**:
  - `/acme/ai/assistant`, `.../investigations`, `.../reports`, `.../usage`, `.../knowledge`, `.../settings`
- **Admin, Billing, Connectors & Chunk Isolation Hotspots (16 routes)**:
  - `/acme/admin/settings`, `.../domains`, `.../team`, `.../members/:userId`, `.../sso`, `.../scim`, `.../roles`, `.../security-events`, `.../audit-logs`, `.../sdk-config`, `.../compliance`
  - `/acme/super-admin/billing`, `/acme/billing/usage`, `.../invoices`, `.../invoices/:invoiceId`, `.../payment-methods`
  - `/acme/connectors/webhooks/:webhookId`, `.../integrations`, `.../integrations/:id`, `.../integrations/slack/success`, `.../integrations/slack/error`, `.../connectors/audit`, `.../developer/data-retention`, `.../developer/custom-settings`
- **Account Settings & Security Panels (`auth-profile` chunk) (11 routes)**:
  - `/acme/account/profile`, `.../security/password`, `.../security/mfa`, `.../security/passkeys`, `.../security/recovery-codes`, `.../activity/active-sessions`, `.../activity/login-history`, `.../connected/linked-accounts`, `/acme/settings/authentication-policy`, `.../mfa-recovery`, `.../privacy`

### Tier 3: Interactions & Transitions (5 Suites)
- **T3.1 Public Guest Routing Transition**: Sequential client-side navigation `/auth/login` -> `/auth/register` -> `/auth/forgot-password`.
- **T3.2 Primary Navigation Header Switch**: Top-level header navigation switching between `/acme/dashboard` -> `/observability` -> `/services` -> `/projects`.
- **T3.3 Project Workspace Tab Transitions**: Project shell tab switching across `/overview` -> `/analytics` -> `/usage` -> `/activity` -> `/api-keys`. Asserts INP < 200ms and zero layout shifts.
- **T3.4 Account Security Panel Transitions**: Account panel switching across `/overview` -> `/profile` -> `/security/password` -> `/security/mfa` -> `/security/passkeys`.
- **T3.5 Virtualized List Scroll Stress & INP**: High-frequency scrolling on `/acme/observability/requests` and `/acme/observability/logs` to stress `VirtualList` scroll throttling and frame budget.

### Tier 4: Real-World Application Scenarios (4 End-to-End User Journeys)
- **T4.1 Incident Responder Forensic Journey**: Direct deep link to active alerts -> select incident -> jump to distributed trace waterfall -> correlate with latency distribution chart.
- **T4.2 Executive Observability Audit Review**: Dashboards overview -> Executive command center -> Performance deep dive -> Observability executive view.
- **T4.3 Workspace Administrator Setup Flow**: Project workspace -> overview dashboard -> configure remote config feature flags -> set alert threshold rules.
- **T4.4 Security & Compliance Officer Audit**: Security events stream -> administrative audit logs -> SSO provider configuration -> SOC2 compliance checklist verification.

---

## 5. Execution & Verification Commands

### 5.1 Run Commands
```bash
# Full regression audit across all 140 routes and 4 tiers
npm run test:cwv
# or directly:
node scripts/audit-cwv.mjs --routes all

# Rapid Golden Sample audit (15 representative routes across all tiers)
npm run test:cwv:quick
# or directly:
node scripts/audit-cwv.mjs --routes quick

# Target specific tiers
node scripts/audit-cwv.mjs --routes tier1
node scripts/audit-cwv.mjs --routes tier2
node scripts/audit-cwv.mjs --routes tier3
node scripts/audit-cwv.mjs --routes tier4

# Adversarial Fast 3G + 4x CPU Throttled audit
node scripts/audit-cwv.mjs --routes all --throttle

# Export audit results to JSON
node scripts/audit-cwv.mjs --routes quick --json .agents/teamwork/audit-summary.json
```

### 5.2 Pass / Fail Assertion Criteria
Each audited route and scenario evaluates three primary Core Web Vitals criteria:
1. **Largest Contentful Paint (LCP)**:
   - Pass: `LCP <= 2500 ms`
   - Breach: `LCP > 2500 ms` (Fails audit)
2. **Cumulative Layout Shift (CLS)**:
   - Pass: `CLS <= 0.1`
   - Breach: `CLS > 0.1` (Fails audit)
3. **Interaction to Next Paint (INP)**:
   - Pass: `INP <= 200 ms`
   - Breach: `INP > 200 ms` (Fails audit)

The runner exits with code **0** when 100% of audited routes meet all three thresholds, or code **1** if any route breaches a threshold.
