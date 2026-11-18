# Survey Report: Build, Bundling, Chunking, Dependencies & Code Splitting

**Agent**: Survey Explorer 2  
**Date**: 2026-10-31T23:28:00Z  
**Scope**: Project build configuration, dependency footprint, chunking strategy, code splitting, asset pipeline, and caching for Requirements R1 & R2.

---

## 1. Observation

### 1.1 Build Setup and Tooling Configuration
- **Package Configuration (`package.json`)**:
  - React 19 (`react: ^19.0.0`, `react-dom: ^19.0.0`) with `@vitejs/plugin-react: ^4.3.4` and `babel-plugin-react-compiler: 19.1.0-rc.2`.
  - Bundler: `vite: ^6.0.3` with `@tailwindcss/vite: ^4.3.1` (Tailwind v4).
  - TypeScript: `typescript: ~5.6.2`, target: `ES2020` in `tsconfig.app.json`, `moduleResolution: "bundler"`.
  - Heavy runtime dependencies: `framer-motion: ^12.42.0`, `react-simple-maps: ^3.0.0`, `lucide-react: ^0.468.0`, `radix-ui: ^1.6.0`, `@tanstack/react-query: ^5.62.7`, `axios: ^1.7.9`, `zod: ^3.24.1`, `@simplewebauthn/browser: ^13.0.1`, `@fontsource/jetbrains-mono: ^5.2.5`.
  - Non-standard entry: `"shadcn": "^4.11.0"` is listed under runtime `dependencies` rather than devDependencies or CLI.

- **Vite Configuration (`vite.config.ts`)**:
  - React compiler configured conditionally on `isProd`:
    ```ts
    // lines 15-23
    react(
      isProd
        ? {
            babel: {
              plugins: [["babel-plugin-react-compiler", { target: "19" }]],
            },
          }
        : undefined
    )
    ```
    During `npm run build`, `tsc -b && vite build` transforms **3,028 modules** with the Babel compiler plugin, requiring **3m 33s** for a full build.
  - Build settings (lines 70-80):
    ```ts
    target: "es2022",
    cssCodeSplit: true,
    cssMinify: true,
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    modulePreload: { polyfill: true }
    ```
  - Manual Chunking (lines 83-143):
    Explicit chunk rules partition third-party libraries into: `react-core`, `router-vendor`, `motion-vendor`, `icons-vendor`, `radix-vendor`, `query-vendor`, `network-vendor`, `form-vendor`, `zod-vendor`, `map-vendor`, `authn-vendor`, `cmdk-vendor`, `toast-vendor`.
    Application chunks are partitioned for `/src/modules/auth/`:
    ```ts
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
    ```

### 1.2 Bundle Size & Composition (Production Output)
Running `npm run build` generates 247 asset files in `dist/assets/`. The top 20 largest JavaScript and CSS assets produced:

