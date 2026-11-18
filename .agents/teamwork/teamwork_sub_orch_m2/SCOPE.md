# Scope: Milestone 2 — Bundle Splitting & Preload Optimization

## Objectives
Eliminate initial entry point modulepreload poisoning, decouple monolithic chunks, and achieve fine-grained route-level code splitting:
1. **F5. Decouple GlobalStepUpModal from Root Entry (`src/app/App.tsx`)**:
   - In `src/app/App.tsx`, `GlobalStepUpModal` is loaded at root level.
   - Decouple it using a dynamic mount wrapper so that the modal component is only loaded when `stepUpPromise` or step-up state is active.
2. **F6. Manual Chunking & Bundle Isolation in Vite (`vite.config.ts`)**:
   - Delete the monolithic `auth-profile` chunking rule in `vite.config.ts` (which grouped `GlobalStepUpModal`, `profile/*`, `SecurityCenter`, `Sessions`, `StepUp`, `Account` into one 361 kB chunk).
   - Allow Rollup to naturally code-split individual lazy panels.
   - Separate `RouteSkeleton` into its own lightweight shared chunk so it does not drag vendor dependencies into entry modules.
3. **F7. Module Preload Pruning (`vite.config.ts`)**:
   - Configure `build.modulePreload.resolveDependencies` in `vite.config.ts` so that non-entry vendor chunks (`motion-vendor`, `radix-vendor`, `authn-vendor`, `form-vendor`, `zod-vendor`, `map-vendor`) are NOT injected as `<link rel="modulepreload">` tags in `dist/index.html`.
   - Verify initial preloaded JS drops from ~1.37 MB to < 400 kB on cold entry.

## Assigned Files & Write Ownership
- `src/app/App.tsx`
- `vite.config.ts`

## Pass / Verification Criteria
- `npm run build` succeeds cleanly with exit code 0.
- `dist/index.html` preloads ONLY essential bootstrap chunks (`index.js`, `react-core`, `router-vendor`), and excludes non-entry heavy chunks (`motion-vendor`, `radix-vendor`, `form-vendor`, `zod-vendor`, `authn-vendor`, `map-vendor`).
- Total preloaded JS bytes on initial entry drop below 400 kB.
- `npm run test:cwv:quick` passes 15/15 routes with 100% compliance.
- Reviewer APPROVE, Challenger verified, Forensic Auditor CLEAN.
