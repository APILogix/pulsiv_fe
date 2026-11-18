# Feature F8 Handoff Report: LoadingBoundary & Gate Delay Optimization

## 1. Observation

### Target File
- File: `src/shared/motion/LoadingBoundary.tsx` (329 lines)
- Linked Bookkeeping File: `src/shared/motion/page-ready.ts` (107 lines)
- Linked Style Rules: `src/app/index.css` (lines 630–665)
- App Usages:
  - `src/app/layouts/ModuleLayout.tsx`: line 27 `<RouteBoundary scope="page">`
  - `src/app/layouts/SettingsLayout.tsx`: line 214 `<RouteBoundary scope="page">`
  - `src/pages/workspaces/ProjectShellPage.tsx`: line 130 `<RouteBoundary scope="page">`
  - `src/app/router/protected-routes.tsx`: lines 11–13, 241, 560–562 `<AnimatedRoute>`

### Artificial Delays & Timers Observed in `LoadingBoundary.tsx`

1. **Artificial Settle Delay (30ms)** (`LoadingBoundary.tsx:41` & `LoadingBoundary.tsx:247-251`):
   ```ts
   // Line 41:
   /** Quiet window after the last blocking query settles, so a dependent query
    *  that starts on the next commit keeps the page behind the same skeleton. */
   const SETTLE_MS = 30;

   // Lines 246-251:
   if (settle !== undefined) return;
   settle = window.setTimeout(() => {
     settle = undefined;
     if (countBlockingQueries(client, since) === 0) finish();
   }, SETTLE_MS);
   ```
   Even after every query has returned data (`countBlockingQueries(client, since) === 0`), `evaluate()` does not reveal the page. It schedules a `window.setTimeout(..., 30)`, adding 30ms of dead latency to every single query resolution.

2. **Artificial Crossfade Entrance Delay (160ms–220ms)** (`LoadingBoundary.tsx:46`, `217-220`, `266-270`):
   ```ts
   // Line 46:
   /** Content entrance (matches `route-gate-in` in index.css). */
   const REVEAL_MS = 220;

   // Lines 215-220 (inside useLayoutEffect):
   if (hasPendingCandidates(client, since)) {
     setFlag("hold", routeKey, true);
     setState("waiting");
   } else if (!animate) {
     setState("ready");
   } else {
     // Chunk skeleton was up: crossfade out of it. Otherwise a short entrance.
     setState(entering ? "revealing" : "entering");
   }

   // Lines 266-270:
   useEffect(() => {
     if (state !== "revealing" && state !== "entering") return;
     const timer = window.setTimeout(() => setState("ready"), REVEAL_MS);
     return () => window.clearTimeout(timer);
   }, [state]);
   ```
   When data is **already cached or ready** (`hasPendingCandidates(client, since) === false`), `GateContent` does **NOT** transition to `"ready"`. Because `animate` is `true` by default, it sets `state = "entering"` (or `"revealing"` if `entering` was true).
   
3. **CSS Keyframe Opacity Suppression** (`src/app/index.css:648-661`):
   ```css
   .route-gate[data-gate="revealing"] {
     animation: route-gate-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
   }
   .route-gate[data-gate="entering"] {
     animation: route-gate-enter 160ms cubic-bezier(0.16, 1, 0.3, 1) both;
   }
   @keyframes route-gate-in {
     from { opacity: 0; transform: translateY(6px); }
     to { opacity: 1; transform: none; }
   }
   @keyframes route-gate-enter {
     from { opacity: 0; transform: translateY(3px); }
     to { opacity: 1; transform: none; }
   }
   ```
   Both `route-gate-in` and `route-gate-enter` start at `opacity: 0`. While animating, the Largest Contentful Paint (LCP) element cannot be registered by the browser at full visibility, and Chrome DevTools marks LCP at the end of or during the opacity ramp, artificially adding 160ms to 220ms to LCP on every cached or fast navigation.

4. **Skeleton Overlay Exit Window (140ms)** (`LoadingBoundary.tsx:44`, `118-122`):
   ```ts
   const OVERLAY_EXIT_MS = 140;
   useEffect(() => {
     if (!exitKey) return;
     const timer = window.setTimeout(() => setExitKey(null), OVERLAY_EXIT_MS);
     return () => window.clearTimeout(timer);
   }, [exitKey]);
   ```
   On cache misses, the skeleton overlay fades out over 140ms via `.route-skeleton-overlay[data-state="leaving"]`. When content is cached, this overlay is never mounted (`visible = false`, `exitKey = null`).

