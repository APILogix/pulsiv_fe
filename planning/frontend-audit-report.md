# Frontend Audit & Upgrade Report

Scope: full audit of `pulsiv_fe` against `planning/uiuxprompt.md` (Phases 1–15), plus the
implementation that followed. Findings are ranked Critical → Low. Every item marked
**Fixed** has a named file you can open.

Environment note: this workspace has no shell access from the agent session, so `tsc -b`
and `vite build` were **not** executed. Every change was made against files read in full,
and the verification steps that still need a terminal are listed at the end under
"Outstanding verification".

---

## Phase 1 — Audit findings

### Critical

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| C1 | **Sidebar navigation showed no feedback on click.** Every protected route element is `React.lazy`, and React Router v7 wraps navigation in `startTransition`. During a transition React *keeps the old UI* instead of showing a Suspense fallback, so clicking a sidebar item to an un-downloaded chunk looked like nothing happened until the chunk landed. | `protected-routes.tsx` (all elements lazy) + a single non-keyed `<Suspense>` in `AppLayout` | **Fixed** — `shared/motion/LoadingBoundary.tsx` keys the boundary on route identity, which forces the fallback to paint on the next frame. |
| C2 | **Loading fallbacks were generic.** Three shapes served ~150 routes: `RouteLoadingRegion` (header + 4 tiles + block), `MetricLoader` (a chart animation), `DetailSkeleton`. A log explorer, a members table and a billing page all showed the same rectangles. | `shared/ui/loading/RouteLoadingRegion.tsx`, `MetricLoader.tsx` | **Fixed** — `shared/skeletons/` (27 page-shaped skeletons + URL resolver). |
| C3 | **Sidebar submenu clipped its own items.** `.nav-group-children.open` capped height at `400px`; the Observability group has 21 children (~800px), so roughly half were unreachable. | `app/index.css` | **Fixed** — height is now derived from content: the rows sit in a single grid child and the parent animates `grid-template-rows: 0fr → 1fr`, so no group can outgrow it. Raising the clamp would only have moved the cliff. Degrades to an instant open (never clipped) on engines without `grid-template-rows` interpolation. |
| C4 | **Multi-step CRUD operations showed a bare spinner.** Organization creation provisions workspace + resources + permissions + keys server-side and reported all of it as `Creating organization...`. | `CreateOrganizationPage.tsx`, `CreateProjectWizardPage.tsx` | **Fixed** — `shared/motion/WorkflowProgress.tsx` + `useWorkflow.ts`, wired into both create flows. |

### High

| # | Finding | Evidence | Status |
|---|---------|----------|--------|
| H1 | **Scroll position leaked between pages.** `ModuleLayout` is the scroll container and stays mounted across pages within a module, so navigating from a scrolled list to a new page opened it mid-page. Back navigation lost position entirely. | `ModuleLayout.tsx` had no scroll handling | **Fixed** — `useScrollRestoration` in `ModuleLayout`, `SettingsLayout`, `ProjectShellPage`, `AppLayout`. Forward navigation resets to top; back re-applies the saved offset across frames until the (lazy) content is tall enough to hold it, with a 1s deadline and an abort as soon as the user scrolls. A single-frame restore silently failed, because on the first frame the container is only a skeleton tall and `scrollTop` is clamped. |
| H2 | **Empty card grids rendered nothing.** `InfiniteCards` had no empty branch: zero results produced an empty grid plus the footer line `0 total · end of results`. | `shared/observe/InfiniteCards.tsx` | **Fixed** — animated empty state with illustration + CTA slot. |
| H3 | **Empty tables were a single grey sentence.** `InfiniteTable` centred `emptyMessage` as 13px `--text3`, with no illustration and no next action. | `shared/observe/InfiniteTable.tsx` | **Fixed** — `AnimatedEmptyState` with `emptyIllustration` / `emptyTitle` / `emptyAction` props (old `emptyMessage` API still works). |
| H4 | **No route prefetching.** Every first visit to a module paid a chunk round-trip after the click, despite hover giving 200–800ms of warning. | no prefetch existed | **Fixed** — `app/router/route-prefetch.ts`, triggered from rail and flyout `onPointerEnter`/`onFocus`. |
| H5 | **Cold start was a canvas particle animation with no narration.** ~150 lines of per-frame `requestAnimationFrame` work plus `getImageData` on the boot path, and it vanished between frames when hydration finished. | `ParticleLoadingCanvas.tsx` (600×300 canvas, ~20k pixel scan) | **Fixed** — `AppBootstrapLoader` rebuilt (brand mark, AI pulse, rotating stage copy), `AppBootstrapGate` owns a 340ms cross-fade into the dashboard. The canvas file is now unreferenced. |
| H6 | **`transition-all` on the sidebar flyout.** Toggling put every animatable property on a 300ms clock, including colours, borders and shadows of the container. | `AppDualSidebar.tsx` | **Fixed** — `transition-[width,opacity]`, 240ms, standard easing. |

