import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { DetailSkeleton, Button } from "@/shared/observe";
import { ArrowLeft } from "lucide-react";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import {
  askObservabilityEvent,
  useObservabilityDetail,
} from "../hooks/useObservabilityApi";
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
  const navigate = useNavigate();
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
      // Keep existing AI panel; surface failure via unchanged state + user can retry.
    } finally {
      setAnalyzing(false);
    }
  }, [activeOrgId, data, scrollTo]);

  if (isLoading) return <RequestDetailSkeleton />;

  if (error || !data?.header) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" className="w-fit" onClick={() => navigate("/observability/requests")}>
          <ArrowLeft className="size-4" />
          Back to requests
        </Button>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] px-6 py-12 text-center">
          <h1 className="text-[16px] font-semibold text-[var(--text)]">Request not found</h1>
          <p className="mt-2 text-[13px] text-[var(--text3)]">
            Use a request public ID (REQ-…). UUID navigation is no longer supported for request detail.
          </p>
        </div>
      </div>
    );
  }

  const aiResponse = aiOverride !== undefined ? aiOverride : data.ai?.aiResponse;

  return (
    <div className="flex flex-col gap-6 pb-20">
      <StickyRequestHeader header={data.header} onAnalyze={runAnalyze} />

      <SummaryCards cards={data.summaryCards} />

      <SectionNavigation activeId={activeId} onSelect={scrollTo} />

      <div className="flex flex-col gap-6">
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
    </div>
  );
}

function RequestDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <DetailSkeleton />
    </div>
  );
}
