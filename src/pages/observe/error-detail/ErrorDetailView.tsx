import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { DetailSkeleton, Button } from "@/shared/observe";
import { ArrowLeft, AlertOctagon } from "lucide-react";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import {
  askObservabilityEvent,
  useObservabilityDetail,
} from "../hooks/useObservabilityApi";
import { StickyErrorHeader } from "./StickyErrorHeader";
import { SummaryCards } from "./SummaryCards";
import { SectionNavigation } from "./SectionNavigation";
import {
  AISection,
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
  const navigate = useNavigate();
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const id = decodeURIComponent(errorId);
  const { data: rawData, isLoading, error } = useObservabilityDetail("errors", id);
  
  const data = useMemo(() => normalizeErrorDetail(rawData), [rawData]);
  const { activeId, scrollTo } = useSectionNavigation(Boolean(data));
  const [analyzing, setAnalyzing] = useState(false);
  const [aiOverride, setAiOverride] = useState<unknown>(undefined);

  const runAnalyze = useCallback(async () => {
    if (!activeOrgId || !data) return;
    setAnalyzing(true);
    try {
      const result = await askObservabilityEvent(activeOrgId, "errors", data.publicId, "root_cause");
      setAiOverride(result);
      scrollTo("ai");
    } catch {
      // Keep existing AI panel; surface failure via unchanged state
    } finally {
      setAnalyzing(false);
    }
  }, [activeOrgId, data, scrollTo]);

  if (isLoading) return <ErrorDetailSkeleton />;

  if (error || !data) {
    return (
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-6 py-8">
        <Button variant="ghost" className="w-fit gap-2" onClick={() => navigate("/observability/errors")}>
          <ArrowLeft className="size-4" />
          Back to Errors
        </Button>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg1)] px-8 py-16 text-center shadow-xs">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--bg2)] text-[var(--text3)]">
            <AlertOctagon className="size-6" />
          </div>
          <h1 className="mt-4 text-[18px] font-semibold text-[var(--text)]">Error Event Not Found</h1>
          <p className="mt-2 max-w-md mx-auto text-[13.5px] leading-relaxed text-[var(--text3)]">
            Could not find error record for ID: <code className="font-[family-name:var(--mono)] font-semibold text-[var(--text2)]">{id}</code>. Check the ID or return to the error explorer.
          </p>
          <div className="mt-6">
            <Button variant="primary" onClick={() => navigate("/observability/errors")}>
              View All Errors
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const aiResponse = aiOverride !== undefined ? aiOverride : data.aiResponse;

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-8 px-6 py-6 pb-28">
      {/* Sticky Header */}
      <StickyErrorHeader detail={data} onAnalyze={runAnalyze} />

      {/* Summary KPI Strip */}
      <SummaryCards detail={data} />

      {/* Sticky Section Navigation */}
      <SectionNavigation activeId={activeId} onSelect={scrollTo} />

      {/* Structured Sections */}
      <div className="flex flex-col gap-8">
        <OverviewSection detail={data} />
        <StackTraceSection detail={data} />
        <BreadcrumbsSection detail={data} />
        <HttpSection detail={data} />
        <ContextSection detail={data} />
        <MetadataSection detail={data} />
        <AISection aiResponse={aiResponse} analyzing={analyzing} onAnalyze={runAnalyze} />
        <RelatedSection detail={data} />
        <TagsSection detail={data} />
      </div>
    </div>
  );
}

function ErrorDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-6 py-8">
      <DetailSkeleton />
    </div>
  );
}