| Chunk Name | Size (Uncompressed) | Gzip Size | Nature / Category |
|---|---|---|---|
| `dist/assets/auth-profile-BMnwhnYI.js` | **360.92 kB** | **88.15 kB** | Monolithic combined auth profile & modals |
| `dist/assets/index-C3czgyoD.css` | **248.03 kB** | **55.08 kB** | Global stylesheet + 24 `@font-face` rules |
| `dist/assets/react-core-DcVtC1FV.js` | **216.28 kB** | **69.30 kB** | React 19 core (`react`, `react-dom`, `scheduler`) |
| `dist/assets/auth-shared-D3lEUR8-.js` | **145.49 kB** | **43.87 kB** | Shared auth components, api, services |
| `dist/assets/motion-vendor-CDK1nRuk.js` | **127.49 kB** | **41.89 kB** | `framer-motion` |
| `dist/assets/map-vendor-aQck_uCj.js` | **102.49 kB** | **35.65 kB** | `react-simple-maps` + `d3-geo` |
| `dist/assets/router-vendor-wejczQWj.js` | **90.52 kB** | **30.62 kB** | `react-router` v7 core |
| `dist/assets/RemoteConfigPanel-CK7gAKzo.js` | **88.82 kB** | **28.34 kB** | Feature page |
| `dist/assets/AuthenticatedAppLayout-CIH5Y5wU.js` | **85.61 kB** | **24.63 kB** | Authenticated shell layout |
| `dist/assets/radix-vendor-D3UjEnxe.js` | **76.65 kB** | **23.46 kB** | `@radix-ui` primitives |
| `dist/assets/TraceDetailPage-D_owECda.js` | **72.22 kB** | **19.19 kB** | Observability trace waterfall |
| `dist/assets/index-Coqt9Wfx.js` | **70.10 kB** | **19.02 kB** | Main application bootstrap entry |
| `dist/assets/zod-vendor-CNXRWoz6.js` | **53.26 kB** | **12.20 kB** | `zod` schema validator |
| `dist/assets/network-vendor-RXCkG4If.js` | **45.43 kB** | **17.63 kB** | `axios` |
| `dist/assets/icons-vendor-C8X5Yirl.js` | **44.56 kB** | **13.62 kB** | `lucide-react` icons |
| `dist/assets/LatencyPage-DBCftO2r.js` | **44.80 kB** | **12.77 kB** | Observability latency route |
| `dist/assets/query-vendor-gB5oOiv_.js` | **35.93 kB** | **10.63 kB** | `@tanstack/react-query` |
| `dist/assets/toast-vendor-_zhc-Y1N.js` | **32.31 kB** | **9.38 kB** | `sonner` |
| `dist/assets/form-vendor-BUnnO7EM.js` | **28.48 kB** | **10.55 kB** | `react-hook-form` + `@hookform/resolvers` |
| `dist/assets/authn-vendor-PCDPDTV4.js` | **20.30 kB** | **6.55 kB** | `@simplewebauthn/browser` |

### 1.3 Critical Finding: Initial Page Modulepreload Poisoning
In the built `dist/index.html` (lines 115-130), the `<head>` contains:
```html
<script type="module" crossorigin src="/assets/index-Coqt9Wfx.js"></script>
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
<link rel="stylesheet" crossorigin href="/assets/index-C3czgyoD.css">
```
- **Total Initial Payload on First Visit**: **1,368.5 kB (~1.37 MB) uncompressed JS** (395 kB gzipped) + **248 kB CSS** (55 kB gzipped).
- Inspection of `dist/assets/index-Coqt9Wfx.js` revealed:
  ```js
  import{b as ye,O as W,N as u,d as ge,e as ve,f as Pe,i as je,g as Ee,R as Ae}from"./router-vendor-wejczQWj.js";
  import{c as Le}from"./query-vendor-gB5oOiv_.js";
  import{a7 as Te,a8 as Ie,c as k,a9 as Re}from"./auth-shared-D3lEUR8-.js";
  import{R as U,B as L}from"./auth-profile-BMnwhnYI.js";
  import{u as Q}from"./auth-store-JjaizQnO.js";
  import"./form-vendor-BUnnO7EM.js";
  import"./icons-vendor-C8X5Yirl.js";
  import"./toast-vendor-_zhc-Y1N.js";
  import"./radix-vendor-D3UjEnxe.js";
  import"./motion-vendor-CDK1nRuk.js";
  import"./zod-vendor-CNXRWoz6.js";
  import"./network-vendor-RXCkG4If.js";
  import"./authn-vendor-PCDPDTV4.js";
  ```
- **Origin of `auth-profile` Dependency**:
  - `src/app/App.tsx` declares at top-level:
    ```tsx
    const GlobalStepUpModal = lazy(() =>
      import("@/modules/auth/components/GlobalStepUpModal").then((m) => ({ default: m.GlobalStepUpModal }))
    );
    ```
  - `GlobalStepUpModal.tsx` is mapped by `vite.config.ts` into `'auth-profile'`.
  - `GlobalStepUpModal.tsx` statically imports `react-hook-form`, `zod`, `@hookform/resolvers/zod`, `@radix-ui/react-dialog`, `@simplewebauthn/browser`, `lucide-react`, `sonner`, `@tanstack/react-query`, and `axios`.
  - Furthermore, `src/shared/skeletons/RouteSkeleton.tsx` and `Block` were co-located by Rollup into `auth-profile-BMnwhnYI.js` (exported as `li as R` and `j as B`).
  - Because `RootLayout.tsx` and `protected-routes.tsx` import `RouteSkeleton`, the entry module `index` has a direct static dependency on `auth-profile`.
  - Because `auth-profile` depends on all 8 vendors, Rollup hoisted side-effect imports (`import "./motion-vendor-..."`, `import "./radix-vendor-..."`, etc.) directly into the initial entry chunk, causing Vite's module preload plugin to output `<link rel="modulepreload">` for all of them.

