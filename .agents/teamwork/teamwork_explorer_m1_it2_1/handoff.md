# Milestone 1 Iteration 2 Explorer Report: Cache Header Edge Hazard Investigation

**Agent**: Milestone 1 Iteration 2 Explorer 1 (`teamwork_explorer_m1_it2_1`)  
**Parent Agent**: Project Orchestrator (`9e64db92-a7c4-4556-b668-3209b9a2d3d0`)  
**Working Directory**: `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m1_it2_1`  
**Date**: 2026-11-01  
**Target Milestone**: Milestone 1 Iteration 2 (Feature F3: HTTP Cache Directives Optimization)  
**Status**: **INVESTIGATION COMPLETE**

---

## 1. Observation

### Observation 1.1: Current `public/_headers` Directives
In `public/_headers` (lines 1–26):
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

# Cache-Control: 1-day cache with stale-while-revalidate for static icons
/favicon.svg
  Cache-Control: public, max-age=86400, stale-while-revalidate=86400

# Cache-Control: never cache entry HTML
/index.html
  Cache-Control: no-cache, no-store, must-revalidate
```

### Observation 1.2: Static Asset Directory Contents in `public/`
- Directory `public/auth/`:
  - Contains **0 files** (empty directory).
  - All legacy image files (`auth-network.webp`, `auth-observability.webp`, `auth-security.webp`) were removed in Iteration 1 because they were dead and unreferenced.
- Directory `public/data/`:
  - Contains **1 file**: `countries-110m.json` (107,762 bytes), referenced exclusively by `src/pages/dashboards/WorldChoropleth.tsx:13` (`const GEO_URL = "/data/countries-110m.json";`).
- File `public/favicon.svg`:
  - Preserved (2,027 bytes).
- File `public/robots.txt`:
  - Preserved (25 bytes).

### Observation 1.3: Active Client-Side SPA Routes Prefixed with `/auth/`
In `src/app/router/public-routes.tsx` (lines 31–62):
- Public unauthenticated auth routes:
  - `/auth/callback` (line 37)
  - `/auth/login` (line 49)
  - `/auth/register` (line 50)
  - `/auth/forgot-password` (line 51)
  - `/auth/reset-password` (line 52)
  - `/auth/verify-email` (line 53)
  - `/auth/login/mfa` (line 54)
  - `/auth/unlock` (line 55)
  - `/auth/unlock/confirm` (line 56)
  - `/auth/login/sso` (line 57)
  - `/auth/login/backup-code` (line 58)

In `src/app/router/protected-routes.tsx` (lines 560–562):
- Authenticated auth-scoped routes:
  - `/auth/security` (line 560)
  - `/auth/sessions` (line 561)
  - `/auth/step-up` (line 562)

**Total**: 14 active client-side routes start with `/auth/`. None of these correspond to physical files on disk; all rely on SPA entry point fallback (`index.html`).

### Observation 1.4: Cloudflare Pages & Netlify `_headers` Matching Semantics
Official Cloudflare Pages and Netlify documentation and RFC specifications confirm:
1. **Matching on Request URL**: Edge CDN platforms match `_headers` rules against the **incoming request path** (`req.url`), not the physical file served after internal rewrites.
2. **SPA Rewrite Mechanics**: When a client requests `/auth/login`, no physical file exists at that path. The platform internally serves `/index.html` (HTTP 200 SPA fallback rewrite).
3. **Header Application**: Because the requested path is `/auth/login`, it matches the rule `/auth/*`. The CDN attaches `Cache-Control: public, max-age=604800, stale-while-revalidate=86400` to the response.
4. **Header Accumulation in Cloudflare Pages**: Cloudflare Pages accumulates headers across all matching rules (inheritance, not override). If `/*` set `Cache-Control`, it would collide with `/assets/*`, corrupting immutable asset caching.
5. **Non-Matching of `/index.html` Rule**: The rule `/index.html` only matches requests where the request path is literally `/index.html`. It is NOT matched for `/auth/login`, `/auth/register`, or `/`.

### Observation 1.5: Existing Challenger Test Harness Assertion
In `scripts/challenge-m1-assets.mjs` lines 365–372:
```javascript
  // 3.3 Verify /auth/* cache rule
  const authCc = rules['/auth/*'] && rules['/auth/*']['cache-control'];
  const authValid = authCc && authCc.includes('max-age=604800') && authCc.includes('stale-while-revalidate=86400');
  recordTest(
    'Cache Directives: /auth/* has 7-day stale-while-revalidate cache',
    Boolean(authValid),
    authValid ? `/auth/* Cache-Control: ${authCc}` : `Invalid /auth/* Cache-Control: ${authCc}`
  );
```
And in lines 392–408:
```javascript
  // 3.6 ADVERSARIAL STRESS TEST: SPA root URL '/' and fallback caching
  // In Cloudflare Pages and Netlify, does '/' inherit /index.html cache rules?
  const rootCc = rules['/'] && rules['/']['cache-control'];
  const wildcardCc = rules['/*'] && rules['/*']['cache-control'];
  if (!rootCc && !wildcardCc) {
    recordTest(
      'Cache Directives Adversarial Check: Root URL "/" explicit Cache-Control',
      'WARN',
      'Warning: /index.html has Cache-Control: no-cache, but "/" (the root URL) has no explicit Cache-Control directive in _headers. Depending on CDN platform (Cloudflare Pages vs Netlify vs CloudFront), requesting "/" may not inherit /index.html headers.'
    );
  }
```
Currently, running `node scripts/challenge-m1-assets.mjs` emits:
`SUMMARY: 25 PASSED | 0 FAILED | 1 WARNINGS` (where test 3.3 passes because `/auth/*` is currently present, and test 3.6 warns because `/` is missing).

---

## 2. Logic Chain

1. **Origin and Nature of the Defect**:
   - In Milestone 1 survey, `/auth/*` caching was proposed under the premise that static WebP assets lived in `public/auth/`.
   - Worker M1 removed all unreferenced WebP files in `public/auth/`, reducing `public/auth/` to 0 static files (Observation 1.2).
   - Worker M1 nevertheless added `/auth/*` to `public/_headers` (Observation 1.1) to meet the historical text in `SCOPE.md`.
   - As documented in Observation 1.3, the application has 14 SPA routes prefixed with `/auth/`.
   - By CDN specification (Observation 1.4), when a user requests any of these 14 routes, the edge server matches `/auth/*` and attaches `Cache-Control: public, max-age=604800, stale-while-revalidate=86400` to the fallback `index.html` document.

2. **Impact on Production Deployments**:
   - The edge CDN and user browser will cache `index.html` for 7 days (`max-age=604800`).
   - Vite produces hashed script chunks (e.g. `dist/assets/index-[hash].js`). When a new deployment occurs, older chunk hashes are replaced.
   - Any visitor navigating to or refreshing `/auth/login`, `/auth/register`, or `/auth/security` will receive the 7-day cached `index.html` referencing deleted script hashes.
   - The browser fails to fetch the old chunks (`404 Not Found`), resulting in a catastrophic white screen or unrecoverable chunk load error.

3. **Remediation Strategy for `public/_headers`**:
   - **Step 1: Remove `/auth/*` rule**:
     Because `public/auth/` contains 0 static files, removing `/auth/*` entirely eliminates the rule collision. Requests to `/auth/*` will no longer receive public caching headers and will be treated like normal dynamic SPA fallback requests.
   - **Step 2: Add explicit `/` rule alongside `/index.html`**:
     Direct visits to the root domain (`https://app.example.com/`) request `/`. To ensure reverse proxies and edge nodes never cache the root HTML document and to resolve Challenger 1's Warning 3.6, specify:
     ```text
     /
       Cache-Control: no-cache, no-store, must-revalidate

     /index.html
       Cache-Control: no-cache, no-store, must-revalidate
     ```
   - **Step 3: Do NOT set `Cache-Control` on `/*`**:
     Because Cloudflare Pages accumulates headers across all matching rules (Observation 1.4), setting `Cache-Control: no-cache` under `/*` would match `/assets/*` as well, attaching conflicting `no-cache` headers to hashed JavaScript/CSS assets and destroying 1-year immutable caching. `/*` must strictly remain limited to security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).

4. **Auditing Other Rules in `public/_headers`**:
   - `/assets/*`: Targets Vite's content-hashed bundles. Matches no SPA routes. Safe and optimal (`max-age=31536000, immutable`).
   - `/favicon.svg`: Static file in `public/`. Matches no SPA routes. Safe (`max-age=86400, stale-while-revalidate=86400`).
   - `/data/*`: Contains only `countries-110m.json`. There are currently no top-level SPA routes matching `/data/`. However, to prevent any hypothetical future collision (e.g. an organization named `data` matching `/:orgSlug`), the team should note that `/data/countries-110m.json` is the sole asset. Since existing test contracts expect `/data/*`, keeping `/data/*` is safe today, but scoped file targeting is documented as a future hardening measure.

5. **Test Harness Synchronization**:
   - Because `scripts/challenge-m1-assets.mjs` test 3.3 asserts that `/auth/*` exists in `_headers`, simply removing `/auth/*` from `public/_headers` without updating the challenge script would cause `node scripts/challenge-m1-assets.mjs` to fail with code 1.
   - Test 3.3 must be updated to verify the **absence** of `/auth/*` (safeguard against SPA caching regression).
   - Test 3.6 will automatically flip from `WARN` to `PASS` once `/` is added to `_headers`.
   - Running the updated suite will produce `26 PASSED | 0 FAILED | 0 WARNINGS`.

---

## 3. Caveats

1. **Static Files vs SPA Routes**:
   - If static authentication assets are ever reintroduced in the future, they MUST NOT be placed in `public/auth/`. Instead, they should be placed in `public/assets/auth/` or imported directly in TypeScript so Vite places them under content-hashed `/assets/*`.
2. **Organization Slug Collision with `/data/*`**:
   - Organization routing uses `/:orgSlug/...`. If an organization were created with the exact slug `data`, requests to `https://domain.com/data/dashboard` would match `/data/*`. While reserved word validation prevents this at the API level, changing `/data/*` to `/data/countries-110m.json` in a future milestone is recommended once test contracts are adjusted.
3. **Scope and File Ownership**:
   - Explorer 1 is read-only. Source files must be modified by Worker M1. Ready-to-apply diff patches and replacement files are provided in `.agents/teamwork/teamwork_explorer_m1_it2_1/`.

---

## 4. Conclusion & Actionable Worker Plan

### Final Assessment
Reviewer 2's defect report is 100% accurate: `/auth/*` in `public/_headers` directly exposes all 14 SPA authentication routes to 7-day edge and browser caching on `index.html`. Remediation is straightforward, zero-risk, and fully verifiable.

### Actionable Remediation for Worker M1

#### Action 1: Replace `public/_headers`
Replace the contents of `public/_headers` with the clean, verified configuration:
```text
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

# Cache-Control: 1-year immutable for content-hashed assets
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# Cache-Control: 7-day cache with 1-day stale-while-revalidate for static data
/data/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400

# Cache-Control: 1-day cache with stale-while-revalidate for static icons
/favicon.svg
  Cache-Control: public, max-age=86400, stale-while-revalidate=86400

# Cache-Control: never cache entry HTML (root and fallback paths)
/
  Cache-Control: no-cache, no-store, must-revalidate

/index.html
  Cache-Control: no-cache, no-store, must-revalidate
```
*Exact artifact available at*:  
`c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m1_it2_1\proposed_public_headers`  
*Diff patch available at*:  
`c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m1_it2_1\headers.patch`

#### Action 2: Update `scripts/challenge-m1-assets.mjs`
In `scripts/challenge-m1-assets.mjs` (lines 365–372), update test 3.3 to verify the absence of `/auth/*`:
```javascript
<<<<
  // 3.3 Verify /auth/* cache rule
  const authCc = rules['/auth/*'] && rules['/auth/*']['cache-control'];
  const authValid = authCc && authCc.includes('max-age=604800') && authCc.includes('stale-while-revalidate=86400');
  recordTest(
    'Cache Directives: /auth/* has 7-day stale-while-revalidate cache',
    Boolean(authValid),
    authValid ? `/auth/* Cache-Control: ${authCc}` : `Invalid /auth/* Cache-Control: ${authCc}`
  );
====
  // 3.3 Verify /auth/* is absent to prevent SPA HTML caching hazard
  const authCc = rules['/auth/*'] && rules['/auth/*']['cache-control'];
  const authSafe = !authCc;
  recordTest(
    'Cache Directives: /auth/* absent to prevent SPA HTML caching hazard',
    authSafe,
    authSafe
      ? '/auth/* correctly omitted (prevents SPA routes matching /auth/* from inheriting 7-day cache on fallback index.html)'
      : `Hazard detected: /auth/* has Cache-Control: ${authCc}`
  );
>>>>
```
*Diff patch available at*:  
`c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m1_it2_1\challenge_assets.patch`

---

## 5. Verification Method

To independently verify the fix:

1. **Verify `public/_headers` Content**:
   ```powershell
   # Confirm /auth/* rule is gone:
   Select-String -Path "public\_headers" -Pattern "/auth/\*"
   # Expected result: No matches found

   # Confirm root / and /index.html are present:
   Select-String -Path "public\_headers" -Pattern "no-cache, no-store, must-revalidate"
   # Expected result: Matches / and /index.html
   ```

2. **Execute Clean Production Build**:
   ```powershell
   npm run build
   ```
   *Expected result*: Exit code `0`. `dist/_headers` is emitted matching `public/_headers`.

3. **Run Challenger Asset & Header Suite**:
   ```powershell
   node scripts/challenge-m1-assets.mjs
   ```
   *Expected result*:
   - Exit code: `0`
   - Summary: `26 PASSED | 0 FAILED | 0 WARNINGS`
   - Test 3.3 reports: `[PASS] Cache Directives: /auth/* absent to prevent SPA HTML caching hazard`
   - Test 3.6 reports: `[PASS] Cache Directives Adversarial Check: Root URL "/" explicit Cache-Control`
