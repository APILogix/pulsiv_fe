import { DetailNotFound, DetailPage, DetailSkeleton, MethodBadge, StatusCodeBadge, formatLatency } from "@/shared/observe";
import { useObservabilityDetail } from "../hooks/useObservabilityApi";
import { StickyRequestHeader } from "./StickyRequestHeader";
import { SummaryCards } from "./SummaryCards";
import { SectionNavigation } from "./SectionNavigation";
import {
  ContextSection,
  HttpSection,
  MetadataSection,
  OverviewSection,
  PerformanceSection,
  RelatedSection,
  TagsSection,
} from "./sections";
import { useSectionNavigation } from "./useSectionNavigation";
import type { RequestDetailResponse } from "./types";

export function RequestDetailView({ requestId }: { requestId: string }) {
  const id = decodeURIComponent(requestId);
  const { data, isLoading, error } = useObservabilityDetail<RequestDetailResponse>("requests", id);
  const { activeId, scrollTo } = useSectionNavigation(Boolean(data));

  if (isLoading) {
    return (
      <DetailPage>
        <DetailSkeleton />
      </DetailPage>
    );
  }

  if (error || !data?.header) {
    return <DetailNotFound kind="Request" id={id} backTo="/observability/requests" backLabel="Requests" />;
  }

  const header = data.header;

  return (
    <DetailPage>
      <StickyRequestHeader header={header} />
      <SummaryCards cards={data.summaryCards} />
      <SectionNavigation
        activeId={activeId}
        onSelect={scrollTo}
        trailing={
          <span className="flex items-center gap-2 text-[12px]">
            <MethodBadge method={header.method} />
            <span className="max-w-[260px] truncate font-[family-name:var(--mono)] text-[var(--text2)]">{header.endpoint}</span>
            <StatusCodeBadge code={header.statusCode} />
            {header.duration != null && <span className="font-[family-name:var(--mono)] tabular-nums text-[var(--text3)]">{formatLatency(header.duration)}</span>}
          </span>
        }
      />

      <div className="flex flex-col gap-4">
        <OverviewSection header={data.header} http={data.http} />
        <HttpSection http={data.http} />
        <PerformanceSection
          performance={data.performance}
          summary={data.summaryCards}
          tracePublicId={data.trace?.publicId ?? data.header.tracePublicId}
        />
        <ContextSection context={data.context} />
        <MetadataSection metadata={data.metadata} />
        <RelatedSection related={data.related} />
        <TagsSection tags={data.tags ?? []} />
      </div>
    </DetailPage>
  );
}
