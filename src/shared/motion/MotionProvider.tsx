import { useMemo, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { DURATION, EASE } from "./tokens";
import { MotionPreferenceProvider, useMotionPreference, useVariants } from "./MotionPreferenceContext";

export { useMotionPreference, useVariants, MotionPreferenceProvider };

export function MotionProvider({ children }: { children: ReactNode }) {
  const transition = useMemo(
    () => ({ duration: DURATION.base, ease: EASE.standard }),
    []
  );

  return (
    <MotionPreferenceProvider>
      <MotionConfig
        reducedMotion="user"
        transition={transition}
      >
        {children}
      </MotionConfig>
    </MotionPreferenceProvider>
  );
}
