# Milestone 1 Iteration 2 Explorer 3 Analysis Report: Test Harness Public Route Auth Separation

**Author**: Milestone 1 Iteration 2 Explorer 3 (Test Harness Public Route Auth Separation)  
**Parent Agent**: Project Orchestrator (`9e64db92-a7c4-4556-b668-3209b9a2d3d0`)  
**Working Directory**: `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m1_it2_3`  
**Timestamp**: 2026-11-01T00:16:00Z  
**Target Milestone**: Milestone 1 Iteration 2 (Audit Harness Fix for F16 & F17)  
**Status**: COMPLETE (Hard Handoff)

---

## 1. Observation

### Observation 1.1: Unconditional Injection in `scripts/audit-cwv.mjs`
In `scripts/audit-cwv.mjs`, lines 806–810 (`setupSession`):
```javascript
// Pre-inject Auth State and CWV Observers into every new document
await this.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
  source: `${AUTH_SEED_SCRIPT}\n${INJECTED_CWV_HARNESS}`
});
```
- `AUTH_SEED_SCRIPT` is concatenated with `INJECTED_CWV_HARNESS` and registered **once** per CDP session during `setupSession()`.
- In the Chrome DevTools Protocol, `Page.addScriptToEvaluateOnNewDocument` registers a script that evaluates on every newly loaded document (every subsequent navigation) before document `<script>` tags run.

### Observation 1.2: Synthetic Authentication Collision with `<RequireGuest />`
In `src/app/router/route-guards.tsx`, lines 12–18:
```tsx
export function RequireGuest() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
```
In `src/app/router/public-routes.tsx`, lines 42–62:
```tsx
  {
    element: <RequireGuest />,
    children: [
      {
        path: "auth",
        element: <AuthLayout />,
        children: [
          { path: "login", element: <LoginPage />, handle: withAuthAside("signal") },
          { path: "register", element: <RegisterPage />, handle: withAuthAside("setup") },
          { path: "forgot-password", element: <ForgotPasswordPage /> },
          ...
```
- When `scripts/audit-cwv.mjs` navigates to `/auth/login` or `/auth/register`:
  1. `AUTH_SEED_SCRIPT` runs on document start, setting `sessionStorage['auth-storage']` with `isAuthenticated: true`.
  2. `auth.store.ts` initializes and reads `isAuthenticated === true`.
  3. `<RequireGuest />` immediately renders `<Navigate to="/dashboard" replace />`.
  4. In `src/app/router/protected-routes.tsx:542`, `/dashboard` redirects via `<OrgScopedRedirect target="dashboard" />` to `/:orgSlug/dashboard` (`/acme/dashboard`).
  5. `/acme/dashboard` mounts `AppLayout` and `AppDualSidebar.tsx:224`, which executes its 240ms width transition animation.
  6. The audit harness records metrics on `/acme/dashboard` (CLS ~0.28) and attributes the failure to `/auth/login` or `/auth/register`.

### Observation 1.3: Empirical Proof — Genuine Guest vs. Pre-Seeded State
Running an isolated CDP diagnostic test across both routes:
1. **Unconditioned Genuine Guest** (No `AUTH_SEED_SCRIPT`):
   - `/auth/login`: URL = `http://127.0.0.1:4173/auth/login`, Title = `"Sign In — LynkTrace"`, **CLS = 0.0017** (PASS `<= 0.1`).
   - `/auth/register`: URL = `http://127.0.0.1:4173/auth/register`, Title = `"Create Account — LynkTrace"`, **CLS = 0.0016** (PASS `<= 0.1`).
2. **Pre-Seeded State** (Current `scripts/audit-cwv.mjs`):
   - `/auth/login`: Redirected to `/acme/dashboard`, **CLS = 0.2808** (FAIL).
   - `/auth/register`: Redirected to `/acme/dashboard`, **CLS = 0.2760** (FAIL).
3. **Transition Sequence**:
   - `T3.1 Public Guest Routing Transition` (`/auth/login` -> `/auth/register` -> `/auth/forgot-password`): Pre-seeded runs failed with **CLS = 0.2760**; genuine guest runs passed with **CLS = 0.0017**.

