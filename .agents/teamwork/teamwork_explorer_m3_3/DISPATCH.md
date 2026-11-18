# Task Assignment: Milestone 3 Explorer 3 (ProjectShellPage Waterfall & Deep-Link Gating - F10, F11)

## Mission
Investigate Feature F10 and F11:
- F10: In `src/pages/workspaces/ProjectShellPage.tsx`, flatten the sequential metadata waterfall so the project navigation shell chrome renders and mounts `<Outlet />` concurrently rather than blocking child route evaluation.
- F11: In deep-link routes and layout guards, prevent layout shifts or premature unmounting when `activeOrgId` is resolving from route parameters.

## Mandatory Inputs to Read
1. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md` (Mandatory - read first)
2. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md`
3. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_sub_orch_m3\SCOPE.md`
4. Target source files:
   - `src/pages/workspaces/ProjectShellPage.tsx`
   - `src/app/layouts/` and route guards (`src/app/router/`)

## Investigation Scope
1. Inspect `ProjectShellPage.tsx`:
   - Trace queries: `useProject(projectId)`, `useOrganization(orgId)`.
   - Check if `<Outlet />` is guarded behind `if (isLoading) return <RouteSkeleton framed />`.
   - Determine how to render the outer project shell chrome immediately with project name placeholder/skeleton while allowing the active child route `<Outlet />` to begin fetching its own data in parallel (eliminating the parent -> child waterfall).
2. Inspect Deep-Link Scope Gating (F11):
   - Check how `orgSlug` / `projectId` from URL params synchronize with `useOrgStore` / `activeOrgId`.
   - Ensure deep-link navigation directly into `/acme/dashboard` or nested project pages does not trigger double-skeletons, blank flashes, or layout shifts (CLS < 0.1).
3. Formulate exact code recommendations, diffs, line numbers, and verification commands for the Milestone 3 Worker.

## Output Requirements
Produce a 5-component handoff report in:
`c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m3_3\handoff.md`:
1. Observation (waterfall traces, query dependencies, route guard structure)
2. Logic Chain (parallelization strategy and layout stability proof)
3. Caveats (child route error handling, unauthenticated deep-links)
4. Conclusion (exact proposed code edits with line numbers)
5. Verification Method (CWV measurement commands and expected metrics)

Then notify the Project Orchestrator via `send_message`.

## 2026-11-01T01:19:29Z
[Message] timestamp=2026-11-01T01:19:29Z sender=9e64db92-a7c4-4556-b668-3209b9a2d3d0 priority=MESSAGE_PRIORITY_HIGH content=You are Milestone 3 Explorer 3 (ProjectShell Waterfall Explorer).
Your working directory is: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m3_3\

Read your dispatch instructions in:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m3_3\DISPATCH.md

Authoritative files to read:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_sub_orch_m3\SCOPE.md
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\src\pages\workspaces\ProjectShellPage.tsx
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\src\app\layouts\
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\src\app\router\

Investigate Features F10 and F11:
- F10: Trace and flatten the sequential metadata waterfall in ProjectShellPage so shell chrome and child `<Outlet />` evaluate concurrently.
- F11: Resolve deep-link org scope gating to eliminate layout shifts or premature unmounting when `activeOrgId` resolves.
Write your 5-component report to `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m3_3\handoff.md` and notify the Project Orchestrator via `send_message`.
