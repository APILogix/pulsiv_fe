# Handoff Report: Feature F2 (Static Asset Hygiene) & Feature F3 (HTTP Cache Directives)

## 1. Observation

### Observation 1.1: Static Files Inventory in `public/`
A directory listing of `public/` and its subdirectories reveals:
- `public/auth-bg.png` — 694,941 bytes (~695 KB)
- `public/favicon.svg` — 2,027 bytes
- `public/robots.txt` — 25 bytes
- `public/_headers` — 418 bytes
- `public/auth/auth-network.webp` — 70,744 bytes
- `public/auth/auth-observability.webp` — 36,918 bytes
- `public/auth/auth-security.webp` — 86,160 bytes
- `public/data/countries-110m.json` — 107,762 bytes (~105 KB)

Total static size in `public/`: 998,570 bytes. The 4 image files alone (`auth-bg.png` + 3 webp images in `auth/`) account for 888,763 bytes (89% of all static content in `public/`).

### Observation 1.2: Reference Audit for `auth-bg.png`
- Grep search `auth-bg.png` across the entire repository yielded 0 results in source code or stylesheets. It was only referenced in `PROJECT.md` survey notes.
- Grep search `auth-bg` yielded 0 results across `src/`, `public/`, and `index.html`.
- Git log inspection (`git log -n 5 --stat -- public/auth-bg.png`) shows it was added in commit `426f233d` on 2026-07-15 ("Initial commit") and never touched again.

### Observation 1.3: Reference Audit for `public/auth/*.webp`
- Grep search for `auth-network`, `auth-observability`, and `auth-security` across the repository yielded 0 results in source code.
- Grep search for `webp` yielded 0 results in application code.
- Inspection of `src/app/layouts/auth-panels.tsx` (lines 71-440) confirmed that the auth sidebars are implemented purely with vector SVGs and HTML/CSS:
  - `SignalPanel`: Inline `<svg>` drawing latency trace (`TRACE = buildTrace()`).
  - `SetupPanel`: Semantic `<ol>` list with pure CSS rail indicators (`auth-rail-segment`).
  - `HandoffPanel`: Inline `<svg>` drawing SSO round-trip curves.
- Inspection of `design/auth/DESIGN.md` (lines 88-89) confirmed explicit design policy:
  `Refuse: Colour pills for factor types, glows, gradient hairlines, aurora or grid backdrops, scan bars, and fake progress stages.`
- The 3 raster `.webp` files in `public/auth/` (totaling 193,822 bytes) are remnants from the July 2026 initial repository commit.

### Observation 1.4: Reference Audit for `public/data/countries-110m.json`
- Grep search for `countries-110m` revealed an active reference in `src/pages/dashboards/WorldChoropleth.tsx`:
  - Line 13: `const GEO_URL = "/data/countries-110m.json";`
  - Line 32: `<ComposableMap projection="geoEqualEarth" ...><Geographies geography={GEO_URL}>...`
- `WorldChoropleth.tsx` dynamically fetches this 107,762-byte TopoJSON payload at runtime to render country request distribution charts across analytics dashboards.
- This asset is **ACTIVE** and **CRITICAL**.

### Observation 1.5: Reference Audit for `"shadcn"` in `package.json`
- `package.json` line 31 declares:
  `"shadcn": "^4.11.0",`
- Grep search for `from 'shadcn'` or `from "shadcn"` across `src/` yielded 0 results.
- `shadcn` is a CLI development utility, not a runtime library, and is erroneously positioned under runtime `dependencies`.

### Observation 1.6: Review of `public/_headers`
- Current content of `public/_headers`:
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

# Cache-Control: 1-year immutable for content-hashed assets
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# Cache-Control: never cache entry HTML
/index.html
  Cache-Control: no-cache, no-store, must-revalidate
