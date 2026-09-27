import React from "react";
import { Clock3, Layers, CheckCircle2, Flame, AlertCircle, Cpu, Database, Globe, Zap } from "lucide-react";
import { formatDurationMs, formatPercent } from "./helpers";
import type { TraceDetailData, SpanTreeNode, ExecutionBreakdown } from "./types";

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
  const status = entity.rootSpanStatus || entity.status || "ok";
  const isOk = status.toLowerCase() === "ok" || status.toLowerCase() === "success";

  const totalErrors = detail.counts?.errors ?? detail.relatedErrors?.length ?? 0;

  // Breakdown values
  const internalComputeMs = executionBreakdown?.internalComputeMs ?? Math.max(0, durationMs);
  const internalComputePercent = executionBreakdown?.internalComputePercent ?? (durationMs > 0 ? (internalComputeMs / durationMs) * 100 : 100);
  const dbMs = executionBreakdown?.databaseMs ?? 0;
  const dbPercent = executionBreakdown?.databasePercent ?? 0;
  const dbCount = executionBreakdown?.databaseCount ?? 0;
  const httpMs = executionBreakdown?.httpMs ?? 0;
  const httpCount = executionBreakdown?.httpCount ?? 0;
  const totalIoMs = dbMs + httpMs + (executionBreakdown?.cacheMs ?? 0);
  const totalIoPercent = durationMs > 0 ? (totalIoMs / durationMs) * 100 : 0;

  // Bottleneck
  const bottleneckLabel = executionBreakdown?.primaryBottleneckLabel ?? (bottleneck ? bottleneck.name : "—");
  const bottleneckMs = executionBreakdown?.primaryBottleneckMs ?? (bottleneck ? bottleneck.durationMs : 0);
  const bottleneckPercent = executionBreakdown?.primaryBottleneckPercent ?? (durationMs > 0 ? (bottleneckMs / durationMs) * 100 : 0);
  const isInternalBottleneck = executionBreakdown?.primaryBottleneckType === "internal_compute";

  const items = [
    {
      label: "Total Trace Duration",
      value: formatDurationMs(durationMs),
      badge: durationMs > 1000 ? "High Latency" : "Normal",
      badgeColor: durationMs > 1000 ? "bg-[var(--amber-bg)] text-[var(--amber)]" : "bg-[var(--green-bg)] text-[var(--green)]",
      icon: Clock3,
      subtext: `Server response time (${spanCount} spans, max depth ${treeDepth})`,
      accent: durationMs > 1000 ? "text-[var(--amber)]" : "text-[var(--text2)]",
    },
    {
      label: "Internal Calculation / Compute",
      value: formatDurationMs(internalComputeMs),
      badge: `${formatPercent(internalComputePercent)} of trace`,
      badgeColor: internalComputePercent > 70 ? "bg-[var(--violet-bg)] text-[var(--violet)] border border-[var(--violet)]/30" : "bg-[var(--bg2)] text-[var(--text3)]",
      icon: Cpu,
      subtext: internalComputePercent > 70
        ? "⚡ Application CPU, business logic & async gaps"
        : "Local controller & application processing",
      accent: "text-[var(--violet)]",
      highlight: internalComputePercent > 70,
    },
    {
      label: "Database & External I/O",
      value: formatDurationMs(totalIoMs),
      badge: `${formatPercent(totalIoPercent)} of trace`,
      badgeColor: "bg-[var(--amber-bg)] text-[var(--amber)]",
      icon: Database,
      subtext: `${dbCount} DB ${dbCount === 1 ? "call" : "calls"} (${formatDurationMs(dbMs)})${httpCount > 0 ? ` • ${httpCount} HTTP` : ""}`,
      accent: "text-[var(--amber)]",
    },
    {
      label: "Primary Bottleneck",
      value: formatDurationMs(bottleneckMs),
      badge: isInternalBottleneck ? "Internal Compute" : "I/O Call",
      badgeColor: isInternalBottleneck ? "bg-[var(--violet-bg)] text-[var(--violet)]" : "bg-[var(--amber-bg)] text-[var(--amber)]",
      icon: Flame,
      subtext: `${bottleneckLabel} (${formatPercent(bottleneckPercent)})`,
      accent: "text-[var(--amber)]",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={`group relative flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition-all hover:bg-[var(--bg1)]/80 ${
              item.highlight
                ? "border-[var(--violet)]/40 bg-[var(--violet-bg)]/20"
                : "border-[var(--border)] bg-[var(--bg1)] hover:border-[var(--border2)]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text3)]">
                {item.label}
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--bg2)] text-[var(--text3)] group-hover:text-[var(--text)] transition-colors">
                <Icon className="size-3.5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-[family-name:var(--mono)] text-[22px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[var(--text)]">
                  {item.value}
                </div>
                {item.badge && (
                  <span className={`rounded-md px-1.5 py-0.5 font-[family-name:var(--mono)] text-[10px] font-semibold ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </div>
              <p className={`mt-2 text-[11.5px] font-medium leading-none ${item.accent}`}>
                {item.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
