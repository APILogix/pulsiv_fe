# Frontend Performance & Core Web Vitals Optimization Plan

## Role & Objective
Act as a Principal Frontend Performance Engineer and Chrome Core Web Vitals Specialist.
The mission is to audit, refactor, and optimize this frontend codebase to achieve **95–100 scores across all four Google Lighthouse categories** (Performance, Accessibility, Best Practices, SEO) and pass all **Chrome Core Web Vitals** thresholds at the 75th percentile:
- **LCP (Largest Contentful Paint):** <= 1.8s (Chrome Good threshold: <= 2.5s)
- **INP (Interaction to Next Paint):** <= 100ms (Chrome Good threshold: <= 200ms)
- **CLS (Cumulative Layout Shift):** <= 0.02 (Chrome Good threshold: <= 0.1)
- **FCP (First Contentful Paint):** <= 1.2s
- **Total Blocking Time (TBT):** <= 150ms

---

## Strict Engineering Rules
1. **Zero Functional Regressions:** Never break existing business logic, UI states, routing, or API contracts.
2. **Measure Before & After:** Inspect the build configuration, bundle output, component tree, and network waterfall before applying changes.
3. **Incremental, Verifiable Phases:** Execute optimizations in the 6 phases below. After each phase, verify that the project builds cleanly (`npm run build` / `tsc`) with zero errors.

---

## Phase 1: Codebase Audit & Bundle/Build Optimization
Inspect `package.json`, bundler config (`vite.config.*`), and entry points:
1. **Bundle Splitting & Vendor Chunking:**
   - Separate heavy third-party libraries (charts, code editors, date utilities, animation libraries, icons) into isolated async chunks so the initial entry JS bundle stays **< 150 KB gzipped**.
   - Configure manual chunks or dynamic `import()` boundaries for route-level and modal/drawer-level components.
2. **Tree-Shaking & Dead-Code Elimination:**
   - Replace barrel/full-package imports (e.g., `import _ from 'lodash'`, `import * as Icons from 'lucide-react'`) with direct path imports or modular equivalents.
   - Remove unused dependencies, polyfills for baseline-supported browser APIs, and duplicate packages.
3. **Compression & Minification:**
   - Enable Terser/SWC/esbuild minification, CSS minification, and Brotli/Gzip pre-compression plugins if using Vite/Webpack.
   - Ensure production builds strip `console.log`/`debugger` statements while preserving error boundaries.

---

## Phase 2: LCP (Largest Contentful Paint) & Critical Rendering Path
Optimize the time it takes to render the primary above-the-fold content:
1. **Eliminate Render-Blocking Resources:**
   - Inline critical CSS or remove unused global CSS.
   - Defer non-critical third-party scripts (`defer` or `async`).
2. **Prioritize the LCP Element:**
   - Identify the hero image, main dashboard header, or primary above-the-fold element on every key route.
   - Add `fetchpriority="high"` and `loading="eager"` (NEVER `loading="lazy"`) to the LCP image.
   - Add `<link rel="preload">` in the document `<head>` for critical fonts (`.woff2`) and the LCP image if static.
3. **Image & Media Optimization:**
   - Convert raster images to modern formats (**AVIF** or **WebP**), serve responsive `srcset` and `sizes` attributes, and add `loading="lazy"` + `decoding="async"` to all below-the-fold images.
4. **Network & Font Preconnects:**
   - Add `<link rel="preconnect" href="..." crossorigin>` for API origins and CDN/font domains in the root HTML/layout.
   - Self-host critical `.woff2` fonts where possible and subset them to `latin`.

---

## Phase 3: INP (Interaction to Next Paint) & Main-Thread Responsiveness
Eliminate long tasks (> 50ms) and ensure instant UI feedback on clicks, keypresses, and filters:
1. **Break Up Long Tasks & Yield to Main Thread:**
   - Offload heavy data transformations (log parsing, trace waterfall building, JSON formatting, large array sorting/filtering) to **Web Workers** or chunk them using `scheduler.yield()` / `requestAnimationFrame`.