### Medium

| # | Finding | Status |
|---|---------|--------|
| M1 | Active rail indicator was two independently mounted absolute divs — it popped rather than moved. | **Fixed** — single `layoutId` element (FLIP, transform-only) in `PrimaryRail.tsx`. |
| M2 | Tab indicator snapped: `border-b-2` colour swap with no transition. | **Fixed** — `::after` underline scaling from centre, 200ms (`components/ui/tabs.tsx`). |
| M3 | Buttons had zero press feedback (`transition-colors` only). | **Fixed** — `active:scale-[0.99]`, transform added to the transition list. |
| M4 | Switch knob moved on a flat 150ms ease-out; toggles felt inert. | **Fixed** — 180ms overshoot curve `cubic-bezier(0.34,1.56,0.64,1)`. |
| M5 | Dropdown/tooltip surfaces faded without scale, so they had no origin. | **Fixed** — `zoom-in-95` from the Radix transform origin, 150ms. |
| M6 | Rail tooltips faded in place with no directional cue. | **Fixed** — 4px slide + shadow, and they now also appear on `:focus-visible`. |
| M7 | Cards had no hover affordance, including clickable ones. | **Fixed** — opt-in `interactive` prop on `Card`; `AnimatedCard` for motion-driven cases. |
| M8 | Redundant loading layers: `MetricRouteBoundary` wrapped 20 routes and would have covered the new page skeletons with a generic chart loader. | **Fixed** — removed from `protected-routes.tsx`; loading is owned by layout boundaries. |
| M9 | No shared motion vocabulary — durations and easings were written inline per component. | **Fixed** — `shared/motion/tokens.ts` is the single source. |

### Low

| # | Finding | Status |
|---|---------|--------|
| L1 | `shared/components/EmptyState.tsx` was `<div className="p-8 text-center">{message}</div>`. | **Fixed** — delegates to `AnimatedEmptyState`, same call signature. |
| L2 | `LoadingScreen.tsx` is a deprecated alias for `AppBootstrapLoader`. | Left in place (still imported by legacy call sites); marked for deletion. |
| L3 | `ParticleLoadingCanvas.tsx` is now dead code. | Not bundled (no importer). Safe to delete — see "Manual follow-ups". |
| L4 | Table rows had `transition-colors` with no explicit duration, inheriting the Tailwind default. | **Fixed** — pinned to 150ms with a documented "rows never translate" rationale. |

---

## Phase 13 — React performance audit

### Already correct before this work

- React Compiler is enabled (`vite.config.ts` → `babel-plugin-react-compiler`, target 19), so
  manual `useMemo`/`useCallback`/`React.memo` is correctly absent. **All new code follows this**
  — the only `useRef` uses are for timers, DOM nodes and mutable non-render state.
- Route-level code splitting is thorough: ~150 lazy route elements.
- `manualChunks` splits react / ui / util vendors.
- Zustand stores use selector subscriptions (`useAuthStore((s) => s.hasHydrated)`), not whole-store reads.
- React Query defaults are conservative: `staleTime` 5min, `gcTime` 30min, `refetchOnWindowFocus: false`,
  `refetchOnMount: false`, no retry on 4xx.
