# Handoff Report: Milestone 2 Explorer 1 (GlobalStepUpModal Decoupling & Root Entry Optimization)

## 1. Observation

### 1.1 Root Entry Implementation (`src/app/App.tsx`)
In `src/app/App.tsx`, the root component is structured as follows:
```tsx
1: import { lazy, Suspense } from "react";
2: import { RouterProvider } from "react-router";
3: import { AppProviders } from "./providers/AppProviders";
4: import { router } from "./router/routes";
5: import { useAuthStore } from "@/modules/auth/store/auth.store";
6: 
7: const GlobalStepUpModal = lazy(() =>
8:   import("@/modules/auth/components/GlobalStepUpModal").then((m) => ({ default: m.GlobalStepUpModal }))
9: );
10: 
11: function App() {
12:   const stepUpPromise = useAuthStore((state) => state.stepUpPromise);
13: 
14:   return (
15:     <AppProviders>
16:       <RouterProvider router={router} />
17:       {stepUpPromise ? (
18:         <Suspense fallback={null}>
19:           <GlobalStepUpModal />
20:         </Suspense>
21:       ) : null}
22:     </AppProviders>
23:   );
24: }
25: 
26: export default App;
```
- Line 7–9 defines `GlobalStepUpModal` via `lazy(() => import(...))` directly at module scope in `App.tsx`.
- Line 12 subscribes the entire root `App` component to `state.stepUpPromise` from `useAuthStore`.
- Any transition of `stepUpPromise` (e.g. from `null` to active promise and back to `null`) forces `App()` to re-render, re-evaluating JSX containing `<AppProviders>` and `<RouterProvider router={router} />`.

### 1.2 Step-Up Trigger Mechanism & State Machine
- In `src/modules/auth/store/auth.store.ts`:
  - Line 21 defines the state interface:
    ```ts
    stepUpPromise: { resolve: () => void; reject: (err: any) => void } | null;
    triggerStepUp: () => Promise<void>;
    resolveStepUp: () => void;
    rejectStepUp: (err: any) => void;
    ```
  - Lines 56–72 manage the Promise lifecycle:
    - `triggerStepUp`: returns a new `Promise<void>`, storing `{ resolve, reject }` in `stepUpPromise`.
    - `resolveStepUp`: executes `stepUpPromise.resolve()`, sets `stepUpPromise: null`, and sets `stepUpFresh: true`.
    - `rejectStepUp`: executes `stepUpPromise.reject(err)` and resets `stepUpPromise: null`.
- In `src/infrastructure/api-client/error.interceptor.ts`:
  - Lines 87–95 intercept HTTP 403 responses with error code `STEP_UP_REQUIRED`:
    ```ts
    if (apiError.status === 403 && apiError.code === 'STEP_UP_REQUIRED' && error.config) {
      try {
        const { triggerStepUp } = useAuthStore.getState();
        await triggerStepUp();
        return client.request(error.config);
      } catch {
        // Step-up cancelled/failed
      }
    }
    ```
- In `src/modules/auth/components/GlobalStepUpModal.tsx`:
  - Lines 19–22:
    ```ts
    const stepUpPromise = useAuthStore((s) => s.stepUpPromise);
    const resolveStepUp = useAuthStore((s) => s.resolveStepUp);
    const rejectStepUp = useAuthStore((s) => s.rejectStepUp);
    const isOpen = !!stepUpPromise;
    ```
  - Lines 31–37 import and configure `useForm` from `react-hook-form` with `zodResolver` from `@hookform/resolvers/zod` and schema `mfaVerifyStepUpSchema` from `zod`.
  - Line 12 imports `stepUpWithPasskey` and `WebAuthnCeremonyError` from `@/modules/auth/services/webauthn.client` (pulling in `@simplewebauthn/browser`).
  - Line 4 imports `Dialog`, `DialogContent`, etc. from `@/components/ui/dialog` (pulling in `@radix-ui/react-dialog`).

