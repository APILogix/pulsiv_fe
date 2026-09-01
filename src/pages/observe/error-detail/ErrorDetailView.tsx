import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { DetailSkeleton, Button } from "@/shared/observe";
import { ArrowLeft } from "lucide-react";
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
      <div className="flex flex-col gap-4">
        <Button variant="ghost" className="w-fit" onClick={() => navigate("/observability/errors")}>
          <ArrowLeft className="size-4" />
          Back to errors
        </Button>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] px-6 py-12 text-center">
          <h1 className="text-[16px] font-semibold text-[var(--text)]">Error event not found</h1>
          <p className="mt-2 text-[13px] text-[var(--text3)]">
            Could not retrieve error detail for ID: <code className="font-[family-name:var(--mono)]">{id}</code>. Check the ID or return to the error list.
          </p>
        </div>
      </div>
    );
  }

  const aiResponse = aiOverride !== undefined ? aiOverride : data.aiResponse;

  return (
    <div className="flex flex-col gap-6 pb-20">
      <StickyErrorHeader detail={data} onAnalyze={runAnalyze} />

      <SummaryCards detail={data} />

      <SectionNavigation activeId={activeId} onSelect={scrollTo} />

      <div className="flex flex-col gap-6">
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
    <div className="flex flex-col gap-5">
      <DetailSkeleton />
    </div>
  );
}
