import { useEffect, useRef, useState, useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bell,
  Boxes,
  Building2,
  Check,
  CreditCard,
  Globe,
  KeyRound,
  Layers,
  Loader2,
  ShieldCheck,
  Sparkles,
  Terminal,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMotionPreference } from "./MotionProvider";
import { DURATION, EASE, SPRING } from "./tokens";
import { stepStatus, type WorkflowState, type WorkflowStepStatus } from "./useWorkflow";
import type { WorkflowStepDef } from "./workflow-presets";

/**
 * CreationTransition: The premium staging deck for Organization & Project creation.
 *
 * Impeccable Craft Principles:
 * - Operates in "Operate" mode: fast, responsive, legible, and respectful of user time.
 * - Replaces tacky AI-slop circular constellations and laser particle animations
 *   with an authentic, precision-engineered provisioning console.
 * - Features an authored entity emblem, precision top-edge progress tracer,
 *   authentic step pipeline with real micro-animations, and a crisp resolution moment.
 * - Full prefers-reduced-motion accessibility & screen-reader live narration.
 */

export interface CreationTransitionProps {
  open: boolean;
  steps: readonly WorkflowStepDef[];
  state: Pick<WorkflowState, "status" | "activeIndex" | "error" | "startedAt">;
  /** The entity name (e.g., "Acme" or "Checkout API"). First letter becomes the monogram. */
  name: string;
  /** A quiet mono line or pill under the heading (e.g., "/acme" or workspace URL). */
  caption?: string;
  title: string;
  successTitle: string;
  errorTitle: string;
  /** Status line once everything is set up, e.g. "Opening your dashboard…". */
  successDescription: string;
  onRetry?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  /** Optional entity type hint: 'organization' | 'project' */
  entityType?: "organization" | "project";
}

type Outcome = "running" | "success" | "error";

/**
 * Resolves a tailored, authentic Lucide icon for each provisioning step ID.
 */
function getStepIcon(stepId: string, entityType?: "organization" | "project"): LucideIcon {
  switch (stepId) {
    case "organization":
      return Building2;
    case "project":
      return entityType === "project" ? Boxes : Layers;
    case "owner":
      return ShieldCheck;
    case "billing":
      return CreditCard;
    case "alerting":
      return Bell;
    case "audit":
      return Activity;
    case "environment":
      return Globe;
    case "sdk":
      return Terminal;
    case "key":
      return KeyRound;
    case "counters":
      return Activity;
    case "connect":
    case "verify":
      return ShieldCheck;
    case "webhook":
      return Terminal;
    default:
      return Sparkles;
  }
}

