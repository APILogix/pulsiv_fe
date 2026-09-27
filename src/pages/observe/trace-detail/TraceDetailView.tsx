import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, GitBranch } from "lucide-react";
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
import { useSectionNavigation } from "./useSectionNavigation";
import { buildSpanTree, sectionDomId, formatDurationMs, formatPercent } from "./helpers";
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
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-6 py-8">
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !data?.entity) {
    return (
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-6 py-8">
        <Button variant="ghost" className="w-fit gap-2" onClick={() => navigate("/observability/traces")}>
          <ArrowLeft className="size-4" />
          Back to Traces
        </Button>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg1)] px-8 py-16 text-center shadow-xs">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--bg2)] text-[var(--text3)]">
            <GitBranch className="size-6" />
          </div>
          <h1 className="mt-4 text-[18px] font-semibold text-[var(--text)]">Trace Not Found</h1>
          <p className="mt-2 max-w-md mx-auto text-[13.5px] leading-relaxed text-[var(--text3)]">
            Could not find trace record for ID: <code className="font-[family-name:var(--mono)] font-semibold text-[var(--text2)]">{id}</code>. Check the ID or return to the trace explorer.
          </p>
          <div className="mt-6">
            <Button variant="primary" onClick={() => navigate("/observability/traces")}>
              View All Traces
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const aiResult = aiOverride !== undefined ? aiOverride : data.ai?.aiResponse;
  const totalDurationMs = data.entity?.totalDurationMs ?? data.entity?.durationMs ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-8 px-6 py-6 pb-28">
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
      <SectionNavigation activeId={activeId} onSelect={scrollTo} />

      {/* Section Content */}
      <div className="flex flex-col gap-8">
        {/* Overview Section */}
        <SectionShell
          id={sectionDomId("overview")}
          title="Trace Overview & Topology"
          description="High-level identity, root execution profile, and telemetry environment."
        >
          <KeyValueGrid
            columns={3}
            items={[
              { label: "Root Span Operation", value: data.entity?.rootSpanName || data.entity?.name, mono: true },
              { label: "Trace ID", value: data.entity?.traceId, mono: true, copyable: true },
              { label: "Public ID", value: data.publicId || data.entity?.publicId, mono: true, copyable: true },
              { label: "Internal Calculation Time", value: executionBreakdown ? `${formatDurationMs(executionBreakdown.internalComputeMs)} (${formatPercent(executionBreakdown.internalComputePercent)})` : "—", mono: true },
              { label: "Database Calls Duration", value: executionBreakdown ? `${formatDurationMs(executionBreakdown.databaseMs)} (${executionBreakdown.databaseCount} ${executionBreakdown.databaseCount === 1 ? 'call' : 'calls'})` : "—", mono: true },
              { label: "External HTTP Duration", value: executionBreakdown ? `${formatDurationMs(executionBreakdown.httpMs)} (${executionBreakdown.httpCount} ${executionBreakdown.httpCount === 1 ? 'call' : 'calls'})` : "0 ms", mono: true },
              { label: "Environment", value: data.entity?.environment },
              { label: "Project", value: data.entity?.projectName || data.entity?.project },
              { label: "Total Spans in Tree", value: flatList.length },
              { label: "Origin Service", value: data.entity?.service || "—", copyable: true },
              { label: "Release Version", value: data.entity?.release || "—", copyable: true },
              { label: "Root Execution Status", value: (data.entity?.rootSpanStatus || data.entity?.status || "ok").toUpperCase(), mono: true },
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
    </div>
  );
}
