# Handoff Report — Feature F6: Manual Chunking & Bundle Isolation in Vite

**Agent**: Milestone 2 Explorer 2 (`teamwork_explorer_m2_2`)  
**Mission**: Investigate Feature F6 (Manual Chunking & Bundle Isolation in Vite) to dissolve monolithic `auth-profile`, isolate `skeletons`, and prevent vendor leakage into initial preloads.  
**Date**: 2026-11-01  
**Handoff Type**: Hard (Task Complete)

---

## 1. Observation

### 1.1 Existing Bundler Configuration in `vite.config.ts`
In `vite.config.ts` lines 83–143:
```ts
83:         manualChunks(id) {
84:           if (id.includes('node_modules')) {
85:             if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
86:               return 'react-core';
87:             }
88:             if (id.includes('react-router')) {
89:               return 'router-vendor';
90:             }
91:             if (id.includes('framer-motion')) {
92:               return 'motion-vendor';
93:             }
94:             if (id.includes('lucide-react')) {
95:               return 'icons-vendor';
96:             }
97:             if (id.includes('radix-ui') || id.includes('@radix-ui')) {
98:               return 'radix-vendor';
99:             }
100:             if (id.includes('@tanstack/react-query')) {
101:               return 'query-vendor';
102:             }
103:             if (id.includes('axios')) {
104:               return 'network-vendor';
105:             }
106:             if (id.includes('react-hook-form') || id.includes('@hookform')) {
107:               return 'form-vendor';
108:             }
109:             if (id.includes('zod')) {
110:               return 'zod-vendor';
111:             }
112:             if (id.includes('react-simple-maps') || id.includes('d3-')) {
113:               return 'map-vendor';
114:             }
115:             if (id.includes('@simplewebauthn')) {
116:               return 'authn-vendor';
117:             }
118:             if (id.includes('cmdk')) {
119:               return 'cmdk-vendor';
120:             }
121:             if (id.includes('sonner')) {
122:               return 'toast-vendor';
123:             }
124:           }
125:           if (id.includes('/src/modules/auth/')) {
126:             if (
127:               id.includes('/profile/') ||
128:               id.includes('/pages/SecurityCenter') ||
129:               id.includes('/pages/Sessions') ||
130:               id.includes('/pages/StepUp') ||
131:               id.includes('/pages/Account') ||
132:               id.includes('/components/GlobalStepUpModal')
133:             ) {
134:               return 'auth-profile';
135:             }
136:             if (id.includes('/store/')) {
137:               return 'auth-store';
138:             }
139:             if (!id.includes('/pages/')) {
140:               return 'auth-shared';
141:             }
142:           }
143:         },
```

### 1.2 Build Output and Manifest Observations
Running `npm run build` (`tsc -b && vite build`) produced the following bundle chunks:
- `dist/assets/auth-profile-BMnwhnYI.js`: **360.92 kB** (88.15 kB gzip).
- `dist/assets/auth-shared-D3lEUR8-.js`: **145.49 kB** (43.87 kB gzip).
- `dist/assets/react-core-DcVtC1FV.js`: **216.28 kB** (69.30 kB gzip).
- `dist/assets/motion-vendor-CDK1nRuk.js`: **127.49 kB** (41.89 kB gzip).
- `dist/assets/map-vendor-aQck_uCj.js`: **102.49 kB** (35.65 kB gzip).
- `dist/assets/router-vendor-wejczQWj.js`: **90.52 kB** (30.62 kB gzip).
- `dist/assets/radix-vendor-D3UjEnxe.js`: **76.65 kB** (23.46 kB gzip).
- `dist/assets/zod-vendor-CNXRWoz6.js`: **53.26 kB** (12.20 kB gzip).
- `dist/assets/network-vendor-RXCkG4If.js`: **45.43 kB** (17.63 kB gzip).
- `dist/assets/icons-vendor-C8X5Yirl.js`: **44.56 kB** (13.62 kB gzip).
- `dist/assets/query-vendor-gB5oOiv_.js`: **35.93 kB** (10.63 kB gzip).
- `dist/assets/toast-vendor-_zhc-Y1N.js`: **32.31 kB** (9.38 kB gzip).
- `dist/assets/form-vendor-BUnnO7EM.js`: **28.48 kB** (10.55 kB gzip).

