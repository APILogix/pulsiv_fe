import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { DURATION, EASE } from "@/shared/motion/tokens";
import { useMotionPreference } from "@/shared/motion/MotionProvider";

/**
 * AppBootstrapLoader — Phase 2.
 *
 * Shown only for a genuine cold start (document boot + auth store hydration).
 * Deliberately not a spinner and not a progress bar: a spinner conveys nothing,
 * and a progress bar would be a lie because we cannot measure hydration.
 *
 * What it does instead:
 *  - anchors the brand mark with an AI pulse, so the wait feels like the product
 *    starting rather than the page hanging;
 *  - narrates the boot with rotating stage copy, which is what turns dead time
 *    into perceived work;
 *  - holds on the final stage rather than looping, so a long boot never looks
 *    like it reset.
 *
 * Exit is owned by `AppBootstrapGate` so the loader always dissolves into the
 * dashboard instead of being cut.
 */

const BOOT_STAGES = [
  "Initializing workspace",
  "Connecting workspace",
  "Ready",
] as const;

const STAGE_INTERVAL = 250;


function BrandMark({ animate }: { animate: boolean }) {
  return (
    <div className="relative flex size-24 items-center justify-center">
      {/* AI pulse — two expanding rings, offset by half a cycle */}
      {animate && (
        <>
          <motion.span
            className="absolute size-16 rounded-full border border-[var(--ai)]/40"
            animate={{ scale: [1, 2.1], opacity: [0.5, 0] }}
            transition={{ duration: 2.4, ease: EASE.standard, repeat: Infinity }}
          />
          <motion.span
            className="absolute size-16 rounded-full border border-[var(--brand)]/40"
            animate={{ scale: [1, 2.1], opacity: [0.5, 0] }}
            transition={{ duration: 2.4, ease: EASE.standard, repeat: Infinity, delay: 1.2 }}
          />
        </>
      )}

      {/* orbit ring — a single rotating group, one composited transform */}
      <motion.div
        className="absolute size-20 rounded-full border border-dashed border-[var(--border2)]"
        animate={animate ? { rotate: 360 } : undefined}
        transition={{ duration: 12, ease: "linear", repeat: Infinity }}
      >
        <span className="absolute -top-[3px] left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-[var(--ai)]" />
        <span className="absolute -bottom-[3px] left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-[var(--brand)]" />
      </motion.div>

      {/* core mark — the one place a linear gradient is allowed (§3) */}
      <motion.div
        className="logo-gradient relative flex size-12 items-center justify-center rounded-[14px] shadow-[0_0_32px_var(--brand-glow)]"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: DURATION.slow, ease: EASE.standard }}
      >
        <motion.svg
          viewBox="0 0 24 24"
          className="size-6"
          aria-hidden="true"
          animate={animate ? { scale: [1, 1.08, 1] } : undefined}
          transition={{ duration: 2.4, ease: EASE.inOut, repeat: Infinity }}
        >
          {/* heartbeat trace — the product metaphor, drawn once then held */}
          <motion.path
            d="M2 13h4l2.5-6 3 11 3-8 2 3h5.5"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0.4 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: EASE.standard }}
          />
        </motion.svg>
      </motion.div>
    </div>
  );
}

export function AppBootstrapLoader({ message = "Loading application" }: { message?: string }) {
  const { enabled } = useMotionPreference();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (stage >= BOOT_STAGES.length - 1) return;
    const id = window.setTimeout(() => setStage((prev) => prev + 1), STAGE_INTERVAL);
    return () => window.clearTimeout(id);
  }, [stage]);

  return (
    <div
      className="app-bootstrap-loader fixed inset-0 z-[120] flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[var(--bg)] px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* ambient wash — same radial language as the app canvas (§3) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 480px at 50% 30%, var(--brand-bg) 0%, transparent 62%), radial-gradient(700px 420px at 50% 110%, var(--ai-bg) 0%, transparent 58%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-6">
        <BrandMark animate={enabled} />

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.slow, ease: EASE.standard, delay: 0.08 }}
          className="flex flex-col items-center gap-2.5"
        >
          <span className="font-[family-name:var(--display)] text-[22px] font-semibold tracking-tight text-[var(--text)]">
            Sentinel
          </span>

          {/* stage copy — fixed height so the layout never shifts between stages */}
          <div className="flex h-5 items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={BOOT_STAGES[stage]}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: DURATION.base, ease: EASE.standard }}
                className="font-[family-name:var(--mono)] text-[11px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]"
              >
                {BOOT_STAGES[stage]}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Stage pips — position, not percentage. Never claims to be progress.
              Width and opacity animate; the colour is static because
              framer-motion can't interpolate `var(--token)` colour strings. */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {BOOT_STAGES.map((label, index) => (
              <motion.span
                key={label}
                className="h-[3px] rounded-full bg-[var(--brand)]"
                animate={{
                  width: index === stage ? 18 : 6,
                  opacity: index <= stage ? 1 : 0.25,
                }}
                transition={{ duration: DURATION.base, ease: EASE.standard }}
              />
            ))}
          </div>
        </motion.div>
      </div>

      <span className="sr-only">{message}</span>
    </div>
  );
}

/**
 * AppBootstrapGate — owns the handoff.
 *
 * Keeps the loader mounted for one exit animation after the app is ready, so it
 * dissolves (fade + 1.02 scale) over the freshly-mounted dashboard rather than
 * vanishing between frames.
 */
export function AppBootstrapGate({
  visible,
  message,
  className,
}: {
  visible: boolean;
  message?: string;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="app-bootstrap"
          className={cn("fixed inset-0 z-[120]", className)}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: EASE.standard }}
        >
          <AppBootstrapLoader message={message} />
        </motion.div>
      )}
    </AnimatePresence>

  );
}
