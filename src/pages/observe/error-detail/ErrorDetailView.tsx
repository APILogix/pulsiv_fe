import { useMemo } from "react";
import { DetailNotFound, DetailPage, DetailSkeleton, SeverityBadge } from "@/shared/observe";
import { useObservabilityDetail } from "../hooks/useObservabilityApi";
import { StickyErrorHeader } from "./StickyErrorHeader";
import { SummaryCards } from "./SummaryCards";
import { SectionNavigation } from "./SectionNavigation";
import {
  BreadcrumbsSection,
  ContextSection,
  HttpSection,
  MetadataSection,
  OverviewSection,
  RelatedSection,
  StackTraceSection,
  TagsSection,
} from "./sections";
import { useSectionNavigation } from "./useSectionNavigation";
import { normalizeErrorDetail } from "./helpers";

export function ErrorDetailView({ errorId }: { errorId: string }) {
  const id = decodeURIComponent(errorId);
  const { data: rawData, isLoading, error } = useObservabilityDetail("errors", id);

  const data = useMemo(() => normalizeErrorDetail(rawData), [rawData]);
  const { activeId, scrollTo } = useSectionNavigation(Boolean(data));

  if (isLoading) {
    return (
      <DetailPage>
        <DetailSkeleton />
      </DetailPage>
    );
  }

  if (error || !data) {
    return <DetailNotFound kind="Error event" id={id} backTo="/observability/errors" backLabel="Errors" />;
  }

  return (
    <DetailPage>
      <StickyErrorHeader detail={data} />
      <SummaryCards detail={data} />
      <SectionNavigation
        activeId={activeId}
        onSelect={scrollTo}
        trailing={
          <span className="flex max-w-[360px] items-center gap-2 text-[12px]">
            <SeverityBadge severity={data.error?.severity ?? "error"} />
            <span className="truncate font-medium text-[var(--red)]">{data.error?.name ?? "Error"}</span>
          </span>
        }
      />
      <div className="flex flex-col gap-4">
        <OverviewSection detail={data} />
        <StackTraceSection detail={data} />
        <BreadcrumbsSection detail={data} />
        <HttpSection detail={data} />
        <ContextSection detail={data} />
        <MetadataSection detail={data} />
        <RelatedSection detail={data} />
        <TagsSection detail={data} />
      </div>
    </DetailPage>
  );
}
