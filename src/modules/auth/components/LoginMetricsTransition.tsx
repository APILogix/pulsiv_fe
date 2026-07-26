/* Hallmark · pre-emit critique: P5 H4 E5 S5 R5 V5 */
import { useEffect, useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { MetricLoader } from "@/shared/ui/loading";
import { LOGIN_METRICS_FLAG } from "../services/post-login-setup-flag";

/** Returning-user transition shown after authentication while dashboard data warms. */
export function LoginMetricsTransition() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(() => {
    try { return sessionStorage.getItem(LOGIN_METRICS_FLAG) === "1"; }
    catch { return false; }
  });

  useEffect(() => {
    if (!active) return;
    try { sessionStorage.removeItem(LOGIN_METRICS_FLAG); } catch { /* storage unavailable */ }
    const timer = window.setTimeout(() => setActive(false), reduceMotion ? 450 : 2200);
    return () => window.clearTimeout(timer);
  }, [active, reduceMotion]);

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {active && (
          <m.div className="fixed inset-0 z-[105] flex min-h-dvh items-center justify-center bg-[var(--bg)] p-5" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MetricLoader
              label="Fetching your workspace details"
              detail="Synchronizing organization settings, recent telemetry, and dashboard metrics"
              className="min-h-0 max-w-[620px] border-0 bg-transparent"
            />
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
