import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton, Button, Badge } from "@/shared/observe";
import { formatDurationMs, formatPercent } from "./helpers";
import type { SpanTreeNode, TraceSpan } from "./types";

const KIND_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  internal: { bg: "bg-[var(--violet-bg)]", text: "text-[var(--violet)]", bar: "bg-[var(--violet)]" },
  server: { bg: "bg-[var(--blue-bg)]", text: "text-[var(--blue)]", bar: "bg-[var(--blue)]" },
  client: { bg: "bg-[var(--cyan-bg)]", text: "text-[var(--cyan)]", bar: "bg-[var(--cyan)]" },
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
}: {
  tree: SpanTreeNode[];
  flatList: SpanTreeNode[];
  totalTraceDurationMs: number;
  bottleneck: SpanTreeNode | null;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKind, setFilterKind] = useState<string>("all");
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [selectedSpan, setSelectedSpan] = useState<SpanTreeNode | null>(null);

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

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)]">
      {/* Waterfall Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-[var(--text3)]" />
            <input
              type="text"
              placeholder="Search spans by name, ID, service…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 font-mono text-[12px] text-[var(--text)] placeholder-[var(--text3)] outline-none focus:border-[var(--brand)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-[var(--text3)] hover:text-[var(--text)]"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Kind filters */}
          <div className="flex items-center gap-1">
            {[
              { id: "all", label: "All" },
              { id: "internal", label: "Internal" },
              { id: "db", label: "DB" },
              { id: "http", label: "HTTP" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterKind(tab.id)}
                className={cn(
                  "rounded-[var(--radius)] px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                  filterKind === tab.id
                    ? "bg-[var(--bg2)] text-[var(--text)] font-semibold shadow-xs"
                    : "text-[var(--text3)] hover:bg-[var(--bg)] hover:text-[var(--text2)]",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Error toggle */}
          <button
            type="button"
            onClick={() => setOnlyErrors((p) => !p)}
            className={cn(
              "flex items-center gap-1.5 rounded-[var(--radius)] px-2.5 py-1 text-[11.5px] font-medium transition-colors border",
              onlyErrors
                ? "border-[var(--red)] bg-[var(--red-bg)] text-[var(--red)] font-semibold"
                : "border-transparent text-[var(--text3)] hover:bg-[var(--bg)]",
            )}
          >
            <AlertCircle className="size-3" />
            Errors only
          </button>
        </div>

        {/* Tree expand / collapse actions */}
        <div className="flex items-center gap-2 text-[12px] text-[var(--text3)]">
          <span>{visibleNodes.length} of {flatList.length} spans</span>
          <div className="h-3 w-px bg-[var(--border)]" />
          <button
            type="button"
            onClick={expandAll}
            className="hover:text-[var(--text)] hover:underline"
          >
            Expand all
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={collapseAll}
            className="hover:text-[var(--text)] hover:underline"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Main Container with Horizontal Scroll Barrier */}
      <div className="relative w-full overflow-x-auto">
        <div className="min-w-[780px] w-full">
          {/* Time axis header — 3 Columns: Span Hierarchy, Timeline Bar, Duration */}
          <div className="grid grid-cols-[minmax(280px,360px)_1fr_120px] items-center border-b border-[var(--border)] bg-[var(--bg2)]/60 text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--text3)]">
            <div className="px-4 py-2.5 font-semibold">Span Hierarchy</div>
            <div className="relative min-w-0 px-2 py-2.5">
              <div className="flex justify-between">
                {timeTicks.map((t, i) => (
                  <span key={i} className="tabular-nums">
                    {formatDurationMs(t)}
                  </span>
                ))}
              </div>
            </div>
            <div className="px-4 py-2.5 text-right font-semibold">Duration</div>
          </div>

          {/* Span rows */}
          <div className="divide-y divide-[var(--border)]">
            {visibleNodes.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-[var(--text3)]">
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

                return (
                  <div
                    key={node.spanId}
                    onClick={() => setSelectedSpan(node)}
                    className={cn(
                      "group grid grid-cols-[minmax(280px,360px)_1fr_120px] cursor-pointer items-center transition-colors",
                      isSelected
                        ? "bg-[var(--brand-bg)]/35 ring-1 ring-inset ring-[var(--brand)]"
                        : "hover:bg-[var(--bg2)]/50",
                    )}
                  >
                    {/* Column 1: Tree & Span Name */}
                    <div
                      className="flex min-w-0 items-center gap-2 py-2 pr-3"
                      style={{ paddingLeft: `${Math.max(12, 12 + node.depth * 16)}px` }}
                    >
                      {/* Collapse chevron */}
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCollapse(node.spanId);
                          }}
                          className="flex size-4 shrink-0 items-center justify-center rounded text-[var(--text3)] hover:bg-[var(--bg3)] hover:text-[var(--text)]"
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

                      {/* Status indicator */}
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
                          "shrink-0 rounded px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase",
                          kindStyle.bg,
                          kindStyle.text,
                        )}
                      >
                        {isDb ? "DB" : isHttp ? "HTTP" : node.kind}
                      </span>

                      {/* Span Name */}
                      <span
                        className={cn(
                          "min-w-0 truncate font-mono text-[12px] font-medium text-[var(--text)]",
                          node.isBottleneck && "text-[var(--amber)] font-semibold",
                        )}
                        title={node.name}
                      >
                        {node.name}
                      </span>

                      {/* Bottleneck flame */}
                      {node.isBottleneck && (
                        <Flame
                          className="size-3.5 shrink-0 text-[var(--amber)] animate-pulse"
                          title="Slowest bottleneck span in trace"
                        />
                      )}
                    </div>

                    {/* Column 2: Timeline Waterfall Bar (strictly bounded 0..100%) */}
                    <div className="relative min-w-0 h-full flex items-center px-2 py-2 overflow-hidden">
                      {/* Grid background vertical guide lines */}
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
                            "h-3 w-full rounded-sm transition-all shadow-xs",
                            node.hasError
                              ? "bg-[var(--red)]"
                              : node.isBottleneck
                              ? "bg-[var(--amber)]"
                              : kindStyle.bar,
                            "opacity-90 group-hover:opacity-100",
                          )}
                          title={`${node.name}: ${formatDurationMs(node.durationMs)} (${formatPercent(percentOfTrace)})`}
                        />
                      </div>
                    </div>

                    {/* Column 3: Fixed-width Duration & Percentage */}
                    <div className="px-4 py-2 text-right">
                      <div
                        className={cn(
                          "font-mono text-[11.5px] tabular-nums font-medium",
                          node.isBottleneck ? "text-[var(--amber)] font-semibold" : "text-[var(--text)]",
                        )}
                      >
                        {formatDurationMs(node.durationMs)}
                      </div>
                      <div className="font-mono text-[10px] tabular-nums text-[var(--text3)]">
                        {formatPercent(percentOfTrace)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Selected Span Detail Inspector Drawer / Modal */}
      {selectedSpan && (
        <div className="border-t border-[var(--border)] bg-[var(--bg)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase",
                  getKindStyle(selectedSpan.kind).bg,
                  getKindStyle(selectedSpan.kind).text,
                )}
              >
                {selectedSpan.kind}
              </span>
              <h3 className="font-mono text-[14px] font-semibold text-[var(--text)]">
                {selectedSpan.name}
              </h3>
              {selectedSpan.isBottleneck && (
                <span className="flex items-center gap-1 rounded-full bg-[var(--amber-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--amber)]">
                  <Flame className="size-3" />
                  Primary Bottleneck
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <CopyButton value={selectedSpan.spanId} label="Copy Span ID" />
              <Button
                variant="ghost"
                className="size-8 p-0 text-[var(--text3)] hover:text-[var(--text)]"
                onClick={() => setSelectedSpan(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg1)] p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text3)]">Duration</div>
              <div className="mt-1 font-mono text-[14px] font-semibold text-[var(--text)]">
                {formatDurationMs(selectedSpan.durationMs)}
              </div>
              <div className="text-[11px] text-[var(--text3)]">
                Self time: {formatDurationMs(selectedSpan.selfDurationMs)}
              </div>
            </div>

            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg1)] p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text3)]">Timeline Offset</div>
              <div className="mt-1 font-mono text-[14px] font-semibold text-[var(--text)]">
                +{formatDurationMs(selectedSpan.startOffsetMs)}
              </div>
              <div className="text-[11px] text-[var(--text3)]">
                {formatPercent(selectedSpan.offsetPercent)} into trace
              </div>
            </div>

            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg1)] p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text3)]">Status</div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[13px] font-semibold text-[var(--text)]">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    selectedSpan.hasError ? "bg-[var(--red)]" : "bg-[var(--green)]",
                  )}
                />
                {selectedSpan.status.toUpperCase()}
              </div>
              <div className="text-[11px] text-[var(--text3)]">
                Depth {selectedSpan.depth} · {selectedSpan.children.length} direct children
              </div>
            </div>

            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg1)] p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text3)]">Span ID</div>
              <div className="mt-1 truncate font-mono text-[12px] font-medium text-[var(--text)]" title={selectedSpan.spanId}>
                {selectedSpan.spanId}
              </div>
              {selectedSpan.parentSpanId && (
                <div className="truncate font-mono text-[11px] text-[var(--text3)]" title={selectedSpan.parentSpanId}>
                  Parent: {selectedSpan.parentSpanId.slice(0, 8)}…
                </div>
              )}
            </div>
          </div>

          {/* Span Attributes / Metadata if present */}
          {(selectedSpan.span.attributes || selectedSpan.span.metadata || selectedSpan.span.dbSystem || selectedSpan.span.httpMethod) && (
            <div className="mt-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg1)] p-3.5">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text2)]">
                Captured Span Attributes
              </div>
              <pre className="mt-2 max-h-48 overflow-auto rounded bg-[var(--bg)] p-2.5 font-mono text-[11.5px] leading-relaxed text-[var(--text2)]">
                {JSON.stringify(
                  {
                    ...selectedSpan.span.attributes,
                    ...selectedSpan.span.metadata,
                    ...(selectedSpan.span.dbSystem ? { "db.system": selectedSpan.span.dbSystem } : {}),
                    ...(selectedSpan.span.httpMethod ? { "http.method": selectedSpan.span.httpMethod } : {}),
                    ...(selectedSpan.span.httpStatusCode ? { "http.status_code": selectedSpan.span.httpStatusCode } : {}),
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
