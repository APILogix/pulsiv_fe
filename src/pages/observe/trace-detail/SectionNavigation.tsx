import { SectionTabs } from "@/shared/observe";
import { TRACE_SECTIONS, type TraceSectionId } from "./useSectionNavigation";

export function SectionNavigation({
  activeId,
  onSelect,
  trailing,
}: {
  activeId: TraceSectionId;
  onSelect: (id: TraceSectionId) => void;
  trailing?: React.ReactNode;
}) {
  return <SectionTabs label="Trace sections" items={TRACE_SECTIONS} activeId={activeId} onSelect={onSelect} trailing={trailing} />;
}
