## 2026-11-01T00:15:55Z
You are Milestone 1 Iteration 2 Worker (Cache Hazard, Sidebar Mount CLS & Test Harness Auth Separation).
Your working directory is: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_worker_m1_it2
Your parent is the Project Orchestrator (Conversation ID: 9e64db92-a7c4-4556-b668-3209b9a2d3d0).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL FIRST STEPS:
1. You MUST read the authoritative user request at:
   c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md
2. You MUST read the project architecture, features, and interface contracts at:
   c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md
3. You MUST read the Gate failure verdicts at:
   c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\orchestrator\GATE_STATUS.md
4. Consult the three Iteration 2 Explorer handoffs and patches:
   - c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m1_it2_1\handoff.md (and proposed_public_headers, challenge_assets.patch)
   - c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m1_it2_2\handoff.md
   - c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m1_it2_3\handoff.md (and audit-cwv-auth-separation.patch)

EXCLUSIVE FILE WRITE OWNERSHIP:
You exclusively own and may edit:
- `public/_headers`
- `scripts/challenge-m1-assets.mjs`
- `src/app/layouts/AppDualSidebar.tsx`
- `scripts/audit-cwv.mjs`

TASKS TO IMPLEMENT:
1. **Fix Cache Hazard in `public/_headers`**:
   - Remove the `/auth/*` rule entirely (as `public/auth/` contains zero static assets; keeping it cached SPA fallback HTML on edge CDNs).
   - Add explicit `/` rule alongside `/index.html` with `Cache-Control: no-cache, no-store, must-revalidate`.
   - Update `scripts/challenge-m1-assets.mjs` (replace assertion 3.3 to assert absence of `/auth/*` rule).
2. **Fix 0.2711 CLS in `src/app/layouts/AppDualSidebar.tsx`**:
   - Add a `hasMounted` state:
     ```tsx
     const [hasMounted, setHasMounted] = useState(false);
     useEffect(() => {
       setHasMounted(true);
     }, []);
     ```
   - Calculate synchronous initial flyout state:
     ```tsx
     const isEffectiveFlyoutOpen = isFlyoutOpen && hasInnerItems;
     ```
   - Update the flyout container `className`:
     ```tsx
     className={clsx(
       'flyout-container ... flex-col border-r overflow-hidden',
       hasMounted && 'transition-[width,opacity] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
       isEffectiveFlyoutOpen ? 'w-[var(--flyout-width)] opacity-100' : 'w-0 opacity-0 border-r-0'
     )}
     ```
   - In `expandedGroups`: default to `expandedGroups[group.id] ?? true` so inner groups render expanded on initial layout.
   - Ensure interactive toggling via `setIsFlyoutOpen` remains functional and smooth.
3. **Fix Test Harness Auth Isolation in `scripts/audit-cwv.mjs`**:
   - Apply the changes from `teamwork_explorer_m1_it2_3/audit-cwv-auth-separation.patch`:
     - Add `auth: false` to `T3.1 Public Guest Routing Transition`.
     - In `AUTH_SEED_SCRIPT`, clear `sessionStorage` if pathname is a public guest route (`/auth`, `/accept-invite`, `/loading`, `/error-preview`, `/account/delete/confirm`).
     - In `WebVitalsAuditor`, implement `prepareAuthContext(requiresAuth)` using `Page.addScriptToEvaluateOnNewDocument` for authenticated routes and session storage removal for guest routes.

VERIFICATION COMMANDS (Mandatory):
1. Execute production build:
   `npm run build`
   Verify exit code 0.
2. Execute automated CWV test suite:
   `npm run test:cwv:quick`
   Verify that CLS drops below 0.1 across audited routes!
3. Execute challenge asset suite:
   `node scripts/challenge-m1-assets.mjs`
   Verify 100% pass.

REPORTING:
- Update your `progress.md` with "Last visited: [timestamp]".
- Write your complete handoff report to:
  `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_worker_m1_it2\handoff.md`
- Report back to parent via `send_message` with build results, test results, and handoff path.
