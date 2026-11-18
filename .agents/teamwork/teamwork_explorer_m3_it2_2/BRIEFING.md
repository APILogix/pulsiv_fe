# BRIEFING — 2026-11-01T03:40:00Z

## Mission
Investigate ESLint failure in `ProjectShellPage.tsx` caused by `useOrgStore.getState()` called in render body, and devise a robust, ESLint-compliant fix strategy for Worker M3.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesis
- Working directory: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m3_it2_2
- Original parent: ada9a12f-ab2f-447c-a83a-8c4bf9d9bdd7
- Milestone: M3 Iteration 2

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT modify project source code under src/
- Deliver findings via 5-component handoff.md and send_message to orchestrator

## Current Parent
- Conversation ID: ada9a12f-ab2f-447c-a83a-8c4bf9d9bdd7
- Updated: 2026-11-01T03:35:00Z

## Investigation State
- **Explored paths**:
  - `src/pages/workspaces/ProjectShellPage.tsx` (lines 61-197)
  - `src/modules/organizations/store/org.store.ts` (lines 1-77)
  - `src/app/router/protected-route-guards.tsx` (lines 1-84)
  - `node_modules/eslint-plugin-react-compiler/dist/index.js` (lines 49614-49740)
  - `scripts/challenge-m3-waterfall-sync.mjs`
  - `.agents/teamwork/teamwork_challenger_m3_2/handoff.md`
- **Key findings**:
  1. ESLint `react-compiler/react-compiler` error on lines 75:25, 75:82, and 163:29 is triggered because `useOrgStore` begins with `use`, identifying it as a React Hook in the compiler's AST parser (`KnownHook`). Referencing `.getState()` treats the hook identifier as a normal value rather than calling it (`visitPlace2` -> `recordInvalidHookUsageError`).
  2. The runtime crash (`Minified React error #300`) in Test 4 was caused by `useMemo` for `contextValue` on line 169 being placed AFTER four conditional early returns (lines 102, 105, 111, 116), violating the Rules of Hooks when cold-cache or out-of-sync org state triggers an early return.
  3. Solution:
     - Use individual reactive selectors: `const activeOrgSlug = useOrgStore((s) => s.activeOrgSlug);` and `const activeProjectId = useOrgStore((s) => s.activeProjectId);`.
     - In render body, compare against the selected local variables instead of calling `useOrgStore.getState()`.
     - Move `effectiveProjectId`, `effectiveProject` (`useMemo`), and `contextValue` (`useMemo`) to the top of `ProjectShellPage.tsx` before ANY conditional returns.
     - Export `export const orgStore = useOrgStore;` from `org.store.ts` for non-hook consumers.
- **Unexplored areas**: None. Root causes and clean architectural resolutions are fully verified.

## Key Decisions Made
- Recommending unconditional hook placement at component top level to fix Rules of Hooks violation.
- Recommending reactive Zustand selectors `useOrgStore((s) => s.xxx)` to eliminate `useOrgStore.getState()` from render bodies.
- Recommending exporting `orgStore` alias in `org.store.ts` for non-component consumers.

## Artifact Index
- DISPATCH.md — Initial dispatch message
- progress.md — Liveness & status log
- handoff.md — 5-component handoff report for Worker M3
