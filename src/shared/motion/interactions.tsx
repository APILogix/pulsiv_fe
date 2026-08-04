import type { ComponentProps, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { VariantProps } from "class-variance-authority";
import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { DURATION, EASE, SPRING } from "./tokens";

/**
 * Micro-interaction library — Phase 8.
 *
 * Ground rules applied throughout:
 *  - transform/opacity only, so every interaction stays on the compositor;
 *  - 100–200ms, because feedback that outlives the gesture reads as lag;
 *  - `whileTap` before `whileHover` in priority, since touch users only get tap;
 *  - nothing loops. Looping motion is reserved for genuine in-flight state.
 */

/* ─────────────────────────────── button ────────────────────────────── */

type ButtonMotionProps = Omit<ComponentProps<typeof motion.button>, "children"> &
  VariantProps<typeof buttonVariants> & {
    children?: ReactNode;
    /** In-flight state: swaps the label for a spinner and blocks input. */
    loading?: boolean;
    /** Post-success state: plays a check + ripple, then reverts. */
    success?: boolean;
    loadingLabel?: string;
  };

/**
 * AnimatedButton — the Button primitive plus press physics and async state.
 *
 * Reuses `buttonVariants` so it is visually identical to every other button in
 * the app; only the interaction layer is added. Keeps its own width while
 * loading so the layout never jumps when the label is swapped.
 */
export function AnimatedButton({
  className,
  variant = "default",
  size = "default",
  loading = false,
  success = false,
  loadingLabel,
  children,
  disabled,
  ...props
}: ButtonMotionProps) {
  return (
    <motion.button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      disabled={disabled || loading}
      className={cn(
        buttonVariants({ variant, size }),
        "relative overflow-hidden",
        className,
      )}
      whileHover={disabled || loading ? undefined : { y: -1 }}
      whileTap={disabled || loading ? undefined : { scale: 0.975, y: 0 }}
      transition={{ duration: DURATION.fast, ease: EASE.standard }}
      {...props}
    >
      {/* success ripple — one expanding disc, removed as soon as it lands */}
      <AnimatePresence>
        {success && (
          <motion.span
            key="ripple"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[var(--green)]/20"
            initial={{ opacity: 0.9, scale: 0.4 }}
            animate={{ opacity: 0, scale: 1.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE.standard }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.span
            key="loading"
            className="inline-flex items-center gap-1.5"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: DURATION.fast, ease: EASE.standard }}
          >
            <Loader2 className="animate-spin" aria-hidden="true" />
            {loadingLabel ?? children}
          </motion.span>
        ) : success ? (
          <motion.span
            key="success"
            className="inline-flex items-center gap-1.5"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={SPRING.bouncy}
          >
            <Check aria-hidden="true" />
            {children}
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            className="inline-flex items-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.instant }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ──────────────────────────────── card ─────────────────────────────── */

/**
 * AnimatedCard — hover elevation for cards that are actually clickable.
 * `tone="ai"` adds the cyan model-channel breathing glow (§0 three-channel law).
 */
export function AnimatedCard({
  children,
  className,
  interactive = true,
  tone = "default",
  delay = 0,
  ...props
}: ComponentProps<typeof motion.div> & {
  interactive?: boolean;
  tone?: "default" | "ai" | "brand";
  delay?: number;
}) {
  return (
    <motion.div
      data-slot="card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE.standard, delay }}
      whileHover={
        interactive
          ? {
              y: -2,
              transition: { duration: DURATION.fast, ease: EASE.standard },
            }
          : undefined
      }
      className={cn(
        "group/card relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--bg1)] text-[13px] text-[var(--text)]",
        tone === "ai"
          ? "border-[var(--ai)]/25"
          : tone === "brand"
            ? "border-[var(--brand)]/25"
            : "border-[var(--border)]",
        interactive &&
          "transition-[border-color,box-shadow] duration-150 ease-out hover:border-[var(--border2)] hover:shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--brand)_28%,transparent)]",
        className,
      )}
      {...props}
    >
      {tone === "ai" && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 100% 0%, var(--ai-bg) 0%, transparent 45%)",
          }}
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 4, ease: EASE.inOut, repeat: Infinity }}
        />
      )}
      {children as any}
    </motion.div>
  );
}

