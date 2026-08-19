import { Clock3, Layers, CheckCircle2, Zap } from "lucide-react";
import { KpiCard } from "@/shared/observe";
import { formatDurationMs, formatPercent } from "./helpers";
import type { TraceDetailData, SpanTreeNode } from "./types";

export function SummaryCards({
  detail,
  bottleneck,
  treeDepth,
  spanCount,
}: {
  detail: TraceDetailData;
  bottleneck: SpanTreeNode | null;
  treeDepth: number;
  spanCount: number;
}) {
  const entity = detail.entity;
  const durationMs = entity.totalDurationMs ?? entity.durationMs ?? 0;
  const status = entity.rootSpanStatus || entity.status || "ok";
  const isOk = status.toLowerCase() === "ok" || status.toLowerCase() === "success";

  const totalErrors = detail.counts?.errors ?? detail.relatedErrors?.length ?? 0;

  const bottleneckPercent = bottleneck && durationMs > 0 ? (bottleneck.durationMs / durationMs) * 100 : 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard
        label="Total duration"
        value={formatDurationMs(durationMs)}
        icon={Clock3}
        delta={durationMs < 50 ? "Fast" : durationMs < 500 ? "Normal" : "Slow"}
        trend={durationMs < 500 ? "up" : "down"}
      />
      <KpiCard
        label="Span tree"
        value={`${spanCount} ${spanCount === 1 ? "span" : "spans"}`}
        icon={Layers}
        delta={`Max depth ${treeDepth}`}
      />
      <KpiCard
        label="Execution status"
        value={isOk ? "Success (OK)" : "Failed"}
        icon={CheckCircle2}
        delta={totalErrors > 0 ? `${totalErrors} correlated errors` : "0 errors"}
        trend={isOk ? "up" : "down"}
      />
      <KpiCard
        label="Slowest operation"
        value={bottleneck ? formatDurationMs(bottleneck.durationMs) : "—"}
        icon={Zap}
        delta={bottleneck ? `${formatPercent(bottleneckPercent)} of trace` : undefined}
        trend={bottleneckPercent > 80 ? "down" : undefined}
      />
    </div>
  );
}