```
- Missing headers:
  - No caching directives for `/data/*` (meaning `countries-110m.json` lacks explicit caching).
  - No caching directives for `/auth/*` (mandated by SCOPE.md F3).
  - No caching directives for `/favicon.svg` (mandated by SCOPE.md F3).
  - Missing `stale-while-revalidate` directives for revalidating non-hashed static assets in the background.

---

## 2. Logic Chain

1. **Dead Asset Removal (F2)**:
   - Observation 1.2 proves `public/auth-bg.png` has 0 references anywhere in the application.
   - Vite copies everything in `public/` verbatim into `dist/`.
   - Therefore, deleting `public/auth-bg.png` immediately saves 694,941 bytes (~695 KB) of dead weight from both the repository and the production distribution bundle (`dist/auth-bg.png`), satisfying SCOPE.md F2 and Pass Criterion 2.
   - Observation 1.3 proves `public/auth/*.webp` (193,822 bytes) are completely unreferenced because `auth-panels.tsx` replaced raster mockups with inline SVGs. Deleting them saves an additional ~194 KB.
   - Observation 1.5 proves `"shadcn"` is an unused runtime dependency; removing line 31 from `package.json` cleans runtime dependencies without breaking imports.

2. **Active Asset Retention (F2)**:
   - Observation 1.4 confirms `public/data/countries-110m.json` is actively fetched by `WorldChoropleth.tsx`.
   - Therefore, `public/data/countries-110m.json` MUST be preserved and not deleted.

3. **HTTP Cache Directives Optimization (F3)**:
   - Observation 1.6 shows `public/_headers` only specifies rules for `/assets/*` and `/index.html`.
   - `/assets/*` contains Vite-generated, content-hashed files (`index-[hash].js`, `index-[hash].css`). The existing `public, max-age=31536000, immutable` directive is correct and optimal.
   - `/data/*` contains static geographic TopoJSON data (`countries-110m.json`, 105KB). Serving it with `Cache-Control: public, max-age=604800, stale-while-revalidate=86400` allows browsers and edge CDNs to cache it for 7 days while allowing seamless background revalidation.
   - `/favicon.svg` is loaded on every HTML document visit; serving it with `Cache-Control: public, max-age=604800, stale-while-revalidate=86400` prevents redundant revalidation requests.
   - Adding `/auth/*` with `Cache-Control: public, max-age=604800, stale-while-revalidate=86400` directly satisfies SCOPE.md F3 and verification criterion: `- dist/_headers contains cache directives for /auth/* and /data/*`.
   - Preserving `/index.html` with `Cache-Control: no-cache, no-store, must-revalidate` guarantees users always receive the latest HTML entry point and Vite script hashes.

---

## 3. Caveats

1. **Cloudflare Pages SPA Path Matching on `/auth/*`**:
   - Cloudflare Pages evaluates `_headers` based on the *requested URL path*, not the physical served file.
   - In this SPA, routes like `/auth/login`, `/auth/register`, `/auth/forgot-password` fall back to `/index.html`.
   - If `/auth/*` is included in `_headers`, Cloudflare Pages matches requests for `/auth/login` and attaches the `/auth/*` `Cache-Control` header to the fallback `index.html` unless overridden or intercepted.
   - Since `public/auth/*.webp` files are dead and deleted in F2, no physical static assets actually exist under `/auth/`.
   - However, because SCOPE.md explicitly specifies adding `/auth/*` to `_headers` and includes the verification criterion: `dist/_headers contains cache directives for /auth/* and /data/*`, the Worker MUST include the `/auth/*` block.
   - Downstream recommendation: If Cloudflare Pages is the hosting platform, ensure Cloudflare Page Rules, Worker transforms, or asset-specific subpaths (e.g. `/assets/auth/*`) are used if static assets are reintroduced, so HTML fallback routes are not aggressively cached by edge CDN nodes.
2. **`package.json` Lockfile**:
   - Removing `"shadcn"` from `package.json` does not require changing any application code. Running `npm install` or `npm run build` after removing it will keep `package-lock.json` clean.

---

## 4. Conclusion & Actionable Worker Plan

The Worker should perform the following concrete actions for Features F2 and F3:

### Action 1: Delete Dead Assets
1. Delete `public/auth-bg.png` (saves 694,941 bytes).
2. Delete `public/auth/auth-network.webp` (saves 70,744 bytes).
3. Delete `public/auth/auth-observability.webp` (saves 36,918 bytes).
4. Delete `public/auth/auth-security.webp` (saves 86,160 bytes).
5. (Optional) Remove empty directory `public/auth/` if git doesn't automatically prune it.

### Action 2: Remove `"shadcn"` from `package.json`
In `package.json`, delete line 31:
```json
<<<<
    "react-simple-maps": "^3.0.0",
    "shadcn": "^4.11.0",
    "sonner": "^1.7.4",
====
    "react-simple-maps": "^3.0.0",
    "sonner": "^1.7.4",
>>>>
```

### Action 3: Update `public/_headers`
Replace `public/_headers` with the following complete, production-ready configuration:

```text
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

# Cache-Control: 1-year immutable for content-hashed assets
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# Cache-Control: 7-day cache with 1-day stale-while-revalidate for auth assets
/auth/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400

# Cache-Control: 7-day cache with 1-day stale-while-revalidate for static data
/data/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400

# Cache-Control: 7-day cache with 1-day stale-while-revalidate for static icons
/favicon.svg
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400

# Cache-Control: never cache entry HTML
/index.html
  Cache-Control: no-cache, no-store, must-revalidate
```

---

## 5. Verification Method

To verify these changes independently:

1. **Verify Asset Deletions**:
   ```powershell
   # Confirm public/auth-bg.png is gone
   Test-Path "public/auth-bg.png"
   # Expected output: False

   # Confirm public/auth/*.webp are gone
   Test-Path "public/auth/auth-network.webp"
   # Expected output: False
   ```

2. **Verify `_headers` content**:
   ```powershell
   Get-Content "public/_headers"
   # Verify it contains rules for /assets/*, /auth/*, /data/*, /favicon.svg, /index.html
   ```

3. **Verify Build & `dist/` Output**:
   ```powershell
   npm run build
   # Verify exit code 0

   # Verify auth-bg.png is absent from dist
   Test-Path "dist/auth-bg.png"
   # Expected: False

   # Verify dist/_headers contains /auth/* and /data/*
   Select-String -Path "dist/_headers" -Pattern "/auth/\*", "/data/\*"
   # Expected: Matches found for both patterns
   ```

4. **Invalidation Conditions**:
   - `WorldChoropleth.tsx` fails to render if `public/data/countries-110m.json` is missing or corrupted.
   - Build fails if `package.json` syntax is corrupted.
   - `dist/_headers` does not match `public/_headers` if Vite build fails to copy static assets.