### 1.3 `dist/index.html` Preload Analysis
In `dist/index.html` lines 87–103, 14 scripts/chunks were injected as module preloads:
```html
87:     <script type="module" crossorigin src="/assets/index-bhvfi-0o.js"></script>
88:     <link rel="modulepreload" crossorigin href="/assets/react-core-DcVtC1FV.js">
89:     <link rel="modulepreload" crossorigin href="/assets/router-vendor-wejczQWj.js">
90:     <link rel="modulepreload" crossorigin href="/assets/query-vendor-gB5oOiv_.js">
91:     <link rel="modulepreload" crossorigin href="/assets/form-vendor-BUnnO7EM.js">
92:     <link rel="modulepreload" crossorigin href="/assets/icons-vendor-C8X5Yirl.js">
93:     <link rel="modulepreload" crossorigin href="/assets/auth-store-JjaizQnO.js">
94:     <link rel="modulepreload" crossorigin href="/assets/toast-vendor-_zhc-Y1N.js">
95:     <link rel="modulepreload" crossorigin href="/assets/radix-vendor-D3UjEnxe.js">
96:     <link rel="modulepreload" crossorigin href="/assets/motion-vendor-CDK1nRuk.js">
97:     <link rel="modulepreload" crossorigin href="/assets/zod-vendor-CNXRWoz6.js">
98:     <link rel="modulepreload" crossorigin href="/assets/network-vendor-RXCkG4If.js">
99:     <link rel="modulepreload" crossorigin href="/assets/authn-vendor-PCDPDTV4.js">
100:     <link rel="modulepreload" crossorigin href="/assets/auth-shared-D3lEUR8-.js">
101:     <link rel="modulepreload" crossorigin href="/assets/auth-profile-BMnwhnYI.js">
```
Total preloaded JavaScript on cold entry: **1,372 kB uncompressed** (> 380 kB gzip).

### 1.4 Co-location of `RouteSkeleton` into `auth-profile`
Direct search inside `dist/assets/` revealed that `skeleton-block` (the CSS selector unique to `src/shared/skeletons/primitives.tsx`) was bundled directly inside `dist/assets/auth-profile-BMnwhnYI.js`:
```powershell
Select-String -Path "dist\assets\*.js" -Pattern "skeleton-block"
# Result: C:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\dist\assets\auth-profile-BMnwhnYI.js
```
Furthermore, checking which dist files imported `auth-profile-BMnwhnYI.js` via:
```powershell
Select-String -Path "dist\assets\*.js" -Pattern "auth-profile"
```
revealed that **over 80 route chunks across the entire application** (e.g., `ProjectShellPage`, `AuthenticatedAppLayout`, `AiOverviewPage`, `AlertsPage`, `TraceDetailPage`, `BillingUsagePage`, etc.) directly imported `auth-profile-BMnwhnYI.js`.

In `src/pages/workspaces/ProjectShellPage.tsx` line 11:
```tsx
import { RouteSkeleton } from "@/shared/skeletons";
```
When compiled into `dist/assets/ProjectShellPage-Dy4SPe_L.js`, this import was transformed to:
```js
import { b as T, d as Z, f as I, e as $, c as B, D as U, a as ee, g as te, R as se, n as re } from "./auth-profile-BMnwhnYI.js";
```
`RouteSkeleton` and `primitives` had been merged into the monolithic `auth-profile` chunk!

### 1.5 Module Contamination in `auth-shared`
In `vite.config.ts` line 139:
```ts
if (!id.includes('/pages/')) {
  return 'auth-shared';
}
```
Because of this negative check:
- `src/modules/auth/components/LoginForm.tsx`
- `src/modules/auth/components/RegisterForm.tsx`
- `src/modules/auth/components/SocialProviders.tsx`
- `src/modules/auth/components/PostLoginSetup.tsx`
- `src/modules/auth/services/webauthn.client.ts`
were all bundled into `auth-shared-*.js` (145 kB).
Because `AppLayout.tsx` imported `PostLoginSetup`, every route wrapped by `AppLayout` imported `auth-shared`.
And because `webauthn.client.ts` imported `@simplewebauthn/browser`, `auth-shared` statically imported `authn-vendor`.

---

## 2. Logic Chain

1. **Step 1 — Root Entry Traversal (F5 connection)**:
   In `src/app/App.tsx`, `const GlobalStepUpModal = lazy(() => import("@/modules/auth/components/GlobalStepUpModal"))` exists at root level. Vite’s entry-point module analyzer walks dynamic imports originating from entry points.
2. **Step 2 — Monolithic Chunk Aggregation (F6 root cause)**:
   In `vite.config.ts`, `manualChunks(id)` grouped `GlobalStepUpModal` together with:
   - All 13 profile panels in `src/modules/auth/components/profile/*` (`PersonalDetailsPanel`, `AccountOverviewPanel`, `PasskeysPanel`, `ActiveSessionsPanel`, `MfaSecurityPanel`, `BackupCodesPanel`, `AuditLogsPanel`, etc.)
   - `pages/SecurityCenterPage`
   - `pages/SessionsPage`
   - `pages/StepUpPage`
   - `pages/Account*`
   into a single named chunk: `'auth-profile'`.
