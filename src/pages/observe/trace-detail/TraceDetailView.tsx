import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button, DetailSkeleton } from "@/shared/observe";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import {
  useObservabilityDetail,
  askObservabilityEvent,
  type AIIntent,
} from "../hooks/useObservabilityApi";
import { StickyTraceHeader } from "./StickyTraceHeader";
import { SummaryCards } from "./SummaryCards";
import { SectionNavigation } from "./SectionNavigation";
import { SpanTreeWaterfall } from "./SpanTreeWaterfall";
import { AIInvestigationSection } from "./AIInvestigationSection";
import { CorrelatedSignalsSection } from "./CorrelatedSignalsSection";
import { DeveloperToolsSection } from "./DeveloperToolsSection";
import { useSectionNavigation } from "./useSectionNavigation";
import { buildSpanTree, toCopyableJson, sectionDomId } from "./helpers";
import { SectionShell, KeyValueGrid } from "./ui";
import type { TraceDetailData } from "./types";

export function TraceDetailView({ traceId }: { traceId: string }) {
  const navigate = useNavigate();
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const id = decodeURIComponent(traceId);

  const { data, isLoading, error } = useObservabilityDetail<TraceDetailData>("traces", id);
  const { activeId, scrollTo } = useSectionNavigation(Boolean(data));

  const [analyzing, setAnalyzing] = useState(false);
  const [aiOverride, setAiOverride] = useState<unknown>(undefined);

  // Build hierarchical span tree and calculate metrics
  const { tree, flatList, bottleneckNode, maxDepth } = useMemo(() => {
    if (!data) return { tree: [], flatList: [], bottleneckNode: null, maxDepth: 0 };
    const rawSpans = data.spans ?? [];
    const totalDuration = data.entity?.totalDurationMs ?? data.entity?.durationMs ?? 0;
    const { tree, flatList, bottleneckNode } = buildSpanTree(
      rawSpans,
      totalDuration,
      data.entity?.occurredAt,
    );
    const maxDepth = flatList.reduce((max, node) => Math.max(max, node.depth), 0);
    return { tree, flatList, bottleneckNode, maxDepth };
  }, [data]);

  const handleRunAnalysis = useCallback(
    async (intent: AIIntent = "performance", question?: string) => {
      if (!activeOrgId || !data) return;
      setAnalyzing(true);
      try {
        const targetId = data.publicId || data.entity?.publicId || data.id || id;
        const result = await askObservabilityEvent(activeOrgId, "traces", targetId, intent, question);
        setAiOverride(result);
        scrollTo("ai");
      } catch (err) {
        console.error("AI Investigation error:", err);
      } finally {
        setAnalyzing(false);
      }
    },
    [activeOrgId, data, id, scrollTo],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !data?.entity) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" className="w-fit" onClick={() => navigate("/observability/traces")}>
          <ArrowLeft className="size-4" />
          Back to traces
        </Button>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] px-6 py-12 text-center">
          <h1 className="text-[16px] font-semibold text-[var(--text)]">Trace not found</h1>
          <p className="mt-2 text-[13px] text-[var(--text3)]">
            The trace "{id}" was not found or has expired past the retention window.
          </p>
        </div>
      </div>
    );
  }

  const aiResult = aiOverride !== undefined ? aiOverride : data.ai?.aiResponse;
  const totalDurationMs = data.entity?.totalDurationMs ?? data.entity?.durationMs ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-20">
      {/* Sticky Header */}
      <StickyTraceHeader
        detail={data}
        onAnalyze={() => void handleRunAnalysis("performance")}
        onCopyJson={() => navigator.clipboard?.writeText(toCopyableJson(data))}
        analyzing={analyzing}
      />

      {/* Summary Strip */}
      <SummaryCards
        detail={data}
        bottleneck={bottleneckNode}
        treeDepth={maxDepth}
        spanCount={flatList.length}
      />

      {/* Sticky Section Navigation */}
      <SectionNavigation activeId={activeId} onSelect={scrollTo} />

      {/* Section Content */}
      <div className="flex flex-col gap-6">
        {/* Overview Section */}
        <SectionShell
          id={sectionDomId("overview")}
          title="Trace Overview"
          description="High-level identity, root execution profile, and telemetry environment."
        >
          <KeyValueGrid
            columns={3}
            items={[
              { label: "Root Span", value: data.entity?.rootSpanName || data.entity?.name, mono: true },
              { label: "Trace ID", value: data.entity?.traceId, mono: true, copyable: true },
              { label: "Public ID", value: data.publicId || data.entity?.publicId, mono: true, copyable: true },
              { label: "Environment", value: data.entity?.environment },
              { label: "Project", value: data.entity?.projectName || data.entity?.project },
              { label: "Total Spans", value: flatList.length },
              { label: "Service", value: data.entity?.service || "—" },
              { label: "Release", value: data.entity?.release || "—" },
              { label: "Status", value: (data.entity?.rootSpanStatus || data.entity?.status || "ok").toUpperCase(), mono: true },
            ]}
          />
        </SectionShell>

        {/* Visual Span Waterfall */}
        <div id={sectionDomId("waterfall")} className="scroll-mt-36">
          <SpanTreeWaterfall
            tree={tree}
            flatList={flatList}
            totalTraceDurationMs={totalDurationMs}
            bottleneck={bottleneckNode}
          />
        </div>

        {/* AI Investigation Section */}
        <AIInvestigationSection
          detail={data}
          aiResult={aiResult}
          analyzing={analyzing}
          onRunAnalysis={handleRunAnalysis}
        />

        {/* Correlated Signals Section */}
        <CorrelatedSignalsSection detail={data} />

        {/* Developer Tools Section */}
        <DeveloperToolsSection detail={data} />
      </div>
    </div>
  );
}
