# BRIEFING — 2026-11-01T00:55:00Z

## Mission
Investigate Feature F6 (Manual Chunking & Bundle Isolation in Vite) to dissolve monolithic `auth-profile`, isolate `skeletons`, and prevent vendor leakage into initial preloads.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesizer
- Working directory: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m2_2
- Original parent: 9e64db92-a7c4-4556-b668-3209b9a2d3d0
- Milestone: Milestone 2 (Performance & Code-Splitting)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT modify source code files
- Formulate exact replacements, line numbers, and impact analysis for Worker

## Current Parent
- Conversation ID: 9e64db92-a7c4-4556-b668-3209b9a2d3d0
- Updated: 2026-11-01T00:46:41Z

## Investigation State
- **Explored paths**:
  - `vite.config.ts`: lines 70-148 (manualChunks, modulePreload)
  - `src/shared/skeletons/`: `RouteSkeleton.tsx`, `primitives.tsx`, `pages.tsx`, `workspace.tsx`, `index.ts`
  - `src/modules/auth/`: components, profile panels, services (`webauthn.client.ts`), store, pages
  - Build output: `dist/index.html`, `dist/assets/auth-profile-BMnwhnYI.js`, `dist/assets/auth-shared-D3lEUR8-.js`
- **Key findings**:
  - Monolithic `auth-profile` (360.92 kB) bundled `GlobalStepUpModal`, all 13 profile panels, and co-located `RouteSkeleton` (`skeleton-block`).
  - Because `RouteSkeleton` was in `auth-profile`, over 80 route chunks across the app imported `auth-profile`.
  - `auth-profile` and `auth-shared` dragged 8 heavy vendor packages (`authn-vendor`, `motion-vendor`, `radix-vendor`, `form-vendor`, `zod-vendor`, `network-vendor`, `toast-vendor`, `icons-vendor`) into `dist/index.html` as `<link rel="modulepreload">` (1.37 MB total JS preloads).
  - Isolating `src/shared/skeletons/` into a dedicated `skeletons` manual chunk cleanly decouples route fallbacks from auth and vendor libraries.
  - Deleting the `auth-profile` and broad `auth-shared` chunk rules allows Rollup to naturally split each profile panel into its own ~15-30 kB chunk and prevents auth forms and WebAuthn from leaking into initial entry preloads.
- **Unexplored areas**: None. Investigation complete and verified against build output and code graph.

## Key Decisions Made
- Formulate exact replacement for `vite.config.ts` `manualChunks(id)`:
  - Add path normalization (`id.replace(/\\/g, '/')`).
  - Map `/src/shared/skeletons/` -> `'skeletons'`.
  - Map `/src/modules/auth/store/` -> `'auth-store'`.
  - Remove `auth-profile` and broad `auth-shared` rules completely.
  - Preserve 13 cleanly separated third-party vendor chunk rules.

## Artifact Index
- DISPATCH.md — Initial dispatch instructions
- BRIEFING.md — Persistent context & working memory
- progress.md — Liveness & heartbeat
- handoff.md — Final investigation report
