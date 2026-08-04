import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { DURATION, EASE, SPRING } from "./tokens";

/**
 * Overlay motion — Phase 8 (dialogs, menus, drawers) + Phase 12 (focus safety).
 *
 * The app's Radix-based `Dialog`/`DropdownMenu` primitives keep their own
 * CSS-driven animation; these components cover the cases Radix isn't used for
 * (workflow surfaces, custom drawers) and the shared surface variants that keep
 * every popover feeling identical.
 *
 * Focus rules honoured here:
 *  - focus moves into the panel on open and returns to the trigger on close;
 *  - Tab cycles inside the panel while it is open;
 *  - Escape always closes;
 *  - decorative layers are `aria-hidden`, so screen readers ignore the motion.
 */

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function useFocusTrap(active: boolean, panelRef: React.RefObject<HTMLElement | null>) {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    previousFocus.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null,
      );
      if (nodes.length === 0) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus({ preventScroll: true });
    };
  }, [active, panelRef]);
}

/** Lock body scroll while an overlay owns the screen (prevents layout jump). */
function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [active]);
}

/* ─────────────────────────────── modal ────────────────────────────── */

export function AnimatedModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  showClose = true,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  showClose?: boolean;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const width = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.fast, ease: EASE.standard }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[3px]"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={cn(
              "relative w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border2)] bg-[var(--bg1)] text-[13px] text-[var(--text)] shadow-[var(--shadow-modal)] outline-none",
              width,
              className,
            )}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: DURATION.base, ease: EASE.standard }}
          >
            <div className="flex flex-col gap-2 p-4">
              <h2 className="text-[15px] font-semibold leading-none text-[var(--text)]">{title}</h2>
              {description && (
                <p className="text-[13px] leading-[1.5] text-[var(--text2)]">{description}</p>
              )}
            </div>
            {children && <div className="px-4 pb-4">{children}</div>}
            {footer && (
              <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] bg-[var(--bg2)]/60 p-4 sm:flex-row sm:justify-end">
                {footer}
              </div>
            )}
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-[var(--radius)] text-[var(--text2)] transition-colors duration-150 hover:bg-[var(--bg2)] hover:text-[var(--text)]"
              >
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────── drawer ───────────────────────────── */

/** AnimatedDrawer — right-hand detail panel. Slides on `x` only. */
export function AnimatedDrawer({
  open,
  onClose,
  title,
  children,
  footer,
  width = "480px",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const panelRef = useRef<HTMLElement>(null);
  useFocusTrap(open, panelRef);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.fast, ease: EASE.standard }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            style={{ width, maxWidth: "100vw" }}
            className="absolute inset-y-0 right-0 flex flex-col border-l border-[var(--border)] bg-[var(--bg1)] shadow-[var(--shadow-modal)] outline-none"
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 16, opacity: 0 }}
            transition={SPRING.snappy}
          >
            <header className="flex h-[var(--header-height)] shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4">
              <h2 className="truncate text-[14px] font-semibold text-[var(--text)]">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="flex size-7 items-center justify-center rounded-[var(--radius)] text-[var(--text2)] transition-colors duration-150 hover:bg-[var(--bg2)] hover:text-[var(--text)]"
              >
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </button>
            </header>
            <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
            {footer && (
              <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--bg2)]/60 p-4">
                {footer}
              </footer>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────── shared popover surface ─────────────────── */

/**
 * MotionSurface — the scale+fade used by every floating surface.
 *
 * Drop it *inside* a Radix `Content` (with `forceMount` if you need exit
 * animation) so positioning stays with Radix and only the motion is ours.
 */
export function MotionSurface({
  children,
  className,
  origin = "top",
}: {
  children: ReactNode;
  className?: string;
  origin?: "top" | "bottom" | "center";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: origin === "bottom" ? 4 : -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: DURATION.fast, ease: EASE.standard }}
      style={{
        transformOrigin:
          origin === "center" ? "center" : origin === "bottom" ? "bottom center" : "top center",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