### 1.3 Root Entry Chunk Leakage in Production Build
Inspection of the current production build output (`dist/index.html` and `dist/assets/index-*.js`) revealed:
1. In `dist/index.html`:
   Lines 87–101 inject `<link rel="modulepreload">` tags for:
   ```html
   <script type="module" crossorigin src="/assets/index-bhvfi-0o.js"></script>
   <link rel="modulepreload" crossorigin href="/assets/react-core-DcVtC1FV.js">
   <link rel="modulepreload" crossorigin href="/assets/router-vendor-wejczQWj.js">
   <link rel="modulepreload" crossorigin href="/assets/query-vendor-gB5oOiv_.js">
   <link rel="modulepreload" crossorigin href="/assets/form-vendor-BUnnO7EM.js">
   <link rel="modulepreload" crossorigin href="/assets/icons-vendor-C8X5Yirl.js">
   <link rel="modulepreload" crossorigin href="/assets/auth-store-JjaizQnO.js">
   <link rel="modulepreload" crossorigin href="/assets/toast-vendor-_zhc-Y1N.js">
   <link rel="modulepreload" crossorigin href="/assets/radix-vendor-D3UjEnxe.js">
   <link rel="modulepreload" crossorigin href="/assets/motion-vendor-CDK1nRuk.js">
   <link rel="modulepreload" crossorigin href="/assets/zod-vendor-CNXRWoz6.js">
   <link rel="modulepreload" crossorigin href="/assets/network-vendor-RXCkG4If.js">
   <link rel="modulepreload" crossorigin href="/assets/authn-vendor-PCDPDTV4.js">
   <link rel="modulepreload" crossorigin href="/assets/auth-shared-D3lEUR8-.js">
   <link rel="modulepreload" crossorigin href="/assets/auth-profile-BMnwhnYI.js">
   ```
2. In `dist/assets/index-bhvfi-0o.js` (entry chunk):
   Line 2 contains static imports:
   ```js
   import{R as U,B as L}from"./auth-profile-BMnwhnYI.js";
   import"./form-vendor-BUnnO7EM.js";
   import"./icons-vendor-C8X5Yirl.js";
   import"./toast-vendor-_zhc-Y1N.js";
   import"./radix-vendor-D3UjEnxe.js";
   import"./motion-vendor-CDK1nRuk.js";
   import"./zod-vendor-CNXRWoz6.js";
   import"./network-vendor-RXCkG4If.js";
   import"./authn-vendor-PCDPDTV4.js";
   ```
3. Source Analysis of the Static Import:
   - Export `R as U` in `auth-profile-BMnwhnYI.js` is `RouteSkeleton` (`src/shared/skeletons/RouteSkeleton.tsx`).
   - Export `B as L` in `auth-profile-BMnwhnYI.js` is `Block` (`src/shared/skeletons/primitives.tsx`).
   - In `src/app/layouts/RootLayout.tsx` line 4, `RootLayout` statically imports `RouteSkeleton`.
   - In `vite.config.ts`, `manualChunks` defines the monolithic rule `auth-profile` for `src/modules/auth/{profile,pages/SecurityCenter,pages/Sessions,pages/StepUp,pages/Account,components/GlobalStepUpModal}`, but has no rule for `src/shared/skeletons/`.
   - Rollup's chunk grouping merged `RouteSkeleton` and `LoadingBoundary` into `auth-profile-BMnwhnYI.js`.
   - Because `RootLayout` is in the entry chunk, Rollup emitted a static import of `auth-profile-BMnwhnYI.js` directly in `index-[hash].js`, causing the entire 361 kB `auth-profile` chunk plus its 8 vendor chunks to be statically imported on cold boot.