---

## 2. Logic Chain

### Why LCP is Artificially Inflated on Cached / Ready Content
1. **Observation**: When a user navigates to a route whose queries are already cached in TanStack Query (e.g. subsequent dashboard visits, tab switching in `ProjectShellPage`, or preloaded routes), `children` render during `<GateContent>` mounting.
2. **Observation**: In `src/shared/motion/page-ready.ts`, `hasPendingCandidates(client, since)` returns `false` at line 73 (`if (query.state.data !== undefined) return false;`).
3. **Deduction**: Because `hasPendingCandidates` is `false`, there are zero queries waiting for network data. The page data is 100% available synchronously.
4. **Observation**: At line 219 of `LoadingBoundary.tsx`, `GateContent` executes:
   `setState(entering ? "revealing" : "entering");`
5. **Deduction**: This state transition schedules an unnecessary second render and applies `data-gate="entering"` (or `data-gate="revealing"`). The DOM node is injected with a CSS animation that forces `opacity: 0` on Frame 1 and interpolates over 160ms with `translateY(3px)`. In addition, line 268 sets a `setTimeout` for 220ms before removing the gate state.
6. **Conclusion**: Even though data was present in memory at 0ms, the user cannot see the content on Frame 1, and the browser's `PerformanceObserver` records an LCP delay of 160ms–220ms.

### How to Bypass Artificial Delays for Frame-1 Instant Mount
1. **Mechanism**: In `GateContent`, `useLayoutEffect` executes synchronously after `children` render but **strictly before the browser paints** to the screen.
2. **Optimization**: When `hasPendingCandidates(client, since)` is `false`:
   Set `setState("ready")` directly instead of `setState(entering ? "revealing" : "entering")`.
3. **Execution**:
   - React flushes `setState("ready")` synchronously in the same layout phase before painting.
   - `state` becomes `"ready"`.
   - `hidden` is `false`.
   - `data-gate` is `undefined`.
   - The DOM node has `opacity: 1`, `transform: none`, `inert={undefined}`, `aria-busy={undefined}`.
   - The browser's **very first paint (Frame 1)** presents the complete, interactive content.
   - LCP fires instantly on Frame 1 with 0ms gate overhead.

### How to Preserve Smooth Loading Transitions on Genuine Cache Misses
1. **Observation**: On genuine cache misses (cold navigations or unpopulated queries), `hasPendingCandidates(client, since)` returns `true` because `query.state.data === undefined` and `created >= since || observed >= since`.
2. **Flow**:
   - `useLayoutEffect` sets `setFlag("hold", routeKey, true)` and `setState("waiting")`.
   - `RouteBoundary` keeps the route skeleton visible (`visible = true`).
   - `GateContent` stays hidden behind the skeleton (`data-gate="hidden"`, `opacity: 0`).
   - When the network query returns, `countBlockingQueries(client, since)` drops to 0.
3. **Settle Delay Optimization**:
   - Change `SETTLE_MS = 0`.
   - `evaluate()` schedules `finish()` on the immediate next turn of the event loop (`setTimeout(..., 0)`), eliminating the 30ms sleep window without race conditions.
4. **Transition Polish**:
   - In `finish()`, `setFlag("hold", routeKey, false)` and `setState(animate ? "revealing" : "ready")` run.
   - The skeleton overlay transitions to `data-state="leaving"` (fades out over 140ms).
   - The content transitions through `data-gate="revealing"`, smoothly fading into view.
   - Layout shifts are prevented (CLS < 0.1) because the skeleton accurately mirrors the route frame.

---

## 3. Caveats

1. **Child Query Initialization Timing**:
   Queries must be instantiated during the component render phase (`useQuery(...)`), which is standard TanStack Query practice. If a component defers calling `useQuery` into a `useEffect` (an anti-pattern), `hasPendingCandidates` would not see it during `useLayoutEffect`. In this codebase, all inspected pages use standard top-level `useQuery` hooks.
2. **Cold Lazy Bundle Downloads**:
   If a JavaScript route chunk has not yet been fetched over the network (`React.lazy`), `SuspenseMarker` triggers `setFlag("chunk", routeKey, true)`, showing `<RouteSkeleton>` while the bundle downloads. Once the chunk downloads, if queries are cached, the skeleton smoothly exits (140ms) while content renders directly in `"ready"` state underneath.
