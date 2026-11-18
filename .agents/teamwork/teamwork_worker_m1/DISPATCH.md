## 2026-10-31T23:39:22Z
You are the Milestone 1 Implementation Worker (Font, Asset & Cache Optimization).
Your working directory is: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_worker_m1
Your parent is the Project Orchestrator (Conversation ID: 9e64db92-a7c4-4556-b668-3209b9a2d3d0).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL FIRST STEPS:
1. You MUST read the authoritative user request at:
   c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md
2. You MUST read the project architecture, features, and interface contracts at:
   c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md
3. You MUST read the Milestone 1 scope document:
   c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_sub_orch_m1\SCOPE.md
4. Consult the three Explorer handoffs for exact patches, lines of code, and artifacts:
   - c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m1_1\handoff.md (and proposed_index_head.html, proposed_index_css.patch)
   - c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m1_2\handoff.md
   - c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m1_3\handoff.md (and proposed_index_skeleton.html, proposed_package.json)

EXCLUSIVE FILE WRITE OWNERSHIP:
You exclusively own and may edit the following files:
- `src/app/index.css`
- `index.html`
- `package.json`
- `public/_headers`
- `public/auth-bg.png` (delete)
- `public/auth/auth-network.webp`, `public/auth/auth-observability.webp`, `public/auth/auth-security.webp` (delete)

TASKS TO IMPLEMENT:
1. **Feature F1 (Web Fonts & Non-Blocking Stylesheets)**:
   - In `src/app/index.css`: Delete lines 3-5 (`@import "@fontsource/jetbrains-mono/...";`).
   - In `src/app/index.css`: Upgrade `--mono` font fallback stack to include system monospace fallbacks (`"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;`).
   - In `index.html`: Replace render-blocking Google Fonts `<link rel="stylesheet">` with the non-blocking `media="print" onload="this.media='all'"` pattern, ensuring `display=swap` is present and `<noscript>` fallback is provided.
2. **Feature F2 (Dead Asset Removal & Package Cleanup)**:
   - Delete `public/auth-bg.png` (~695 KB).
   - Delete unreferenced legacy `public/auth/*.webp` files (`auth-network.webp`, `auth-observability.webp`, `auth-security.webp`).
   - In `package.json`: Remove `"@fontsource/jetbrains-mono": "^5.2.5"` and `"shadcn": "^4.11.0"` from `"dependencies"`.
3. **Feature F3 (HTTP Cache Directives)**:
   - In `public/_headers`: Add caching directives for `/assets/*` (immutable 1 year), `/data/*` (max-age=604800, stale-while-revalidate=86400), `/auth/*` (max-age=604800, stale-while-revalidate=86400), `/favicon.svg` (max-age=86400), and `/index.html` (no-cache).
4. **Feature F4 (HTML Boot Skeleton Neutralization)**:
   - In `index.html`: Replace lines 35-142 inside `<div id="root">` with the neutral, centered brand mark pulse skeleton designed in Explorer 3's `proposed_index_skeleton.html` (or equivalent minimalist layout-neutral design). This eliminates the 440px auth-card skeleton mismatch that caused severe CLS on wide dashboard routes.

VERIFICATION COMMANDS (Mandatory):
1. Execute production build:
   `npm run build`
   Verify that `tsc -b && vite build` exits with code 0.
2. Verify asset reduction:
   - Confirm `auth-bg.png` is not in `dist/`.
   - Confirm no `@fontsource` font binaries are generated in `dist/assets/`.
   - Confirm `dist/assets/index-*.css` size decreased.
   - Confirm `dist/_headers` has the updated cache rules.

REPORTING:
- Update your `progress.md` with "Last visited: [timestamp]".
- Write your complete handoff report to:
  `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_worker_m1\handoff.md`
- Report back to parent via `send_message` specifying build results and handoff file path.
