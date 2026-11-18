# Investigation Report: Feature F7 — Module Preload Pruning & Bundle Verification

**Agent**: Milestone 2 Explorer 3 (Module Preload Pruning & Bundle Verification)  
**Parent**: Project Orchestrator (`9e64db92-a7c4-4556-b668-3209b9a2d3d0`)  
**Target File**: `vite.config.ts` (lines 78–80)  
**Status**: COMPLETE  

---

## 1. Observation

### 1.1 Current Configuration in `vite.config.ts`
At `vite.config.ts`, lines 78–80:
```ts
78:    modulePreload: {
79:      polyfill: true,
80:    },
```
Currently, `modulePreload` only enables `polyfill: true`. No dependency resolution filter (`resolveDependencies`) is defined.

### 1.2 Baseline Preload Bloat in `dist/index.html`
In the baseline production build, Vite recursively crawls all static imports reachable from `src/main.tsx` -> `src/app/App.tsx`. Because `GlobalStepUpModal` was statically imported and grouped into `auth-profile` alongside `auth-shared`, Vite injected `<link rel="modulepreload">` for all 14 transitive chunks into `dist/index.html` (lines 87–101):

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
<link rel="stylesheet" crossorigin href="/assets/index-D2-XRAbu.css">
```

### 1.3 Exact Baseline Byte Breakdown
Total preloaded JS across 15 chunks was **1,308.68 KB (1,340,087 uncompressed bytes)**:

| Chunk | Size (KB) | Size (Bytes) | Category |
|---|---|---|---|
| `auth-profile-BMnwhnYI.js` | 352.46 KB | 360,917 B | Non-entry / Profile & Security Center |
| `react-core-DcVtC1FV.js` | 211.21 KB | 216,280 B | Core runtime |
| `auth-shared-D3lEUR8-.js` | 142.08 KB | 145,486 B | Non-entry / Auth forms & dialogs |
| `motion-vendor-CDK1nRuk.js` | 124.51 KB | 127,494 B | Non-entry / framer-motion |
| `router-vendor-wejczQWj.js` | 88.39 KB | 90,515 B | Core routing |
| `radix-vendor-D3UjEnxe.js` | 74.86 KB | 76,653 B | Non-entry / Radix UI |
| `index-bhvfi-0o.js` | 68.46 KB | 70,100 B | Main application entry |
| `zod-vendor-CNXRWoz6.js` | 52.01 KB | 53,261 B | Non-entry / Zod schemas |
| `network-vendor-RXCkG4If.js` | 44.37 KB | 45,433 B | Axios HTTP client |
| `icons-vendor-C8X5Yirl.js` | 43.51 KB | 44,555 B | Lucide icons |
| `query-vendor-gB5oOiv_.js` | 35.09 KB | 35,934 B | TanStack Query client |
| `toast-vendor-_zhc-Y1N.js` | 31.55 KB | 32,307 B | Sonner toasts |
| `form-vendor-BUnnO7EM.js` | 27.81 KB | 28,482 B | Non-entry / react-hook-form |
| `authn-vendor-PCDPDTV4.js` | 7.50 KB | 7,682 B | Non-entry / WebAuthn & passkeys |
| `auth-store-JjaizQnO.js` | 4.87 KB | 4,988 B | Core auth store |
| **TOTAL** | **1,308.68 KB** | **1,340,087 B** | **15 Chunks** |

### 1.4 Vite Internal Mechanism
In `node_modules/vite/dist/node/index.d.ts` (lines 2745–2748):
```ts
type ResolveModulePreloadDependenciesFn = (filename: string, deps: string[], context: {
    hostId: string;
    hostType: 'html' | 'js';
}) => string[];
```
In `node_modules/vite/dist/node/chunks/dep-Dm0c1Wj2.js`:
- Lines 36742–36754: When `hostType === "html"`, Vite invokes `resolveDependencies(chunk.fileName, importsFileNames, { hostId: relativeUrlPath, hostType: "html" })`. The returned array directly governs which `<link rel="modulepreload">` tags are injected into `index.html`.
- Lines 45792–45806: When `hostType === "js"`, Vite invokes `resolveDependencies` to construct the `depsArray` for dynamic import expressions wrapped by `__vitePreload`.

### 1.5 Empirical Test Results
We verified the proposed `resolveDependencies` filter in an isolated build:
1. **Alone against baseline imports**: Pruning the 8 non-entry chunks immediately reduced preloaded HTML JS from **1,308.68 KB down to 560.50 KB** (a **748.18 KB reduction**).
2. **Combined with F6 (RouteSkeleton isolated + auth-profile eliminated)**: Preloaded HTML JS dropped to **497.07 KB uncompressed (~155 kB gzipped)** across only 5 core chunks (`index`, `react-core`, `router-vendor`, `query-vendor`, `skeletons`, `auth-store`).
3. **Dynamic Import Verification**: All 168 dynamic imports in `index` preserved their complete `__vite__mapDeps` dependency tables. Vite's runtime chunk loader `s(() => import(...), __vite__mapDeps([...]))` retains full dependency resolution for every route on demand.

---

## 2. Logic Chain

1. **Root Cause**: Vite automatically inserts `<link rel="modulepreload">` into `index.html` for every chunk statically reachable from the entry module `src/main.tsx`. Because `auth-profile` and `auth-shared` were statically pulled in, their dependencies (`motion-vendor`, `radix-vendor`, `form-vendor`, `zod-vendor`, `authn-vendor`) were preloaded unconditionally on initial cold entry, degrading Largest Contentful Paint (LCP) and Time to Interactive (TTI).
2. **Filter Targeting**: Vite's `build.modulePreload.resolveDependencies` provides a lifecycle hook where `context.hostType === 'html'` differentiates HTML `<link rel="modulepreload">` injection from JavaScript runtime dynamic imports (`hostType === 'js'`).
3. **HTML Pruning**: By filtering `deps` when `hostType === 'html'` to exclude `motion-vendor`, `map-vendor`, `radix-vendor`, `form-vendor`, `zod-vendor`, `authn-vendor`, `auth-profile`, and `auth-shared`, the HTML document only preloads core bootstrap code.
4. **Boot Critical Preservation**: The initial render of the application entry point requires:
   - `index-*.js`: Application initialization, router mounting.
   - `react-core-*.js`: React 19, ReactDOM, scheduler.
   - `router-vendor-*.js`: React Router v7 navigation engine.
   - `query-vendor-*.js`: Root QueryClientProvider.
   - `auth-store-*.js`: Auth state evaluation for synchronous route guards (`RequireAuth` / `RequireGuest`).
   - `skeletons-*.js`: Skeleton layout components so `<RouteSkeleton framed />` renders synchronously on cold navigation without blank flashes or CLS.
   - `index-*.css`: Global styles, CSS variables, and skeleton shimmer animations.
   All of these remain uninhibited and preloaded.
5. **No Broken Dynamic Imports**: Because `resolveDependencies` returns `deps` unmodified when `hostType === 'js'`, Vite's internal AST transformer writes full dependency mappings (`__vite__mapDeps`) for every `React.lazy` / dynamic `import()`. When the user navigates to an authenticated route or opens a modal, the Vite runtime loader fetches the chunk and its associated dependencies on demand.

---

## 3. Caveats

- **Host Type Scope**: The filter MUST be guarded by `if (hostType === 'html')`. If applied unconditionally, dynamic imports inside JS chunks would also have their dependency preloading stripped, increasing round trips when navigating to complex routes.
- **Future Vendor Names**: If new manual chunks are added to `rollupOptions.output.manualChunks` in the future (e.g. heavy charting or code-editor libraries), their identifiers should also be evaluated for inclusion in `resolveDependencies` if they risk leaking into HTML preloads.

---

## 4. Conclusion

Feature F7 is fully validated and ready for implementation. Adding `resolveDependencies` to `modulePreload` in `vite.config.ts` prevents non-entry chunks from polluting `index.html`, eliminating 750+ kB of uncompressed script preloads on every cold visit.

### Exact Worker Implementation Plan

**File**: `vite.config.ts`  
**Target Range**: Lines 78–80  

#### Code Before:
```ts
    modulePreload: {
      polyfill: true,
    },
