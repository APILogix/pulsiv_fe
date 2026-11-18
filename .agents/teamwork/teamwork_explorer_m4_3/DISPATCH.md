## 2026-11-01T04:55:40Z
You are teamwork_explorer (Explorer M4 3: Image Explicit Sizing & CWV Telemetry).
Your working directory is: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m4_3\

Before starting work, you MUST read:
1. ORIGINAL_REQUEST.md: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\ORIGINAL_REQUEST.md
2. PROJECT.md: c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\PROJECT.md

Scope: Features F14 (Image Explicit Sizing) & F15 (In-App CWV Telemetry)
Focus:
- Read-only exploration — DO NOT write or edit source code files.
- **F14 (Image Explicit Sizing for CLS Prevention)**:
  - Search all JSX/TSX files for `<img>` tags and SVG icons rendered as images.
  - Specifically examine `src/pages/inventory/AddDeviceDialog.tsx` and any other dialogs, modals, empty states, avatars, or logos.
  - Check whether `width`, `height`, and `loading` attributes or CSS `aspect-ratio` are present.
  - Document all missing dimension attributes that could cause Cumulative Layout Shift during image download/rendering.
- **F15 (In-App Core Web Vitals Telemetry Instrumentation)**:
  - Investigate `src/infrastructure/web-vitals.ts`.
  - Review how `fcp`, `lcp`, and `ttfb` are currently captured and stored.
  - Design the extension to measure:
    1. **CLS**: `layout-shift` PerformanceObserver accumulating shifts with `hadRecentInput === false` using the standard session window algorithm (5s max session window, 1s gap).
    2. **INP**: `event` PerformanceObserver observing interaction durations (`duration`, `processingStart`, `processingEnd`) with fallback to `first-input` when `event` is not supported.
    3. Global accessor: Expose `window.__getWebVitalsReport(): FullWebVitalsReport` conforming strictly to the interface contract defined in `PROJECT.md § Telemetry Interface`.
- Document concrete code proposals, exact file paths, and step-by-step guidance for the worker.
- Write your 5-component handoff report (Observation, Logic Chain, Caveats, Conclusion, Verification Method) to:
  `c:\Users\vikas\OneDrive\Desktop\SaasBackend\pulsiv_fe\.agents\teamwork\teamwork_explorer_m4_3\handoff.md`
- When complete, notify the Project Orchestrator via send_message.
