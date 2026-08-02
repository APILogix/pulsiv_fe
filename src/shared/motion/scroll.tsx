import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigationType } from "react-router";
import { ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { DURATION, EASE } from "./tokens";
import { useMotionPreference } from "./MotionProvider";

/**
 * Scroll experience — Phase 9.
 *
 * Constraints honoured:
 *  - one passive scroll listener per container, and it only writes to a ref;
 *  - position is committed to a module-level Map (not state), so scrolling never
 *    triggers a React render;
 *  - restoration happens in a rAF after paint, so we measure a laid-out DOM and
 *    never fight the browser for the same frame.
 */

/** pathname → scrollTop. Module-level so it survives route unmounts. */
const positions = new Map<string, number>();

/**
 * useScrollRestoration — remembers where the user was in each route.
 *
 * Back/forward restores the saved offset; a fresh navigation starts at the top.
 * That distinction is why this exists instead of a blanket "scroll to top": in a
 * dense observability app, losing your place in a 500-row table on back is worse
 * than any animation problem.
 */
export function useScrollRestoration(ref: React.RefObject<HTMLElement | null>) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const key = location.pathname + location.search;

  // Track the live offset without re-rendering.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        positions.set(key, node.scrollTop);
      });
    };

    node.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      node.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
      // Commit the final offset on unmount/route change.
      positions.set(key, node.scrollTop);
    };
  }, [key, ref]);

  // Apply the right offset for the new route.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const target = navigationType === "POP" ? (positions.get(key) ?? 0) : 0;

    // Forward navigation is trivial: the top is always reachable.
    if (target === 0) {
      const frame = requestAnimationFrame(() => {
        node.scrollTop = 0;
      });
      return () => cancelAnimationFrame(frame);
    }

    /**
     * Restoring on back is not a single-frame job. The destination is usually a
     * lazy chunk whose data has not landed, so on the first frame the container
     * is only a skeleton tall — assigning `scrollTop = target` would be clamped
     * to the current `scrollHeight` and the position lost for good.
     *
     * So we keep re-applying it across frames until the content is genuinely
     * tall enough to hold the offset, then stop. Two guards keep that honest:
     *   - a ~1s deadline, for pages whose content never reaches the old height
     *     (a list that came back shorter), where the last clamped value is the
     *     correct answer;
     *   - an abort on any user scroll input, because fighting someone who has
     *     already started scrolling is worse than losing their old position.
     */
    let frame = 0;
    let aborted = false;
    const deadline = performance.now() + 1000;

    const abort = () => {
      aborted = true;
    };

    const apply = () => {
      if (aborted) return;
      const reachable = node.scrollHeight - node.clientHeight;
      node.scrollTop = Math.min(target, Math.max(reachable, 0));

      const settled = reachable >= target;
      if (settled || performance.now() > deadline) return;
      frame = requestAnimationFrame(apply);
    };

    node.addEventListener("wheel", abort, { passive: true, once: true });
    node.addEventListener("touchstart", abort, { passive: true, once: true });
    node.addEventListener("keydown", abort, { once: true });

    frame = requestAnimationFrame(apply);
    return () => {
      aborted = true;
      cancelAnimationFrame(frame);
      node.removeEventListener("wheel", abort);
      node.removeEventListener("touchstart", abort);
      node.removeEventListener("keydown", abort);
    };
  }, [key, navigationType, ref]);
}

/**
 * SectionReveal — fades a section in as it enters the viewport.
 *
 * Uses framer's IntersectionObserver-backed `whileInView` (no scroll handler)
 * and fires once, so long pages don't keep observers alive.
 */
export function SectionReveal({
  children,
  className,
  delay = 0,
  distance = 12,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px" }}
      transition={{ duration: DURATION.slow, ease: EASE.standard, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Smooth-scroll a container to an anchor, respecting reduced motion. */
export function scrollToAnchor(
  container: HTMLElement | null,
  anchorId: string,
  options: { offset?: number; reduced?: boolean } = {},
) {
  const target = document.getElementById(anchorId);
  if (!target) return;
  const { offset = 16, reduced = false } = options;

  if (container) {
    const top = target.offsetTop - container.offsetTop - offset;
    container.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    return;
  }
  target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}

/**
 * ScrollToTop — appears once the container is scrolled past `showAfter`.
 *
 * Visibility is toggled by writing a data attribute straight to the DOM node in
 * the scroll handler, so scrolling stays render-free.
 */
export function ScrollToTop({
  targetRef,
  showAfter = 600,
  className,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  showAfter?: number;
  className?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { reduced } = useMotionPreference();

  useEffect(() => {
    const node = targetRef.current;
    const button = buttonRef.current;
    if (!node || !button) return;

    let frame = 0;
    const sync = () => {
      frame = 0;
      button.dataset.visible = node.scrollTop > showAfter ? "true" : "false";
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(sync);
    };

    sync();
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      node.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [showAfter, targetRef]);

  return (
    <button
      ref={buttonRef}
      type="button"
      data-visible="false"
      onClick={() =>
        targetRef.current?.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })
      }
      className={cn(
        "fixed bottom-6 right-6 z-40 flex size-9 items-center justify-center rounded-full border border-[var(--border2)] bg-[var(--bg1)]/90 text-[var(--text2)] shadow-[var(--shadow-toast)] backdrop-blur-sm",
        "transition-[opacity,transform] duration-200 ease-out",
        "data-[visible=false]:pointer-events-none data-[visible=false]:translate-y-2 data-[visible=false]:opacity-0",
        "data-[visible=true]:translate-y-0 data-[visible=true]:opacity-100",
        "hover:text-[var(--text)]",
        className,
      )}
    >
      <ArrowUp className="size-4" aria-hidden="true" />
      <span className="sr-only">Scroll to top</span>
    </button>
  );
}

/**
 * StickyHeader — a sticky bar that gains a hairline + blur once content scrolls
 * under it. Class toggling happens on the node itself, not via state.
 */
export function StickyHeader({
  children,
  scrollRef,
  className,
  threshold = 8,
}: {
  children: ReactNode;
  scrollRef: React.RefObject<HTMLElement | null>;
  className?: string;
  threshold?: number;
}) {
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    const header = headerRef.current;
    if (!node || !header) return;

    let frame = 0;
    const sync = () => {
      frame = 0;
      header.dataset.stuck = node.scrollTop > threshold ? "true" : "false";
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(sync);
    };

    sync();
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      node.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scrollRef, threshold]);

  return (
    <div
      ref={headerRef}
      data-stuck="false"
      className={cn(
        "sticky top-0 z-20 transition-[background-color,border-color,backdrop-filter] duration-200 ease-out",
        "data-[stuck=true]:border-b data-[stuck=true]:border-[var(--border)] data-[stuck=true]:bg-[var(--bg)]/85 data-[stuck=true]:backdrop-blur-md",
        "data-[stuck=false]:border-b data-[stuck=false]:border-transparent",
        className,
      )}
    >
      {children}
    </div>
  );
}
