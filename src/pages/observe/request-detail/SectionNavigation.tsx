import { cn } from "@/lib/utils";
import { REQUEST_SECTIONS } from "./helpers";
import type { RequestSectionId } from "./types";

export function SectionNavigation({
  activeId,
  onSelect,
}: {
  activeId: RequestSectionId;
  onSelect: (id: RequestSectionId) => void;
}) {
  return (
    <nav
      aria-label="Request sections"
      className="sticky top-[4.75rem] z-20 -mx-6 border-b border-[var(--border)] bg-[var(--bg)]/90 px-6 backdrop-blur-md"
    >
      <div className="sidebar-scroll flex gap-1 overflow-x-auto py-2">
        {REQUEST_SECTIONS.map((section) => {
          const active = section.id === activeId;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              className={cn(
                "shrink-0 rounded-[var(--radius)] px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]",
                active
                  ? "bg-[var(--bg2)] text-[var(--text)]"
                  : "text-[var(--text3)] hover:bg-[var(--bg2)] hover:text-[var(--text2)]",
              )}
              aria-current={active ? "true" : undefined}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