export function CreationTransition({
  open,
  steps,
  state,
  name,
  caption,
  title,
  successTitle,
  errorTitle,
  successDescription,
  onRetry,
  onCancel,
  cancelLabel = "Back to form",
  entityType = "organization",
}: CreationTransitionProps) {
  const { reduced } = useMotionPreference();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  const { status, activeIndex } = state;
  const outcome: Outcome = status === "success" ? "success" : status === "error" ? "error" : "running";

  const totalSteps = Math.max(1, steps.length);
  const currentStep = steps[Math.min(activeIndex, totalSteps - 1)];

  // Progress percentage dynamically mapped from active step
  const progressPercent =
    outcome === "success"
      ? 100
      : outcome === "error"
        ? Math.min(100, Math.round(((activeIndex + 0.5) / totalSteps) * 100))
        : Math.min(95, Math.max(16, Math.round(((activeIndex + 0.6) / totalSteps) * 100)));

  // Focus dialog on open for accessibility
  useEffect(() => {
    if (open) {
      dialogRef.current?.focus();
    }
  }, [open]);

  // Keyboard shortcut: Escape cancels on error or when allowed
  useEffect(() => {
    if (!open || status !== "error" || !onCancel) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, status, onCancel]);

  const cleanName = name.trim() || (entityType === "project" ? "New Project" : "New Workspace");
  const monogram = (cleanName[0] ?? (entityType === "project" ? "P" : "O")).toUpperCase();

  const EntityIcon = entityType === "project" ? Boxes : Building2;

  // Active status narrative copy
  const activeDetail =
    outcome === "success"
      ? successDescription
      : outcome === "error"
        ? state.error || "Setup encountered an error. It is safe to try again."
        : currentStep?.activity || currentStep?.detail || "Configuring system defaults…";

  const headerTitle =
    outcome === "success"
      ? successTitle
      : outcome === "error"
        ? errorTitle
        : title;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-center justify-center overflow-y-auto bg-black/70 p-4 sm:p-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: DURATION.fast, ease: EASE.exit } }}
          transition={{ duration: DURATION.base, ease: EASE.standard }}
        >
          {/* Subtle ambient lighting aura behind the card */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-opacity duration-700"
            style={{
              opacity: outcome === "success" ? 0.35 : outcome === "error" ? 0.25 : 0.2,
              background:
                outcome === "success"
                  ? "radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, transparent 70%)"
                  : outcome === "error"
                    ? "radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, transparent 70%)"
                    : "radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, rgba(59, 130, 246, 0.2) 50%, transparent 70%)",
            }}
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            tabIndex={-1}
            className="relative flex w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border border-[var(--border2)] bg-[var(--bg1)] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06)] outline-none"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={
              outcome === "success"
                ? reduced
                  ? { opacity: 1 }
                  : { opacity: 1, scale: 1, y: 0 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.98, y: -8, transition: { duration: DURATION.fast, ease: EASE.exit } }
            }
            transition={{ duration: DURATION.slow, ease: EASE.standard }}
          >
            {/* Top Precision Progress Tracer */}
            <div className="relative h-[2.5px] w-full overflow-hidden bg-[var(--border)]/40" aria-hidden="true">
              <motion.div
                className={cn(
                  "h-full rounded-full transition-colors duration-300",
                  outcome === "success"
                    ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
                    : outcome === "error"
                      ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                      : "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
                )}
                initial={{ width: "8%" }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: reduced ? 0 : 0.35, ease: EASE.standard }}
              />
            </div>

            {/* Header Hero Area */}
            <div className="flex flex-col gap-4 px-6 pt-6 pb-4">
              <div className="flex items-start justify-between gap-4">
                {/* Authored Entity Emblem Badge */}
                <div className="relative flex size-13 shrink-0 items-center justify-center rounded-xl border border-[var(--border2)] bg-gradient-to-b from-[var(--bg2)] to-[var(--bg1)] shadow-sm">
                  {/* Subtle orbiting perimeter tracer while in-flight */}
                  {outcome === "running" && !reduced && (
                    <motion.div
                      className="absolute -inset-[2px] rounded-xl border border-transparent border-t-emerald-400/80 border-r-teal-400/60"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, ease: "linear", repeat: Infinity }}
                    />
                  )}

                  {/* Monogram or Hero Glyph */}
                  <span className="font-sans text-[22px] font-bold tracking-tight text-[var(--text)] select-none">
                    {monogram}
                  </span>

                  {/* Bottom-right Corner Status Pin */}
                  <div className="absolute -bottom-1 -right-1 flex size-5.5 items-center justify-center rounded-full border border-[var(--bg1)] shadow-xs">
                    {outcome === "success" ? (
                      <motion.div
                        className="flex size-full items-center justify-center rounded-full bg-emerald-500 text-white"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={SPRING.snappy}
                      >
                        <Check className="size-3 stroke-[3]" />
                      </motion.div>
                    ) : outcome === "error" ? (
                      <div className="flex size-full items-center justify-center rounded-full bg-rose-500 text-white">
                        <AlertTriangle className="size-3 stroke-[2.5]" />
                      </div>
                    ) : (
                      <div className="flex size-full items-center justify-center rounded-full bg-[var(--bg2)] text-[var(--text3)]">
                        <EntityIcon className="size-3" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress / Step Counter Badge */}
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--text3)]">
                  {outcome === "success" ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-400 border border-emerald-500/20">
                      <Check className="size-3" /> 100% Ready
                    </span>
                  ) : outcome === "error" ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 font-medium text-rose-400 border border-rose-500/20">
                      Failed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--bg2)] px-2.5 py-1 text-[var(--text2)] border border-[var(--border)]">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>
                        Step {Math.min(activeIndex + 1, totalSteps)} of {totalSteps}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Caption */}
              <div className="flex flex-col gap-1 min-w-0">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.h2
                    key={headerTitle}
                    id={titleId}
                    className="truncate text-[19px] sm:text-[20px] font-semibold tracking-[-0.025em] text-[var(--text)]"
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: DURATION.fast, ease: EASE.standard }}
                  >
                    {headerTitle}
                  </motion.h2>
                </AnimatePresence>

                {caption && (
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-[12px] text-[var(--text2)] bg-[var(--bg2)]/60 px-2 py-0.5 rounded-md border border-[var(--border)]/70">
                      {caption}
                    </span>
                  </div>
                )}

                {/* Live Activity Narrative */}
                <div className="mt-1 flex items-center gap-2 text-[13px] text-[var(--text2)]" id={descId}>
                  {outcome === "running" && (
                    <Loader2 className="size-3.5 shrink-0 animate-spin text-emerald-400" aria-hidden="true" />
                  )}
                  {outcome === "success" && (
                    <Check className="size-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                  )}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={activeDetail}
                      className="truncate leading-normal"
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: DURATION.fast }}
                    >
                      {activeDetail}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Stepper Pipeline Timeline */}
            <div className="border-t border-b border-[var(--border)] bg-[var(--bg)]/35 px-6 py-3.5">
              <ol className="relative flex flex-col gap-1">
                {/* Connecting vertical hairline */}
                <div
                  aria-hidden="true"
                  className="absolute left-[11px] top-3 bottom-3 w-[1px] bg-[var(--border)]"
                />

                {steps.map((step, index) => {
                  const status = stepStatus(index, state);
                  const isCurrent = status === "active";
                  const isDone = status === "done";
                  const isError = status === "error";
                  const StepIcon = getStepIcon(step.id, entityType);

                  return (
                    <motion.li
                      key={step.id}
                      className={cn(
                        "relative flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors",
                        isCurrent && "bg-[var(--bg1)]/80 border border-[var(--border2)]/80 shadow-xs",
                      )}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: DURATION.base, delay: reduced ? 0 : index * 0.03 }}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Step Node */}
                        <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg1)]">
                          {isDone ? (
                            <motion.div
                              className="flex size-5.5 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400"
                              initial={reduced ? undefined : { scale: 0.8 }}
                              animate={{ scale: 1 }}
                              transition={SPRING.snappy}
                            >
                              <Check className="size-3 stroke-[2.5]" aria-hidden="true" />
                            </motion.div>
                          ) : isCurrent ? (
                            <div className="relative flex size-5.5 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                              {!reduced && (
                                <motion.div
                                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-400 border-r-emerald-400/80"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
                                />
                              )}
                              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                            </div>
                          ) : isError ? (
                            <div className="flex size-5.5 items-center justify-center rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-400">
                              <AlertTriangle className="size-3" aria-hidden="true" />
                            </div>
                          ) : (
                            <div className="flex size-5.5 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg2)]/60 font-mono text-[10px] text-[var(--text3)]">
                              {index + 1}
                            </div>
                          )}
                        </div>

                        {/* Step Details */}
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "truncate text-[13px] font-medium leading-tight",
                                isDone
                                  ? "text-[var(--text)] font-semibold"
                                  : isCurrent
                                    ? "text-[var(--text)] font-semibold"
                                    : "text-[var(--text3)]",
                              )}
                            >
                              {isDone && step.doneLabel ? step.doneLabel : step.label}
                            </span>
                          </div>

                          {/* Present-tense in-flight activity line */}
                          {isCurrent && step.activity && (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-0.5 truncate text-[11.5px] text-emerald-400 font-medium"
                            >
                              {step.activity}
                            </motion.p>
                          )}
                        </div>
                      </div>

                      {/* Right Status Tag */}
                      <div className="shrink-0">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                            Done
                          </span>
                        ) : isCurrent ? (
                          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 animate-pulse">
                            Provisioning
                          </span>
                        ) : isError ? (
                          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20">
                            Failed
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-[var(--text3)]">
                            Pending
                          </span>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </ol>
            </div>

            {/* Error or Completion Footer */}
            {outcome === "error" ? (
              <div className="flex flex-col gap-3 p-5 bg-[var(--bg1)]">
                {state.error && (
                  <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-[12.5px] text-rose-400 leading-snug">
                    {state.error}
                  </p>
                )}
                <div className="flex items-center justify-end gap-2 pt-1">
                  {onCancel && (
                    <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                      {cancelLabel}
                    </Button>
                  )}
                  {onRetry && (
                    <Button type="button" size="sm" onClick={onRetry} autoFocus>
                      Try again
                    </Button>
                  )}
                </div>
              </div>
            ) : outcome === "success" ? (
              <div className="flex items-center justify-between px-6 py-4 bg-[var(--bg1)] text-[12.5px]">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Check className="size-3.5" /> Workspace ready
                </span>
                <span className="flex items-center gap-2 text-[var(--text3)]">
                  <Loader2 className="size-3 animate-spin" /> Redirecting…
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between px-6 py-3.5 bg-[var(--bg1)] text-[12px] text-[var(--text3)]">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3 animate-spin text-emerald-400" /> Building infrastructure…
                </span>
                <span className="font-mono text-[11px]">LynkTrace Core</span>
              </div>
            )}

            {/* Accessibility SR-only updates */}
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {outcome === "success"
                ? `${successTitle}. ${successDescription}.`
                : outcome === "error"
                  ? `${errorTitle}. ${state.error ?? ""}`
                  : `${title}. ${activeDetail}`}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
