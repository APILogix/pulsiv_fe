import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMotionPreference } from "./MotionProvider";
import { DURATION, EASE } from "./tokens";
import { stepStatus, type WorkflowState, type WorkflowStepStatus } from "./useWorkflow";
import type { WorkflowStepDef } from "./workflow-presets";

/**
 * CreationTransition: the moment between "Create" and the new workspace.
 *
 * The record being created sits at the centre as its monogram. The parts the
 * server sets up for it are placed around it, and each one is connected as its
 * step comes up, with light travelling along the finished connections so the
 * scene never sits still. The scene leans toward the pointer, and hovering a
 * part says what it is. There is no clock, percentage, or step count.
 *
 * On success every connection turns green in one sweep, the orbit closes, and
 * the scene zooms through to the destination on the same `--bg` canvas, so the
 * next page reads as the continuation of this one.
 *
 * Reduced motion: no parallax, no travelling light, no orbit spin, and the
 * exit is a plain fade. State changes stay visible as colour.
 */

/* ─────────────────────────────── geometry ─────────────────────────────── */

const RADIUS = 128;
const ORBIT = 40;
const CORE = 28;
/** How long the finished scene holds before it zooms through. */
const LEAVE_AFTER_MS = 700;
/** How often the status line moves on while the last step is still in flight. */
const FINISHING_EVERY_MS = 2400;
const FINISHING = ["Checking everything is in place", "Finishing setup"];

type Anchor = "start" | "middle" | "end";

interface NodeGeometry {
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  anchor: Anchor;
  /** The connection runs from just outside the orbit to just short of the node. */
  path: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

function layoutNodes(count: number): NodeGeometry[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const round = (value: number) => Math.round(value * 10) / 10;
    const from = { x: round((ORBIT + 8) * cos), y: round((ORBIT + 8) * sin) };
    const to = { x: round((RADIUS - 11) * cos), y: round((RADIUS - 11) * sin) };
    const labelRadius = RADIUS + 16;

    return {
      x: round(RADIUS * cos),
      y: round(RADIUS * sin),
      labelX: round(labelRadius * cos),
      // above the top node, below the bottom one, centred on the sides
      labelY: round(labelRadius * sin + (sin > 0.5 ? 12 : sin < -0.5 ? -2 : 4)),
      anchor: cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle",
      path: `M${from.x} ${from.y} L${to.x} ${to.y}`,
      from,
      to,
    };
  });
}

type Outcome = "running" | "success" | "error";

/* ──────────────────────────────── parts ──────────────────────────────── */

function Connection({
  geometry,
  status,
  outcome,
  index,
  live,
}: {
  geometry: NodeGeometry;
  status: WorkflowStepStatus;
  outcome: Outcome;
  index: number;
  live: boolean;
}) {
  const drawn = status === "active" || status === "done";
  const sweep = outcome === "success" ? 0.05 + index * 0.06 : 0;

  return (
    <g>
      {/* the structure is visible from the start, faintly */}
      <path d={geometry.path} strokeWidth={1} className="fill-none stroke-[var(--border)]" />
      <motion.path
        d={geometry.path}
        strokeWidth={1.25}
        strokeLinecap="round"
        className={cn(
          "fill-none transition-[stroke] duration-300",
          outcome === "success"
            ? "stroke-[var(--green)]"
            : status === "error"
              ? "stroke-[var(--red)]"
              : status === "active"
                ? "stroke-[var(--text2)]"
                : "stroke-[var(--text3)]",
        )}
        style={{ transitionDelay: `${sweep}s` }}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: drawn || outcome === "success" ? 1 : 0 }}
        transition={{ duration: live ? 0.5 : 0, ease: EASE.standard }}
      />

      {/* light travelling outward: quick on the step in flight, slow on finished ones */}
      {live && outcome === "running" && drawn && (
        <motion.circle
          key={status}
          r={status === "active" ? 2.2 : 1.6}
          className={status === "active" ? "fill-[var(--text)]" : "fill-[var(--text2)]"}
          initial={{ x: geometry.from.x, y: geometry.from.y, opacity: 0 }}
          animate={{
            x: [geometry.from.x, geometry.to.x],
            y: [geometry.from.y, geometry.to.y],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: status === "active" ? 0.9 : 1.6,
            ease: "easeInOut",
            times: [0, 0.15, 0.85, 1],
            repeat: Infinity,
            repeatDelay: status === "active" ? 0.15 : 1.4 + (index % 3) * 0.5,
            delay: status === "active" ? 0.35 : index * 0.2,
          }}
        />
      )}
    </g>
  );
}

