import { ReadoutBand } from "@/shared/observe";
import type { ReadoutCell } from "@/shared/observe";
import { formatDurationMs, formatPercent } from "./helpers";
import type { TraceDetailData, SpanTreeNode, ExecutionBreakdown } from "./types";

/** Readout band plus a single stacked rule showing where the trace spent its time. */
export function SummaryCards({
  detail,
  bottleneck,
  treeDepth,
  spanCount,
  executionBreakdown,
}: {
  detail: TraceDetailData;
  bottleneck: SpanTreeNode | null;
  treeDepth: number;
  spanCount: number;
  executionBreakdown?: ExecutionBreakdown;
}) {
  const entity = detail.entity;
  const durationMs = entity.totalDurationMs ?? entity.durationMs ?? 0;
  const errors = detail.counts?.errors ?? detail.relatedErrors?.length ?? 0;

  const computeMs = executionBreakdown?.internalComputeMs ?? Math.max(0, durationMs);
  const computePct = executionBreakdown?.internalComputePercent ?? (durationMs > 0 ? (computeMs / durationMs) * 100 : 100);
  const dbMs = executionBreakdown?.databaseMs ?? 0;
  const dbCount = executionBreakdown?.databaseCount ?? 0;
  const httpMs = executionBreakdown?.httpMs ?? 0;
  const httpCount = executionBreakdown?.httpCount ?? 0;
  const cacheMs = executionBreakdown?.cacheMs ?? 0;
  const ioMs = dbMs + httpMs + cacheMs;

  const bottleneckLabel = executionBreakdown?.primaryBottleneckLabel ?? bottleneck?.name ?? "—";
  const bottleneckMs = executionBreakdown?.primaryBottleneckMs ?? bottleneck?.durationMs ?? 0;
  const bottleneckPct = executionBreakdown?.primaryBottleneckPercent ?? (durationMs > 0 ? (bottleneckMs / durationMs) * 100 : 0);

  const cells: ReadoutCell[] = [
    {
      label: "Duration",
      value: formatDurationMs(durationMs),
      sub: `${spanCount} spans · depth ${treeDepth}`,
      tone: durationMs >= 1000 ? "bad" : durationMs >= 500 ? "warn" : "neutral",
    },
    { label: "In-process", value: formatDurationMs(computeMs), sub: `${formatPercent(computePct)} of the trace` },
    { label: "Database", value: formatDurationMs(dbMs), sub: `${dbCount} ${dbCount === 1 ? "query" : "queries"}` },
    { label: "Outbound HTTP", value: formatDurationMs(httpMs), sub: `${httpCount} ${httpCount === 1 ? "call" : "calls"}` },
    { label: "Slowest span", value: formatDurationMs(bottleneckMs), sub: bottleneckLabel, title: `${bottleneckLabel} · ${formatPercent(bottleneckPct)} of the trace` },
    { label: "Errors", value: String(errors), sub: "correlated error events", tone: errors > 0 ? "bad" : "neutral" },
  ];

  const total = Math.max(1, durationMs);
  const parts = [
    { label: "In-process", ms: computeMs, color: "var(--text2)" },
    { label: "Database", ms: dbMs, color: "var(--blue)" },
    { label: "HTTP", ms: httpMs, color: "var(--violet)" },
    { label: "Cache", ms: cacheMs, color: "var(--text3)" },
  ].filter((p) => p.ms > 0);

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]">
      <ReadoutBand cells={cells} className="rounded-none border-0 border-b" />
      {parts.length > 0 && (
        <div className="flex flex-col gap-2 px-4 py-3">
          <div className="flex h-1.5 gap-px overflow-hidden rounded-full bg-[var(--bg3)]" role="img" aria-label={parts.map((p) => `${p.label} ${formatDurationMs(p.ms)}`).join(", ")}>
            {parts.map((p) => <div key={p.label} style={{ width: `${(p.ms / total) * 100}%`, background: p.color }} />)}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--text2)]">
            {parts.map((p) => (
              <span key={p.label} className="flex items-center gap-1.5">
                <span className="size-2 rounded-[2px]" style={{ background: p.color }} aria-hidden="true" />
                {p.label}
                <span className="font-[family-name:var(--mono)] tabular-nums text-[var(--text)]">{formatPercent((p.ms / total) * 100)}</span>
              </span>
            ))}
            {ioMs === 0 && <span className="text-[var(--text3)]">No I/O spans recorded</span>}
          </div>
        </div>
      )}
    </div>
  );
}
