"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { PulsivWordmark } from "@/shared/components/PulsivLogo";
import { POST_LOGIN_SETUP_FLAG } from "../services/post-login-setup-flag";

interface SetupStep {
  label: string;
  duration: number;
}

const STEPS: SetupStep[] = [
  { label: "Authenticating your session", duration: 550 },
  { label: "Setting up your project", duration: 700 },
  { label: "Gathering telemetry streams", duration: 750 },
  { label: "Indexing errors, traces & logs", duration: 700 },
  { label: "Preparing your dashboards", duration: 600 },
];

const TOTAL = STEPS.reduce((s, x) => s + x.duration, 0);

/**
 * Full-screen "setting up your workspace" sequence shown once right after
 * login. Rendered as an overlay inside AppLayout so the dashboard loads
 * concurrently behind it — zero time is wasted waiting.
 */
export function PostLoginSetup() {
  const [active, setActive] = useState(() => {
    try {
      return sessionStorage.getItem(POST_LOGIN_SETUP_FLAG) === "1";
    } catch {
      return false;
    }
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;
    // Clear immediately so a refresh never replays the sequence.
    try {
      sessionStorage.removeItem(POST_LOGIN_SETUP_FLAG);
    } catch {
      /* noop */
    }

    let elapsed = 0;
    const stepTimers = STEPS.map((step, i) => {
      elapsed += step.duration;
      return window.setTimeout(() => setStepIndex(i + 1), elapsed);
    });
    const doneTimer = window.setTimeout(() => setDone(true), elapsed + 350);
    const hideTimer = window.setTimeout(() => setActive(false), elapsed + 900);

    return () => {
      stepTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(doneTimer);
      window.clearTimeout(hideTimer);
    };
  }, [active]);

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {active && (
          <m.div
            key="post-login-setup"
            role="status"
            aria-live="polite"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0a0a]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
          >
            <m.div
              className="flex w-full max-w-[340px] flex-col items-center gap-10 px-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <PulsivWordmark size={44} animate={true} />

              <div className="flex w-full flex-col gap-3.5" aria-label="Setup progress">
                {STEPS.map((step, i) => {
                  const state = done || i < stepIndex ? "done" : i === stepIndex ? "active" : "pending";
                  return (
                    <m.div
                      key={step.label}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{
                        opacity: state === "pending" ? 0.35 : 1,
                        x: 0,
                      }}
                      transition={{ duration: 0.3, delay: i * 0.06 }}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center">
                        {state === "done" ? (
                          <m.span
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 26 }}
                            className="flex size-5 items-center justify-center rounded-full bg-[#10b981]/15"
                          >
                            <Check className="size-3 text-[#10b981]" strokeWidth={3} />
                          </m.span>
                        ) : state === "active" ? (
                          <Loader2 className="size-4 animate-spin text-[#10b981]" />
                        ) : (
                          <span className="size-1.5 rounded-full bg-[#333333]" />
                        )}
                      </span>
                      <span
                        className={
                          state === "active"
                            ? "font-mono text-[13px] tracking-wide text-white"
                            : state === "done"
                              ? "font-mono text-[13px] tracking-wide text-[#8a8a8a] line-through decoration-[#333333]"
                              : "font-mono text-[13px] tracking-wide text-[#555555]"
                        }
                      >
                        {step.label}
                      </span>
                    </m.div>
                  );
                })}
              </div>

              <div className="h-[3px] w-full overflow-hidden rounded-full bg-[#1c1c1c]">
                <m.div
                  className="h-full rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981]"
                  style={{ transformOrigin: "left center" }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: done ? 1 : Math.min(1, stepIndex / STEPS.length) }}
                  transition={{ duration: done ? 0.3 : TOTAL / STEPS.length / 1000, ease: "easeInOut" }}
                />
              </div>

              <AnimatePresence mode="wait">
                <m.p
                  key={done ? "ready" : "working"}
                  className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#666666]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {done ? "Workspace ready" : "Preparing your workspace"}
                </m.p>
              </AnimatePresence>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
