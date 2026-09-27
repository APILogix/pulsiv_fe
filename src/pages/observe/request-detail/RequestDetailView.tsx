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
      // Keep existing AI panel; surface failure via unchanged state
    } finally {
      setAnalyzing(false);
    }
  }, [activeOrgId, data, scrollTo]);

  if (isLoading) return <RequestDetailSkeleton />;

  if (error || !data?.header) {
    return (
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-6 py-8">
        <Button variant="ghost" className="w-fit gap-2" onClick={() => navigate("/observability/requests")}>
          <ArrowLeft className="size-4" />
          Back to Requests
        </Button>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg1)] px-8 py-16 text-center shadow-xs">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--bg2)] text-[var(--text3)]">
            <ArrowLeft className="size-6" />
          </div>
          <h1 className="mt-4 text-[18px] font-semibold text-[var(--text)]">Request Not Found</h1>
          <p className="mt-2 max-w-md mx-auto text-[13.5px] leading-relaxed text-[var(--text3)]">
            Could not find request record for ID: <code className="font-[family-name:var(--mono)] font-semibold text-[var(--text2)]">{id}</code>. Check the ID or return to the requests explorer.
          </p>
          <div className="mt-6">
            <Button variant="primary" onClick={() => navigate("/observability/requests")}>
              View All Requests
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const aiResponse = aiOverride !== undefined ? aiOverride : data.ai?.aiResponse;

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-8 px-6 py-6 pb-28">
      {/* Sticky Top Header */}
      <StickyRequestHeader header={data.header} onAnalyze={runAnalyze} />

      {/* Summary KPI Strip */}
      <SummaryCards cards={data.summaryCards} />

      {/* Sticky Segmented Navigation */}
      <SectionNavigation activeId={activeId} onSelect={scrollTo} />

      {/* Structured Investigation Sections */}
      <div className="flex flex-col gap-8">
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
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-6 py-8">
      <DetailSkeleton />
    </div>
  );
}
