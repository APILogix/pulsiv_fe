# Task Assignment: Milestone 2 Implementation Worker

## Mission
Implement Milestone 2 Features F5, F6, and F7 to optimize bundle splitting, isolate route skeletons, decouple `GlobalStepUpModal` from entry, and prune non-entry module preloads from `dist/index.html`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Write Ownership Boundaries
You have exclusive write ownership to:
- `src/app/App.tsx`
- `vite.config.ts`

Do NOT modify any other source files or test scripts.

## Authoritative Inputs to Read
1. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md` (Mandatory - read first)
2. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md`
3. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_sub_orch_m2\SCOPE.md`
4. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m2_1\handoff.md` (F5 analysis & code)
5. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m2_2\handoff.md` (F6 analysis & chunking config)
6. `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m2_3\handoff.md` (F7 analysis & preload filtering)

## Required Implementation Steps

### 1. Feature F5: Decouple GlobalStepUpModal in `src/app/App.tsx`
- Replace root store subscription in `App()` with a dedicated `GlobalStepUpGate()` component.
- In `GlobalStepUpGate()`:
  - Subscribe to boolean `hasStepUp = useAuthStore((state) => !!state.stepUpPromise)`.
  - Return `null` if `!hasStepUp`.
  - Return `<Suspense fallback={null}><GlobalStepUpModal /></Suspense>` when `hasStepUp` is true.
- `App()` renders `<AppProviders><RouterProvider router={router} /><GlobalStepUpGate /></AppProviders>`.
- Root component does not re-render on step-up transitions, and modal is only mounted when required.

### 2. Feature F6: Manual Chunking & Skeletons Isolation in `vite.config.ts`
- In `rollupOptions.output.manualChunks(id)`:
  - Add path normalization: `const normalizedId = id.replace(/\\/g, '/');`
  - Add explicit chunking for skeletons:
    ```ts
    if (normalizedId.includes('/src/shared/skeletons/')) {
      return 'skeletons';
    }
    ```
  - Dissolve the monolithic `auth-profile` manual chunk rule.
  - Retain `auth-store` for `/src/modules/auth/store/`.
  - Eliminate broad `auth-shared` rule so Rollup naturally code-splits sub-panels and forms.

### 3. Feature F7: Module Preload Pruning in `vite.config.ts`
- In `build.modulePreload`:
  - Add `resolveDependencies`:
    ```ts
    modulePreload: {
      polyfill: true,
      resolveDependencies(filename, deps, { hostType }) {
        if (hostType === 'html') {
          return deps.filter(dep => {
            if (dep.includes('motion-vendor')) return false;
            if (dep.includes('map-vendor')) return false;
            if (dep.includes('radix-vendor')) return false;
            if (dep.includes('form-vendor')) return false;
            if (dep.includes('zod-vendor')) return false;
            if (dep.includes('authn-vendor')) return false;
            if (dep.includes('auth-profile')) return false;
            if (dep.includes('auth-shared')) return false;
            return true;
          });
        }
        return deps;
      },
    },
    ```

## Verification Requirements
You must execute the following commands and include full output in your report:
1. `npm run build` (`tsc -b && vite build`) - must exit with code 0.
2. Verify total preloaded JS size in `dist/index.html`:
   - Calculate sum of uncompressed sizes of all `<script>` and `<link rel="modulepreload">` tags in `dist/index.html`.
   - Must be < 500 KB (target ~400 KB, down from 1.37 MB).
3. Verify forbidden chunks are absent from `dist/index.html` preloads:
   - Zero occurrences of `motion-vendor`, `map-vendor`, `radix-vendor`, `form-vendor`, `zod-vendor`, `authn-vendor`, `auth-profile`, `auth-shared`.
4. Verify `skeletons` chunk exists in `dist/assets/`:
   - Contains route skeletons and has zero heavy vendor dependencies.
5. Verify Core Web Vitals:
   - Run `npm run test:cwv:quick`.
   - Must pass 15/15 routes with zero regressions.

## Output Format
Write your 5-component report to `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_worker_m2\handoff.md`:
1. Observation (files modified, diffs applied)
2. Logic Chain (rationale for modifications)
3. Caveats (any trade-offs or notable behaviors)
4. Conclusion (summary of bundle and metric changes)
5. Verification (commands run, exit codes, exact stdout/stderr evidence)

Then notify the Orchestrator via `send_message`.


## 2026-11-01T00:59:23Z
You are the Milestone 2 Implementation Worker.
Your working directory is: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_worker_m2\

Read your full task assignment in:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_worker_m2\DISPATCH.md

Read the authoritative requirements first:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_sub_orch_m2\SCOPE.md

Also read the 3 Explorer handoffs for exact code and diffs:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m2_1\handoff.md
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m2_2\handoff.md
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m2_3\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your exclusive write ownership:
- `src/app/App.tsx`
- `vite.config.ts`

Tasks:
1. Feature F5: Decouple GlobalStepUpModal in `src/app/App.tsx` using `GlobalStepUpGate` so it only mounts when `hasStepUp` (`!!state.stepUpPromise`) is true and does not re-render root App.
2. Feature F6: In `vite.config.ts`, normalize paths (`id.replace(/\\/g, '/')`), isolate skeletons into chunk `'skeletons'`, dissolve the monolithic `auth-profile` chunk, and eliminate broad `auth-shared` so sub-routes code-split cleanly.
3. Feature F7: In `vite.config.ts`, add `build.modulePreload.resolveDependencies` filtering non-entry vendor chunks (`motion-vendor`, `map-vendor`, `radix-vendor`, `form-vendor`, `zod-vendor`, `authn-vendor`, `auth-profile`, `auth-shared`) when `hostType === 'html'`.

Verification:
- Run `npm run build` (`tsc -b && vite build`) and ensure exit code 0.
- Verify forbidden chunks are absent from `dist/index.html` modulepreloads.
- Verify total preloaded JS size in `dist/index.html` is < 500 KB (target ~400 KB).
- Run `npm run test:cwv:quick` and verify 15/15 routes pass.

Write your 5-component report to `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_worker_m2\handoff.md` and notify the Project Orchestrator via `send_message`.
