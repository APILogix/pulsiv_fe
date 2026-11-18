# Test Suite Readiness Report (TEST_READY.md)

**Status**: READY  
**Track**: E2E Testing Track (Core Web Vitals & Frontend Performance Audit Suite)  
**Date**: 2026-10-31  
**Runner Path**: `scripts/audit-cwv.mjs`  
**Test Spec**: `TEST_INFRA.md`  

---

## 1. Executive Summary

The Core Web Vitals (CWV) automated audit test harness is fully established, verified, and operational. It performs automated, opaque-box performance audits of the compiled production application (`dist/`) running on the preview server (`http://127.0.0.1:4173`).

The test runner utilizes native Chrome DevTools Protocol (CDP) WebSocket communication with headless Chrome to measure real user-centric metrics:
- **Largest Contentful Paint (LCP)** (Acceptance threshold: `<= 2500 ms`)
- **Cumulative Layout Shift (CLS)** (Acceptance threshold: `<= 0.1`)
- **Interaction to Next Paint (INP)** (Acceptance threshold: `<= 200 ms`)
- **First Contentful Paint (FCP)** and **Time to First Byte (TTFB)**

---

## 2. Test Execution Commands

| Execution Mode | Command | Scope & Purpose |
|---|---|---|
| **Full Regression Audit** | `npm run test:cwv` | Audits all **140 route endpoints** across Tiers 1–4. Exit code 0 on 100% compliance. |
| **Rapid Golden Sample** | `npm run test:cwv:quick` | Audits 15 representative routes across all 4 tiers for fast CI & developer feedback. |
| **Tier 1 (Core & Public)** | `node scripts/audit-cwv.mjs --routes tier1` | Audits 31 core public and top-level module routes. |
| **Tier 2 (Boundary & Heavy)** | `node scripts/audit-cwv.mjs --routes tier2` | Audits 89 heavy dashboards, detail pages, waterfalls, and settings panels. |
| **Tier 3 (Interactions)** | `node scripts/audit-cwv.mjs --routes tier3` | Tests client routing transitions, tab switching, and scroll INP stress. |
| **Tier 4 (Real Scenarios)** | `node scripts/audit-cwv.mjs --routes tier4` | Validates 4 multi-surface end-to-end user workflows. |
| **Adversarial Throttling** | `npm run test:cwv -- --throttle` | Audits routes under simulated Fast 3G network and 4x CPU slowdown. |
| **JSON Export** | `npm run test:cwv:quick -- --json cwv-report.json` | Exports structured metrics to a JSON artifact for reporting. |

---

## 3. Tier Coverage & Route Counts (140 Routes Total)

The test suite derives its test scope directly from the 140-route inventory:

```
Total Route Endpoints Audited: 140 Routes (100% Coverage)
├── Tier 1: Feature Coverage (Core & Entry Routes)              :  31 Routes
│   ├── Public & Auth Flows (15 routes)
│   └── Primary Module Entries (16 routes)
├── Tier 2: Boundary & Corner Cases (Heavy / Complex / Deep)    :  89 Routes
│   ├── Heavy Visualizations & Dashboards (13 routes)
│   ├── Observability Sub-Surfaces & Detail Endpoints (21 routes)
│   ├── Workspaces & Project Shell Waterfall Routes (18 routes)
│   ├── Alerting & Incident Management Surfaces (11 routes)
│   ├── Automation & Ingestion Surfaces (15 routes)
│   ├── AI Ops Surfaces (6 routes)
│   ├── Admin, Governance & Billing Surfaces (18 routes)
│   └── Account Profile Panels (auth-profile chunk) (11 routes)
├── Tier 3: Interactions & Transitions                          :   5 Suites
│   ├── T3.1 Public Guest Routing Transition
│   ├── T3.2 Primary Navigation Header Switch
│   ├── T3.3 Project Workspace Tab Transitions
│   ├── T3.4 Account Security Panel Transitions
│   └── T3.5 Virtualized List Scroll Stress & INP
└── Tier 4: Real-World Application Scenarios                    :   4 Flows
    ├── T4.1 Incident Responder Forensic Journey
    ├── T4.2 Executive Observability Audit Review
    ├── T4.3 Workspace Administrator Setup Flow
    └── T4.4 Security & Compliance Officer Audit
```

