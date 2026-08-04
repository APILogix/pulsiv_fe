import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { DURATION, EASE, STAGGER } from "./tokens";

/**
 * PageTransition — Phase 7.
 *
 * Entrance-only by design. An `AnimatePresence mode="wait"` crossfade would
 * hold the incoming page back until the outgoing one finished animating, which
 * adds latency to every click — the exact opposite of the goal. Instead the new
 * page fades and rises over the skeleton it replaces, so nothing ever waits on
 * an animation and there is no white flash between routes.
 *
 * `transitionKey` should be whatever identifies "a new page" at this level of
 * the tree (usually the pathname). Changing it replays the entrance.
 */
export function PageTransition({
  children,
  transitionKey,
  className,
}: {
  children: ReactNode;
  transitionKey: string;
  className?: string;
}) {
  return (
    <motion.div
      key={transitionKey}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE.standard }}
      // framer-motion sets and clears `will-change` itself, so we don't pin a
      // compositor layer for the lifetime of the page.
      className={cn("min-h-0 w-full", className)}
    >
      {children}
    </motion.div>
  );
}

/**
 * ProgressiveReveal — Phase 10 ("content appears progressively").
 *
 * Wrap a page section; direct `RevealItem` children fade up in sequence. The
 * stagger is 30ms, so even a 10-item grid finishes inside ~500ms and the first
 * item is visible on the frame after mount.
 */
export function ProgressiveReveal({
  children,
  className,
  stagger = STAGGER.base,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** A single item inside `ProgressiveReveal`. */
export function RevealItem({
  children,
  className,
  distance = 8,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
}) {
  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: distance },
        animate: {
          opacity: 1,
          y: 0,
          transition: { duration: DURATION.base, ease: EASE.standard },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