### 1.4 Provider Tree Inspection (`src/app/providers/AppProviders.tsx`)
- `ThemeProvider`: manages `mono` dark theme class on `<html>`, pure state, no external heavy libraries.
- `QueryProvider`: provides `queryClient` instance from `@tanstack/react-query`.
- `MotionPreferenceProvider`: uses native `window.matchMedia("(prefers-reduced-motion: reduce)")`, pure React state with zero `framer-motion` runtime.
- `Toaster`: lazy imported with `lazy(() => import('@/components/ui/sonner').then(m => ({ default: m.Toaster })))`.

---

## 2. Logic Chain

1. **Step-up is an asynchronous error-recovery flow, not an entry-time prerequisite**:
   Based on observation §1.2, step-up verification is only invoked when an authenticated user performs a privileged action that triggers a 403 `STEP_UP_REQUIRED` API response. For cold-start and anonymous navigation, `stepUpPromise` is always `null`.
2. **Top-level store subscription in `App()` creates unnecessary root component churn**:
   Based on observation §1.1, line 12 subscribes the root `App` component to `state.stepUpPromise`. Placing the subscription directly in `App()` forces React to re-execute `App` and re-render `<AppProviders>` and `<RouterProvider>` whenever step-up state initiates or clears.
3. **Encapsulating step-up mounting into `GlobalStepUpGate` decouples the root render cycle**:
   By moving the store subscription into a dedicated `GlobalStepUpGate` component:
   - `App` becomes a purely static wrapper that never re-renders when step-up triggers.
   - `GlobalStepUpGate` returns `null` immediately when `!hasStepUp`.
   - `<GlobalStepUpModal />` is only mounted when `hasStepUp` is `true`, at which point React Suspense kicks off the dynamic import of `GlobalStepUpModal`.
4. **Decoupling F5 alone is necessary but must pair with F6 and F7 to eliminate entry preload bloat**:
   Based on observation §1.3, the bundler statically linked `auth-profile` and all step-up dependencies (`form-vendor`, `zod-vendor`, `authn-vendor`, `radix-vendor`) into `index-[hash].js` because:
   a) `manualChunks` lumped `GlobalStepUpModal` into `auth-profile`.
   b) Rollup merged `RouteSkeleton` into `auth-profile`.
   c) `RootLayout` statically imported `RouteSkeleton`.
   Therefore, the complete elimination of entry bundle poisoning requires:
   - **F5 (`src/app/App.tsx`)**: Isolate step-up in `GlobalStepUpGate` with conditional lazy mounting.
   - **F6 (`vite.config.ts`)**: Remove the monolithic `auth-profile` manual chunk and isolate `RouteSkeleton` into its own `'route-skeleton'` chunk.
   - **F7 (`vite.config.ts`)**: Prune non-entry vendor chunks in `build.modulePreload.resolveDependencies`.

---

## 3. Caveats

1. **F6 / F7 Dependency**: F5 in `src/app/App.tsx` decouples the component tree and ensures runtime code-splitting. However, Rollup's physical output chunking is dictated by `vite.config.ts`. If F6 and F7 are not implemented concurrently in Worker's step, `auth-profile` would still be generated by Vite until `manualChunks` is updated.
2. **Session Storage Persistence**: In `useAuthStore`, `stepUpPromise` is omitted from `partialize` (only `user`, `isAuthenticated`, `isAdmin`, `mfaVerified` are persisted). This is correct: `stepUpPromise` holds in-memory Promise resolver closures that cannot and should not be serialized to storage. On page reload, `stepUpPromise` is cleanly `null`.
3. **No other eager modals found in root**: Inspection of `App.tsx`, `AppProviders.tsx`, and `RootLayout.tsx` confirmed there are no other eager modals or dialogs mounted at the root level. `Toaster` is already lazy-loaded.

---

## 4. Conclusion & Concrete Worker Instructions

### 4.1 Exact Code Edits for `src/app/App.tsx`
Replace the contents of `src/app/App.tsx` with the following clean, decoupled implementation:

