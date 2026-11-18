# BRIEFING — 2026-11-01T05:30:00Z

## Mission
Implement Milestone 4: Runtime CWV Hardening & Telemetry (Features F12, F13, F14, F15) with zero regressions, passing eslint, build, and cwv quick test.

## 🔒 My Identity
- Archetype: implementer (also QA/specialist)
- Roles: implementer, qa, specialist
- Working directory: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_worker_m4\
- Original parent: ada9a12f-ab2f-447c-a83a-8c4bf9d9bdd7
- Milestone: Milestone 4 (F12, F13, F14, F15)

## 🔒 Key Constraints
- Genuine implementation only, no cheating or hardcoding test outcomes.
- Scope: F12 VirtualList scroll INP optimization, F13 Context memoization, F14 Image explicit sizing, F15 Web Vitals telemetry instrumentation.
- Zero ESLint errors across all modified files.
- `npm run build` passes.
- `npm run test:cwv:quick` passes (15/15 routes).
- Write only to `.agents/teamwork/teamwork_worker_m4/` and the assigned source files.

## Current Parent
- Conversation ID: ada9a12f-ab2f-447c-a83a-8c4bf9d9bdd7
- Updated: 2026-11-01T05:30:00Z

## Task Summary
- **What to build**:
  - F12: Optimized VirtualList with passive native scroll listener, rAF coalescing, quantized scroll updates, endReached debounce/guard, willChange: transform.
  - F13: Context value memoization in ThemeProvider, MotionPreferenceContext, MotionProvider; hoisted empty structures in ProjectShellPage.
  - F14: Explicit image sizing (width/height, loading="eager", aspect-square) across AddDeviceDialog, PersonalDetailsPanel, OrgOverviewPage, AccountOverviewPanel, avatar, and AnimatedEmptyState SVGs.
  - F15: In-app Core Web Vitals telemetry (CLS, INP, TTFB, LCP, FCP) in web-vitals.ts exposed on window.__getWebVitalsReport().
- **Success criteria**: ESLint passes (0 errors/warnings), `npm run build` passes (code 0), `npm run test:cwv:quick` passes 15/15 routes.
- **Interface contracts**: PROJECT.md § Telemetry Interface, Explorer M4 handoff docs.

## Change Tracker
- **Files modified**:
  - `src/shared/observe/VirtualList.tsx`: Passive scroll listener, RAF coalescing, quantized updates, endReached guard.
  - `src/theme/ThemeProvider.tsx`: useMemo on ThemeContext value.
  - `src/shared/motion/MotionPreferenceContext.tsx`: useMemo on MotionPreferenceContext value.
  - `src/shared/motion/MotionProvider.tsx`: useMemo on MotionConfig transition prop.
  - `src/pages/workspaces/ProjectShellPage.tsx`: Hoisted EMPTY_TAGS and EMPTY_METADATA.
  - `src/modules/auth/components/profile/AddDeviceDialog.tsx`: Explicit dimensions (176x176), loading="eager", decoding="async", aspect-square on QR code img.
  - `src/modules/auth/components/profile/PersonalDetailsPanel.tsx`: Explicit dimensions (80x80), fetchPriority="high", loading="eager", decoding="async", aspect-square on avatar img; clean envelope typing.
  - `src/pages/team/OrgOverviewPage.tsx`: Explicit dimensions (40x40), fetchPriority="high", loading="eager", decoding="async", aspect-square on org logo img.
  - `src/modules/auth/components/profile/AccountOverviewPanel.tsx`: Explicit dimensions (64x64), fetchPriority="high", loading="eager", decoding="async", aspect-square on user avatar img; clean envelope typing.
  - `src/components/ui/avatar.tsx`: Default loading="eager" and decoding="async" on AvatarImage.
  - `src/shared/motion/AnimatedEmptyState.tsx`: Added width={80} height={80} to 12 empty state SVG illustrations.
  - `src/infrastructure/web-vitals.ts`: Implemented CLS session window observer, INP event observer, TTFB navigation timing, and exposed window.__getWebVitalsReport().
- **Build status**: PASS (tsc -b && vite build in 2m 26s).
- **Pending issues**: None.

## Quality Status
- **Build/test result**: `npm run build` exit code 0; `npm run test:cwv:quick` 15/15 passed (exit code 0); `tier3` scroll stress passed with INP 22ms.
- **Lint status**: 0 errors, 0 warnings across all 12 modified files.
- **Tests added/modified**: Validated against audit-cwv.mjs automated harness.

## Artifact Index
- `.agents/teamwork/teamwork_worker_m4/DISPATCH.md` — Assignment
- `.agents/teamwork/teamwork_worker_m4/BRIEFING.md` — Persistent state
- `.agents/teamwork/teamwork_worker_m4/progress.md` — Liveness & progress tracker
- `.agents/teamwork/teamwork_worker_m4/handoff.md` — 5-component handoff report
