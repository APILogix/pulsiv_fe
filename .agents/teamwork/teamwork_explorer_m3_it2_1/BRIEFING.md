# BRIEFING — 2026-11-01T03:38:15Z

## Mission
Analyze React error #300 (hook order violation) and `useOrgStore.getState()` usage in `src/pages/workspaces/ProjectShellPage.tsx` and produce an actionable fix strategy and diff recommendation for Worker M3.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m3_it2_1
- Original parent: ada9a12f-ab2f-447c-a83a-8c4bf9d9bdd7
- Milestone: Milestone 3 Iteration 2

## 🔒 Key Constraints
- Read-only investigation — do NOT implement code changes in application source files
- Adhere strictly to Rules of Hooks and React Compiler rules
- Deliver 5-component handoff.md report

## Current Parent
- Conversation ID: ada9a12f-ab2f-447c-a83a-8c4bf9d9bdd7
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `src/pages/workspaces/ProjectShellPage.tsx`
  - `src/modules/organizations/store/org.store.ts`
  - `src/pages/workspaces/ProjectUuidRedirect.tsx`
  - `scripts/challenge-m3-waterfall-sync.mjs`
  - `PROJECT.md`, `ORIGINAL_REQUEST.md`
- **Key findings**:
  - `useMemo` on line 169 is called after conditional returns (lines 102, 105, 111, 116), causing `Minified React error #300` whenever an early exit occurs.
  - Calling `useOrgStore.getState()` on lines 75, 84, and 163 violates React Compiler rules because `useOrgStore` is named like a hook and referenced as an object.
  - Adding `activeOrgSlug` and `activeProjectId` hook selectors allows pure hook-based state reading.
  - Lifting `effectiveProjectId`, `effectiveProject` (memoized), and `contextValue` (memoized) above line 102 guarantees 100% constant hook call counts across every render path.
- **Unexplored areas**: None. Problem and solution fully characterized.

## Key Decisions Made
- Recommended lifting all hooks (`effectiveProject` memo, `contextValue` memo) unconditionally before any conditional return statements.
- Recommended replacing all 3 instances of `useOrgStore.getState()` with Zustand hook selectors.

## Artifact Index
- DISPATCH.md — dispatch record
- progress.md — liveness and progress log
- BRIEFING.md — persistent memory
- handoff.md — 5-component handoff report