3. **Step 3 — Unassigned Skeletons Module Hoisting**:
   Neither `src/shared/skeletons/RouteSkeleton.tsx` nor `primitives.tsx` had a manual chunk rule. Because `protected-routes.tsx` imported both `RouteSkeleton` and the lazy pages assigned to `auth-profile`, Rollup’s chunking graph hoisted `src/shared/skeletons/*` into `auth-profile-*.js`.
4. **Step 4 — Contagious Importer Cascading**:
   Because `RouteSkeleton` is the universal fallback in `RootLayout`, `AuthenticatedAppLayout`, `protected-route-guards`, `LoadingBoundary`, and `ProjectShellPage`, virtually every page in the application was transformed by Rollup to import `auth-profile-*.js`.
5. **Step 5 — Vendor Package Transitive Preloading**:
   Because `auth-profile` contained `PasskeysPanel` and `GlobalStepUpModal`, it imported `@simplewebauthn/browser` (`authn-vendor`), `framer-motion` (`motion-vendor`), `@radix-ui/*` (`radix-vendor`), `react-hook-form` (`form-vendor`), `zod` (`zod-vendor`), `axios` (`network-vendor`), `sonner` (`toast-vendor`), and `lucide-react` (`icons-vendor`). Vite’s default HTML module preload generation observed `index.js` -> `App.tsx` -> `GlobalStepUpModal` -> `auth-profile` -> 8 vendor chunks, and injected `<link rel="modulepreload">` for all of them into `dist/index.html`.
6. **Step 6 — Resolution Mechanism**:
   - **Isolate skeletons**: Adding `if (normalizedId.includes('/src/shared/skeletons/')) return 'skeletons';` isolates `RouteSkeleton.tsx`, `primitives.tsx`, `pages.tsx`, `workspace.tsx`, and `index.ts` into a dedicated ~35 kB chunk. It has ZERO dependencies on heavy vendors (only CSS classes + React + react-router).
   - **Dissolve monolithic `auth-profile`**: Deleting the `auth-profile` rule allows Rollup to naturally split each profile panel and page into its own individual chunk (~15–30 kB each).
   - **Eliminate broad `auth-shared` rule**: Removing the `!id.includes('/pages/')` catch-all prevents `LoginForm`, `RegisterForm`, `PostLoginSetup`, and `webauthn.client.ts` from forming a 145 kB preloaded monolith. Only `src/modules/auth/store/` is retained as `'auth-store'` (~5 kB).
   - **Cross-platform path normalization**: Using `const normalizedId = id.replace(/\\/g, '/')` ensures reliable chunk assignment on Windows, macOS, and Linux.

---

## 3. Caveats

1. **Inter-Feature Dependency on F5**:
   While F6 dissolves `auth-profile` and isolates `skeletons`, `src/app/App.tsx` still lazily references `GlobalStepUpModal`. With F6 in place, `GlobalStepUpModal` becomes its own isolated ~20 kB chunk (rather than 361 kB). When F5 decouples `GlobalStepUpModal` to render conditionally on `stepUpPromise`, even this 20 kB chunk will be completely removed from initial entry preloads.
2. **Complementary Role of F7**:
   Feature F7 (`modulePreload.resolveDependencies`) acts as an explicit firewall in `vite.config.ts` to ensure Vite’s HTML plugin never preloads non-entry vendor chunks (`motion-vendor`, `radix-vendor`, `authn-vendor`, `form-vendor`, `zod-vendor`, `map-vendor`). F6 provides the structural bundle isolation so that chunks are cleanly separated and can be filtered.
3. **No Circular Vendor Dependencies**:
   All 13 vendor chunks in `vite.config.ts` (`react-core`, `router-vendor`, `motion-vendor`, `icons-vendor`, `radix-vendor`, `query-vendor`, `network-vendor`, `form-vendor`, `zod-vendor`, `map-vendor`, `authn-vendor`, `cmdk-vendor`, `toast-vendor`) are pure leaf or second-tier vendor packages. They import `react-core` and do not import each other.

---

## 4. Conclusion & Concrete Worker Instructions

### 4.1 Target File & Line Numbers
**File**: `vite.config.ts`  
**Target Range**: Lines 83–143 (within `rollupOptions.output`)

### 4.2 Exact Replacement for `vite.config.ts`

