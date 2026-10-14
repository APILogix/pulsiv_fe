import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  ChevronRight,
  ChevronDown,
  Clock,
  Database,
  Globe,
  Layers,
  Flame,
  AlertCircle,
  CheckCircle2,
  Copy,
  X,
  Code2,
  Filter,
  Tag,
  Server,
  Zap,
  HelpCircle,
  Info,
  SlidersHorizontal,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton, Button } from "@/shared/observe";
import { formatDurationMs, formatPercent, type ExecutionGap } from "./helpers";
import { SpanDetailDrawer } from "./SpanDetailDrawer";
import type { SpanTreeNode, TraceSpan, ExecutionBreakdown } from "./types";

const KIND_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  internal: { bg: "bg-[var(--violet-bg)]", text: "text-[var(--violet)]", bar: "bg-[var(--violet)]" },
  server: { bg: "bg-[var(--blue-bg)]", text: "text-[var(--blue)]", bar: "bg-[var(--blue)]" },
  client: { bg: "bg-[var(--cyan-bg)]", text: "text-[var(--text2)]", bar: "bg-[var(--text2)]" },
  db: { bg: "bg-[var(--amber-bg)]", text: "text-[var(--amber)]", bar: "bg-[var(--amber)]" },
  database: { bg: "bg-[var(--amber-bg)]", text: "text-[var(--amber)]", bar: "bg-[var(--amber)]" },
  http: { bg: "bg-[var(--blue-bg)]", text: "text-[var(--blue)]", bar: "bg-[var(--blue)]" },
  producer: { bg: "bg-[var(--green-bg)]", text: "text-[var(--green)]", bar: "bg-[var(--green)]" },
  consumer: { bg: "bg-[var(--green-bg)]", text: "text-[var(--green)]", bar: "bg-[var(--green)]" },
};

function getKindStyle(kind: string) {
  return KIND_COLORS[kind.toLowerCase()] || {
    bg: "bg-[var(--bg3)]",
    text: "text-[var(--text2)]",
    bar: "bg-[var(--brand)]",
  };
}