### Observation 1.4: Manifest Audit in `scripts/audit-cwv.mjs`
- **Tier 1 (`ROUTE_MANIFEST.tier1`)**: Lines 27–41 explicitly flag all 15 public routes with `auth: false, tier: 1`. Lines 44–59 flag all 16 protected routes with `auth: true, tier: 1`.
- **Tier 2 (`ROUTE_MANIFEST.tier2`)**: All 70+ routes have `auth: true, tier: 2`.
- **Tier 3 (`ROUTE_MANIFEST.tier3`)**:
  - Item 0 (`T3.1 Public Guest Routing Transition`, line 204) is public guest navigation (`steps: ['/auth/login', '/auth/register', '/auth/forgot-password']`), but **currently lacks `auth: false`**.
- **Quick Routes (`QUICK_ROUTES`)**: Includes `/auth/login` (`auth: false`), `/auth/register` (`auth: false`), and `ROUTE_MANIFEST.tier3[0]`.
- **Custom Route Mode (`getRoutesToAudit`)**: Line 777 hardcodes `auth: true` for all custom paths (`return [{ path: mode, name: Custom Route (${mode}), auth: true, tier: 1 }]`). Testing `--routes /auth/login` would therefore still force auth without a path check.

---

## 2. Logic Chain

1. **Why Removal of `AUTH_SEED_SCRIPT` from `setupSession` is Required**:
   - Registering `AUTH_SEED_SCRIPT` globally in `setupSession` means every document created in the tab receives auth data, regardless of route properties.
   - Decoupling `AUTH_SEED_SCRIPT` so only `INJECTED_CWV_HARNESS` is globally added in `setupSession()` ensures that observers are always active without polluting storage.

2. **Why Browser Storage Must Be Dynamically Managed Across Same-Origin Navigations**:
   - Web Storage (`sessionStorage` and `localStorage`) is scoped per origin and persists across navigations in the same tab.
   - If the test suite runs `/acme/dashboard` (authenticated) followed by `/auth/register` (guest), even if `AUTH_SEED_SCRIPT` does not re-run on `/auth/register`, the residual `sessionStorage['auth-storage']` from `/acme/dashboard` would still trigger `<RequireGuest />`.
   - Therefore, when switching to an unauthenticated route (`item.auth === false`), the harness must actively purge `sessionStorage` (`auth-storage`, tokens) and remove the evaluate-on-new-document script identifier via CDP (`Page.removeScriptToEvaluateOnNewDocument`).

3. **Why Dual-Layer Defense-in-Depth Is Necessary**:
   - **Layer 1 (CDP Session Management)**: The runner defines `prepareAuthContext(requiresAuth)` called before `auditSingleRoute` and `auditScenario`. For protected routes, it registers `AUTH_SEED_SCRIPT` via `Page.addScriptToEvaluateOnNewDocument`. For public routes, it deregisters the script and evaluates storage purge.
   - **Layer 2 (Document-Level Guard)**: Inside `AUTH_SEED_SCRIPT`, the script checks `window.location.pathname`. If `window.location.pathname` matches a public route (`/auth/*`, `/accept-invite`, `/loading`, `/error-preview`, `/account/delete/confirm`), it removes `auth-storage` and exits immediately without setting `isAuthenticated: true`.
   - **Benefit**: Even during multi-step sequences (like `auditScenario` with `navigate-sequence`), any navigation hitting a public route is guaranteed to be clean at document start, before React or Zustand hydrates.

4. **Manifest and CLI Alignment**:
   - Adding `auth: false` to `ROUTE_MANIFEST.tier3[0]` ensures interaction sequence tests are evaluated in genuine guest state.
   - Updating `getRoutesToAudit()` ensures that invoking `node scripts/audit-cwv.mjs --routes /auth/register` properly detects public routes and sets `auth: false`.

---

## 3. Caveats

1. **Application-Level CLS on Authenticated Routes Remains**:
   - This test harness fix eliminates the false positive CLS failure on `/auth/login`, `/auth/register`, and `T3.1` (which drop to CLS 0.0016).
   - However, authenticated routes (`/acme/dashboard`, `/acme/p/proj_1/overview`, `/acme/account/security/passkeys`) will continue to exhibit CLS ~0.271 until the sidebar animation bug in `src/app/layouts/AppDualSidebar.tsx:224` is resolved.