```tsx
import { lazy, Suspense } from "react";
import { RouterProvider } from "react-router";
import { AppProviders } from "./providers/AppProviders";
import { router } from "./router/routes";
import { useAuthStore } from "@/modules/auth/store/auth.store";

const GlobalStepUpModal = lazy(() =>
  import("@/modules/auth/components/GlobalStepUpModal").then((m) => ({ default: m.GlobalStepUpModal }))
);

/**
 * GlobalStepUpGate
 *
 * Decoupled step-up modal gate.
 * Only mounts and loads the lazy GlobalStepUpModal component when an active
 * step-up verification is required (i.e. stepUpPromise is non-null).
 * Isolating the store subscription here ensures the root App component and its
 * provider hierarchy do not re-render during step-up state transitions.
 */
function GlobalStepUpGate() {
  const hasStepUp = useAuthStore((state) => !!state.stepUpPromise);

  if (!hasStepUp) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <GlobalStepUpModal />
    </Suspense>
  );
}

function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <GlobalStepUpGate />
    </AppProviders>
  );
}

export default App;
```

### 4.2 Detailed Line-by-Line Changes
- **Lines 11–24**:
  - Remove `const stepUpPromise = useAuthStore((state) => state.stepUpPromise);` from `App()`.
  - Introduce `GlobalStepUpGate()` component that reads `const hasStepUp = useAuthStore((state) => !!state.stepUpPromise);` (evaluating to a boolean primitive to minimize selector triggering).
  - In `GlobalStepUpGate()`, return `null` when `!hasStepUp`.
  - In `App()`, render `<RouterProvider router={router} />` and `<GlobalStepUpGate />`.

### 4.3 Companion Instructions for F6 & F7 (`vite.config.ts`)
To ensure the Worker achieves all Milestone 2 targets, the Worker must apply the following in `vite.config.ts`:
1. **Isolate `RouteSkeleton` chunk**:
   In `manualChunks(id)`:
   ```ts
   if (id.includes('/src/shared/skeletons/')) {
     return 'route-skeleton';
   }
   ```
2. **Remove `auth-profile` monolithic rule**:
   Remove `GlobalStepUpModal`, `profile/*`, `SecurityCenter`, `Sessions`, `StepUp`, `Account` from `auth-profile` so Rollup splits lazy modules naturally.
3. **Prune Module Preloads in HTML**:
   Add `resolveDependencies` to `build.modulePreload`:
   ```ts
   modulePreload: {
     polyfill: true,
     resolveDependencies(filename, deps, { hostType }) {
       if (hostType === 'html') {
         return deps.filter((dep) => {
           return !(
             dep.includes('motion-vendor') ||
             dep.includes('radix-vendor') ||
             dep.includes('authn-vendor') ||
             dep.includes('form-vendor') ||
             dep.includes('zod-vendor') ||
             dep.includes('map-vendor')
           );
         });
       }
       return deps;
     },
   },
   ```

---

## 5. Verification Method

### 5.1 Build & Bundle Verification
1. Run:
   ```powershell
   npm run build
   ```
   **Pass Condition**: Clean compilation (`tsc -b && vite build`) with exit code 0.
2. Inspect `dist/index.html`:
   Verify that `<link rel="modulepreload">` does NOT contain:
   - `form-vendor`
   - `zod-vendor`
   - `radix-vendor`
   - `motion-vendor`
   - `authn-vendor`
   - `map-vendor`
   - `auth-profile`
3. Verify total preloaded JS size in `dist/index.html`:
   Sum of uncompressed sizes of all `<script>` and `<link rel="modulepreload">` files must be `< 400 kB` (down from ~1.37 MB).

### 5.2 Runtime & CWV Test Verification
1. Run quick CWV audit:
   ```powershell
   npm run test:cwv:quick
   ```
   **Pass Condition**: 15/15 audited routes pass with LCP < 2.5s, CLS < 0.1, INP < 200ms.
2. Verify Step-Up modal functionality:
   In dev or preview mode, calling `useAuthStore.getState().triggerStepUp()` mounts `<GlobalStepUpModal />`, renders the security challenge dialog, and unmounts upon resolve or cancel.
