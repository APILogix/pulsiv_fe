import { useState, useEffect, useCallback, useRef } from "react";
import { sectionDomId } from "./helpers";

export type TraceSectionId = "overview" | "waterfall" | "ai" | "correlations";

export const TRACE_SECTIONS: { id: TraceSectionId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "waterfall", label: "Waterfall" },
  { id: "ai", label: "AI analysis" },
  { id: "correlations", label: "Related" },
];

/** Scroll-spy over the module scroll container (`.scroll-region`), not window. */
export function useSectionNavigation(isReady: boolean) {
  const [activeId, setActiveId] = useState<TraceSectionId>("overview");
  const lock = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isReady) return;
    const nodes = TRACE_SECTIONS
      .map((s) => document.getElementById(sectionDomId(s.id)))
      .filter((n): n is HTMLElement => n !== null);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (lock.current) return;
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const match = TRACE_SECTIONS.find((s) => sectionDomId(s.id) === top?.target.id);
        if (match) setActiveId(match.id);
      },
      { root: document.querySelector(".scroll-region"), rootMargin: "-20% 0px -55% 0px", threshold: [0.05, 0.3, 0.6] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [isReady]);

  const scrollTo = useCallback((id: TraceSectionId) => {
    const el = document.getElementById(sectionDomId(id));
    if (!el) return;
    lock.current = true;
    setActiveId(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { lock.current = false; }, 700);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { activeId, scrollTo };
}
