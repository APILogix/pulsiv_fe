import { SectionTabs } from "@/shared/observe";
import { REQUEST_SECTIONS } from "./helpers";
import type { RequestSectionId } from "./types";

export function SectionNavigation({
  activeId,
  onSelect,
  trailing,
}: {
  activeId: RequestSectionId;
  onSelect: (id: RequestSectionId) => void;
  trailing?: React.ReactNode;
}) {
  return <SectionTabs label="Request sections" items={REQUEST_SECTIONS} activeId={activeId} onSelect={onSelect} trailing={trailing} />;
}