- `VirtualList` already windows long tables.

### Issues found and fixed

| # | Issue | Fix |
|---|-------|-----|
| P1 | Boot path ran a canvas particle system: `getImageData` over 180,000 pixels, then a per-frame loop over ~2,000 particles — on the critical path, competing with hydration. | Replaced with 4 composited elements + one rotating group. |
| P2 | `transition-all` on the flyout forced the browser to evaluate every animatable property on toggle. | Scoped to `width, opacity`. |
| P3 | Provider tree had no motion configuration point, so `prefers-reduced-motion` was checked ad-hoc per component. | One `MotionConfig` with `reducedMotion="user"` in `AppProviders`. |
| P4 | No prefetch → chunk fetch serialized after click. | Idle-time hover prefetch, skipped on `saveData`/2g. |
| P5 | Counter/scroll patterns that re-render per frame were not available, so pages would have hand-rolled them. | `CounterAnimation` drives a `MotionValue` (0 React renders/frame); all scroll listeners are passive + rAF-throttled and write to refs or `dataset`, never to state. |

### Deliberate constraints in the new code

- **Composited properties only.** `opacity` and `transform` (`x`, `y`, `scale`, `scaleX`, `scaleY`,
  `rotate`, `pathLength`). The one exception is `AnimatedCollapse`, which animates `height: auto`;
  it is documented in place and scoped to small panels, because the alternative (max-height guessing)
  visibly clips content.
- **Progress bars use `scaleX`, not `width`.**
- **Bars in charts grow with `scaleY` + `transform-box: fill-box`,** so a 40-bar chart never re-lays out.
- **Stagger is capped** (`Math.min(index, 14)`) so row 200 of a table doesn't wait seconds.
- **No `will-change` is hand-set.** framer-motion adds and removes it per animation; pinning it
  would hold a compositor layer for the lifetime of every page.

---

## Phase 12 — Accessibility validation

| Requirement | How it's met |
|---|---|
| `prefers-reduced-motion` respected | `MotionConfig reducedMotion="user"` disables transform/layout animation app-wide while keeping opacity. CSS loops (`skeleton-block`, `skeleton-rise`, `pulse-*`, rail tooltip, nav accordion, nav indicator) are switched off in the reduced-motion block in `index.css`. Imperative loops branch on `useMotionPreference()`. |
| Keyboard focus never lost | `AnimatedModal`/`AnimatedDrawer` move focus into the panel on open, cycle Tab inside it, and restore focus to the trigger on close. Escape always closes. |
| No motion-sickness triggers | No parallax, no scroll-jacking, no large-area movement. Maximum travel is 8px; maximum scale delta 3%. |
| Screen readers ignore decoration | Every illustration, ambient wash, pip row and skeleton block is `aria-hidden="true"`. |
| Loading states announced | Skeletons expose one `role="status" aria-live="polite" aria-busy="true"` per region with an `sr-only` label, not one per block. |
| Workflow progress announced | `WorkflowProgress` renders an `<ol>` with `aria-live="polite"` and `aria-busy`. |
| Counters readable | `CounterAnimation` sets `aria-label` to the final formatted value, so assistive tech reads the number, not the tween. |
| Nav state exposed | `aria-current="page"` on active rail and flyout rows; `aria-expanded` on rail items with children and on group toggles; the collapsed flyout is `aria-hidden`. |

---

## Outstanding verification (needs a terminal)

These could not be run from this session:

1. `npm run build` — `tsc -b && vite build`. Type-checks everything and produces chunk sizes.
2. `npm run lint`.
3. Lighthouse / Web Vitals capture for before-vs-after numbers.
4. A manual pass on the checklist in `planning/upgrade-checklist.md`.

## Manual follow-ups

- Delete `src/shared/ui/loading/ParticleLoadingCanvas.tsx` (no importers remain).
- Delete `src/shared/components/LoadingScreen.tsx` once its legacy call sites are migrated to
  `AppBootstrapLoader`.
- `src/components/ui/PageLoader.tsx` is now only a compatibility shim; migrate remaining callers to
  `RouteSkeleton`.