export function SpanTreeWaterfall({
  tree,
  flatList,
  totalTraceDurationMs,
  bottleneck,
  executionBreakdown,
  executionGaps = [],
  traceId,
  tracePublicId,
  environment,
  hasMissingParents = false,
}: {
  tree: SpanTreeNode[];
  flatList: SpanTreeNode[];
  totalTraceDurationMs: number;
  bottleneck: SpanTreeNode | null;
  executionBreakdown?: ExecutionBreakdown;
  executionGaps?: ExecutionGap[];
  traceId?: string;
  tracePublicId?: string;
  environment?: string;
  hasMissingParents?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKind, setFilterKind] = useState<string>("all");
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [showGaps, setShowGaps] = useState(true);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [selectedSpan, setSelectedSpan] = useState<SpanTreeNode | null>(null);
  const [hoveredSpan, setHoveredSpan] = useState<SpanTreeNode | null>(null);
  const [showExplanation, setShowExplanation] = useState(true);

  const toggleCollapse = (spanId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(spanId)) {
        next.delete(spanId);
      } else {
        next.add(spanId);
      }
      return next;
    });
  };

  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => {
    const allParentIds = new Set<string>();
    for (const node of flatList) {
      if (node.children.length > 0) allParentIds.add(node.spanId);
    }
    setCollapsedIds(allParentIds);
  };

  // Filtered flat list taking collapse & search into account
  const visibleNodes = useMemo(() => {
    const hiddenByCollapse = new Set<string>();

    function markHidden(node: SpanTreeNode) {
      for (const child of node.children) {
        hiddenByCollapse.add(child.spanId);
        markHidden(child);
      }
    }

    for (const node of flatList) {
      if (collapsedIds.has(node.spanId)) {
        markHidden(node);
      }
    }

    return flatList.filter((node) => {
      if (hiddenByCollapse.has(node.spanId)) return false;

      if (onlyErrors && !node.hasError) return false;

      if (filterKind !== "all") {
        if (filterKind === "db" && !node.kind.includes("db") && !node.span.dbSystem && !node.name.startsWith("db.")) return false;
        if (filterKind === "http" && !node.kind.includes("http") && !node.kind.includes("client") && !node.span.httpMethod) return false;
        if (filterKind === "internal" && node.kind !== "internal") return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = node.name.toLowerCase().includes(query);
        const matchesId = node.spanId.toLowerCase().includes(query);
        const matchesKind = node.kind.toLowerCase().includes(query);
        const matchesService = (node.service || "").toLowerCase().includes(query);
        return matchesName || matchesId || matchesKind || matchesService;
      }

      return true;
    });
  }, [flatList, collapsedIds, searchQuery, filterKind, onlyErrors]);

  const maxDuration = Math.max(
    totalTraceDurationMs,
    ...flatList.map((n) => n.durationMs),
    1,
  );
  const timeTicks = [0, 0.25, 0.5, 0.75, 1.0].map((ratio) => ratio * maxDuration);

  // Jump to span helper for correlations
  const handleSelectSpanId = (targetSpanId: string) => {
    const target = flatList.find((n) => n.spanId === targetSpanId);
    if (target) {
      // Ensure parents are uncollapsed so target is visible
      let curr = target;
      const parentsToUncollapse = new Set<string>();
      while (curr.parentSpanId) {
        parentsToUncollapse.add(curr.parentSpanId);
        const parentNode = flatList.find((n) => n.spanId === curr.parentSpanId);
        if (!parentNode) break;
        curr = parentNode;
      }

      setCollapsedIds((prev) => {
        const next = new Set(prev);
        for (const pId of parentsToUncollapse) next.delete(pId);
        return next;
      });

      setSelectedSpan(target);
    }
  };

  // Map each span name to any following uninstrumented gap
  const gapByPrecedingSpan = useMemo(() => {
    const map = new Map<string, ExecutionGap>();
    for (const gap of executionGaps) {
      map.set(gap.precedingSpanName, gap);
    }
    return map;
  }, [executionGaps]);

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]">
      {/* Missing Parent Warning Alert Banner (if applicable) */}
      {hasMissingParents && (
        <div className="flex items-center gap-2.5 border-b border-[var(--amber)]/30 bg-[var(--amber-bg)]/40 px-5 py-3 text-[12px] text-[var(--amber)]">
          <AlertCircle className="size-4 shrink-0 text-[var(--amber)]" />
          <span>
            <strong>Missing Parent Detected:</strong> One or more spans reference a parent span ID not present in this trace batch. These spans have been safely attached as top-level operations.
          </span>
        </div>
      )}

      {/* Explanatory UX Guidance Banner for Developers / Junior Devs */}
      {showExplanation && (
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg2)]/40 px-5 py-3.5 text-[12px]">
          <div className="flex items-start gap-2.5">
            <Info className="size-4 shrink-0 text-[var(--brand)] mt-0.5" />
            <div className="flex flex-col gap-1 leading-relaxed text-[var(--text2)]">
              <span className="font-semibold text-[var(--text)]">
                Understanding the Trace Timeline & Internal Calculation Time:
              </span>
              <span>
                • <strong>Root Transaction</strong>: The root operation at the top shows total wall-clock duration of the request.
              </span>
              <span>
                • <strong>Internal Calculation (Self Time)</strong>: Time taken by application business logic, CPU calculations (e.g. password hashing/bcrypt), serialization, or event loop gaps rather than external database or HTTP network calls.
              </span>
              <span>
                • <strong>Database & Outbound Calls</strong>: Nested child operations represent actual I/O time spent talking to databases or third-party APIs.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowExplanation(false)}
            className="text-[var(--text3)] hover:text-[var(--text)] cursor-pointer"
            title="Dismiss explanation"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Trace Execution Time Attribution Bar */}
      {executionBreakdown && (
        <div className="border-b border-[var(--border)] bg-[var(--bg2)]/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-[var(--brand)]" />
              <span className="font-[family-name:var(--mono)] text-[11px] font-semibold text-[var(--text)]">
                Trace Execution Time Attribution
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11.5px]">
              <span className="text-[var(--text3)]">Total Duration:</span>
              <strong className="font-[family-name:var(--mono)] font-semibold text-[var(--text)]">
                {formatDurationMs(executionBreakdown.totalDurationMs)}
              </strong>
            </div>
          </div>

          {/* Segmented Stacked Progress Bar */}
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-[var(--bg3)] flex shadow-inner">
            {executionBreakdown.internalComputeMs > 0 && (
              <div
                style={{ width: `${Math.max(1, executionBreakdown.internalComputePercent)}%` }}
                className="h-full bg-[var(--violet)] relative group"
                title={`Internal Calculation / App Logic: ${formatDurationMs(executionBreakdown.internalComputeMs)} (${formatPercent(executionBreakdown.internalComputePercent)})`}
              />
            )}
            {executionBreakdown.databaseMs > 0 && (
              <div
                style={{ width: `${Math.max(1, executionBreakdown.databasePercent)}%` }}
                className="h-full bg-[var(--amber)] relative group"
                title={`Database Queries: ${formatDurationMs(executionBreakdown.databaseMs)} (${formatPercent(executionBreakdown.databasePercent)})`}
              />
            )}
            {executionBreakdown.httpMs > 0 && (
              <div
                style={{ width: `${Math.max(1, executionBreakdown.httpPercent)}%` }}
                className="h-full bg-[var(--blue)] relative group"
                title={`External HTTP: ${formatDurationMs(executionBreakdown.httpMs)} (${formatPercent(executionBreakdown.httpPercent)})`}
              />
            )}
            {executionBreakdown.cacheMs > 0 && (
              <div
                style={{ width: `${Math.max(1, executionBreakdown.cachePercent)}%` }}
                className="h-full bg-[var(--text2)] relative group"
                title={`Cache: ${formatDurationMs(executionBreakdown.cacheMs)} (${formatPercent(executionBreakdown.cachePercent)})`}
              />
            )}
          </div>

          {/* Legend Pills */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-[11.5px]">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[var(--violet)]" />
              <span className="font-medium text-[var(--text)]">Internal Calculation:</span>
              <span className="font-[family-name:var(--mono)] font-semibold text-[var(--violet)]">
                {formatDurationMs(executionBreakdown.internalComputeMs)} ({formatPercent(executionBreakdown.internalComputePercent)})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[var(--amber)]" />
              <span className="font-medium text-[var(--text)]">Database Calls:</span>
              <span className="font-[family-name:var(--mono)] font-semibold text-[var(--amber)]">
                {formatDurationMs(executionBreakdown.databaseMs)} ({formatPercent(executionBreakdown.databasePercent)})
              </span>
              <span className="text-[var(--text3)] font-[family-name:var(--mono)] text-[10.5px]">
                [{executionBreakdown.databaseCount} {executionBreakdown.databaseCount === 1 ? "call" : "calls"}]
              </span>
            </div>
            {executionBreakdown.httpMs > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[var(--blue)]" />
                <span className="font-medium text-[var(--text)]">External HTTP:</span>
                <span className="font-[family-name:var(--mono)] font-semibold text-[var(--blue)]">
                  {formatDurationMs(executionBreakdown.httpMs)} ({formatPercent(executionBreakdown.httpPercent)})
                </span>
              </div>
            )}
            {executionBreakdown.cacheMs > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[var(--text2)]" />
                <span className="font-medium text-[var(--text)]">Cache:</span>
                <span className="font-[family-name:var(--mono)] font-semibold text-[var(--text2)]">
                  {formatDurationMs(executionBreakdown.cacheMs)} ({formatPercent(executionBreakdown.cachePercent)})
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Waterfall Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] p-5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-2.5 size-3.5 text-[var(--text3)]" />
            <input
              type="text"
              placeholder="Search spans by name, ID, service…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] pl-9 pr-8 font-[family-name:var(--mono)] text-[12px] text-[var(--text)] placeholder-[var(--text3)] outline-none focus:border-[var(--brand)] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-[var(--text3)] hover:text-[var(--text)] cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Kind filters */}
          <div className="flex items-center gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-1">
            {[
              { id: "all", label: "All Spans" },
              { id: "db", label: "Database" },
              { id: "http", label: "HTTP" },
              { id: "internal", label: "Internal" },
            ].map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setFilterKind(k.id)}
                className={cn(
                  "rounded-[var(--radius)] px-2.5 py-1 text-[11.5px] font-medium transition-colors cursor-pointer",
                  filterKind === k.id
                    ? "bg-[var(--bg3)] text-[var(--text)] font-semibold"
                    : "text-[var(--text3)] hover:text-[var(--text)]",
                )}
              >
                {k.label}
              </button>
            ))}
          </div>

          {/* Error toggle */}
          <button
            type="button"
            onClick={() => setOnlyErrors((p) => !p)}
            className={cn(
              "flex items-center gap-1.5 rounded-[var(--radius)] border px-3 py-1.5 text-[11.5px] font-medium transition-colors cursor-pointer",
              onlyErrors
                ? "border-[var(--red)]/40 bg-[var(--red-bg)] text-[var(--red)]"
                : "border-[var(--border)] bg-[var(--bg)] text-[var(--text3)] hover:text-[var(--text)]",
            )}
          >
            <AlertCircle className="size-3.5" />
            <span>Errors Only</span>
          </button>

          {/* Internal Calculation Gaps Toggle */}
          {executionGaps.length > 0 && (
            <button
              type="button"
              onClick={() => setShowGaps((p) => !p)}
              className={cn(
                "flex items-center gap-1.5 rounded-[var(--radius)] border px-3 py-1.5 text-[11.5px] font-medium transition-colors cursor-pointer",
                showGaps
                  ? "border-[var(--violet)]/40 bg-[var(--violet-bg)]/30 text-[var(--violet)]"
                  : "border-[var(--border)] bg-[var(--bg)] text-[var(--text3)] hover:text-[var(--text)]",
              )}
              title="Show uninstrumented internal calculation phases between operations"
            >
              <Cpu className="size-3.5" />
              <span>Show Calculation Gaps ({executionGaps.length})</span>
            </button>
          )}
        </div>

        {/* Tree controls */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="h-8 text-[11.5px] px-2.5 font-medium" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="ghost" className="h-8 text-[11.5px] px-2.5 font-medium" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* Main Waterfall Table Area with Responsive Horizontal Scroll */}
      <div className="relative w-full overflow-x-auto">
        <div className="min-w-[840px] w-full">
          {/* Time axis header — 3 Columns: Span Hierarchy, Timeline Bar, Duration */}
          <div className="grid grid-cols-[minmax(320px,420px)_1fr_130px] items-center border-b border-[var(--border)] bg-[var(--bg2)]/60 text-[10.5px] font-[family-name:var(--mono)] text-[var(--text3)]">
            <div className="px-5 py-3 font-semibold">Span Hierarchy</div>
            <div className="relative min-w-0 px-3 py-3">
              <div className="flex justify-between">
                {timeTicks.map((t, i) => (
                  <span key={i} className="tabular-nums font-medium">
                    {formatDurationMs(t)}
                  </span>
                ))}
              </div>
            </div>
            <div className="px-5 py-3 text-right font-semibold">Duration / Self</div>
          </div>

          {/* Span rows */}
          <div className="divide-y divide-[var(--border)]">
            {visibleNodes.length === 0 ? (
              <div className="p-12 text-center text-[13px] text-[var(--text3)]">
                No spans match the filter criteria.
              </div>
            ) : (
              visibleNodes.map((node) => {
                const isSelected = selectedSpan?.spanId === node.spanId;
                const hasChildren = node.children.length > 0;
                const isCollapsed = collapsedIds.has(node.spanId);
                const kindStyle = getKindStyle(node.kind);
                const isDb = node.kind.includes("db") || !!node.span.dbSystem || node.name.startsWith("db.");
                const isHttp = node.kind.includes("http") || !!node.span.httpMethod;
                const percentOfTrace = maxDuration > 0 ? (node.durationMs / maxDuration) * 100 : 0;
                const gapAfter = gapByPrecedingSpan.get(node.name);

                return (
                  <React.Fragment key={node.spanId}>
                    <div
                      id={`wf-row-${node.spanId}`}
                      onClick={() => setSelectedSpan(node)}
                      onMouseEnter={() => setHoveredSpan(node)}
                      onMouseLeave={() => setHoveredSpan((prev) => (prev?.spanId === node.spanId ? null : prev))}
                      className={cn(
                        "group grid grid-cols-[minmax(320px,420px)_1fr_130px] cursor-pointer items-center transition-colors select-none",
                        isSelected
                          ? "bg-[var(--brand-bg)]/35 ring-1 ring-inset ring-[var(--brand)]"
                          : "hover:bg-[var(--bg2)]/50",
                      )}
                    >
                      {/* Column 1: Tree & Span Name */}
                      <div
                        className="flex min-w-0 items-center gap-2 py-2.5 pr-4"
                        style={{ paddingLeft: `${Math.max(16, 16 + node.depth * 18)}px` }}
                      >
                        {/* Collapse chevron */}
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCollapse(node.spanId);
                            }}
                            className="flex size-4 shrink-0 items-center justify-center rounded text-[var(--text3)] hover:bg-[var(--bg3)] hover:text-[var(--text)] cursor-pointer"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="size-3.5" />
                            ) : (
                              <ChevronDown className="size-3.5" />
                            )}
                          </button>
                        ) : (
                          <span className="size-4 shrink-0" />
                        )}

                        {/* Status indicator dot */}
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            node.hasError
                              ? "bg-[var(--red)] ring-2 ring-[var(--red)]/20"
                              : "bg-[var(--green)]",
                          )}
                          title={node.status}
                        />

                        {/* Kind badge */}
                        <span
                          className={cn(
                            "shrink-0 rounded px-1.5 py-0.5 font-[family-name:var(--mono)] text-[9.5px] font-semibold ",
                            kindStyle.bg,
                            kindStyle.text,
                          )}
                        >
                          {isDb ? "DB" : isHttp ? "HTTP" : node.kind}
                        </span>

                        {/* Span Name */}
                        <span
                          className={cn(
                            "min-w-0 truncate font-[family-name:var(--mono)] text-[12.5px] font-medium text-[var(--text)]",
                            node.isBottleneck && "text-[var(--amber)] font-semibold",
                          )}
                          title={node.name}
                        >
                          {node.name}
                        </span>

                        {/* Internal Calculation Badge for high self-time parent */}
                        {node.isRoot && node.selfDurationMs > 100 && (node.selfDurationMs / node.durationMs) > 0.5 && (
                          <span
                            className="shrink-0 rounded px-1.5 py-0.5 font-[family-name:var(--mono)] text-[9.5px] font-semibold bg-[var(--violet-bg)] text-[var(--violet)] border border-[var(--violet)]/30"
                            title={`Internal Compute: ${formatDurationMs(node.selfDurationMs)} (${formatPercent((node.selfDurationMs / node.durationMs) * 100)} of root)`}
                          >
                            ⚡ {formatDurationMs(node.selfDurationMs)} compute
                          </span>
                        )}

                        {/* Service tag if multi-service */}
                        {node.service && (
                          <span className="shrink-0 font-[family-name:var(--mono)] text-[10px] text-[var(--text3)] truncate max-w-[90px]">
                            [{node.service}]
                          </span>
                        )}

                        {/* Bottleneck flame */}
                        {node.isBottleneck && (
                          <span title="Primary bottleneck span in trace">
                            <Flame className="size-3.5 shrink-0 text-[var(--amber)] animate-pulse" />
                          </span>
                        )}
                      </div>

                      {/* Column 2: Timeline Waterfall Bar */}
                      <div className="relative min-w-0 h-full flex items-center px-3 py-2 overflow-hidden">
                        {/* Background vertical guide lines */}
                        <div className="pointer-events-none absolute inset-0 flex justify-between opacity-15">
                          <div className="h-full w-px bg-[var(--border)]" />
                          <div className="h-full w-px bg-[var(--border)]" />
                          <div className="h-full w-px bg-[var(--border)]" />
                          <div className="h-full w-px bg-[var(--border)]" />
                          <div className="h-full w-px bg-[var(--border)]" />
                        </div>

                        {/* Waterfall Bar wrapper */}
                        <div
                          className="relative flex h-4 items-center"
                          style={{
                            left: `${node.offsetPercent}%`,
                            width: `${node.widthPercent}%`,
                            maxWidth: `${100 - node.offsetPercent}%`,
                          }}
                        >
                          <div
                            className={cn(
                              "h-3 w-full rounded-sm relative overflow-hidden transition-opacity duration-150",
                              node.hasError
                                ? "bg-[var(--red)]"
                                : node.isBottleneck
                                ? "bg-[var(--amber)]"
                                : kindStyle.bar,
                              "opacity-90 group-hover:opacity-100",
                            )}
                            title={`${node.name}: ${formatDurationMs(node.durationMs)} (${formatPercent(percentOfTrace)} of trace)`}
                          >
                            {/* Inner stripe pattern if root has massive self compute */}
                            {node.isRoot && node.selfDurationMs > 0 && (
                              <div
                                className="absolute inset-0 opacity-20 pointer-events-none bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.4)_4px,rgba(255,255,255,0.4)_8px)]"
                                title={`Self Compute: ${formatDurationMs(node.selfDurationMs)}`}
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Column 3: Fixed-width Duration & Self Time */}
                      <div className="px-5 py-2.5 text-right">
                        <div
                          className={cn(
                            "font-[family-name:var(--mono)] text-[12px] tabular-nums font-semibold",
                            node.isBottleneck ? "text-[var(--amber)]" : "text-[var(--text)]",
                          )}
                        >
                          {formatDurationMs(node.durationMs)}
                        </div>
                        {node.children.length > 0 && node.selfDurationMs > 0 ? (
                          <div className="font-[family-name:var(--mono)] text-[10px] tabular-nums text-[var(--violet)] font-medium" title="Wall-clock time in local calculation rather than waiting on child operations">
                            Self: {formatDurationMs(node.selfDurationMs)}
                          </div>
                        ) : (
                          <div className="font-[family-name:var(--mono)] text-[10.5px] tabular-nums text-[var(--text3)]">
                            {formatPercent(percentOfTrace)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Gap Row for uninstrumented internal calculation phase */}
                    {showGaps && gapAfter && (
                      <div
                        key={gapAfter.id}
                        className="grid grid-cols-[minmax(320px,420px)_1fr_130px] items-center bg-[var(--violet-bg)]/20 border-y border-dashed border-[var(--violet)]/35 py-1.5 select-none transition-colors"
                      >
                        {/* Column 1: Gap Info */}
                        <div
                          className="flex min-w-0 items-center gap-2 py-0.5 pr-4"
                          style={{ paddingLeft: `${Math.max(16, 16 + gapAfter.depth * 18)}px` }}
                        >
                          <span className="size-4 shrink-0" />
                          <span className="flex size-4 shrink-0 items-center justify-center rounded bg-[var(--violet-bg)] text-[var(--violet)]">
                            <Cpu className="size-2.5" />
                          </span>
                          <span className="shrink-0 rounded px-1.5 py-0.5 font-[family-name:var(--mono)] text-[9px] font-semibold bg-[var(--violet-bg)] text-[var(--violet)] border border-[var(--violet)]/40">
                            INTERNAL CALCULATION
                          </span>
                          <span className="min-w-0 truncate font-[family-name:var(--mono)] text-[11.5px] text-[var(--violet)] font-medium">
                            {formatDurationMs(gapAfter.durationMs)} application compute ({gapAfter.precedingSpanName} → {gapAfter.succeedingSpanName})
                          </span>
                        </div>

                        {/* Column 2: Gap Timeline Bar */}
                        <div className="relative min-w-0 h-full flex items-center px-3 py-1 overflow-hidden">
                          <div
                            className="relative flex h-3.5 items-center"
                            style={{
                              left: `${gapAfter.offsetPercent}%`,
                              width: `${gapAfter.widthPercent}%`,
                              maxWidth: `${100 - gapAfter.offsetPercent}%`,
                            }}
                          >
                            <div
                              className="h-2.5 w-full rounded-sm bg-[var(--violet)]/30 border border-dashed border-[var(--violet)]/80"
                              title={`Internal calculation / async gap: ${formatDurationMs(gapAfter.durationMs)}`}
                            />
                          </div>
                        </div>

                        {/* Column 3: Gap Duration */}
                        <div className="px-5 py-1 text-right">
                          <div className="font-[family-name:var(--mono)] text-[11.5px] tabular-nums font-semibold text-[var(--violet)]">
                            +{formatDurationMs(gapAfter.durationMs)}
                          </div>
                          <div className="font-[family-name:var(--mono)] text-[9.5px] tabular-nums text-[var(--violet)]/80 font-medium">
                            {formatPercent(maxDuration > 0 ? (gapAfter.durationMs / maxDuration) * 100 : 0)} gap
                          </div>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Slide-out Span Detail Drawer */}
      <SpanDetailDrawer
        span={selectedSpan}
        onClose={() => setSelectedSpan(null)}
        traceId={traceId}
        tracePublicId={tracePublicId}
        environment={environment}
        onSelectSpanId={handleSelectSpanId}
      />
    </div>
  );
}
