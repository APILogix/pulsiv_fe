import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion";

import { cn } from "@/lib/utils";
import { DURATION, EASE } from "./tokens";
import { useMotionPreference } from "./MotionProvider";

/**
 * Data-motion primitives — Phase 8 (counters, charts, progress) and Phase 10
 * (data streams in rather than blocking).
 */

/* ─────────────────────────── counter ────────────────────────── */

const defaultFormat = (value: number) => Math.round(value).toLocaleString();

/**
 * CounterAnimation — count-up for KPI numbers.
 *
 * Drives a `MotionValue` and hands it to `motion.span` as a child, so the text
 * node is written directly by framer-motion. That means zero React re-renders
 * per frame — the naive `setState` on every tick version costs ~60 renders per
 * second per counter, which is what makes dashboards with 8 KPIs feel heavy.
 *
 * Animates from the previous value on updates, so a live metric ticks rather
 * than restarting from zero.
 */
export function CounterAnimation({
  value,
  duration = 0.7,
  format = defaultFormat,
  className,
  from,
}: {
  value: number;
  duration?: number;
  format?: (value: number) => string;
  className?: string;
  /** Starting value for the first run. Defaults to 0. */
  from?: number;
}) {
  const { reduced } = useMotionPreference();
  const count = useMotionValue(from ?? 0);
  const text = useTransform(count, (latest) => format(latest));
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (reduced) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, {
      duration: isFirstRun.current ? duration : Math.min(duration, 0.45),
      ease: EASE.standard,
    });
    isFirstRun.current = false;
    return () => controls.stop();
  }, [value, duration, reduced, count]);

  return (
    <motion.span className={cn("tabular-nums", className)} aria-label={format(value)}>
      {text}
    </motion.span>
  );
}

/* ──────────────────────────── charts ─────────────────────────── */

/**
 * AnimatedLine — draws an SVG line once on mount and re-draws when the series
 * changes. Requires `pathLength` support, which is why the `d` string can stay
 * arbitrary: framer normalises the length to 0–1.
 */
export function AnimatedLine({
  d,
  stroke = "var(--brand)",
  strokeWidth = 2,
  duration = 0.6,
  delay = 0,
  seriesKey,
  className,
}: {
  d: string;
  stroke?: string;
  strokeWidth?: number;
  duration?: number;
  delay?: number;
  /** Change this to replay the draw when the underlying data changes. */
  seriesKey?: string;
  className?: string;
}) {
  return (
    <motion.path
      key={seriesKey}
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration, ease: EASE.standard, delay }}
    />
  );
}

/** AnimatedArea — the fill under an `AnimatedLine`. Fades, never draws. */
export function AnimatedArea({
  d,
  fill = "var(--brand)",
  fillOpacity = 0.14,
  delay = 0.15,
  seriesKey,
}: {
  d: string;
  fill?: string;
  fillOpacity?: number;
  delay?: number;
  seriesKey?: string;
}) {
  return (
    <motion.path
      key={seriesKey}
      d={d}
      fill={fill}
      initial={{ opacity: 0 }}
      animate={{ opacity: fillOpacity }}
      transition={{ duration: DURATION.slow, ease: EASE.standard, delay }}
    />
  );
}

/**
 * AnimatedBar — grows from the baseline using `scaleY`, not `height`, so the
 * browser never re-lays-out the chart mid-animation.
 * The parent `<g>`/`<svg>` needs no changes; `transform-box: fill-box` and a
 * bottom origin are set inline.
 */
export function AnimatedBar({
  x,
  y,
  width,
  height,
  fill = "var(--brand)",
  index = 0,
  rx = 2,
  className,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  index?: number;
  rx?: number;
  className?: string;
}) {
  return (
    <motion.rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={rx}
      fill={fill}
      className={className}
      style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}
      initial={{ scaleY: 0, opacity: 0 }}
      animate={{ scaleY: 1, opacity: 1 }}
      transition={{
        duration: DURATION.workflow,
        ease: EASE.standard,
        delay: Math.min(index, 20) * 0.022,
      }}
    />
  );
}

/**
 * ChartAnimation — wrapper that replays its children's entrance when the data
 * identity changes, so a time-range switch animates instead of snapping.
 */
export function ChartAnimation({
  children,
  dataKey,
  className,
}: {
  children: ReactNode;
  /** Identity of the current dataset (range + series). */
  dataKey: string;
  className?: string;
}) {
  return (
    <motion.div
      key={dataKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.base, ease: EASE.standard }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ───────────────────── skeleton → content handoff ──────────────── */

/**
 * AnimatedSkeleton — Phase 10's core move.
 *
 * Renders the skeleton while loading and crossfades to real content when it
 * arrives. The exit is deliberately near-instant (100ms) and the entrance short
 * (150ms), so the handoff reads as the data "filling in" rather than as two
 * separate screens.
 */
export function AnimatedSkeleton({
  loading,
  skeleton,
  children,
  className,
}: {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.instant, ease: EASE.exit }}
          >
            {skeleton}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.fast, ease: EASE.standard }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * LiveValue — flashes a highlight behind a value when it changes, for streaming
 * metrics. Colour-only feedback (no movement) so live tables stay readable.
 *
 * The flash is an overlay span animating `opacity`, not an animated
 * `backgroundColor`: framer-motion can't interpolate `var(--token)` colour
 * strings, and hard-coding hex here would break the second theme. Opacity is
 * also composited, which matters when 50 rows tick at once.
 */
export function LiveValue({
  children,
  changeKey,
  tone = "brand",
  className,
}: {
  children: ReactNode;
  /** Change this when the value updates. */
  changeKey: string | number;
  tone?: "brand" | "ai" | "green" | "red";
  className?: string;
}) {
  const background =
    tone === "ai"
      ? "var(--ai-bg)"
      : tone === "green"
        ? "var(--green-bg)"
        : tone === "red"
          ? "var(--red-bg)"
          : "var(--brand-bg)";

  return (
    <span className={cn("relative inline-flex rounded-[4px] px-1 tabular-nums", className)}>
      <motion.span
        key={changeKey}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[4px]"
        style={{ background }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.7, ease: EASE.standard }}
      />
      <span className="relative">{children}</span>
    </span>
  );
}