function Node({
  geometry,
  step,
  status,
  outcome,
  index,
  live,
  hovered,
  onHover,
}: {
  geometry: NodeGeometry;
  step: WorkflowStepDef;
  status: WorkflowStepStatus;
  outcome: Outcome;
  index: number;
  live: boolean;
  hovered: boolean;
  onHover: (index: number | null) => void;
}) {
  const sweep = outcome === "success" ? 0.05 + index * 0.06 : 0;
  const committed = outcome === "success";

  return (
    <g>
      <g transform={`translate(${geometry.x} ${geometry.y})`}>
        <motion.g
          initial={live ? { opacity: 0, scale: 0.4 } : { opacity: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: DURATION.slow, ease: EASE.standard, delay: live ? 0.12 + index * 0.05 : 0 }}
        >
          {status === "active" && live && (
            <motion.circle
              r={6}
              strokeWidth={1}
              className="fill-none stroke-[var(--text)]"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: [1, 2.6], opacity: [0.5, 0] }}
              transition={{ duration: 1.4, ease: "easeOut", repeat: Infinity }}
            />
          )}

          <motion.circle
            r={6}
            strokeWidth={1.25}
            className={cn(
              "transition-[fill,stroke] duration-300",
              committed
                ? "fill-[var(--green)] stroke-[var(--green)]"
                : status === "active"
                  ? "fill-[var(--text)] stroke-[var(--text)]"
                  : status === "done"
                    ? "fill-[var(--text2)] stroke-[var(--text2)]"
                    : status === "error"
                      ? "fill-[var(--bg)] stroke-[var(--red)]"
                      : "fill-[var(--bg)] stroke-[var(--border2)]",
            )}
            style={{ transitionDelay: `${sweep}s` }}
            animate={{ scale: committed ? 1.25 : hovered ? 1.2 : 1 }}
            transition={{ duration: DURATION.base, ease: EASE.standard, delay: committed && live ? sweep : 0 }}
          />

          {committed && (
            <motion.path
              d="M-3.2 0.2 L-1 2.4 L3.3 -2.2"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="fill-none stroke-[var(--bg)]"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: live ? 0.22 : 0, ease: EASE.standard, delay: live ? sweep + 0.1 : 0 }}
            />
          )}

          {/* generous hit area, so hovering does not need precision */}
          <circle
            r={22}
            fill="transparent"
            onPointerEnter={() => onHover(index)}
            onPointerLeave={() => onHover(null)}
          />
        </motion.g>
      </g>

      <motion.text
        x={geometry.labelX}
        y={geometry.labelY}
        textAnchor={geometry.anchor}
        fontSize={12}
        fontWeight={500}
        className={cn(
          "pointer-events-none select-none transition-[fill] duration-300",
          hovered || status === "active" || committed
            ? "fill-[var(--text)]"
            : status === "done"
              ? "fill-[var(--text2)]"
              : "fill-[var(--text3)]",
        )}
        style={{ transitionDelay: `${sweep}s` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: DURATION.slow, delay: live ? 0.2 + index * 0.05 : 0 }}
      >
        {step.short ?? step.label}
      </motion.text>
    </g>
  );
}

function Core({ mark, outcome, live }: { mark: string; outcome: Outcome; live: boolean }) {
  return (
    <g>
      <circle r={ORBIT} strokeWidth={1} className="fill-none stroke-[var(--border)]" />

      {outcome === "running" && (
        <motion.circle
          r={ORBIT}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeDasharray="34 217"
          className="fill-none stroke-[var(--text2)]"
          animate={live ? { rotate: 360 } : { rotate: 0 }}
          transition={live ? { duration: 1.8, ease: "linear", repeat: Infinity } : { duration: 0 }}
        />
      )}

      {outcome === "success" && (
        <g transform="rotate(-90)">
          <motion.circle
            r={ORBIT}
            strokeWidth={1.5}
            className="fill-none stroke-[var(--green)]"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: live ? 0.45 : 0, ease: EASE.standard, delay: live ? 0.15 : 0 }}
          />
        </g>
      )}

      {outcome === "error" && <circle r={ORBIT} strokeWidth={1.5} className="fill-none stroke-[var(--red)]" />}

      <rect
        x={-CORE}
        y={-CORE}
        width={CORE * 2}
        height={CORE * 2}
        rx={10}
        strokeWidth={1}
        className="fill-[var(--bg2)] stroke-[var(--border2)]"
      />
      <text
        textAnchor="middle"
        dy="0.36em"
        fontSize={22}
        fontWeight={600}
        letterSpacing="-0.02em"
        className="select-none fill-[var(--text)]"
      >
        {mark}
      </text>
    </g>
  );
}