/* ─────────────────────────────── table ────────────────────────────── */

/**
 * AnimatedTableRow — entrance stagger plus selection feedback.
 *
 * Rows animate `opacity` only (no y): shifting rows in a dense table reads as
 * jitter, and a table that settles is more legible than one that slides.
 */
export function AnimatedTableRow({
  children,
  index = 0,
  selected = false,
  className,
  ...props
}: ComponentProps<typeof motion.tr> & { index?: number; selected?: boolean }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: DURATION.fast,
        ease: EASE.standard,
        // Cap the stagger so row 200 doesn't wait 4 seconds.
        delay: Math.min(index, 14) * 0.014,
      }}
      data-selected={selected || undefined}
      className={cn(
        "border-b border-[var(--border)] transition-colors duration-150 last:border-b-0 hover:bg-[var(--bg2)]/60",
        selected && "bg-[var(--brand-bg)]",
        className,
      )}
      {...props}
    >
      {children}
    </motion.tr>
  );
}

/** Staggered list container for card grids and feeds. */
export function AnimatedList({
  children,
  className,
  stagger = 0.03,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ initial: {}, animate: { transition: { staggerChildren: stagger } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Item for `AnimatedList`. */
export function AnimatedListItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 8 },
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

/* ──────────────────────────────── tabs ───────────────────────────── */

/**
 * AnimatedTabIndicator — a shared-layout underline.
 *
 * Drop inside each tab trigger and give every instance of a tab set the same
 * `groupId`; framer-motion then slides the single indicator between them via
 * FLIP, which is transform-only.
 */
export function AnimatedTabIndicator({
  active,
  groupId,
  className,
}: {
  active: boolean;
  groupId: string;
  className?: string;
}) {
  if (!active) return null;
  return (
    <motion.span
      layoutId={`tab-indicator-${groupId}`}
      transition={SPRING.layout}
      className={cn(
        "absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-[var(--brand)]",
        className,
      )}
      aria-hidden="true"
    />
  );
}

/* ───────────────────────────── checkbox ──────────────────────────── */

/** AnimatedCheckbox — drawn tick, spring box. Fully keyboard accessible. */
export function AnimatedCheckbox({
  checked,
  onCheckedChange,
  label,
  disabled,
  className,
  indeterminate = false,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
  indeterminate?: boolean;
}) {
  return (
    <label
      className={cn(
        "group/checkbox inline-flex items-center gap-2 text-[13px] text-[var(--text2)]",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        aria-checked={indeterminate ? "mixed" : checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      <motion.span
        aria-hidden="true"
        className={cn(
          "relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors duration-150 peer-focus-visible:ring-3 peer-focus-visible:ring-[var(--brand-bg)]",
          checked || indeterminate
            ? "border-[var(--brand)] bg-[var(--brand)]"
            : "border-[var(--border2)] bg-transparent group-hover/checkbox:border-[var(--text3)]",
        )}
        animate={{ scale: checked ? [1, 0.88, 1] : 1 }}
        transition={{ duration: DURATION.base, ease: EASE.standard }}
      >
        {indeterminate ? (
          <motion.span
            className="h-[2px] w-2 rounded-full bg-[var(--brand-fg)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: DURATION.fast, ease: EASE.standard }}
          />
        ) : (
          <svg viewBox="0 0 16 16" className="size-3">
            <motion.path
              d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
              fill="none"
              stroke="var(--brand-fg)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
              transition={{ duration: DURATION.base, ease: EASE.standard }}
            />
          </svg>
        )}
      </motion.span>
      {label}
    </label>
  );
}

/* ───────────────────────────── radio ────────────────────────────── */

/** AnimatedRadio — smooth fill, matched to the checkbox rhythm. */
export function AnimatedRadio({
  checked,
  onSelect,
  label,
  name,
  disabled,
  className,
}: {
  checked: boolean;
  onSelect: () => void;
  label?: ReactNode;
  name: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "group/radio inline-flex items-center gap-2 text-[13px] text-[var(--text2)]",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
      />
      <span
        aria-hidden="true"
        className={cn(
          "relative flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 peer-focus-visible:ring-3 peer-focus-visible:ring-[var(--brand-bg)]",
          checked
            ? "border-[var(--brand)]"
            : "border-[var(--border2)] group-hover/radio:border-[var(--text3)]",
        )}
      >
        <motion.span
          className="size-2 rounded-full bg-[var(--brand)]"
          initial={false}
          animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={SPRING.bouncy}
        />
      </span>
      {label}
    </label>
  );
}

/* ──────────────────────────── progress ─────────────────────────── */

/** AnimatedProgress — scaleX fill (never animates `width`). */
export function AnimatedProgress({
  value,
  className,
  tone = "brand",
  label,
}: {
  /** 0–100. */
  value: number;
  className?: string;
  tone?: "brand" | "ai" | "green" | "amber" | "red";
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const colour =
    tone === "ai"
      ? "var(--ai)"
      : tone === "green"
        ? "var(--green)"
        : tone === "amber"
          ? "var(--amber)"
          : tone === "red"
            ? "var(--red)"
            : "var(--brand)";

  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg3)]", className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <motion.div
        className="h-full w-full rounded-full"
        style={{ background: colour, transformOrigin: "left center" }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: clamped / 100 }}
        transition={{ duration: 0.5, ease: EASE.standard }}
      />
    </div>
  );
}

/* ───────────────────────── form field feedback ──────────────────── */

/**
 * FieldFeedback — validation motion for form fields (Phase 8 "forms").
 *
 * Errors shake once (5px, 240ms). Success shows a green ring that fades out —
 * implemented as an overlay element animating `opacity` rather than an animated
 * `boxShadow`, because framer-motion can't interpolate `var(--token)` colour
 * strings and a hard-coded colour would break the second theme.
 * Neither state loops.
 */
export function FieldFeedback({
  state,
  message,
  children,
  className,
}: {
  state: "idle" | "error" | "success";
  message?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <motion.div
        className="relative rounded-[var(--radius)]"
        animate={state === "error" ? { x: [0, -5, 4, -3, 0] } : { x: 0 }}
        transition={{ duration: 0.24, ease: EASE.standard }}
      >
        {children}
        <AnimatePresence>
          {state === "success" && (
            <motion.span
              key="success-ring"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[var(--radius)] ring-3 ring-[var(--green-bg)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: EASE.standard }}
            />
          )}
        </AnimatePresence>
      </motion.div>
      <AnimatePresence initial={false}>
        {message && (
          <motion.p
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: DURATION.fast, ease: EASE.standard }}
            className={cn(
              "overflow-hidden text-[12px]",
              state === "error" ? "text-[var(--red)]" : "text-[var(--green)]",
            )}
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────────────────────────── accordion ───────────────────────── */

/**
 * AnimatedAccordion — height animation done the cheap way.
 *
 * `height: auto` is one of the few non-composited properties worth animating:
 * the alternative (max-height guessing) causes visible clipping. Scoped to
 * small panels and paired with opacity so it stays under 250ms.
 */
export function AnimatedCollapse({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: DURATION.slow, ease: EASE.standard }}
          className={cn("overflow-hidden", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────── hover lift ──────────────────────── */

/** Generic hover-lift wrapper for anything clickable that isn't a card. */
export function HoverLift({
  children,
  className,
  distance = 1,
  scale = 1,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
  scale?: number;
}) {
  return (
    <motion.div
      whileHover={{ y: -distance, scale }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: DURATION.fast, ease: EASE.standard }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
