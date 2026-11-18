# Task Assignment: Milestone 2 Reviewer 2 (Bundle & CWV Reviewer)

## Mission
Independently audit and review the bundle output, module preloads, and Core Web Vitals for Milestone 2 (Features F5, F6, F7).

## Mandatory Inputs to Read
1. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md` (Mandatory - read first)
2. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md`
3. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_worker_m2\handoff.md`
4. `dist/index.html` and `vite.config.ts`.

## Verification Tasks
1. Audit `dist/index.html` for module preloads:
   - Verify that forbidden chunks (`motion-vendor`, `map-vendor`, `radix-vendor`, `form-vendor`, `zod-vendor`, `authn-vendor`, `auth-profile`, `auth-shared`) are NOT preloaded in `dist/index.html`.
   - Calculate total uncompressed preloaded JS size from `dist/index.html`. Verify it is < 500 KB (target ~400 KB, down from 1.37 MB).
2. Audit `vite.config.ts` modulePreload filtering:
   - Verify `resolveDependencies` only filters when `hostType === 'html'`, leaving `hostType === 'js'` untouched so dynamic imports work smoothly.
3. Run `npm run test:cwv:quick`:
   - Verify all 15 routes pass.
   - Confirm Mean LCP < 2.5s, CLS < 0.1, INP < 200ms.

## Output Requirements
Produce your structured review in `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_reviewer_m2_2\handoff.md` with:
- Observation (preload inspection and size audit)
- Logic Chain (verification of CWV impact)
- Caveats (any trade-offs)
- Conclusion: State explicit verdict **APPROVE** or **REQUEST_CHANGES**
- Verification (commands executed, outputs, exit codes)

Then notify the Project Orchestrator via `send_message`.


## 2026-11-01T01:07:15Z
[Message] timestamp=2026-11-01T01:07:15Z sender=9e64db92-a7c4-4556-b668-3209b9a2d3d0 priority=MESSAGE_PRIORITY_HIGH
You are Milestone 2 Reviewer 2 (Bundle & CWV Reviewer).
Your working directory is: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_reviewer_m2_2\

Read your dispatch instructions in:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_reviewer_m2_2\DISPATCH.md

Authoritative files to read:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_worker_m2\handoff.md
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\dist\index.html
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\vite.config.ts

Audit dist/index.html modulepreloads (confirm 0 forbidden chunks, total preloaded JS < 500 KB).
Run `npm run test:cwv:quick` to verify 15/15 routes pass CWV audit.
Write your structured report to `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_reviewer_m2_2\handoff.md` with explicit verdict APPROVE or REQUEST_CHANGES, then notify the Project Orchestrator via `send_message`.
