# Task Assignment: Milestone 3 Explorer 2 (Dashboard Multi-Query Gate Decoupling - F9)

## Mission
Investigate Feature F9: In `src/modules/dashboard/ExecutiveDashboard.tsx` and `src/modules/analytics/LatencyPage.tsx`, decouple secondary widget queries from blocking the primary hero/KPI cards so Largest Contentful Paint (LCP) fires immediately on primary data.

## Mandatory Inputs to Read
1. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md` (Mandatory - read first)
2. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md`
3. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_sub_orch_m3\SCOPE.md`
4. Target source files:
   - `src/modules/dashboard/ExecutiveDashboard.tsx` (and related dashboard components)
   - `src/modules/analytics/LatencyPage.tsx` (and related analytics components)

## Investigation Scope
1. Analyze `ExecutiveDashboard.tsx`:
   - Inspect all TanStack Query hooks (`useQuery`) invoked on page load (currently ~9 queries).
   - Check if an overarching `isLoading = q1.isLoading || q2.isLoading || ...` gate prevents ANY content from rendering until all 9 queries resolve.
   - Identify which DOM element represents the Largest Contentful Paint (e.g. Primary KPI cards, Summary Metrics, or Hero Chart).
   - Formulate how to decouple the query gates so primary KPI metrics render immediately while secondary widgets (e.g. activity feed, secondary charts) load independently or show targeted mini-skeletons.
2. Analyze `LatencyPage.tsx`:
   - Inspect all TanStack Query hooks (currently ~7 queries).
   - Check if secondary latency percentiles or regional breakdown queries block the primary latency summary card.
   - Formulate independent widget loading boundaries.
3. Formulate exact code recommendations, diffs, line numbers, and verification commands for the Milestone 3 Worker.

## Output Requirements
Produce a 5-component handoff report in:
`c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m3_2\handoff.md`:
1. Observation (inventory of all queries and gate structures)
2. Logic Chain (decoupling strategy and LCP critical path analysis)
3. Caveats (UI consistency, loading state coordination)
4. Conclusion (exact proposed code edits with line numbers)
5. Verification Method (CWV measurement commands and expected metrics)

Then notify the Project Orchestrator via `send_message`.

## 2026-11-01T01:19:22Z
You are Milestone 3 Explorer 2 (Dashboard Multi-Query Explorer).
Your working directory is: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m3_2\

Read your dispatch instructions in:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m3_2\DISPATCH.md

Authoritative files to read:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_sub_orch_m3\SCOPE.md
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\src\modules\dashboard\ExecutiveDashboard.tsx
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\src\modules\analytics\LatencyPage.tsx

Investigate Feature F9: Analyze the multi-query loading gates in ExecutiveDashboard and LatencyPage. Identify primary LCP elements vs secondary widgets, and formulate a decoupling strategy so primary hero KPIs render immediately.
Write your 5-component report to `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m3_2\handoff.md` and notify the Project Orchestrator via `send_message`.
