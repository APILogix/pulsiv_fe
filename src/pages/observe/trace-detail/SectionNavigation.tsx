import { cn } from "@/lib/utils";
import { TRACE_SECTIONS, type TraceSectionId } from "./useSectionNavigation";

export function SectionNavigation({
  activeId,
  onSelect,
}: {
  activeId: TraceSectionId;
  onSelect: (id: TraceSectionId) => void;
}) {
  return (
    <nav
      aria-label="Trace sections navigation"
      className="sticky top-[5.25rem] z-20 -mx-6 border-b border-[var(--border)] bg-[var(--bg)]/90 px-6 py-2.5 backdrop-blur-md"
    >
      <div className="sidebar-scroll flex items-center gap-1.5 overflow-x-auto py-0.5">
        {TRACE_SECTIONS.map((section) => {
          const isActive = activeId === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-[12px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] cursor-pointer",
                isActive
                  ? "bg-[var(--text)] text-[var(--bg)] font-semibold shadow-xs"
                  : "text-[var(--text3)] hover:bg-[var(--bg2)] hover:text-[var(--text)]",
              )}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
