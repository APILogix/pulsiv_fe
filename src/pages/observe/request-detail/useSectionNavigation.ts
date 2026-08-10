import { useCallback, useEffect, useRef, useState } from "react";
import { REQUEST_SECTIONS, sectionDomId } from "./helpers";
import type { RequestSectionId } from "./types";

/** Tracks which section is in view and scrolls to a section on nav click. */
export function useSectionNavigation(enabled: boolean) {
  const [activeId, setActiveId] = useState<RequestSectionId>("overview");
  const lockRef = useRef(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const nodes = REQUEST_SECTIONS
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
        const match = REQUEST_SECTIONS.find((section) => sectionDomId(section.id) === top.target.id);
        if (match) setActiveId(match.id);
      },
      { root: document.querySelector(".scroll-region"), rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [enabled]);

  const scrollTo = useCallback((id: RequestSectionId) => {
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
