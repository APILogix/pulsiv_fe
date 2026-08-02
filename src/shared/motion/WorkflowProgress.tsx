import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { DURATION, EASE, STAGGER } from "./tokens";
import { stepStatus, type WorkflowState, type WorkflowStepStatus } from "./useWorkflow";
import type { WorkflowStepDef } from "./workflow-presets";

/**
 * WorkflowProgress — Phase 4 presentation layer.
 *
 * Reads a `useWorkflow` state and narrates it: completed steps carry a drawn
 * check, the in-flight step carries a rotating arc, pending steps sit dim. All
 * motion is transform/opacity only, and the check draw uses SVG `pathLength`
 * so it stays on the compositor.
 */

/* ───────────────────────────── step indicator ───────────────────────────── */

function StepIcon({ status }: { status: WorkflowStepStatus }) {
  if (status === "error") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-[var(--red-bg)] text-[var(--red)]">
        <AlertTriangle className="size-3" aria-hidden="true" />
      </span>
    );
  }

  if (status === "done") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-[var(--green-bg)]">
        <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden="true">
          <motion.path
            d="M4.5 10.5 L8 14 L15.5 6"
            fill="none"
            stroke="var(--green)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: DURATION.slow, ease: EASE.standard }}
          />
        </svg>
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className="relative flex size-5 items-center justify-center">
        {/* rotating arc — the only infinite animation in this component */}
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-[var(--border2)] border-t-[var(--brand)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.75, ease: "linear", repeat: Infinity }}
        />
        <motion.span
          className="size-1.5 rounded-full bg-[var(--brand)]"
          animate={{ opacity: [1, 0.35, 1] }}
          transition={{ duration: 1.2, ease: EASE.inOut, repeat: Infinity }}
        />
      </span>
    );
  }

  return (
    <span className="flex size-5 items-center justify-center">
      <span className="size-1.5 rounded-full bg-[var(--text3)]/50" />
    </span>
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
      className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2.5", className)}
      aria-live="polite"
      aria-busy={state.status === "running"}
    >
      {steps.map((step, index) => {
        const status = stepStatus(index, state);
        const label = status === "done" && step.doneLabel ? step.doneLabel : step.label;

        return (
          <motion.li
            key={step.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: DURATION.base,
              ease: EASE.standard,
              delay: index * STAGGER.loose,
            }}
            className="flex items-center gap-2.5"
          >
            <StepIcon status={status} />
            <motion.span
              animate={{
                opacity: status === "pending" ? 0.45 : 1,
              }}
              transition={{ duration: DURATION.fast, ease: EASE.standard }}
              className={cn(
                "text-[13px] leading-tight",
                status === "error"
                  ? "font-medium text-[var(--red)]"
                  : status === "active"
                    ? "font-medium text-[var(--text)]"
                    : status === "done"
                      ? "text-[var(--text2)]"
                      : "text-[var(--text3)]",
              )}
            >
              {label}
            </motion.span>
          </motion.li>
        );
      })}
    </ol>
  );
}

/* ────────────────────────────── success mark ───────────────────────────── */

/** Expanding ring + drawn check. ~450ms total, matching `successHold`. */
export function SuccessBurst({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex size-14 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-full bg-[var(--green-bg)]"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: DURATION.base, ease: EASE.standard }}
        />
        <motion.span
          className="absolute inset-0 rounded-full border border-[var(--green)]/40"
          initial={{ scale: 0.8, opacity: 0.8 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE.standard }}
        />
        <svg viewBox="0 0 32 32" className="relative size-7" aria-hidden="true">
          <motion.path
            d="M7 16.5 L13 22.5 L25 9.5"
            fill="none"
            stroke="var(--green)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.32, ease: EASE.standard, delay: 0.08 }}
          />
        </svg>
      </div>
      {label && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.base, ease: EASE.standard, delay: 0.12 }}
          className="text-[14px] font-medium text-[var(--text)]"
        >
          {label}
        </motion.p>
      )}
    </div>
  );
}

/* ──────────────────────────────── overlay ─────────────────────────────── */

/**
 * Full-surface workflow overlay for create flows that navigate on completion
 * (organization, project, checkout). Renders in place — the caller decides
 * whether that's a dialog, a wizard pane, or the whole screen.
 */
export function WorkflowOverlay({
  open,
  title,
  description,
  steps,
  state,
  successLabel = "All set",
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
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-[var(--overlay)] px-4 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.fast, ease: EASE.standard }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            className="relative w-full max-w-[420px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border2)] bg-[var(--bg1)] p-6 shadow-[var(--shadow-modal)]"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: DURATION.base, ease: EASE.standard }}
          >
            {/* brand wash — one radial, consistent with §3 */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{
                background:
                  "radial-gradient(120% 80% at 50% -20%, var(--brand-bg) 0%, transparent 65%)",
              }}
            />

            <div className="relative flex flex-col gap-5">
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
                    <div className="flex flex-col gap-1.5">
                      <h2 className="text-[15px] font-semibold text-[var(--text)]">{title}</h2>
                      {description && (
                        <p className="text-[13px] leading-[1.5] text-[var(--text2)]">
                          {description}
                        </p>
                      )}
                    </div>
                    <WorkflowProgress steps={steps} state={state} />
                    {state.status === "error" && state.error && (
                      <motion.p
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: DURATION.base, ease: EASE.standard }}
                        className="rounded-[var(--radius)] border border-[var(--red)]/30 bg-[var(--red-bg)] px-3 py-2 text-[12px] text-[var(--red)]"
                      >
                        {state.error}
                      </motion.p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {(footer || ((onRetry || onCancel) && state.status === "error")) && (
                <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
                  {footer}
                  {state.status === "error" && onCancel && (
                    <button
                      type="button"
                      onClick={onCancel}
                      className="h-8 rounded-[var(--radius)] border border-[var(--border2)] px-2.5 text-[13px] font-medium text-[var(--text2)] transition-colors duration-150 hover:border-[var(--text3)] hover:text-[var(--text)]"
                    >
                      Close
                    </button>
                  )}
                  {state.status === "error" && onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="h-8 rounded-[var(--radius)] bg-[var(--brand)] px-2.5 text-[13px] font-semibold text-[var(--brand-fg)] transition-colors duration-150 hover:bg-[var(--brand-d)]"
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
 * Inline variant for panels and drawers — same narration, no backdrop.
 * Use where the surrounding form should stay visible (API keys, connectors).
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
        "flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/50 p-3.5",
        className,
      )}
    >
      {title && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium text-[var(--text)]">{title}</span>
          {state.status === "success" && (
            <span className="font-mono text-[10px] uppercase tracking-[0.09em] text-[var(--green)]">
              Done
            </span>
          )}
        </div>
      )}
      <WorkflowProgress steps={steps} state={state} compact />
      {state.status === "error" && state.error && (
        <p className="text-[12px] text-[var(--red)]">{state.error}</p>
      )}
    </motion.div>
  );
}
