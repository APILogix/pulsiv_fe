import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface MotionPreference {
  /** True when the OS asks for reduced motion. */
  reduced: boolean;
  /** Convenience inverse — `enabled` reads better at call sites. */
  enabled: boolean;
}

export const MotionPreferenceContext = createContext<MotionPreference>({
  reduced: false,
  enabled: true,
});

export function MotionPreferenceProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const value = useMemo<MotionPreference>(
    () => ({
      reduced,
      enabled: !reduced,
    }),
    [reduced]
  );

  return (
    <MotionPreferenceContext.Provider value={value}>
      {children}
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

