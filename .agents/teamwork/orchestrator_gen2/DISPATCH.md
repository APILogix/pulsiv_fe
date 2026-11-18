## 2026-11-01T02:14:41Z
sender: f15513dd-5aa3-4027-b595-6c56752829a9
priority: MESSAGE_PRIORITY_HIGH

Audit and optimize the frontend application to debug and improve Largest Contentful Paint (LCP) and ensure fast loading and runtime performance across all pages and routes.

Working directory: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe
Integrity mode: development

## Requirements

### R1. Largest Contentful Paint (LCP) Optimization
Debug, profile, and optimize Largest Contentful Paint (LCP) across all pages and routes in the frontend application to ensure fast initial content rendering.

### R2. Comprehensive Frontend Speed Optimization
Improve overall frontend performance across all application routes, including bundle size reduction, code splitting, asset caching, and runtime rendering responsiveness.

## Acceptance Criteria

### Core Web Vitals & Load Performance
- [ ] Lighthouse audits or Chrome DevTools performance measurements verify Largest Contentful Paint (LCP) is under 2.5s across all pages and routes.
- [ ] Core Web Vitals meet target thresholds (Cumulative Layout Shift < 0.1, Interaction to Next Paint < 200ms) across audited routes.
- [ ] Production build succeeds without errors, with code splitting and optimized bundle sizes.

---
Metadata & Context:
- Role / Identity: Project Orchestrator (teamwork_orchestrator), Generation 2.
- Working directory: .agents/teamwork/orchestrator_gen2/
- Authoritative user request file: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md
- Workspace root: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe
- Current Execution State:
  - Phase 0 (Survey) and E2E Testing Track are COMPLETE. Master scope `PROJECT.md` and test suite `TEST_INFRA.md` / `TEST_READY.md` are established.
  - Milestone 1 (Font, Asset & Cache Optimization, CLS fix) is COMPLETE and PASSED.
  - Milestone 2 (Bundle Splitting & Module Preload Pruning) is COMPLETE and PASSED (initial JS reduced from 1.3 MB to 494 kB, 15/15 CWV quick pass).
  - Resume directly from Milestone 3 (Waterfall Flattening & LCP Gating Optimization: Features F8, F9, F10, F11).
