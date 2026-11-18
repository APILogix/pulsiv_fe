## 2026-11-01T03:43:16Z
You are teamwork_worker (Worker M3, Iteration 2).
Your working directory is: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_worker_m3_it2\

Before starting work, you MUST read:
1. ORIGINAL_REQUEST.md: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md
2. PROJECT.md: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md
3. Explorer 1 Handoff (Hook Structure & Patch): c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m3_it2_1\handoff.md
4. Explorer 2 Handoff (Zustand Selectors): c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m3_it2_2\handoff.md
5. Explorer 3 Handoff (Cross-File Audit): c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m3_it2_3\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & File Ownership:
You own exclusively:
- src/pages/workspaces/ProjectShellPage.tsx
- src/modules/organizations/store/org.store.ts
- src/app/router/protected-route-guards.tsx
- src/pages/workspaces/ProjectUuidRedirect.tsx
- src/shared/motion/page-ready.ts

Your Mission: Remediate Rules of Hooks violation and React Compiler lint errors in Milestone 3:
1. In `src/pages/workspaces/ProjectShellPage.tsx`:
   - Select all needed Zustand state at the top:
     `const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);`
     `const activeProjectId = useOrgStore((s) => s.activeProjectId);`
   - Lift `effectiveProjectId`, `effectiveProject` (`useMemo`), and `contextValue` (`useMemo`) to the top of the component immediately after `useScrollRestoration(scrollRef)`, strictly BEFORE line 102 (before ANY conditional return statements).
   - Replace all `useOrgStore.getState()` invocations in render with local reactive variables (`activeOrgId`, `activeOrgSlug`, `activeProjectId`).
   - Keep synchronous project ID sync before returning JSX:
     `if (effectiveProjectId && activeProjectId !== effectiveProjectId) { setActiveProjectId(effectiveProjectId); setActiveProjectSlug(effectiveProject.slug); }`
2. In `src/app/router/protected-route-guards.tsx`:
   - Replace `useOrgStore.getState()` on line 50 with selector or clean hook access.
3. In `src/modules/organizations/store/org.store.ts`:
   - Export `orgStore = useOrgStore` if needed for non-hook callers.
4. Clean up any TypeScript `any` lints in `src/pages/workspaces/ProjectUuidRedirect.tsx` and `src/shared/motion/page-ready.ts`.

Verification Requirements:
1. Run `npx eslint src/pages/workspaces/ProjectShellPage.tsx` — must pass with 0 errors.
2. Run `npm run build` (`tsc -b && vite build`) — must pass with exit code 0.
3. Run `node scripts/challenge-m3-waterfall-sync.mjs` — must pass all 5 empirical tests with 0 errors (specifically Test 4 passing with 0 layout shift and zero render faults).
4. Run `npm run test:cwv:quick` — all 15/15 routes must pass Core Web Vitals thresholds.
5. Document all implementation details and verification results in `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_worker_m3_it2\handoff.md`.
6. Send completion message via `send_message`.


## 2026-11-01T03:58:52Z
**Context**: Milestone 3 Iteration 2 Implementation
**Content**: Status check on empirical test runner and CWV quick suite. Please report progress and submit handoff.md once test runs conclude.
**Action**: Update progress and send handoff.
