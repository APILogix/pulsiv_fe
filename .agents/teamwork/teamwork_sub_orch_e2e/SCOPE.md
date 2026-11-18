# Scope: E2E Testing Track — Automated CWV & Performance Audit Suite

## Objectives
Design and build an automated, comprehensive Core Web Vitals audit test suite derived from user requirements and acceptance criteria:
1. **F16. Automated E2E CWV Audit Harness**:
   - Create an automated audit runner in `scripts/audit-cwv.mjs` (or similar) using Puppeteer, Playwright, or direct Chrome DevTools Protocol (CDP) / Lighthouse.
   - The runner must be capable of:
     1. Starting or connecting to `npm run preview` on `http://127.0.0.1:4173`.
     2. Auditing routes under simulated network/CPU conditions (e.g. Fast 3G / 4x CPU throttle).
     3. Pre-seeding authentication and organization state in `sessionStorage` (`auth-storage`) and `localStorage` (`org-storage`) so all protected routes can be audited without human login.
     4. Reading metrics (`lcp`, `cls`, `inp`, `fcp`, `ttfb`) from `window.__getWebVitalsReport()` or performance observers / CDP.
     5. Asserting against Acceptance Criteria:
        - LCP < 2500ms
        - CLS < 0.1
        - INP < 200ms
     6. Outputting structured audit reports and returning exit code 0 on pass or non-zero on failure.
2. **Tiered Test Cases**:
   - **Tier 1 (Feature Coverage)**: Public auth routes (`/auth/login`, `/auth/register`, `/auth/forgot-password`, etc.) and primary module entries (`/:orgSlug/dashboard`, `/:orgSlug/observability`, `/:orgSlug/projects`, `/:orgSlug/alerts`, `/:orgSlug/billing`).
   - **Tier 2 (Boundary & Corner Cases)**: Heavy multi-query dashboards (`/:orgSlug/observability/latency`, `/:orgSlug/dashboards/geo`, `/:orgSlug/observability/traces/:traceId`), empty state routes, deep-link routes.
   - **Tier 3 (Cross-Feature Combinations)**: Navigation transitions between public -> auth -> project workspace tabs -> settings panels.
   - **Tier 4 (Real-World Application Scenarios)**: Complete user flows (e.g., login -> select project -> view trace detail -> filter latency -> inspect incident).
3. **Artifacts**:
   - Publish `TEST_INFRA.md` at project root documenting architecture, invocation commands, and coverage thresholds.
   - When the test suite is complete and functional, publish `TEST_READY.md` at project root with runner command, tier counts, and route checklist.

## Assigned Files & Write Ownership
- `scripts/` (audit scripts and test runner)
- `TEST_INFRA.md` at project root
- `TEST_READY.md` at project root
- `package.json` (may add test scripts such as `"test:cwv": "node scripts/audit-cwv.mjs"`)

## Pass / Verification Criteria
- `npm run test:cwv` or `node scripts/audit-cwv.mjs` runs against `npm run preview` cleanly.
- Test runner reliably audits routes and reports numeric LCP, CLS, and INP metrics.
- `TEST_READY.md` published at project root.
- Reviewer APPROVE, Challenger verified, Forensic Auditor CLEAN.
