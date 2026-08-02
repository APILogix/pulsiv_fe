# Motion Architecture

Everything animated in the app comes from `@/shared/motion` (behaviour) or
`@/shared/skeletons` (loading shapes). Import from the barrel, never from a file inside it,
so the public surface stays reviewable.

## Layers

```
src/shared/motion/
  tokens.ts            durations, easings, springs, stagger, variants  ← single source
  MotionProvider.tsx   one MotionConfig + resolved prefers-reduced-motion
  PageTransition.tsx   route entrance, ProgressiveReveal / RevealItem
  LoadingBoundary.tsx  RouteBoundary (keyed Suspense), AnimatedRoute, LoadingBoundary
  useWorkflow.ts       multi-step CRUD state machine
  WorkflowProgress.tsx step list, SuccessBurst, WorkflowOverlay, WorkflowInline
  workflow-presets.ts  canonical step copy per operation
  AnimatedEmptyState   12 illustrations + copy + CTA
  interactions.tsx     button, card, table row, list, tabs, checkbox, radio,
                       progress, field feedback, collapse, hover lift
  data-motion.tsx      CounterAnimation, chart line/area/bar, AnimatedSkeleton, LiveValue
  overlays.tsx         AnimatedModal, AnimatedDrawer, MotionSurface (focus-trapped)
  ai.tsx               ThinkingIndicator, TypingDots, ReasoningPulse, StreamingText,
                       MessageReveal, SuggestedPrompts, AiBlockReveal, useAutoScroll
  scroll.tsx           useScrollRestoration, SectionReveal, ScrollToTop, StickyHeader

src/shared/skeletons/
  primitives.tsx       Block, SurfaceCard, page header/KPI/chart/table/form/people/log/detail
  pages.tsx            27 page-shaped skeletons
  RouteSkeleton.tsx    URL → skeleton resolver (~90 patterns)
```

## The rules encoded in the tokens

| Token | Value | Why |
|---|---|---|
| `DURATION.fast` | 150ms | hovers, colour fades, tooltips |
| `DURATION.base` | 200ms | the default — page transitions, dropdowns, dialogs |
| `DURATION.slow` | 250ms | panel reveals, toasts |
| `DURATION.workflow` | 400ms | workflow step commits — informational, not decorative |
| `EASE.standard` | `[0.22, 1, 0.36, 1]` | ease-out-expo: fast start, soft landing. Reads as "already done" |
| `EASE.exit` | `[0.4, 0, 1, 1]` | leaving never lingers |
| `STAGGER.base` | 30ms | a 10-item grid finishes in ~500ms with item 1 visible next frame |

Only `opacity` and `transform` are animated. The single documented exception is
`AnimatedCollapse` (`height: auto`), scoped to small panels.

## How route loading works

The important mechanic, because it is not obvious:

React Router v7 wraps navigation in `startTransition`. During a transition React **keeps the
old UI on screen** rather than showing a Suspense fallback. With ~150 lazy route elements
that meant clicking a sidebar item produced no feedback at all until the chunk arrived.

`RouteBoundary` fixes it by **keying** the Suspense boundary:

```tsx
<Suspense key={key} fallback={<RouteSkeleton padded={padded} />}>
```

Changing the key unmounts the old subtree, so the fallback paints on the next frame.
Two scopes control how aggressively that happens:

- **`scope="module"`** — key is the top-level module (`/alerts`) or the specific project shell
  (`/acme/p/prj_1`). Used once, in `AppLayout`. Switching modules shows that module's skeleton;
  navigating *inside* a module leaves its layout and query subscriptions mounted.
- **`scope="page"`** — key is the full pathname. Used in `ModuleLayout`, `SettingsLayout` and
  `ProjectShellPage`, so every page swap gets its own skeleton.

`RouteSkeleton` picks the shape from the URL alone — no route module, no data — which is what
lets it render before the destination chunk exists.

Page transitions are **entrance-only**. An `AnimatePresence mode="wait"` crossfade would hold
the incoming page back until the outgoing one finished, adding latency to every click. The new
page fades and rises 6px over the skeleton it replaces.

## Workflow progress contract

`useWorkflow(steps, { pace, successHold })`:

1. Intermediate steps advance on a timer while the request is in flight.
2. **The final step never completes until the promise resolves.** No step claims work that
   hasn't happened.
3. If the API is faster than the pacing, remaining steps snap to done — the user is never
   stalled to finish an animation.
4. On failure, the machine freezes on the step that was in flight and shows the error there,
   so the user can see how far it got.
5. Total added latency after resolution is `successHold` (450ms), just enough to read the
   success mark before navigation.

`run()` never throws; inspect `result.ok`. That avoids unhandled rejections when the overlay
is dismissed mid-flight.

## Reduced motion

`MotionConfig reducedMotion="user"` disables transform and layout animation app-wide while
keeping opacity, so nothing ever appears or disappears without a cue. CSS loops are switched
off in the `prefers-reduced-motion` block in `src/app/index.css`. Imperative loops (canvas,
rAF, autoscroll) branch on `useMotionPreference()`.

## Adding motion to a new page

1. Loading: nothing to do — the layout boundary already resolves a skeleton. If the page has a
   genuinely new shape, add a skeleton to `pages.tsx` and one line to `RULES` in
   `RouteSkeleton.tsx`.
2. Empty: `<AnimatedEmptyState illustration="…" title description action />`. Always pass an action.
3. Async action that takes >1s and does more than one thing: `useWorkflow` + `WorkflowOverlay`
   (navigates away) or `WorkflowInline` (stays put).
4. Numbers: `CounterAnimation`. Charts: `AnimatedLine` / `AnimatedBar` / `ChartAnimation`.
5. Everything else: reach for `interactions.tsx` before writing a new `motion.*` element, and
   if you must write one, take its duration and easing from `tokens.ts`.
