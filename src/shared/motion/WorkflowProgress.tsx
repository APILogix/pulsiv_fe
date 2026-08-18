import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Terminal, Cpu } from "lucide-react";

import { cn } from "@/lib/utils";
import { DURATION, EASE, STAGGER } from "./tokens";
import { stepStatus, type WorkflowState, type WorkflowStepStatus } from "./useWorkflow";
import type { WorkflowStepDef } from "./workflow-presets";

/**
 * WorkflowProgress — Modern Monospace / Cybernetic Presentation Layer.
 *
 * Provides a high-tech terminal aesthetic with:
 *  - Monospace step indices and status tags ([ OK ], [ RUN ], [ -- ], [ ERR ])
 *  - High-precision dual-arc animated mono loaders with glowing cores
 *  - Live elapsed execution timer & segmented progress bar
 *  - Fluid compositor-accelerated SVG check paths & spring physics
 */

/* ────────────────────────── live elapsed timer hook ────────────────────────── */

function useElapsedTimer(startedAt: number | null, isRunning: boolean) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRunning || !startedAt) {
      if (!isRunning && startedAt) {
        setElapsed(Math.max(0, (Date.now() - startedAt) / 1000));
      }
      return;
    }

    const interval = window.setInterval(() => {
      setElapsed(Math.max(0, (Date.now() - startedAt) / 1000));
    }, 50);

    return () => window.clearInterval(interval);
  }, [startedAt, isRunning]);

  return elapsed.toFixed(1);
}

/* ───────────────────────────── mono step indicator ───────────────────────────── */

function StepIcon({ status, index }: { status: WorkflowStepStatus; index: number }) {
  const stepNum = String(index + 1).padStart(2, "0");

  if (status === "error") {
    return (
      <div className="flex size-6 shrink-0 items-center justify-center rounded-md border border-rose-500/40 bg-rose-500/15 text-rose-400 font-mono text-[10px] font-bold shadow-xs">
        <AlertTriangle className="size-3 text-rose-400" aria-hidden="true" />
      </div>
    );
  }

  if (status === "done") {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: DURATION.fast, ease: EASE.standard }}
        className="flex size-6 shrink-0 items-center justify-center rounded-md border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-xs shadow-emerald-500/10"
      >
        <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden="true">
          <motion.path
            d="M4.5 10.5 L8 14 L15.5 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.28, ease: EASE.standard }}
          />
        </svg>
      </motion.div>
    );
  }

  if (status === "active") {
    return (
      <div className="relative flex size-6 shrink-0 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10">
        {/* outer rotating cyber ring */}
        <motion.div
          className="absolute inset-0 rounded-md border border-transparent border-t-emerald-400 border-r-emerald-400/80"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.85, ease: "linear", repeat: Infinity }}
        />
        {/* inner pulsing core */}
        <motion.div
          className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
          animate={{ scale: [1, 1.25, 1], opacity: [0.9, 0.4, 0.9] }}
          transition={{ duration: 1.1, ease: EASE.inOut, repeat: Infinity }}
        />
      </div>
    );
  }

  return (
    <div className="flex size-6 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/60 font-mono text-[10px] text-zinc-500">
      {stepNum}
    </div>
  );
}

/* ────────────────────────── mono progress bar ─────────────────────────── */

