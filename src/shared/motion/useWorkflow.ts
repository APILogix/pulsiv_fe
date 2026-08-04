import { useEffect, useRef, useState } from "react";

import type { WorkflowStepDef } from "./workflow-presets";

/**
 * useWorkflow — Phase 4 state machine.
 *
 * The honesty rules this encodes:
 *  - Steps are *paced* while real work is in flight, and the final step is never
 *    marked done until the promise actually resolves.
 *  - If the work finishes early, remaining steps snap to done immediately. We do
 *    not stall the user to finish playing an animation.
 *  - A failure freezes on the step that was in flight and surfaces the error
 *    there, so the user can see how far the operation got.
 *  - Total added latency after resolution is `successHold` (default 450ms) —
 *    just enough to read the success mark before we navigate.
 *
 * No useCallback/useMemo here by design: the React Compiler is enabled
 * (rules.md §1), so manual memoization is a code smell in this codebase.
 */

export type WorkflowStatus = "idle" | "running" | "success" | "error";
export type WorkflowStepStatus = "pending" | "active" | "done" | "error";

export interface WorkflowState {
  status: WorkflowStatus;
  /** Index of the step currently in flight (or steps.length once all are done). */
  activeIndex: number;
  error: string | null;
}

export interface WorkflowResult<T> {
  ok: boolean;
  data?: T;
  error?: unknown;
}

interface UseWorkflowOptions {
  /** ms between paced intermediate steps. */
  pace?: number;
  /** ms the success state is held before `onSuccess` fires. */
  successHold?: number;
}

export function useWorkflow(
  steps: readonly WorkflowStepDef[],
  options: UseWorkflowOptions = {},
) {
  const { pace = 850, successHold = 450 } = options;

  const [state, setState] = useState<WorkflowState>({
    status: "idle",
    activeIndex: 0,
    error: null,
  });

  const timers = useRef<number[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const pending = timers.current;
    return () => {
      mounted.current = false;
      pending.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, []);

  function clearTimers() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }

  function reset() {
    clearTimers();
    setState({ status: "idle", activeIndex: 0, error: null });
  }

  /**
   * Run the real work while narrating progress.
   * Never throws — inspect `result.ok`. This keeps call sites free of try/catch
   * noise and avoids unhandled rejections if the overlay is dismissed mid-flight.
   */
  async function run<T>(
    task: () => Promise<T>,
    handlers?: {
      onSuccess?: (data: T) => void;
      onError?: (error: unknown) => void;
    },
  ): Promise<WorkflowResult<T>> {
    clearTimers();
    setState({ status: "running", activeIndex: 0, error: null });

    // Pace every step except the last: the last one belongs to real work.
    const lastPaced = Math.max(0, steps.length - 2);
    for (let index = 1; index <= lastPaced; index += 1) {
      timers.current.push(
        window.setTimeout(() => {
          if (!mounted.current) return;
          setState((prev) =>
            prev.status === "running" ? { ...prev, activeIndex: index } : prev,
          );
        }, pace * index),
      );
    }

    try {
      const data = await task();
      clearTimers();
      if (mounted.current) {
        setState({ status: "success", activeIndex: steps.length, error: null });
      }
      await new Promise<void>((resolve) => {
        timers.current.push(window.setTimeout(resolve, successHold));
      });
      handlers?.onSuccess?.(data);
      return { ok: true, data };
    } catch (error) {
      clearTimers();
      if (mounted.current) {
        setState((prev) => ({
          status: "error",
          activeIndex: prev.activeIndex,
          error: extractMessage(error),
        }));
      }
      handlers?.onError?.(error);
      return { ok: false, error };
    }
  }

  return {
    ...state,
    steps,
    isRunning: state.status === "running",
    isDone: state.status === "success",
    isError: state.status === "error",
    /** True while the progress surface should stay on screen. */
    isActive: state.status !== "idle",
    run,
    reset,
  };
}

/** Per-step status derived from the machine — used by the presentation layer. */
export function stepStatus(
  index: number,
  state: Pick<WorkflowState, "status" | "activeIndex">,
): WorkflowStepStatus {
  if (state.status === "success") return "done";
  if (state.status === "error") {
    if (index === state.activeIndex) return "error";
    return index < state.activeIndex ? "done" : "pending";
  }
  if (index < state.activeIndex) return "done";
  if (index === state.activeIndex && state.status === "running") return "active";
  return "pending";
}

function extractMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && error !== null) {
    const response = (error as { response?: { data?: { message?: unknown; error?: unknown } } })
      .response;
    const data = response?.data;

    if (data?.error) {
      if (typeof data.error === "string") return data.error;
      if (typeof data.error === "object" && data.error !== null) {
        if ("message" in data.error && typeof (data.error as any).message === "string") {
          return (data.error as any).message;
        }
      }
    }

    if (typeof data?.message === "string") return data.message;
    if (typeof data?.message === "object" && data?.message !== null && "message" in data.message && typeof (data.message as any).message === "string") {
      return (data.message as any).message;
    }

    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
    if (typeof message === "object" && message !== null && "message" in message && typeof (message as any).message === "string") {
      return (message as any).message;
    }
  }
  return "Something went wrong. Please try again.";
}
