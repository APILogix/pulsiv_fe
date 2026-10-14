import { useState, useCallback, useMemo } from "react";
import { DetailNotFound, DetailPage, DetailSkeleton, StatusBadge } from "@/shared/observe";
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
import { useSectionNavigation } from "./useSectionNavigation";
import { buildSpanTree, sectionDomId, formatDurationMs, formatPercent } from "./helpers";
import { SectionShell, KeyValueGrid } from "./ui";
import type { TraceDetailData } from "./types";

export function TraceDetailView({ traceId }: { traceId: string }) {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const id = decodeURIComponent(traceId);

  const { data, isLoading, error } = useObservabilityDetail<TraceDetailData>("traces", id);
  const { activeId, scrollTo } = useSectionNavigation(Boolean(data));

  const [analyzing, setAnalyzing] = useState(false);
  const [aiOverride, setAiOverride] = useState<unknown>(undefined);

  // Build hierarchical span tree and calculate metrics
  const { tree, flatList, bottleneckNode, maxDepth, hasMissingParents, executionBreakdown, executionGaps } = useMemo(() => {
    if (!data) return { tree: [], flatList: [], bottleneckNode: null, maxDepth: 0, hasMissingParents: false, executionBreakdown: undefined, executionGaps: [] };
    const rawSpans = data.spans ?? [];
    const totalDuration = data.entity?.totalDurationMs ?? data.entity?.durationMs ?? 0;
    const { tree, flatList, bottleneckNode, hasMissingParents, executionBreakdown, executionGaps } = buildSpanTree(
      rawSpans,
      totalDuration,
      data.entity?.occurredAt,
    );
    const maxDepth = flatList.reduce((max, node) => Math.max(max, node.depth), 0);
    return { tree, flatList, bottleneckNode, maxDepth, hasMissingParents, executionBreakdown, executionGaps };
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
      <DetailPage>
        <DetailSkeleton />
      </DetailPage>
    );
  }

  if (error || !data?.entity) {
    return <DetailNotFound kind="Trace" id={id} backTo="/observability/traces" backLabel="Traces" />;
  }
  const aiResult = aiOverride !== undefined ? aiOverride : data.ai?.aiResponse;
  const totalDurationMs = data.entity?.totalDurationMs ?? data.entity?.durationMs ?? 0;

  return (
    <DetailPage>
      {/* Sticky Header */}
      <StickyTraceHeader
        detail={data}
        onAnalyze={() => void handleRunAnalysis("performance")}
        analyzing={analyzing}
      />

      {/* Summary KPI Strip */}
      <SummaryCards
        detail={data}
        bottleneck={bottleneckNode}
        treeDepth={maxDepth}
        spanCount={flatList.length}
        executionBreakdown={executionBreakdown}
      />

      {/* Sticky Section Navigation */}
      <SectionNavigation activeId={activeId} onSelect={scrollTo} trailing={<span className="flex max-w-[360px] items-center gap-2 text-[12px]"><StatusBadge status={String(data.entity?.rootSpanStatus || data.entity?.status || "ok").toLowerCase()} /><span className="truncate font-[family-name:var(--mono)] text-[var(--text2)]">{data.entity?.rootSpanName || data.entity?.name}</span><span className="font-[family-name:var(--mono)] tabular-nums text-[var(--text3)]">{formatDurationMs(totalDurationMs)}</span></span>} />

      {/* Section Content */}
      <div className="flex flex-col gap-4">
        {/* Overview Section */}
        <SectionShell
          id={sectionDomId("overview")}
          title="Overview"
          description="Identity of the trace and where its time went."
        >
          <KeyValueGrid
            columns={2}
            items={[
              { label: "Root operation", value: data.entity?.rootSpanName || data.entity?.name, mono: true },
              { label: "Trace ID", value: data.entity?.traceId, mono: true, copyable: true },
              { label: "Public ID", value: data.publicId || data.entity?.publicId, mono: true, copyable: true },
              { label: "In-process time", value: executionBreakdown ? `${formatDurationMs(executionBreakdown.internalComputeMs)} (${formatPercent(executionBreakdown.internalComputePercent)})` : "—", mono: true },
              { label: "Database time", value: executionBreakdown ? `${formatDurationMs(executionBreakdown.databaseMs)} (${executionBreakdown.databaseCount} ${executionBreakdown.databaseCount === 1 ? 'call' : 'calls'})` : "—", mono: true },
              { label: "Outbound HTTP time", value: executionBreakdown ? `${formatDurationMs(executionBreakdown.httpMs)} (${executionBreakdown.httpCount} ${executionBreakdown.httpCount === 1 ? 'call' : 'calls'})` : "0 ms", mono: true },
              { label: "Environment", value: data.entity?.environment },
              { label: "Project", value: data.entity?.projectName || data.entity?.project },
              { label: "Spans", value: flatList.length },
              { label: "Service", value: data.entity?.service, copyable: true },
              { label: "Release", value: data.entity?.release, copyable: true },
              { label: "Root status", value: data.entity?.rootSpanStatus || data.entity?.status || "ok", mono: true },
            ]}
          />
        </SectionShell>

        {/* Visual Span Waterfall */}
        <div id={sectionDomId("waterfall")} className="scroll-mt-16">
          <SpanTreeWaterfall
            tree={tree}
            flatList={flatList}
            totalTraceDurationMs={totalDurationMs}
            bottleneck={bottleneckNode}
            executionBreakdown={executionBreakdown}
            executionGaps={executionGaps}
            traceId={data.entity?.traceId || id}
            tracePublicId={data.publicId || data.entity?.publicId}
            environment={data.entity?.environment}
            hasMissingParents={hasMissingParents}
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
      </div>
    </DetailPage>
  );
}