```ts
<<<<
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
              return 'react-core';
            }
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            if (id.includes('framer-motion')) {
              return 'motion-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            if (id.includes('radix-ui') || id.includes('@radix-ui')) {
              return 'radix-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (id.includes('axios')) {
              return 'network-vendor';
            }
            if (id.includes('react-hook-form') || id.includes('@hookform')) {
              return 'form-vendor';
            }
            if (id.includes('zod')) {
              return 'zod-vendor';
            }
            if (id.includes('react-simple-maps') || id.includes('d3-')) {
              return 'map-vendor';
            }
            if (id.includes('@simplewebauthn')) {
              return 'authn-vendor';
            }
            if (id.includes('cmdk')) {
              return 'cmdk-vendor';
            }
            if (id.includes('sonner')) {
              return 'toast-vendor';
            }
          }
          if (id.includes('/src/modules/auth/')) {
            if (
              id.includes('/profile/') ||
              id.includes('/pages/SecurityCenter') ||
              id.includes('/pages/Sessions') ||
              id.includes('/pages/StepUp') ||
              id.includes('/pages/Account') ||
              id.includes('/components/GlobalStepUpModal')
            ) {
              return 'auth-profile';
            }
            if (id.includes('/store/')) {
              return 'auth-store';
            }
            if (!id.includes('/pages/')) {
              return 'auth-shared';
            }
          }
        },
====
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');

          if (normalizedId.includes('node_modules')) {
            if (normalizedId.includes('/react/') || normalizedId.includes('/react-dom/') || normalizedId.includes('/scheduler/')) {
              return 'react-core';
            }
            if (normalizedId.includes('react-router')) {
              return 'router-vendor';
            }
            if (normalizedId.includes('framer-motion')) {
              return 'motion-vendor';
            }
            if (normalizedId.includes('lucide-react')) {
              return 'icons-vendor';
            }
            if (normalizedId.includes('radix-ui') || normalizedId.includes('@radix-ui')) {
              return 'radix-vendor';
            }
            if (normalizedId.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (normalizedId.includes('axios')) {
              return 'network-vendor';
            }
            if (normalizedId.includes('react-hook-form') || normalizedId.includes('@hookform')) {
              return 'form-vendor';
            }
            if (normalizedId.includes('zod')) {
              return 'zod-vendor';
            }
            if (normalizedId.includes('react-simple-maps') || normalizedId.includes('d3-')) {
              return 'map-vendor';
            }
            if (normalizedId.includes('@simplewebauthn')) {
              return 'authn-vendor';
            }
            if (normalizedId.includes('cmdk')) {
              return 'cmdk-vendor';
            }
            if (normalizedId.includes('sonner')) {
              return 'toast-vendor';
            }
          }

          if (normalizedId.includes('/src/shared/skeletons/')) {
            return 'skeletons';
          }

          if (normalizedId.includes('/src/modules/auth/store/')) {
            return 'auth-store';
          }
        },
>>>>
```

### 4.3 Expected Impact
1. `auth-profile-*.js` (361 kB) completely vanishes from the build output.
2. Individual profile panels (`PersonalDetailsPanel`, `AccountOverviewPanel`, `PasskeysPanel`, `ActiveSessionsPanel`, etc.) become independent lazy chunks (~15–30 kB each).
3. `skeletons-*.js` (~35 kB uncompressed, ~9 kB gzip) contains all route skeletons without any vendor dependencies.
4. `auth-shared-*.js` monolith is eliminated; auth forms and WebAuthn ceremonies are isolated to their specific routes.
5. Entry preload weight drops dramatically toward the target < 400 kB.

---

## 5. Verification Method

### 5.1 Verification Commands
1. **Build Verification**:
   ```bash
   npm run build
   ```
   Must exit with code 0 (`tsc -b && vite build` succeeds).

2. **Chunk Existence & Size Inspection**:
   ```powershell
   Get-ChildItem -Path "dist/assets/*.js" | Where-Object { $_.Name -like "*auth-profile*" }
   ```
   Must return **zero** results (monolithic chunk abolished).

   ```powershell
   Get-ChildItem -Path "dist/assets/*.js" | Where-Object { $_.Name -like "*skeletons*" }
   ```
   Must return exactly one file (`skeletons-*.js`) with size ~30–45 kB.

3. **Preload Inspection in `dist/index.html`**:
   ```powershell
   Select-String -Path "dist/index.html" -Pattern "auth-profile|authn-vendor|map-vendor"
   ```
   Must return **zero** matches.

4. **CWV Audit Suite**:
   ```bash
   npm run test:cwv:quick
   ```
   Must execute and pass 15/15 routes with zero regressions.

### 5.2 Invalidation Conditions
- Any occurrence of `auth-profile` in `dist/index.html` or `dist/assets/`.
- `skeletons-*.js` importing `radix-vendor` or `motion-vendor`.
- Build failures or TypeScript compilation errors.