2. **Session Storage vs. Local Storage**:
   - `auth.store.ts` persists strictly to `sessionStorage` (under `'auth-storage'`). `org.store` and `bootstrap.store` use `localStorage`.
   - Clearing `sessionStorage['auth-storage']` and token items (`pulse_*`) is sufficient to place the application in a genuine guest state. `localStorage` org cache does not trigger auth redirects.

---

## 4. Conclusion

### Final Assessment
The failure of public authentication routes (`/auth/login`, `/auth/register`, `T3.1`) during CWV audits is **100% caused by test harness test-state contamination**: `AUTH_SEED_SCRIPT` unconditionally populating `isAuthenticated: true` in `sessionStorage`, causing `<RequireGuest />` to redirect to `/acme/dashboard`.

### Actionable Remediation
Apply the formulated patch `audit-cwv-auth-separation.patch` to `scripts/audit-cwv.mjs`:
1. Add `auth: false` to `ROUTE_MANIFEST.tier3[0]`.
2. Add pathname guard to `AUTH_SEED_SCRIPT`.
3. Separate `AUTH_SEED_SCRIPT` from `setupSession()`.
4. Implement `prepareAuthContext(requiresAuth)` in `WebVitalsAuditor`.
5. Call `prepareAuthContext` in `auditSingleRoute` and `auditScenario`.
6. Make custom route selection in `getRoutesToAudit` detect public paths.

### Machine-Applicable Patch
The complete, validated patch has been generated at:
`c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m1_it2_3\audit-cwv-auth-separation.patch`

#### Code Snippets (Before -> After)

**1. `ROUTE_MANIFEST.tier3[0]` (lines 203–209)**:
```diff
--- a/scripts/audit-cwv.mjs
+++ b/scripts/audit-cwv.mjs
@@ -204,6 +204,7 @@ export const ROUTE_MANIFEST = {
     {
       name: 'T3.1 Public Guest Routing Transition',
       steps: ['/auth/login', '/auth/register', '/auth/forgot-password'],
       action: 'navigate-sequence',
+      auth: false,
       tier: 3
     },
```

