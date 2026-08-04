/**
 * Motion tokens — the single source of truth for every animation in the app.
 *
 * Rules encoded here (planning/uiuxprompt.md Phase 14/15):
 *  - Only GPU-composited properties are animated: `opacity` and `transform`.
 *  - Interaction/transition durations stay in the 120–250ms band. Anything
 *    longer is reserved for multi-step workflow progress, where the animation
 *    *is* the information.
 *  - Nothing here delays navigation. Transitions overlap real work.
 */

/** Durations in seconds (framer-motion) — keep these in the 0.12–0.25 band. */
export const DURATION = {
  /** 100ms — instant feedback: taps, checkbox ticks. */
  instant: 0.1,
  /** 150ms — hovers, colour/opacity fades, tooltips. */
  fast: 0.15,
  /** 200ms — the default. Page transitions, dropdowns, dialogs. */
  base: 0.2,
  /** 250ms — panel/accordion reveals, toasts. */
  slow: 0.25,
  /** 400ms — workflow step commits, success marks. Informational, not decorative. */
  workflow: 0.4,
} as const;

/** Durations in milliseconds — for setTimeout / CSS interop. */
export const DURATION_MS = {
  instant: 100,
  fast: 150,
  base: 200,
  slow: 250,
  workflow: 400,
} as const;

/**
 * Easings. `standard` is an ease-out-expo variant: fast start, soft landing —
 * the curve that reads as "already done" and is why Linear/Raycast feel quick.
 *
 * Typed as mutable 4-tuples rather than `as const`, because framer-motion's
 * bezier definition is a plain `[number, number, number, number]`; a readonly
 * tuple is not assignable to it.
 */
type Bezier = [number, number, number, number];

export const EASE: { standard: Bezier; exit: Bezier; inOut: Bezier } = {
  /** Default for entrances and movement. */
  standard: [0.22, 1, 0.36, 1],
  /** Exits — slightly more linear so leaving never lingers. */
  exit: [0.4, 0, 1, 1],
  /** Symmetric, for looping/ambient motion. */
  inOut: [0.4, 0, 0.2, 1],
};

/** Spring presets. Used only where a spring communicates physicality. */
export const SPRING = {
  /** Menus, popovers — snappy, minimal overshoot. */
  snappy: { type: "spring", stiffness: 520, damping: 34, mass: 0.7 } as const,
  /** Switches, knobs — a touch of overshoot. */
  bouncy: { type: "spring", stiffness: 620, damping: 26, mass: 0.6 } as const,
  /** Layout/indicator slides (active tab, sidebar indicator). */
  layout: { type: "spring", stiffness: 420, damping: 38, mass: 0.8 } as const,
} as const;

/** Stagger steps for lists/grids. Kept tiny so a 12-card grid still lands <200ms. */
export const STAGGER = {
  tight: 0.018,
  base: 0.03,
  loose: 0.05,
} as const;

export const TRANSITION = {
  fast: { duration: DURATION.fast, ease: EASE.standard },
  base: { duration: DURATION.base, ease: EASE.standard },
  slow: { duration: DURATION.slow, ease: EASE.standard },
  exit: { duration: DURATION.fast, ease: EASE.exit },
} as const;

/* ────────────────────────────── variants ────────────────────────────── */

/** Page transition: old page fades out, new page fades + rises 6px. */
export const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: TRANSITION.base },
  exit: { opacity: 0, transition: { duration: DURATION.instant, ease: EASE.exit } },
} as const;

/** Progressive content reveal inside a page (header → cards → table). */
export const revealVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: TRANSITION.base },
} as const;

/** Container that staggers its children. */
export const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: STAGGER.base } },
} as const;

/** Fade only — safest fallback, also the reduced-motion substitute. */
export const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: TRANSITION.fast },
  exit: { opacity: 0, transition: TRANSITION.exit },
} as const;

/** Scale+fade for overlays (dialogs, command palette, dropdowns). */
export const overlayVariants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1, transition: TRANSITION.base },
  exit: { opacity: 0, scale: 0.98, transition: TRANSITION.exit },
} as const;

/** Slide-in from bottom — toasts, inline banners. */
export const slideUpVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: TRANSITION.slow },
  exit: { opacity: 0, y: 6, transition: TRANSITION.exit },
} as const;

/** Reduced-motion replacement: no movement, instant-ish opacity only. */
export const reducedVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DURATION.instant } },
  exit: { opacity: 0, transition: { duration: DURATION.instant } },
} as const;
