import { createContext, useContext, type ReactNode } from "react";
import { MotionConfig, useReducedMotion } from "framer-motion";

import { DURATION, EASE } from "./tokens";

/**
 * MotionProvider — Phase 14 (motion architecture) + Phase 12 (accessibility).
 *
 * Two jobs:
 *  1. Install one app-wide `MotionConfig` so every `motion.*` element inherits
 *     the same default transition. No component re-declares easing curves.
 *  2. Honour `prefers-reduced-motion` globally. `reducedMotion="user"` makes
 *     framer-motion drop transform/layout animation for those users while
 *     keeping opacity, so nothing ever disappears without a cue.
 *
 * Consumers read `useMotionPreference()` to branch imperative work (canvas
 * loops, rAF, autoscroll) that framer-motion cannot switch off for them.
 */

interface MotionPreference {
  /** True when the OS asks for reduced motion. */
  reduced: boolean;
  /** Convenience inverse — `enabled` reads better at call sites. */
  enabled: boolean;
}

const MotionPreferenceContext = createContext<MotionPreference>({
  reduced: false,
  enabled: true,
});

export function MotionProvider({ children }: { children: ReactNode }) {
  // framer-motion returns null before the media query resolves; treat as false.
  const reduced = useReducedMotion() ?? false;

  return (
    <MotionPreferenceContext.Provider value={{ reduced, enabled: !reduced }}>
      <MotionConfig
        reducedMotion="user"
        transition={{ duration: DURATION.base, ease: EASE.standard }}
      >
        {children}
      </MotionConfig>
    </MotionPreferenceContext.Provider>
  );
}

/** Read the resolved motion preference. Safe outside the provider (defaults on). */
export function useMotionPreference() {
  return useContext(MotionPreferenceContext);
}

/**
 * Pick between a full variant set and its reduced-motion counterpart.
 * Used where movement itself carries meaning and a fade is the right substitute.
 */
export function useVariants<T>(full: T, reducedFallback: T): T {
  const { reduced } = useMotionPreference();
  return reduced ? reducedFallback : full;
}
