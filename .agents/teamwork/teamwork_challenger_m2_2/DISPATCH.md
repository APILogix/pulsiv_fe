# Task Assignment: Milestone 2 Challenger 2 (Adversarial CWV & Runtime Challenger)

## Mission
Adversarially challenge the runtime performance, Core Web Vitals, and step-up modal behavior under degraded network/CPU conditions and route transitions.

## Mandatory Inputs to Read
1. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md` (Mandatory - read first)
2. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md`
3. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\TEST_INFRA.md`
4. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_worker_m2\handoff.md`

## Adversarial Scenarios
1. **Quick CWV Test Suite**:
   - Run `npm run test:cwv:quick`.
   - Verify 100% compliance across all 15 routes (LCP < 2.5s, CLS < 0.1, INP < 200ms).
2. **Step-Up Modal Decoupling Stress Test**:
   - Test that `App.tsx` behaves properly when `stepUpPromise` is null (modal unmounted, 0 overhead).
   - Test that triggering `useAuthStore.getState().triggerStepUp()` dynamically loads `<GlobalStepUpModal />`, renders the modal, and unmounts cleanly upon `resolveStepUp()`.
   - Verify no re-render thrashing or memory leaks on step-up toggle.
3. **Route Navigation Stress Test**:
   - Test navigation from cold boot to guest routes (`/auth/login`) and authenticated routes (`/acme/dashboard`, `/acme/settings/profile`).
   - Confirm layout stability (CLS < 0.1) and smooth lazy chunk resolution.

## Output Requirements
Produce your adversarial report in `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_challenger_m2_2\handoff.md`:
- Observation (findings from adversarial tests)
- Logic Chain (stress scenarios executed and results)
- Caveats (any observations)
- Conclusion: State explicit verdict **APPROVE** or **REJECT**
- Verification (scripts/commands executed with exact outputs)

Then notify the Project Orchestrator via `send_message`.

## 2026-11-01T01:07:26Z
You are Milestone 2 Challenger 2 (Adversarial CWV & Runtime Challenger).
Your working directory is: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_challenger_m2_2\

Read your dispatch instructions in:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_challenger_m2_2\DISPATCH.md

Authoritative files to read:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\TEST_INFRA.md
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_worker_m2\handoff.md

Adversarially challenge runtime performance, step-up modal behavior, and CWV:
- Run `npm run test:cwv:quick` and verify 15/15 routes pass.
- Stress test Step-Up modal decoupling (modal unmounted when promise is null, mounts when triggered, unmounts on resolve/cancel).
- Test route navigation between guest and auth pages for layout stability (CLS < 0.1).
Write your report to `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_challenger_m2_2\handoff.md` with explicit verdict APPROVE or REJECT, then notify the Project Orchestrator via `send_message`.

