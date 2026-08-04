import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { DURATION, EASE, STAGGER } from "./tokens";
import { useMotionPreference } from "./MotionProvider";

/**
 * AI interaction motion — Phase 11.
 *
 * The cyan `--ai` channel is reserved for model output (§0 three-channel law),
 * so every animation here uses it and nothing else does.
 */

/* ───────────────────────── thinking / reasoning ──────────────────── */

const DEFAULT_THINKING_STAGES = [
  "Reading telemetry",
  "Correlating traces",
  "Ranking hypotheses",
  "Drafting answer",
];

/**
 * ThinkingIndicator — what the model is doing right now.
 *
 * Rotating stage labels beat a static "Thinking…" because they set expectations
 * for a multi-second wait. Stages advance on a timer only while `active`; the
 * copy is descriptive of the pipeline, not a fake progress bar.
 */
export function ThinkingIndicator({
  active = true,
  stages = DEFAULT_THINKING_STAGES,
  interval = 1600,
  className,
}: {
  active?: boolean;
  stages?: readonly string[];
  interval?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const { reduced } = useMotionPreference();

  useEffect(() => {
    if (!active || stages.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % stages.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [active, interval, stages.length]);

  if (!active) return null;

  return (
    <div
      className={cn("flex items-center gap-2.5 text-[13px] text-[var(--ai)]", className)}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex size-5 items-center justify-center">
        {!reduced && (
          <motion.span
            className="absolute inset-0 rounded-full bg-[var(--ai-bg)]"
            animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
            transition={{ duration: 1.8, ease: EASE.standard, repeat: Infinity }}
          />
        )}
        <Sparkles className="relative size-3.5" aria-hidden="true" />
      </span>
      <motion.span
        key={stages[index]}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION.base, ease: EASE.standard }}
        className="font-medium"
      >
        {stages[index]}
      </motion.span>
      <TypingDots />
    </div>
  );
}

/** TypingDots — three dots, staggered opacity. The classic, done cheaply. */
export function TypingDots({ className, tone = "ai" }: { className?: string; tone?: "ai" | "text" }) {
  const { reduced } = useMotionPreference();
  const colour = tone === "ai" ? "bg-[var(--ai)]" : "bg-[var(--text3)]";

  if (reduced) {
    return (
      <span className={cn("inline-flex items-center gap-1", className)} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("size-1 rounded-full opacity-60", colour)} />
        ))}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={cn("size-1 rounded-full", colour)}
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -1.5, 0] }}
          transition={{ duration: 1.1, ease: EASE.inOut, repeat: Infinity, delay: i * 0.14 }}
        />
      ))}
    </span>
  );
}

/**
 * ReasoningPulse — a soft cyan bar for the collapsed "reasoning" affordance.
 * Communicates ongoing work without competing with the answer text.
 */
export function ReasoningPulse({ className }: { className?: string }) {
  const { reduced } = useMotionPreference();
  return (
    <div
      className={cn(
        "relative h-[3px] w-full overflow-hidden rounded-full bg-[var(--ai-bg)]",
        className,
      )}
      aria-hidden="true"
    >
      {!reduced && (
        <motion.span
          className="absolute inset-y-0 w-1/3 rounded-full bg-[var(--ai)]/70"
          animate={{ x: ["-110%", "330%"] }}
          transition={{ duration: 1.5, ease: EASE.inOut, repeat: Infinity }}
        />
      )}
    </div>
  );
}

/* ───────────────────────── token streaming ──────────────────────── */

/**
 * StreamingText — renders streamed model output so each new chunk fades in.
 *
 * Only the newly appended slice is wrapped in a motion element; already-shown
 * text stays as a plain text node. Wrapping every word (or re-animating the
 * whole string on each token) is what makes naive streaming UIs stutter — a
 * 2,000-word answer would create 2,000 animating nodes.
 */
export function StreamingText({
  text,
  streaming = false,
  className,
}: {
  text: string;
  streaming?: boolean;
  className?: string;
}) {
  const shown = useRef("");
  const { reduced } = useMotionPreference();

  // Continuation of the same message → animate only the new tail.
  const isContinuation = text.startsWith(shown.current) && shown.current.length > 0;
  const splitAt = isContinuation ? shown.current.length : 0;

  useEffect(() => {
    shown.current = text;
  }, [text]);

  const head = text.slice(0, splitAt);
  const tail = text.slice(splitAt);

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {head}
      {tail &&
        (reduced ? (
          tail
        ) : (
          <motion.span
            key={splitAt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: DURATION.base, ease: EASE.standard }}
          >
            {tail}
          </motion.span>
        ))}
      {streaming && (
        <motion.span
          aria-hidden="true"
          className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-[var(--ai)]"
          animate={reduced ? undefined : { opacity: [1, 0, 1] }}
          transition={{ duration: 1, ease: "linear", repeat: Infinity }}
        />
      )}
    </span>
  );
}

/* ─────────────────────────── message reveal ─────────────────────── */

/** MessageReveal — entrance for a chat turn. User turns come from the right. */
export function MessageReveal({
  children,
  role = "assistant",
  className,
}: {
  children: ReactNode;
  role?: "assistant" | "user" | "system";
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, x: role === "user" ? 6 : 0 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: DURATION.base, ease: EASE.standard }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Suggested prompt chips — staggered in, hover-lift on each. */
export function SuggestedPrompts({
  prompts,
  onSelect,
  className,
}: {
  prompts: readonly string[];
  onSelect: (prompt: string) => void;
  className?: string;
}) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ initial: {}, animate: { transition: { staggerChildren: STAGGER.loose } } }}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {prompts.map((prompt) => (
        <motion.button
          key={prompt}
          type="button"
          onClick={() => onSelect(prompt)}
          variants={{
            initial: { opacity: 0, y: 6 },
            animate: {
              opacity: 1,
              y: 0,
              transition: { duration: DURATION.base, ease: EASE.standard },
            },
          }}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-full border border-[var(--ai)]/30 bg-[var(--ai-bg)] px-3 py-1.5 text-[12px] font-medium text-[var(--ai)] transition-colors duration-150 hover:bg-[var(--ai)]/15"
        >
          {prompt}
        </motion.button>
      ))}
    </motion.div>
  );
}

/** Code block / chart fade-in inside an AI answer. */
export function AiBlockReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.slow, ease: EASE.standard, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ───────────────────────────── auto scroll ─────────────────────── */

/**
 * useAutoScroll — keeps a streaming transcript pinned to the bottom, but yields
 * the moment the user scrolls up to read history (and re-pins when they return).
 *
 * The scroll listener is passive and only reads `scrollTop`/`scrollHeight`, so
 * it can't trigger layout thrash (Phase 9: no heavy scroll listeners).
 */
export function useAutoScroll(dependency: unknown, threshold = 64) {
  const ref = useRef<HTMLDivElement | null>(null);
  const pinned = useRef(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const onScroll = () => {
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
      pinned.current = distance <= threshold;
    };

    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [threshold]);

  useEffect(() => {
    const node = ref.current;
    if (!node || !pinned.current) return;
    // rAF so we measure after the new content has been laid out.
    const frame = requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [dependency]);

  return ref;
}
