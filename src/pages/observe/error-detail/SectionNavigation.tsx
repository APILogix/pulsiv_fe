import { SectionTabs } from "@/shared/observe";
import { ERROR_SECTIONS } from "./helpers";
import type { ErrorSectionId } from "./types";

export function SectionNavigation({
  activeId,
  onSelect,
  trailing,
}: {
  activeId: ErrorSectionId;
  onSelect: (id: ErrorSectionId) => void;
  trailing?: React.ReactNode;
}) {
  return <SectionTabs label="Error sections" items={ERROR_SECTIONS} activeId={activeId} onSelect={onSelect} trailing={trailing} />;
}
