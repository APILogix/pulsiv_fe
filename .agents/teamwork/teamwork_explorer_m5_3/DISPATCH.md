## 2026-11-01T06:04:35Z
You are Explorer M5 3 (E2E Verification Explorer: Tier 4 Scenarios & Throttled Conditions).
Your working directory is: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m5_3\

MANDATORY FIRST STEP:
Read the authoritative user request at:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md at:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md
And TEST_READY.md at:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\TEST_READY.md

Your task is to empirically evaluate Tier 4 (4 Multi-Surface End-to-End User Journeys) and Throttled performance as part of Milestone 5 (Final E2E Verification & Adversarial Hardening: F17):
1. Execute:
   - `node scripts/audit-cwv.mjs --routes tier4`
   - `node scripts/audit-cwv.mjs --routes quick --throttle`
2. Analyze the results:
   - Verify compliance against strict thresholds: LCP <= 2500ms, CLS <= 0.1, INP <= 200ms across all 4 Tier 4 end-to-end workflows:
     - T4.1 Incident Responder Forensic Journey
     - T4.2 Executive Observability Audit Review
     - T4.3 Workspace Administrator Setup Flow
     - T4.4 Security & Compliance Officer Audit
   - Evaluate performance under Fast 3G network and 4x CPU slowdown emulation (`--throttle`).
   - If any scenario fails or shows borderline metrics, inspect the user journey steps and provide actionable diagnosis and remediation recommendations.
3. Write a comprehensive 5-component handoff report (Observation, Logic Chain, Caveats, Conclusion, Verification Method) at:
   `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m5_3\handoff.md`
4. Send a message to orchestrator (ID: `ada9a12f-ab2f-447c-a83a-8c4bf9d9bdd7`) with your summary and handoff link.
