import { useCallback, useState } from "react";
import { DetailNotFound, DetailPage, DetailSkeleton, MethodBadge, StatusCodeBadge, formatLatency } from "@/shared/observe";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { askObservabilityEvent, useObservabilityDetail } from "../hooks/useObservabilityApi";
import { StickyRequestHeader } from "./StickyRequestHeader";
import { SummaryCards } from "./SummaryCards";
import { SectionNavigation } from "./SectionNavigation";
import {
  AISection,
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
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const id = decodeURIComponent(requestId);
  const { data, isLoading, error } = useObservabilityDetail<RequestDetailResponse>("requests", id);
  const { activeId, scrollTo } = useSectionNavigation(Boolean(data));
  const [analyzing, setAnalyzing] = useState(false);
  const [aiOverride, setAiOverride] = useState<unknown>(undefined);

  const runAnalyze = useCallback(async () => {
    if (!activeOrgId || !data) return;
    setAnalyzing(true);
    try {
      const result = await askObservabilityEvent(activeOrgId, "requests", data.header.publicId, "root_cause");
      setAiOverride(result);
      scrollTo("ai");
    } catch {
      // Keep the existing AI panel; the section shows its own retry.
    } finally {
      setAnalyzing(false);
    }
  }, [activeOrgId, data, scrollTo]);

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

  const aiResponse = aiOverride !== undefined ? aiOverride : data.ai?.aiResponse;
  const header = data.header;

  return (
    <DetailPage>
      <StickyRequestHeader header={header} onAnalyze={runAnalyze} />
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
        <AISection aiResponse={aiResponse} analyzing={analyzing} onAnalyze={runAnalyze} />
        <RelatedSection related={data.related} />
        <TagsSection tags={data.tags ?? []} />
      </div>
    </DetailPage>
  );
}