function MonoProgressBar({
  current,
  total,
  isSuccess,
}: {
  current: number;
  total: number;
  isSuccess: boolean;
}) {
  const percentage = isSuccess
    ? 100
    : Math.min(95, Math.max(12, Math.round(((current + 0.5) / total) * 100)));

  return (
    <div className="space-y-1.5 font-mono text-xs">
      <div className="flex items-center justify-between text-[11px] text-zinc-400">
        <span className="flex items-center gap-1.5 tracking-wider uppercase text-zinc-300">
          <Cpu className="size-3 text-emerald-400" />
          <span>Pipeline Progress</span>
        </span>
        <span className="font-semibold text-emerald-400">
          {isSuccess ? "100%" : `${percentage}%`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/80 border border-zinc-700/50 p-px">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
          initial={{ width: "0%" }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.35, ease: EASE.standard }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────── step list ─────────────────────────────── */

export function WorkflowProgress({
  steps,
  state,
  className,
  compact = false,
}: {
  steps: readonly WorkflowStepDef[];
  state: WorkflowState;
  className?: string;
  compact?: boolean;
}) {
  return (
    <ol
      className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2", className)}
      aria-live="polite"
      aria-busy={state.status === "running"}
    >
      {steps.map((step, index) => {
        const status = stepStatus(index, state);
        const label = status === "done" && step.doneLabel ? step.doneLabel : step.label;
        const isCurrentActive = status === "active";

        return (
          <motion.li
            key={step.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: DURATION.base,
              ease: EASE.standard,
              delay: index * STAGGER.tight,
            }}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 transition-colors font-mono",
              isCurrentActive
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 shadow-xs"
                : status === "done"
                  ? "bg-zinc-900/30 border border-transparent text-zinc-300"
                  : "text-zinc-500 border border-transparent",
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <StepIcon status={status} index={index} />
              <span
                className={cn(
                  "text-[12.5px] tracking-tight truncate",
                  status === "error"
                    ? "font-semibold text-rose-400"
                    : isCurrentActive
                      ? "font-semibold text-zinc-100"
                      : status === "done"
                        ? "text-zinc-200"
                        : "text-zinc-500",
                )}
              >
                {label}
              </span>
            </div>

            {/* status mono badge */}
            <div className="shrink-0">
              {status === "done" ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-400 border border-emerald-500/30">
                  <Check className="size-2.5" />
                  OK
                </span>
              ) : isCurrentActive ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-300 border border-emerald-500/40 animate-pulse">
                  RUNNING
                </span>
              ) : status === "error" ? (
                <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[9.5px] font-semibold text-rose-400 border border-rose-500/30">
                  FAIL
                </span>
              ) : (
                <span className="text-[10px] text-zinc-600">
                  --
                </span>
              )}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

/* ────────────────────────────── success mark ───────────────────────────── */

/** Expanding ring + drawn check mark in modern mono style. */
export function SuccessBurst({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="relative flex size-14 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-xl bg-emerald-500/15 border border-emerald-500/30"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: DURATION.base, ease: EASE.standard }}
        />
        <motion.span
          className="absolute inset-0 rounded-xl border border-emerald-400/40"
          initial={{ scale: 0.8, opacity: 0.8 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE.standard }}
        />
        <svg viewBox="0 0 32 32" className="relative size-7 text-emerald-400" aria-hidden="true">
          <motion.path
            d="M7 16.5 L13 22.5 L25 9.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.32, ease: EASE.standard, delay: 0.08 }}
          />
        </svg>
      </div>

      <div className="text-center font-mono space-y-1">
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.base, ease: EASE.standard, delay: 0.1 }}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30"
        >
          <span>✓ SYSTEM_READY</span>
        </motion.div>
        {label && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.base, ease: EASE.standard, delay: 0.15 }}
            className="text-[14px] font-semibold text-zinc-100 tracking-tight"
          >
            {label}
          </motion.p>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────── overlay ─────────────────────────────── */

/**
 * Full-surface workflow overlay with sleek dark mono theme.
 */
export function WorkflowOverlay({
  open,
  title,
  description,
  steps,
  state,
  successLabel = "Project ready",
  onRetry,
  onCancel,
  footer,
}: {
  open: boolean;
  title: string;
  description?: string;
  steps: readonly WorkflowStepDef[];
  state: WorkflowState;
  successLabel?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  footer?: ReactNode;
}) {
  const elapsed = useElapsedTimer(state.startedAt, state.status === "running");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.fast, ease: EASE.standard }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            className="relative w-full max-w-[460px] overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-950/95 p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: DURATION.base, ease: EASE.standard }}
          >
            {/* cybernetic ambient top glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 -top-24 h-48 opacity-40 blur-3xl"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(52, 211, 153, 0.45), transparent 70%)",
              }}
            />

            <div className="relative flex flex-col gap-5">
              {/* Header with Mono System Tag & Timer */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3.5 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Terminal className="size-3.5" />
                  </div>
                  <span className="font-bold tracking-wider text-zinc-300 uppercase text-[11px]">
                    SYSTEM // PROVISIONING
                  </span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>⏱ {elapsed}s</span>
                </div>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {state.status === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: DURATION.fast }}
                    className="flex flex-col items-center gap-4 py-2"
                  >
                    <SuccessBurst label={successLabel} />
                    <WorkflowProgress steps={steps} state={state} compact className="w-full" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="running"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: DURATION.fast }}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex flex-col gap-1">
                      <h2 className="text-[16px] font-bold text-zinc-100 tracking-tight">{title}</h2>
                      {description && (
                        <p className="text-[12.5px] leading-relaxed text-zinc-400">
                          {description}
                        </p>
                      )}
                    </div>

                    <MonoProgressBar
                      current={state.activeIndex}
                      total={steps.length}
                      isSuccess={false}
                    />

                    <WorkflowProgress steps={steps} state={state} />

                    {state.status === "error" && state.error && (
                      <motion.p
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: DURATION.base, ease: EASE.standard }}
                        className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 font-mono text-[11.5px] text-rose-400"
                      >
                        {state.error}
                      </motion.p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {(footer || ((onRetry || onCancel) && state.status === "error")) && (
                <div className="flex items-center justify-end gap-2 border-t border-zinc-800/80 pt-3.5">
                  {footer}
                  {state.status === "error" && onCancel && (
                    <button
                      type="button"
                      onClick={onCancel}
                      className="h-8 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-[12px] font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white cursor-pointer"
                    >
                      Close
                    </button>
                  )}
                  {state.status === "error" && onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="h-8 rounded-lg bg-emerald-500 px-3 text-[12px] font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 cursor-pointer"
                    >
                      Try again
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Inline variant for dialogs, panels, and drawers with mono theme.
 */
export function WorkflowInline({
  title,
  steps,
  state,
  className,
}: {
  title?: string;
  steps: readonly WorkflowStepDef[];
  state: WorkflowState;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE.standard }}
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 shadow-sm font-mono",
        className,
      )}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800/60 pb-2">
          <span className="text-[12.5px] font-bold text-zinc-200 tracking-tight">{title}</span>
          {state.status === "success" ? (
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30">
              Done
            </span>
          ) : (
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9.5px] font-medium text-zinc-400">
              Live
            </span>
          )}
        </div>
      )}
      <WorkflowProgress steps={steps} state={state} compact />
      {state.status === "error" && state.error && (
        <p className="rounded border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-400">
          {state.error}
        </p>
      )}
    </motion.div>
  );
}

