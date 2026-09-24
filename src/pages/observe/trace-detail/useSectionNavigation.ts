import { useState, useEffect, useCallback } from "react";
import { sectionDomId } from "./helpers";

export type TraceSectionId = "overview" | "waterfall" | "ai" | "correlations";

export const TRACE_SECTIONS: { id: TraceSectionId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "waterfall", label: "Span Waterfall" },
  { id: "ai", label: "AI Investigation" },
  { id: "correlations", label: "Correlated Signals" },
];

export function useSectionNavigation(isReady: boolean) {
  const [activeId, setActiveId] = useState<TraceSectionId>("overview");

  useEffect(() => {
    if (!isReady) return;

    const handleScroll = () => {
      const scrollPos = window.scrollY + 160;
      for (const section of [...TRACE_SECTIONS].reverse()) {
        const el = document.getElementById(sectionDomId(section.id));
        if (el && el.offsetTop <= scrollPos) {
          setActiveId(section.id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isReady]);

  const scrollTo = useCallback((id: TraceSectionId) => {
    setActiveId(id);
    const el = document.getElementById(sectionDomId(id));
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 130;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, []);

  return { activeId, scrollTo };
}
