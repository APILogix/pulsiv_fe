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
    const timer = window.setTimeout(() => setActive(false), reduceMotion ? 300 : 1700);
    return () => window.clearTimeout(timer);
  }, [active, reduceMotion]);

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {active && (
          <m.div role="status" aria-live="polite" aria-busy="true" className="fixed inset-0 z-[110] flex min-h-dvh items-center justify-center bg-[var(--bg)] px-5" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <m.div className="w-full max-w-[360px]" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 border-y border-[var(--border)] py-5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)]"><Check className="size-4 text-[var(--green)]" aria-hidden="true" /></span>
                <div><p className="text-[13px] font-medium text-[var(--text)]">Organization created</p><p className="mt-0.5 text-[12px] text-[var(--text3)]">Setting up your workspace</p></div>
              </div>
              <div className="mt-5 h-0.5 overflow-hidden bg-[var(--bg3)]"><span className="auth-transition-progress block h-full bg-[var(--brand)]" /></div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
