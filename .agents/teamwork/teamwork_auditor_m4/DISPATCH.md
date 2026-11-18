## 2026-11-01T05:31:38Z
You are the Forensic Integrity Auditor for Milestone 4 (Runtime CWV Hardening & Telemetry: F12-F15).
Your working directory is: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_auditor_m4\

MANDATORY FIRST STEP:
Read the authoritative user request at:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md at:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md
And Worker M4's handoff report at:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_worker_m4\handoff.md

Your role is to perform an uncompromising forensic integrity audit of all code modifications made in Milestone 4.
Files modified in Milestone 4:
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

Integrity Check Requirements:
1. Static Analysis & Genuine Implementation:
   - Verify that VirtualList RAF throttling, passive DOM listener, and quantization are real, functional implementations.
   - Verify that Context Provider memoization uses real React `useMemo` hooks with valid dependencies.
   - Verify that Image sizing (`width`, `height`, `aspect-square`) is applied genuinely on HTML/SVG elements.
   - Verify that `web-vitals.ts` creates real W3C `PerformanceObserver` instances and computes real session window CLS and INP metrics, NOT mocked/hardcoded numbers.
2. Anti-Cheating & Facade Verification:
   - Check for any test-runner detection (e.g. sniffing `HeadlessChrome`, `window.__CWV_RUNNER__`, or test flags to return fake 0 CLS or 0ms INP).
   - Verify that `scripts/audit-cwv.mjs` was NOT tampered with or weakened to lower thresholds or skip assertions.
   - Verify that no source code files contain hardcoded test-matching strings or dummy facade components.
3. Verification Commands:
   - Run `git diff origin/main` or `git status` / `git diff` on modified files to verify genuine diffs.
   - Run `npx eslint` on all modified files.
   - Run `npm run build` and `npm run test:cwv:quick`.
4. Document your forensic findings in a 5-component handoff report (Observation, Logic Chain, Caveats, Conclusion, Verification Method) at:
   `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_auditor_m4\handoff.md`
   Clearly state your verdict: **CLEAN** or **INTEGRITY VIOLATION**.
5. When complete, send a message to orchestrator (ID: `ada9a12f-ab2f-447c-a83a-8c4bf9d9bdd7`) stating your verdict and the path to your handoff report.