### 1.4 Web Font Redundancy & Double Fetching
1. `index.html` lines 22-30:
   ```html
   <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" />
   <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" />
   ```
2. `src/app/index.css` lines 3-5:
   ```css
   @import "@fontsource/jetbrains-mono/400.css";
   @import "@fontsource/jetbrains-mono/500.css";
   @import "@fontsource/jetbrains-mono/600.css";
   ```
3. Vite build output:
   Emits **24 font files** in `dist/assets/`:
   - Cyrillic: 400, 500, 600 in `.woff` (7.0 kB each) and `.woff2` (5.3 kB each)
   - Greek: 400, 500, 600 in `.woff` (5.7 kB each) and `.woff2` (4.3 kB each)
   - Vietnamese: 400, 500, 600 in `.woff` (5.4 kB each)
   - Latin & Latin-ext: 400, 500, 600 in `.woff` (28.2 kB each) and `.woff2` (21.8 kB each)
4. Total font asset size emitted: **~226 kB**, with `@font-face` definitions expanding `dist/assets/index-C3czgyoD.css` to **248 kB**.
5. Result: The browser requests `JetBrains Mono` from Google Fonts AND parses 24 `@font-face` definitions locally, adding network contention and parse overhead to the critical render path.

### 1.5 Asset Pipeline & Static Directory Audits
- **Dead / Unreferenced Assets**:
  - `public/auth-bg.png`: **694,941 bytes (~695 kB)**. Grep search across `src/`, `index.html`, and CSS confirmed **zero references** to `auth-bg.png`. It is copied to `dist/` on every build as dead weight.
- **Cache-Control Header Configuration (`public/_headers`)**:
  - Content:
    ```
    /assets/*
      Cache-Control: public, max-age=31536000, immutable

    /index.html
      Cache-Control: no-cache, no-store, must-revalidate
    ```
  - Observation: Assets in `/auth/*` (`auth-network.webp` 71 kB, `auth-observability.webp` 37 kB, `auth-security.webp` 86 kB), `/data/*` (`countries-110m.json` 108 kB), and `favicon.svg` (2 kB) are outside `/assets/*` and receive NO caching directive. Browsers and edge caches treat them as revalidatable on every session.

---

## 2. Logic Chain