**2. `AUTH_SEED_SCRIPT` (lines 323–330)**:
```diff
--- a/scripts/audit-cwv.mjs
+++ b/scripts/audit-cwv.mjs
@@ -324,6 +325,25 @@ export const AUTH_SEED_SCRIPT = `
 (() => {
   try {
+    const pathname = window.location.pathname;
+    const isPublicGuestPath = 
+      pathname.startsWith('/auth') ||
+      pathname === '/accept-invite' ||
+      pathname === '/loading' ||
+      pathname === '/error-preview' ||
+      pathname.startsWith('/account/delete/confirm');
+
+    if (isPublicGuestPath) {
+      sessionStorage.removeItem('auth-storage');
+      sessionStorage.removeItem('pulse_access_token');
+      sessionStorage.removeItem('pulse_access_token_expires_at');
+      sessionStorage.removeItem('pulse_current_org_id');
+      sessionStorage.removeItem('pulse_current_org_slug');
+      sessionStorage.removeItem('pulse_current_project_id');
+      sessionStorage.removeItem('pulse_current_project_slug');
+      return;
+    }
+
     sessionStorage.setItem('auth-storage', JSON.stringify({
```

**3. `WebVitalsAuditor.constructor` (line 748)**:
```diff
--- a/scripts/audit-cwv.mjs
+++ b/scripts/audit-cwv.mjs
@@ -748,6 +768,7 @@ export class WebVitalsAuditor {
     this.serverManager = new PreviewServerManager(this.options.baseUrl);
     this.chromeRunner = new ChromeRunner();
     this.cdp = null;
+    this.authScriptIdentifier = null;
     this.results = [];
   }
```

**4. `getRoutesToAudit()` (line 776–778)**:
```diff
--- a/scripts/audit-cwv.mjs
+++ b/scripts/audit-cwv.mjs
@@ -776,2 +797,8 @@ export class WebVitalsAuditor {
     // Specific custom route path
-    return [{ path: mode, name: `Custom Route (${mode})`, auth: true, tier: 1 }];
+    const isPublic =
+      mode.startsWith('/auth') ||
+      mode === '/accept-invite' ||
+      mode === '/loading' ||
+      mode === '/error-preview' ||
+      mode.startsWith('/account/delete/confirm');
+    return [{ path: mode, name: `Custom Route (${mode})`, auth: !isPublic, tier: 1 }];
   }
```

**5. `setupSession()` & `prepareAuthContext()` (lines 806–817)**:
```diff
--- a/scripts/audit-cwv.mjs
+++ b/scripts/audit-cwv.mjs
@@ -806,6 +833,39 @@ export class WebVitalsAuditor {
-    // Pre-inject Auth State and CWV Observers into every new document
-    await this.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
-      source: `${AUTH_SEED_SCRIPT}\n${INJECTED_CWV_HARNESS}`
-    });
+    // Pre-inject CWV Observers into every new document
+    await this.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
+      source: INJECTED_CWV_HARNESS
+    });
+    this.authScriptIdentifier = null;
   }
 
+  async prepareAuthContext(requiresAuth) {
+    if (requiresAuth) {
+      if (!this.authScriptIdentifier) {
+        const res = await this.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
+          source: AUTH_SEED_SCRIPT
+        });
+        this.authScriptIdentifier = res.identifier;
+      }
+    } else {
+      if (this.authScriptIdentifier) {
+        await this.cdp.send('Page.removeScriptToEvaluateOnNewDocument', {
+          identifier: this.authScriptIdentifier
+        });
+        this.authScriptIdentifier = null;
+      }
+      try {
+        await this.cdp.send('Runtime.evaluate', {
+          expression: `(() => {
+            sessionStorage.removeItem('auth-storage');
+            sessionStorage.removeItem('pulse_access_token');
+            sessionStorage.removeItem('pulse_access_token_expires_at');
+            sessionStorage.removeItem('pulse_current_org_id');
+            sessionStorage.removeItem('pulse_current_org_slug');
+            sessionStorage.removeItem('pulse_current_project_id');
+            sessionStorage.removeItem('pulse_current_project_slug');
+          })()`
+        });
+      } catch {}
+    }
+  }
```

**6. `auditSingleRoute()` and `auditScenario()` (lines 812 & 900)**:
```diff
--- a/scripts/audit-cwv.mjs
+++ b/scripts/audit-cwv.mjs
@@ -812,2 +872,4 @@ export class WebVitalsAuditor {
   async auditSingleRoute(item) {
+    await this.prepareAuthContext(item.auth !== false);
+
     const fullUrl = `${this.options.baseUrl}${item.path}`;
@@ -900,2 +962,4 @@ export class WebVitalsAuditor {
   async auditScenario(scenario) {
+    await this.prepareAuthContext(scenario.auth !== false);
+
     let worstLcp = 0;
```

---

## 5. Verification Method

### 1. Patch Integrity Verification
Run the standard git dry-run command against the repository:
```powershell
git apply --check .agents/teamwork/teamwork_explorer_m1_it2_3/audit-cwv-auth-separation.patch
```
*Expected Result*: Exits with code `0` (clean application without errors).

### 2. End-to-End Route Isolation Execution
Execute the automated test harness across the separation test runner:
```powershell
node .agents/teamwork/teamwork_explorer_m1_it2_3/test-runner-separation.mjs
```
*Expected Observations*:
- **Test 1 (`/auth/login`)**: URL remains `http://127.0.0.1:4173/auth/login`, Title = `"Sign In — LynkTrace"`, `isAuthenticated: false`, **CLS = 0.0017**.
- **Test 2 (`/auth/register`)**: URL remains `http://127.0.0.1:4173/auth/register`, Title = `"Create Account — LynkTrace"`, `isAuthenticated: false`, **CLS = 0.0016**.
- **Test 3 (`/acme/dashboard`)**: URL = `http://127.0.0.1:4173/acme/dashboard`, `isAuthenticated: true`.
- **Test 5 (`T3.1 Guest Routing Transition`)**: All 3 sequence steps execute with `isAuthenticated: false` and **CLS < 0.002**.
- **Test 6 (`/auth/forgot-password` after protected routes)**: Successfully clears storage, `isAuthenticated: false`, **CLS = 0.0014**.

### 3. Verification Invalidation Condition
If applying this patch causes `/acme/dashboard` to fail due to unauthenticated redirect (`/auth/login`), or causes `/auth/register` to report CLS > 0.010, the fix is invalidated. Our empirical testing confirms that protected routes maintain 100% hydration while public routes achieve CLS 0.0016.