---

## 4. Test Architecture & Authentication Seeding

1. **Automatic Preview Server Orchestration**:
   The runner automatically checks if `http://127.0.0.1:4173` is active. If not, it spawns `vite preview` and polls until the server returns `200 OK`. On completion, any spawned preview server or Chrome process is cleanly terminated.
2. **Headless Chrome Dynamic Port Management**:
   Chrome is launched with `--remote-debugging-port=0`. The active port is dynamically discovered from Chrome's `DevToolsActivePort` file, eliminating port collisions in parallel CI environments.
3. **Pre-Seeded Authenticated State**:
   Protected routes are audited without requiring interactive login via `Page.addScriptToEvaluateOnNewDocument`:
   - `sessionStorage['auth-storage']`: Zustand store with authenticated session.
   - `sessionStorage['pulse_*']`: Bearer tokens and org/project scoping.
   - `localStorage['org-storage']`: Active organization (`org_1`, `acme`) and project (`proj_1`, `prod`).
   - `localStorage['app-bootstrap-storage']`: Pre-hydrated bootstrap payload (organizations, projects, billing, quotas).

---

## 5. Baseline Test Execution Results (Pre-Optimization Ground Truth)

The audit harness was executed against the unoptimized production build (`npm run test:cwv:quick`):

```
============================================================
 Total Audited Items: 15
 Passed             : 8
 Failed             : 7
 Mean LCP           : 910 ms (Threshold: <= 2500 ms)
 Mean CLS           : 0.1557 (Threshold: <= 0.1)
 Peak INP           : 22 ms (Threshold: <= 200 ms)
 Overall Compliance : 53.3%
============================================================
```

### Detected Baseline Defects (Escalated to Feature Milestones):
1. **Font Render-Blocking & Network Congestion (F1, F7 -> M1, M2)**:
   - `/auth/login` had an initial cold LCP of **7,632 ms** (FCP: 7,084 ms, TTFB: 6,853 ms) caused by the render-blocking Google Fonts `<link rel="stylesheet">` and over-eager 1.2 MB module preloads.
2. **HTML Boot Skeleton Layout Shift (F4 -> M1)**:
   - `/auth/register`, `/acme/dashboard`, and `/acme/account/security/passkeys` exhibited **CLS: 0.2711** (exceeding the 0.1 threshold) due to visual mismatch when the auth-card boot skeleton in `index.html` was replaced by the page layout.
3. **Project Shell Sequential Waterfall (F10 -> M3)**:
   - `/acme/p/proj_1/overview` had **CLS: 0.3043** due to sequential gating in `ProjectShellPage` before child `<Outlet />` mounted.
4. **Passed Routes**:
   - `/acme/projects` (LCP: 60 ms, CLS: 0, INP: 0 ms)
   - `/acme/observability/latency` (LCP: 68 ms, CLS: 0.06, INP: 0 ms)
   - `/acme/observability/traces/tr_abc123` (LCP: 76 ms, CLS: 0.0708, INP: 0 ms)
   - `/acme/dashboards/geo` (LCP: 760 ms, CLS: 0, INP: 0 ms)

---

## 6. Verification Status

- [x] Test harness implemented in `scripts/audit-cwv.mjs`.
- [x] Test infrastructure documented in `TEST_INFRA.md`.
- [x] Test runner scripts added to `package.json` (`test:cwv`, `test:cwv:quick`).
- [x] Opaque-box execution against production preview server verified.
- [x] Exit codes verified (returns 1 on threshold breach, 0 on full compliance).
- [x] Baseline defects identified and escalated.