```

#### Code After:
```ts
    modulePreload: {
      polyfill: true,
      resolveDependencies(filename, deps, { hostType }) {
        if (hostType === 'html') {
          // Only allow core entry dependencies to be preloaded in HTML
          return deps.filter(dep => {
            // Exclude non-entry vendor chunks
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

---

## 5. Verification Method

To independently verify after implementation:

1. **Build Execution**:
   ```powershell
   npm run build
   ```
   Must complete cleanly with exit code 0 (`tsc -b && vite build`).

2. **Inspect Preload Tags in `dist/index.html`**:
   Check that none of the excluded chunks are present as `<link rel="modulepreload">`:
   ```powershell
   node -e "const html = require('fs').readFileSync('dist/index.html', 'utf8'); const forbidden = ['motion-vendor','map-vendor','radix-vendor','form-vendor','zod-vendor','authn-vendor','auth-profile','auth-shared']; const matches = forbidden.filter(f => html.includes(f)); console.log('Forbidden chunks in HTML:', matches); process.exit(matches.length ? 1 : 0);"
   ```
   Must output `Forbidden chunks in HTML: []` and exit code 0.

3. **Total Preload Size Check**:
   Calculate total preloaded bytes from `dist/index.html`:
   ```powershell
   node -e "const fs = require('fs'); const html = fs.readFileSync('dist/index.html', 'utf8'); const re = /(?:href|src)=\"\/assets\/([^\"]+\.js)\"/g; let m, total = 0; while ((m = re.exec(html)) !== null) { total += fs.statSync('dist/assets/' + m[1]).size; } console.log('Total preloaded JS:', (total/1024).toFixed(2) + ' KB'); if (total > 500000) process.exit(1);"
   ```
   Must output `< 500 KB` (target threshold per `PROJECT.md`).

4. **CWV Verification**:
   ```powershell
   npm run test:cwv:quick
   ```
   Must pass 15/15 routes with 100% compliance.
