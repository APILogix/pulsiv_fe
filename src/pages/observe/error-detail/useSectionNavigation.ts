import { useCallback, useEffect, useRef, useState } from "react";
import { ERROR_SECTIONS, sectionDomId } from "./helpers";
import type { ErrorSectionId } from "./types";

/** Tracks which section is in view and scrolls to a section on sub-nav click. */
export function useSectionNavigation(enabled: boolean) {
  const [activeId, setActiveId] = useState<ErrorSectionId>("overview");
  const lockRef = useRef(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const nodes = ERROR_SECTIONS
      .map((section) => document.getElementById(sectionDomId(section.id)))
      .filter((node): node is HTMLElement => node !== null);

    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (lockRef.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (!top?.target?.id) return;
        const match = ERROR_SECTIONS.find((section) => sectionDomId(section.id) === top.target.id);
        if (match) setActiveId(match.id);
      },
      { root: document.querySelector(".scroll-region"), rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [enabled]);

  const scrollTo = useCallback((id: ErrorSectionId) => {
    const node = document.getElementById(sectionDomId(id));
    if (!node) return;
    lockRef.current = true;
    setActiveId(id);
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    if (lockTimer.current) clearTimeout(lockTimer.current);
    lockTimer.current = setTimeout(() => {
      lockRef.current = false;
    }, 700);
  }, []);

  useEffect(() => () => {
    if (lockTimer.current) clearTimeout(lockTimer.current);
  }, []);

  return { activeId, scrollTo };
}