2. **Virtualize Large Lists, Tables & Trees:**
   - Any list, log viewer, span waterfall, or table rendering > 50 rows MUST use windowed virtualization (e.g., `@tanstack/react-virtual` or `content-visibility: auto` with `contain-intrinsic-size`).
3. **Framework Render Optimization (React / Vite):**
   - Prevent cascading re-renders: memoize expensive subtrees (`React.memo`, `useMemo`, `useCallback`), colocate state closest to the leaf component that reads it, and split monolithic context providers into granular state slices.
   - Wrap non-urgent UI updates (search filtering, tab switching, chart re-rendering) in `startTransition` or `useDeferredValue` so input fields remain 60fps responsive.
4. **Lazy-Load Heavy Interactive Widgets:**
   - Dynamically import heavy components (charts, flamegraphs, syntax highlighters, rich text editors, modals, command palettes) only when they enter the viewport (`IntersectionObserver`) or on user interaction (`onMouseEnter` / `onFocus` prefetch).

---

## Phase 4: CLS (Cumulative Layout Shift) & Visual Stability
Ensure zero unexpected layout movement during page load and async data hydration:
1. **Explicit Dimensions on All Media & Containers:**
   - Add explicit `width` and `height` attributes (or CSS `aspect-ratio`) to every `<img>`, `<svg>`, `<video>`, `<iframe>`, and chart container.
2. **Dimension-Matched Skeletons:**
   - Audit all loading states and skeleton placeholders. Every skeleton must match the exact height/grid layout of the hydrated component (`min-height` matching the loaded card/table/chart).
3. **Font Metric Overrides:**
   - Configure `font-display: swap` (or `optional`) alongside fallback font metric overrides (`size-adjust`, `ascent-override`, `descent-override`) so text never reflows when web fonts load.
4. **GPU-Accelerated Animations Only:**
   - Replace any CSS transitions/animations that mutate layout properties (`top`, `left`, `width`, `height`, `margin`, `padding`) with compositor-only properties (`transform`, `opacity`).

---

## Phase 5: Data Fetching, Caching & Instant Navigation
1. **Request Waterfall Elimination:**
   - Replace sequential `await fetch()` waterfalls in components with parallel `Promise.all()` or route-level prefetching.
2. **Stale-While-Revalidate & Caching:**
   - Deduplicate in-flight API requests, cache read-heavy responses in memory (TanStack Query), and prefetch likely next routes on link hover/viewport entry (or via the Chrome **Speculation Rules API**).
3. **Static Asset Cache Headers:**
   - Configure hashed build assets (`/assets/*`) with `Cache-Control: public, max-age=31536000, immutable`.

---

## Phase 6: Lighthouse Accessibility, Best Practices & SEO (100/100)
1. **Accessibility (A11y):**
   - Ensure every icon-only `<button>` and `<a>` has an `aria-label`.
   - Maintain a strict heading hierarchy (`<h1>` -> `<h2>` -> `<h3>`), proper `<main>`/`<nav>`/`<header>` landmarks, and WCAG AA contrast ratios (>= 4.5:1 for normal text).
   - Ensure all interactive elements are keyboard-focusable with visible `:focus-visible` styles.
2. **Best Practices & SEO:**
   - Ensure `<html lang="en">`, unique `<title>`, `<meta name="description">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, and canonical tags are present on every route.
   - Fix any passive event listener warnings (`{ passive: true }` on `scroll`, `touchstart`, `wheel`).

---

## Deliverables & Execution Plan
1. **Full Codebase Audit:** Measure baseline bundle sizes and identify all bottlenecks across CWV and Lighthouse pillars.
2. **Implementation:** Systematically execute optimizations Phase 1 through Phase 6 with zero regressions.
3. **Verification:** Validate clean TypeScript compilation and report Before vs. After metrics.
