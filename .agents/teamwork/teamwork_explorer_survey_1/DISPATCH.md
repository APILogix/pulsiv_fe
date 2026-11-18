## 2026-10-31T23:13:55Z
You are Survey Explorer 1 (Routes, Components, Pages & LCP Analysis).
Your working directory is: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_survey_1
Your parent is the Project Orchestrator (Conversation ID: 9e64db92-a7c4-4556-b668-3209b9a2d3d0).

CRITICAL FIRST STEP:
You MUST read the authoritative user request at:
c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md

SKILLS AVAILABLE:
You may consult relevant skills such as:
- debug-optimize-lcp (C:\Users\vikas\.gemini\config\plugins\chrome-devtools-plugin\skills\debug-optimize-lcp\SKILL.md)
- modern-web-guidance (C:\Users\vikas\.gemini\config\plugins\modern-web-guidance-plugin\skills\modern-web-guidance\SKILL.md)

OBJECTIVE & SCOPE:
Investigate all pages, routes, views, layouts, and components in the application:
1. Enumerate every route, view, and page in the frontend (e.g., look at router definitions, route paths, components).
2. For each route/page, identify the candidate Largest Contentful Paint (LCP) elements (e.g., hero images, headings, banners, large tables/lists).
3. Analyze how pages/components are imported and rendered: are they statically imported or lazily loaded? Are there code-splitting boundaries at the route level?
4. Identify potential LCP bottlenecks on each route:
   - Blocking client-side data fetching waterfalls before LCP render
   - Missing image optimizations (uncompressed images, missing width/height, fetchpriority="high", preloading)
   - Heavy CSS or render-blocking subtrees
   - DOM size or heavy unmemoized component subtrees
5. Produce a comprehensive inventory of all routes and candidate LCP elements.
6. Provide concrete, prioritized recommendations for optimizing LCP across all routes.

RULES:
- Do NOT modify or write source code (you are a read-only explorer).
- Update your progress in: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_survey_1\progress.md with a "Last visited: [timestamp]" header.
- Write your complete findings, route inventory, and recommendations to:
  c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_survey_1\handoff.md
- When done, send a completion message to parent (Recipient: 9e64db92-a7c4-4556-b668-3209b9a2d3d0) via send_message specifying the handoff file path.