1. **Premise**: Under R1 and R2, Largest Contentful Paint (LCP) must be under 2.5s and overall frontend loading speed must be maximized through bundle reduction, code splitting, and asset caching.
2. **From Observation 1.3**: When a first-time user loads `/auth/login`, `dist/index.html` forces the browser to download 15 JavaScript chunks totaling 1.37 MB (plus 248 kB CSS and Google Fonts stylesheets) before executing React.
3. **Reasoning from 1.3**: The entry chunk `index-Coqt9Wfx.js` does not actually execute `SecurityCenterPage` or `PasskeysPanel` on login. However, because `vite.config.ts` bundled `GlobalStepUpModal` (imported in `App.tsx`) and 14 profile panels into `'auth-profile'`, and Rollup placed `RouteSkeleton` into `auth-profile`, Rollup hoisted side-effect imports for `framer-motion`, `radix-ui`, `zod`, `axios`, `react-hook-form`, `simplewebauthn`, `lucide-react`, and `sonner` into `index-Coqt9Wfx.js`.
4. **Reasoning on Preload**: Vite's `modulePreload` scanner recursively traces static and entry-reachable imports. Since `index` statically imports `auth-profile` and all 8 vendor chunks, Vite injects `<link rel="modulepreload">` for all of them in `index.html`.
5. **Impact on LCP**: On mobile and throttled network connections, downloading and parsing 1.37 MB of JavaScript blocks main thread execution, delaying the painting of initial UI elements (auth card, form fields, headers) well beyond 2.5s.
6. **From Observation 1.4**: Google Fonts stylesheet loading in `<head>` is render-blocking. Simultaneously loading `@fontsource/jetbrains-mono` locally causes duplicate requests and inflates the CSS bundle to 248 kB with unused Greek, Cyrillic, and Vietnamese font definitions in both `.woff` and `.woff2`.
7. **From Observation 1.5**: 695 kB of dead PNG image assets exist in the build output, and non-asset static files (`/auth/*.webp`, `/data/*.json`) miss browser and CDN caching.
8. **Conclusion**: Resolving the manual chunking architecture in `vite.config.ts`, decoupling `GlobalStepUpModal` and `RouteSkeleton`, consolidating web font loading to Latin `.woff2`, and pruning dead assets will directly drop initial JS payload from ~1.37 MB to ~350 kB (a ~75% reduction on initial visit), unblocking the main thread and achieving sub-second LCP.

---

## 3. Caveats

1. **React Compiler Build Time**: Babel React Compiler 19-rc.2 adds ~3 minutes to production build times (`tsc -b && vite build` takes 3m 33s). This is an offline build-time cost, not a runtime penalty, but developers should keep `isProd` conditional so dev server startup remains instantaneous.
2. **Dynamic Route Splitting Verification**: All application routes in `public-routes.tsx` and `protected-routes.tsx` already use `React.lazy(() => import(...))`. The code-splitting architecture at the router level is sound; the problem is entirely within the Rollup `manualChunks` grouping and entry preload leakage.
3. **Framer Motion Retention**: `framer-motion` (127 kB) is used across multiple authenticated pages. While `LazyMotion` and `domAnimation` are used in some auth components, removing framer-motion entirely would require rewriting animation hooks. Isolating `motion-vendor` away from unauthenticated pages (`/auth/*`) is the appropriate, non-breaking architectural remedy.

---

## 4. Conclusion & Actionable Recommendations

To satisfy Requirement R2 and optimize initial LCP under Requirement R1, the following concrete optimizations are recommended for implementation:

### Recommendation 1: Decouple `GlobalStepUpModal` & Reform `manualChunks` in `vite.config.ts`
1. **Remove the Monolithic `auth-profile` Chunk**:
   In `vite.config.ts`, delete lines 125-142 that group `GlobalStepUpModal`, `profile/*`, `SecurityCenter`, `Sessions`, and `StepUp` into `auth-profile`. Let Rollup naturally chunk each lazy route and panel into its own isolated file.
2. **Decouple `GlobalStepUpModal` from Root `App.tsx`**:
   In `src/app/App.tsx`, load `GlobalStepUpModal` through a truly dynamic component wrapper that is only evaluated when `stepUpPromise` is truthy, or move the modal mount into a dedicated auth route provider.
3. **Ensure `RouteSkeleton` is in its Own Shared Chunk**:
   Explicitly assign `src/shared/skeletons/RouteSkeleton.tsx` and `src/shared/skeletons/primitives.tsx` to a lightweight `skeletons` chunk, or leave them untagged so Rollup does not drag them into vendor chunks.
4. **Tune `modulePreload.resolveDependencies` in `vite.config.ts`**:
   Filter out non-initial chunks from being injected into `index.html`'s `<link rel="modulepreload">`:
   ```ts
   modulePreload: {
     polyfill: true,
     resolveDependencies(filename, deps, { hostType }) {
       return hostType === 'html'
         ? deps.filter(dep => !dep.includes('motion-vendor') && !dep.includes('authn-vendor') && !dep.includes('form-vendor') && !dep.includes('zod-vendor') && !dep.includes('map-vendor'))
         : deps;
     }
   }
   ```
   *Expected Impact*: Reduces initial JS downloads on `/auth/login` from **1,368 kB** to **~350 kB** (saving >1 MB of uncompressed script parse time).