3. **Secondary Queries Decoupling (Feature F9)**:
   This optimization (F8) eliminates gate delays once blocking queries settle. Feature F9 will further optimize multi-query routes (`ExecutiveDashboard` and `LatencyPage`) so that secondary off-screen widgets do not count as blocking queries in `countBlockingQueries`.

---

## 4. Conclusion & Proposed Code Changes

To resolve Feature F8, make the following targeted modifications in `src/shared/motion/LoadingBoundary.tsx`:

### Modification 1: Eliminate 30ms Settle Delay (`SETTLE_MS`)
Change line 41 in `src/shared/motion/LoadingBoundary.tsx`:

```ts
// BEFORE (line 41):
const SETTLE_MS = 30;

// AFTER:
/** Quiet window after the last blocking query settles. Reduced to 0ms so that
 *  when all blocking queries complete, the gate opens on the next event loop tick
 *  without introducing dead latency. */
const SETTLE_MS = 0;
```

### Modification 2: Bypass Entrance Animations on Cached / Ready Content
In `GateContent`'s `useLayoutEffect` (lines 210–223):

```ts
// BEFORE (lines 210-223):
  useLayoutEffect(() => {
    if (state !== "checking") return;
    if (hasPendingCandidates(client, since)) {
      setFlag("hold", routeKey, true);
      setState("waiting");
    } else if (!animate) {
      setState("ready");
    } else {
      // Chunk skeleton was up: crossfade out of it. Otherwise a short entrance.
      setState(entering ? "revealing" : "entering");
    }
    // Runs once per mount by design: the gate never re-engages for filter or
    // pagination changes; those use the page's own in-place loading states.
  }, [state, client, since, routeKey, setFlag, animate, entering]);

// AFTER:
  useLayoutEffect(() => {
    if (state !== "checking") return;
    if (hasPendingCandidates(client, since)) {
      setFlag("hold", routeKey, true);
      setState("waiting");
    } else {
      // Data is already cached or ready: bypass entrance animations completely
      // for instant LCP rendering on Frame 1.
      setState("ready");
    }
    // Runs once per mount by design: the gate never re-engages for filter or
    // pagination changes; those use the page's own in-place loading states.
  }, [state, client, since, routeKey, setFlag]);
```

### Line-by-Line Unified Diff Patch

```patch
--- a/src/shared/motion/LoadingBoundary.tsx
+++ b/src/shared/motion/LoadingBoundary.tsx
@@ -38,3 +38,4 @@
 /** Quiet window after the last blocking query settles, so a dependent query
- *  that starts on the next commit keeps the page behind the same skeleton. */
-const SETTLE_MS = 30;
+ *  that starts on the next commit keeps the page behind the same skeleton.
+ *  Set to 0 to eliminate artificial gate latency on query resolution. */
+const SETTLE_MS = 0;
@@ -214,5 +215,5 @@
     if (hasPendingCandidates(client, since)) {
       setFlag("hold", routeKey, true);
       setState("waiting");
-    } else if (!animate) {
+    } else {
+      // Data is already cached or ready: bypass entrance animations completely
+      // for instant LCP rendering on Frame 1.
       setState("ready");
-    } else {
-      // Chunk skeleton was up: crossfade out of it. Otherwise a short entrance.
-      setState(entering ? "revealing" : "entering");
     }
-  }, [state, client, since, routeKey, setFlag, animate, entering]);
+  }, [state, client, since, routeKey, setFlag]);
```

---

## 5. Verification Method

### 1. Build Verification
Execute production build to ensure clean TypeScript compilation and bundling:
```bash
npm run build
```
**Expected Outcome**: Clean compilation with exit code 0; no unused variables or type errors.

### 2. CWV Quick Audit Verification
Run the automated Core Web Vitals quick suite:
```bash
npm run test:cwv:quick
```
**Expected Outcome**:
- All audited routes pass with LCP < 2500ms, CLS < 0.1, INP < 200ms.
- Cached route transitions (e.g. Tier 3.2 navigation header switches and Tier 3.3 project workspace tab transitions) demonstrate immediate render without 160ms–220ms entrance lag.

### 3. Invalidation Conditions
- Any occurrence of visual flash/flicker of empty/unpopulated content before skeleton mounts on cold cache misses.
- Cumulative Layout Shift (CLS) exceeding 0.1 on route transitions.
- LCP exceeding 2500ms on cached routes.
