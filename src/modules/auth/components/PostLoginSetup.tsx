/* Hallmark · pre-emit critique: P5 H4 E5 S5 R5 V4 */
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { ORGANIZATION_SETUP_FLAG } from "../services/post-login-setup-flag";

/** One-time workspace setup shown only after organization creation. */
export function PostLoginSetup() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(() => {
    try { return sessionStorage.getItem(ORGANIZATION_SETUP_FLAG) === "1"; }
    catch { return false; }
  });

  useEffect(() => {
    if (!active) return;
    try { sessionStorage.removeItem(ORGANIZATION_SETUP_FLAG); } catch { /* storage unavailable */ }
    const timer = window.setTimeout(() => setActive(false), reduceMotion ? 150 : 300);
    return () => window.clearTimeout(timer);
  }, [active, reduceMotion]);

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {active && (
          <m.div role="status" aria-live="polite" aria-busy="true" className="fixed inset-0 z-[110] flex min-h-dvh items-center justify-center bg-[var(--bg)]/90 backdrop-blur-sm px-5" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <m.div className="w-full max-w-[340px] rounded-xl border border-border bg-[var(--bg1)] p-5 shadow-2xl" initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)]"><Check className="size-4 text-[var(--green)]" aria-hidden="true" /></span>
                <div><p className="text-[13px] font-medium text-[var(--text)]">Organization created</p><p className="mt-0.5 text-[12px] text-[var(--text3)]">Opening workspace</p></div>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}

