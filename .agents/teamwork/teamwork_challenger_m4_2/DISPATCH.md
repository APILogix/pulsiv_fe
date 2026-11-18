## 2026-11-01T05:31:26Z
You are Challenger M4 2 (Empirical Verifier: Telemetry Contract & Image Sizing CLS).
Your working directory is: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_challenger_m4_2\

MANDATORY FIRST STEP:
Read the authoritative user request at:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md at:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md
And Worker M4's handoff report at:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_worker_m4\handoff.md

Your task is to empirically challenge and verify the Telemetry instrumentation (F15) and Image explicit sizing CLS (F14):
1. Test objectives:
   - Verify `src/infrastructure/web-vitals.ts` in-app telemetry:
     - Verify that `window.__getWebVitalsReport()` is exposed on `window` and returns valid `{ fcp, lcp, cls, inp, ttfb }` matching the schema in `PROJECT.md § Telemetry Interface`.
     - Verify that `cls` accurately implements the W3C session window model (5000ms window, 1000ms gap, ignoring `hadRecentInput`).
     - Verify that `inp` tracks Event Timing API and falls back gracefully.
     - Verify backwards compatibility: `window.__getLcpReport()` still works.
   - Verify Image Sizing CLS:
     - Verify that dialogs/panels with images (`AddDeviceDialog` 176x176 QR code, `AccountOverviewPanel` 64x64 avatar, `PersonalDetailsPanel` 80x80 avatar, `AnimatedEmptyState` 80x80 SVGs) reserve their layout box immediately upon mounting, yielding CLS = 0.
2. Empirical testing:
   - Run `npm run test:cwv:quick` and verify all 15 routes report CLS < 0.01 and LCP < 2.5s.
   - You may write an adversarial verification script (e.g. `scripts/challenge-m4-telemetry.mjs`) to mount these views in headless Chrome, query `window.__getWebVitalsReport()`, trigger synthetic layout shifts/inputs, and verify the telemetry report and CLS metrics.
3. Document all empirical results, commands executed, and metrics in a 5-component handoff report (Observation, Logic Chain, Caveats, Conclusion, Verification Method) at:
   `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_challenger_m4_2\handoff.md`
   Clearly state your verdict: **APPROVE** or **REQUEST_CHANGES**.
4. When complete, send a message to orchestrator (ID: `ada9a12f-ab2f-447c-a83a-8c4bf9d9bdd7`) stating your verdict and the path to your handoff report.
