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
    <nav aria-label="Trace sections" className="sticky top-[73px] z-20 -mx-6 border-b border-[var(--border)] bg-[var(--bg)]/95 px-6 backdrop-blur-md">
      <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
        {TRACE_SECTIONS.map((section) => {
          const isActive = activeId === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              className={cn(
                "whitespace-nowrap rounded-[var(--radius)] px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                isActive
                  ? "bg-[var(--bg2)] text-[var(--text)] shadow-xs"
                  : "text-[var(--text3)] hover:bg-[var(--bg1)] hover:text-[var(--text2)]",
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
