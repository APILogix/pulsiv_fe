## 2026-11-01T05:09:51Z
You are teamwork_worker (Worker M4: Implementation of Runtime CWV Hardening & Telemetry).
Your working directory is: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_worker_m4\

Before starting work, you MUST read:
1. ORIGINAL_REQUEST.md: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md
2. PROJECT.md: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md
3. Explorer M4 1 Handoff (F12 VirtualList): c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m4_1\handoff.md
4. Explorer M4 2 Handoff (F13 Context Memoization): c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m4_2\handoff.md
5. Explorer M4 3 Handoff (F14 Image Sizing & F15 Telemetry): c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m4_3\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope: Milestone 4 (Features F12, F13, F14, F15)
You own and have exclusive write permission on the following files:
- `src/shared/observe/VirtualList.tsx`
- `src/theme/ThemeProvider.tsx`
- `src/shared/motion/MotionPreferenceContext.tsx`
- `src/shared/motion/MotionProvider.tsx`
- `src/pages/workspaces/ProjectShellPage.tsx`
- `src/modules/auth/components/profile/AddDeviceDialog.tsx`
- `src/modules/auth/components/profile/PersonalDetailsPanel.tsx`
- `src/pages/team/OrgOverviewPage.tsx`
- `src/modules/auth/components/profile/AccountOverviewPanel.tsx`
- `src/components/ui/avatar.tsx`
- `src/shared/motion/AnimatedEmptyState.tsx`
- `src/infrastructure/web-vitals.ts`

Detailed Tasks:
1. **F12: VirtualList Scroll INP Optimization** (`src/shared/observe/VirtualList.tsx`):
   - Implement the optimized drop-in `VirtualList` specified in `teamwork_explorer_m4_1/handoff.md §4`.
   - Replace React synthetic `onScroll` with native `addEventListener("scroll", onScroll, { passive: true })` on `containerRef.current`.
   - Coalesce scroll updates using `requestAnimationFrame`, canceling any queued frame on cleanup.
   - Batch layout reads (`scrollTop`, `scrollHeight`, `clientHeight`) before updating React state.
   - Quantize state updates: update `scrollTop` only when `newStartIndex !== lastStartIndexRef.current`.
   - Guard `onEndReached` with `endReachedTriggeredRef` to prevent runaway pagination during high-speed fling.
   - Add `willChange: "transform"` to the inner translated container.

2. **F13: Context Provider Value Memoization**:
   - In `src/theme/ThemeProvider.tsx`: wrap context value in `useMemo(() => ({ theme, setTheme, toggleTheme, resolvedTheme: 'dark' }), [theme, setTheme, toggleTheme])`.
   - In `src/shared/motion/MotionPreferenceContext.tsx`: wrap context value in `useMemo(() => ({ reduced, enabled: !reduced }), [reduced])`.
   - In `src/shared/motion/MotionProvider.tsx`: wrap `transition` in `useMemo(() => ({ duration: DURATION.base, ease: EASE.standard }), [])`.
   - In `src/pages/workspaces/ProjectShellPage.tsx`: hoist `EMPTY_TAGS = []` and `EMPTY_METADATA = {}` to module scope for fallback synthesis.
   - Ensure full React 19 and `babel-plugin-react-compiler` compliance (0 ESLint errors).

3. **F14: Image Explicit Sizing for CLS Prevention**:
   - In `src/modules/auth/components/profile/AddDeviceDialog.tsx` (line 211): add `width={176}`, `height={176}`, `loading="eager"`, `decoding="async"` to the TOTP QR code `<img>`.
   - In `PersonalDetailsPanel.tsx`, `OrgOverviewPage.tsx`, `AccountOverviewPanel.tsx`: ensure explicit `loading="eager"` and `aspect-square`.
   - In `src/shared/motion/AnimatedEmptyState.tsx`: add `width={80}` and `height={80}` to the 10 empty state SVG illustrations.

4. **F15: In-App Core Web Vitals Telemetry Instrumentation** (`src/infrastructure/web-vitals.ts`):
   - Implement `layout-shift` PerformanceObserver with the standard session window algorithm (5s max window, 1s gap, excluding `hadRecentInput`).
   - Implement `event` PerformanceObserver for INP tracking (p98 / max duration) with fallback to `first-input`.
   - Extract `ttfb` from `PerformanceNavigationTiming`.
   - Expose `window.__getWebVitalsReport(): FullWebVitalsReport` matching `PROJECT.md § Telemetry Interface`:
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
     ```
   - Preserve backwards compatibility with `window.__getLcpReport()`.

Verification Required:
1. `npx eslint` across all modified files (exit code 0, 0 errors, 0 warnings).
2. `npm run build` (`tsc -b && vite build`) exit code 0.
3. `npm run test:cwv:quick` exit code 0 (15/15 routes pass).