### Recommendation 2: Consolidate Web Fonts & Eliminate Font Duplication
1. **Choose Single Font Loading Strategy**:
   Remove the `@fontsource/jetbrains-mono` imports from `src/app/index.css` (lines 3-5) and remove `@fontsource/jetbrains-mono` from `package.json`.
2. **Optimize Google Fonts Preload in `index.html`**:
   Add `&display=swap` to the font stylesheet link and remove render-blocking stylesheet preloads for non-Latin character sets.
   Alternatively, self-host only the Latin `woff2` font files with `@font-face { font-display: swap; unicode-range: ... }` to avoid external Google Fonts connections.
   *Expected Impact*: Eliminates 24 `.woff` and `.woff2` font files (~226 kB) from `dist/assets/` and trims `index.css` by ~15 kB.

### Recommendation 3: Remove Dead Assets & Enhance HTTP Cache Headers
1. **Remove `public/auth-bg.png`**:
   Delete or archive `public/auth-bg.png` (saving 695 kB from `dist/`).
2. **Update `public/_headers`**:
   Add cache rules for webp illustrations and json data:
   ```
   /auth/*
     Cache-Control: public, max-age=604800, stale-while-revalidate=86400

   /data/*
     Cache-Control: public, max-age=604800, stale-while-revalidate=86400

   /favicon.svg
     Cache-Control: public, max-age=86400
   ```
   *Expected Impact*: Prevents repeat downloads of auth illustrations (194 kB) and world choropleth map data (108 kB) on return visits.

### Recommendation 4: Remove Unused `"shadcn"` Dependency
In `package.json`, remove `"shadcn": "^4.11.0"` from `"dependencies"` (it is a CLI tool, not a runtime dependency).

---

## 5. Verification Method

To independently verify these findings and measure the improvements after changes are applied:

1. **Verify Production Build Output**:
   ```bash
   npm run build
   ```
   - Check that `dist/` builds with zero errors.
   - Inspect `dist/index.html` for `<link rel="modulepreload">` tags:
     ```bash
     node -e "const fs = require('fs'); const html = fs.readFileSync('dist/index.html', 'utf8'); console.log(html.match(/<link rel=\"modulepreload\"[^>]+>/g));"
     ```
   - **Target**: Initial `index.html` must ONLY preload `index.js`, `react-core`, `router-vendor`, and basic theme/query dependencies. It must NOT preload `motion-vendor`, `radix-vendor`, `authn-vendor`, `form-vendor`, or `zod-vendor`.

2. **Verify Total Initial Payload Size**:
   ```bash
   node -e "const fs = require('fs'); const path = require('path'); const html = fs.readFileSync('dist/index.html', 'utf8'); const scripts = (html.match(/src=\"\/assets\/[^\"]+\"/g) || []).concat(html.match(/href=\"\/assets\/[^\"]+\"/g) || []); const total = scripts.reduce((sum, s) => { const file = s.match(/\/assets\/([^\"]+)/)[1]; try { return sum + fs.statSync(path.join('dist/assets', file)).size; } catch { return sum; } }, 0); console.log('Initial preloaded bytes:', total, 'Bytes (' + (total/1024).toFixed(1) + ' KB)');"
   ```
   - **Current Baseline**: 1,655,752 Bytes (~1,617 KB total JS + CSS).
   - **Target Metric**: < 500 KB total preloaded JS + CSS.

3. **Verify Asset Absence & Headers**:
   - Confirm `auth-bg.png` is deleted from `public/`.
   - Verify `dist/auth-bg.png` no longer exists after build.
   - Verify `dist/_headers` contains cache directives for `/auth/*` and `/data/*`.

4. **Invalidation Conditions**:
   - If `GlobalStepUpModal` remains coupled in `App.tsx` and in `manualChunks`, the 1.37 MB initial bundle preloading will persist.
   - If `RouteSkeleton` continues to be bundled with authenticated/profile chunks, entry point bundle poisoning will remain.