/* ─────────────────────────────── overlay ─────────────────────────────── */

export interface CreationTransitionProps {
  open: boolean;
  steps: readonly WorkflowStepDef[];
  state: Pick<WorkflowState, "status" | "activeIndex" | "error" | "startedAt">;
  /** The record's name. Its first letter becomes the monogram. */
  name: string;
  /** A quiet mono line under the heading, e.g. the workspace URL. */
  caption?: string;
  title: string;
  successTitle: string;
  errorTitle: string;
  /** Status line once everything is set up, e.g. "Opening your dashboard". */
  successDescription: string;
  onRetry?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
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
}: CreationTransitionProps) {
  const { enabled: live } = useMotionPreference();
  const dialogRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const { status, activeIndex, startedAt } = state;
  const outcome: Outcome = status === "success" ? "success" : status === "error" ? "error" : "running";
  const runKey = String(startedAt ?? "idle");
  const nodes = useMemo(() => layoutNodes(steps.length), [steps.length]);
  const onLastStep = status === "running" && activeIndex >= steps.length - 1;

  // Status line keeps moving while the last step waits on the server.
  const [finishing, setFinishing] = useState({ key: "", count: 0 });
  useEffect(() => {
    if (!open || !onLastStep) return;
    const id = window.setInterval(() => {
      setFinishing((prev) => ({ key: runKey, count: prev.key === runKey ? prev.count + 1 : 1 }));
    }, FINISHING_EVERY_MS);
    return () => window.clearInterval(id);
  }, [open, onLastStep, runKey]);
  const finishingCount = onLastStep && finishing.key === runKey ? finishing.count : 0;

  // Hold the finished scene, then zoom through to the destination.
  const [leftRun, setLeftRun] = useState<string | null>(null);
  useEffect(() => {
    if (!open || status !== "success") return;
    const id = window.setTimeout(() => setLeftRun(runKey), LEAVE_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [open, status, runKey]);
  const leaving = status === "success" && leftRun === runKey;

  // The scene leans slightly toward the pointer: far nodes more than the core.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 110, damping: 18, mass: 0.6 });
  const springY = useSpring(pointerY, { stiffness: 110, damping: 18, mass: 0.6 });
  const farX = useTransform(springX, (v) => v * 10);
  const farY = useTransform(springY, (v) => v * 10);
  const nearX = useTransform(springX, (v) => v * 4);
  const nearY = useTransform(springY, (v) => v * 4);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!live || event.pointerType !== "mouse") return;
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clamp = (value: number) => Math.max(-1, Math.min(1, value));
    pointerX.set(clamp((event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)));
    pointerY.set(clamp((event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)));
  };
  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || status !== "error" || !onCancel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, status, onCancel]);

  const current = steps[Math.min(activeIndex, steps.length - 1)];
  const hoveredStep = hovered !== null ? steps[hovered] : undefined;
  const finishingLines = [...FINISHING, current?.activity ?? current?.label ?? ""];

  const statusLine = hoveredStep?.detail
    ? `${hoveredStep.label}: ${hoveredStep.detail}`
    : outcome === "success"
      ? successDescription
      : outcome === "error"
        ? "Nothing was created, so it is safe to try again."
        : finishingCount > 0
          ? `${finishingLines[(finishingCount - 1) % finishingLines.length]}…`
          : `${current?.activity ?? current?.label ?? "Setting up"}…`;

  const heading = outcome === "success" ? successTitle : outcome === "error" ? errorTitle : title;
  const mark = (name.trim()[0] ?? "·").toUpperCase();

  const stepWord: Record<WorkflowStepStatus, string> = {
    pending: "waiting",
    active: "in progress",
    done: "done",
    error: "failed",
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-center justify-center overflow-y-auto bg-[var(--bg)] px-6 py-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: DURATION.fast, ease: EASE.exit } }}
          transition={{ duration: DURATION.slow, ease: EASE.standard }}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetPointer}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="creation-title"
            aria-describedby="creation-status"
            tabIndex={-1}
            className="flex w-full max-w-[460px] flex-col items-center outline-none"
          >
            <motion.div
              ref={sceneRef}
              className="w-full"
              initial={false}
              animate={
                leaving
                  ? live
                    ? { opacity: 0, scale: 1.12, filter: "blur(6px)" }
                    : { opacity: 0 }
                  : { opacity: 1, scale: 1, filter: "blur(0px)" }
              }
              transition={{ duration: 0.5, ease: EASE.standard }}
            >
              <svg viewBox="-230 -176 460 352" className="block h-auto w-full overflow-visible" aria-hidden="true">
                <motion.g style={live ? { x: farX, y: farY } : undefined}>
                  {nodes.map((geometry, index) => (
                    <Connection
                      key={`c-${steps[index]!.id}`}
                      geometry={geometry}
                      status={stepStatus(index, state)}
                      outcome={outcome}
                      index={index}
                      live={live}
                    />
                  ))}
                  {nodes.map((geometry, index) => (
                    <Node
                      key={`n-${steps[index]!.id}`}
                      geometry={geometry}
                      step={steps[index]!}
                      status={stepStatus(index, state)}
                      outcome={outcome}
                      index={index}
                      live={live}
                      hovered={hovered === index}
                      onHover={setHovered}
                    />
                  ))}
                </motion.g>
                <motion.g style={live ? { x: nearX, y: nearY } : undefined}>
                  <Core mark={mark} outcome={outcome} live={live} />
                </motion.g>
              </svg>
            </motion.div>

            <motion.div
              className="mt-4 flex w-full min-w-0 flex-col items-center text-center"
              initial={false}
              animate={leaving ? { opacity: 0, y: live ? -6 : 0 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE.standard }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.h2
                  key={heading}
                  id="creation-title"
                  className="max-w-full truncate text-[20px] font-semibold leading-7 tracking-[-0.025em] text-[var(--text)]"
                  initial={{ opacity: 0, y: live ? 4 : 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: DURATION.instant } }}
                  transition={{ duration: DURATION.base, ease: EASE.standard }}
                >
                  {heading}
                </motion.h2>
              </AnimatePresence>

              {caption && (
                <p className="mt-0.5 max-w-full truncate font-[family-name:var(--mono)] text-[12px] leading-5 text-[var(--text3)]">
                  {caption}
                </p>
              )}

              <div className="mt-3 flex h-5 w-full items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={statusLine}
                    id="creation-status"
                    className="max-w-full truncate text-[13px] leading-5 text-[var(--text2)]"
                    initial={{ opacity: 0, y: live ? 6 : 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: live ? -6 : 0, transition: { duration: DURATION.fast, ease: EASE.exit } }}
                    transition={{ duration: DURATION.slow, ease: EASE.standard }}
                  >
                    {statusLine}
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>

            {outcome === "error" && (
              <motion.div
                className="mt-6 flex w-full max-w-[400px] flex-col gap-4"
                initial={{ opacity: 0, y: live ? 6 : 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DURATION.slow, ease: EASE.standard, delay: live ? 0.1 : 0 }}
              >
                {state.error && (
                  <p className="rounded-[var(--radius)] bg-[var(--red-bg)] px-3 py-2.5 text-left text-[13px] leading-5 text-[var(--text)]">
                    {state.error}
                  </p>
                )}
                {(onCancel || onRetry) && (
                  <div className="flex items-center justify-center gap-2">
                    {onCancel && (
                      <Button type="button" variant="outline" size="lg" onClick={onCancel}>
                        {cancelLabel}
                      </Button>
                    )}
                    {onRetry && (
                      <Button type="button" size="lg" onClick={onRetry} autoFocus>
                        Try again
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* The scene is decorative; this is the same progress for assistive tech. */}
            <ol className="sr-only">
              {steps.map((step, index) => (
                <li key={step.id}>
                  {step.label}: {outcome === "success" ? "done" : stepWord[stepStatus(index, state)]}
                </li>
              ))}
            </ol>
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {outcome === "success"
                ? `${successTitle}. ${successDescription}.`
                : outcome === "error"
                  ? `${errorTitle}. ${state.error ?? ""}`
                  : `${title}.`}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
