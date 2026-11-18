## 2026-10-31T23:29:36Z
You are the E2E Test Writer for the E2E Testing Track.
Your working directory is: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_test_writer_e2e
Your parent is the Project Orchestrator (Conversation ID: 9e64db92-a7c4-4556-b668-3209b9a2d3d0).

CRITICAL FIRST STEPS:
1. You MUST read the authoritative user request at:
   c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md
2. You MUST read the project architecture, features, and interface contracts at:
   c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md
3. Consult the survey reports for the 140-route inventory and audit harness blueprint:
   - c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_survey_1\handoff.md (Section 3: Route Inventory)
   - c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_survey_3\handoff.md (Section 5.2: Audit Harness Blueprint)

OBJECTIVE & DELIVERABLES:
You own the E2E Testing Track (opaque-box, requirement-driven Core Web Vitals audit suite):
1. Create `TEST_INFRA.md` at the project root (`c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\TEST_INFRA.md`) following the exact Project Pattern template:
   - Test Philosophy (opaque-box, requirement-driven, 4 tiers)
   - Feature Inventory mapping
   - Test Architecture (how runner starts preview server, seeds localStorage/sessionStorage, evaluates LCP < 2.5s, CLS < 0.1, INP < 200ms)
   - Coverage thresholds (Tier 1: Feature routes; Tier 2: Boundary/heavy routes; Tier 3: Interactions; Tier 4: Real-world scenarios)
2. Implement the automated test runner in `scripts/audit-cwv.mjs` (or similar node script):
   - Derives test routes across all tiers from the 140-route inventory.
   - Able to spawn/connect to production preview server (`http://127.0.0.1:4173`).
   - Injects pre-authenticated storage state (`auth-storage` in sessionStorage and `org-storage` in localStorage) for protected routes so all routes can be audited cleanly.
   - Evaluates performance metrics (LCP, CLS, INP, FCP) via Chrome DevTools Protocol (CDP), Puppeteer, Playwright, or in-browser performance observer evaluation.
   - Provides clear CLI output with table summary and exit code (0 on success, non-zero on failure).
3. Publish `TEST_READY.md` at project root (`c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\TEST_READY.md`) once the test suite is ready, including runner command and tier counts.
4. Record progress in `progress.md` with "Last visited: [timestamp]".
5. Write your complete handoff report to:
   c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_test_writer_e2e\handoff.md
   and notify the Project Orchestrator via send_message.

RULES:
- Do NOT modify application source code in `src/` (you write tests and test infra).
- Follow all anti-cheating and integrity rules. Genuine test execution only.
