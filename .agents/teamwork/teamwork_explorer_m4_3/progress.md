# Progress — Explorer M4 3 (F14 Image Sizing & F15 CWV Telemetry)

Last visited: 2026-11-01T05:13:00Z

## Status
- [x] Initialized workspace and briefing
- [x] Read ORIGINAL_REQUEST.md and PROJECT.md
- [x] Investigate F14: All `<img>` tags and SVGs rendered as images across the codebase
  - Identified 4 `<img` occurrences: `AddDeviceDialog.tsx` (missing explicit width/height), `PersonalDetailsPanel.tsx`, `OrgOverviewPage.tsx`, `AccountOverviewPanel.tsx`
  - Identified 3 `AvatarImage` occurrences: `SettingsLayout.tsx`, `DropdownMenu.tsx`, `AvatarButton.tsx`
  - Identified 10 SVG illustrations in `AnimatedEmptyState.tsx` missing explicit width/height attributes
  - Clarified file location for `AddDeviceDialog`: Located at `src/modules/auth/components/profile/AddDeviceDialog.tsx` (not `src/pages/inventory/`)
- [x] Investigate F15: Inspect `src/infrastructure/web-vitals.ts` and existing metrics capture
  - Examined current FCP, LCP capture and `window.__getLcpReport()`
- [x] Investigate F15: Review `PROJECT.md § Telemetry Interface` contract
  - Verified `FullWebVitalsReport` and `window.__getWebVitalsReport` requirements
  - Verified how `scripts/audit-cwv.mjs` consumes `__getWebVitalsReport()`
- [x] Design CLS (session window algorithm: 5s max window, 1s inter-shift gap, `!hadRecentInput`)
- [x] Design INP (`event` PerformanceObserver with interactionId tracking & p98/worst duration, fallback to `first-input`)
- [x] Design global accessor `window.__getWebVitalsReport(): FullWebVitalsReport`
- [x] Verify production build (`npm run build`) succeeds cleanly (Task 108 exited with code 0)
- [x] Synthesize findings and write handoff report (`handoff.md`)
- [x] Update BRIEFING.md
- [x] Notify orchestrator via send_message
