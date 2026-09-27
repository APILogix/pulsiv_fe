import type { TraceSpan, SpanTreeNode, TraceDetailData, ExecutionBreakdown } from "./types";

export function formatDurationMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || isNaN(ms) || ms === 0) return "0 ms";
  if (ms < 0.001) return "< 1 µs";
  if (ms < 1) return `${(ms * 1000).toFixed(0)} µs`;
  if (ms < 10) return `${ms.toFixed(3)} ms`;
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(1);
  return `${mins}m ${secs}s`;
}

export function formatPercent(value: number): string {
  if (isNaN(value)) return "0%";
  if (value < 0.1 && value > 0) return "< 0.1%";
  return `${value.toFixed(1)}%`;
}

export function deduplicateSpans(spans: TraceSpan[]): TraceSpan[] {
  const spanMap = new Map<string, TraceSpan>();

  for (const span of spans) {
    const key = span.spanId || span.id;
    if (!key) continue;

    if (!spanMap.has(key)) {
      spanMap.set(key, span);
    } else {
      const existing = spanMap.get(key)!;
      // Prefer the one with more information (e.g. non-null depth or longer duration)
      const existingScore = (existing.depth !== null ? 2 : 0) + (existing.durationMs ? 1 : 0) + (existing.service ? 1 : 0);
      const newScore = (span.depth !== null ? 2 : 0) + (span.durationMs ? 1 : 0) + (span.service ? 1 : 0);
      if (newScore > existingScore) {
        spanMap.set(key, { ...existing, ...span });
      }
    }
  }

  return Array.from(spanMap.values());
}

export interface TimeInterval {
  start: number;
  end: number;
}

export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length <= 1) return intervals;
  const sorted = [...intervals].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: TimeInterval[] = [{ start: sorted[0].start, end: sorted[0].end }];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ start: current.start, end: current.end });
    }
  }
  return merged;
}

export function sumMergedIntervals(intervals: TimeInterval[]): number {
  const merged = mergeIntervals(intervals);
  return merged.reduce((sum, int) => sum + Math.max(0, int.end - int.start), 0);
}

export interface ExecutionGap {
  id: string;
  parentSpanId: string | null;
  startOffsetMs: number;
  durationMs: number;
  offsetPercent: number;
  widthPercent: number;
  precedingSpanName: string;
  succeedingSpanName: string;
  depth: number;
}

export function buildSpanTree(
  rawSpans: TraceSpan[],
  totalTraceDurationMs: number,
  rootOccurredAt?: string,
): {
  tree: SpanTreeNode[];
  flatList: SpanTreeNode[];
  bottleneckNode: SpanTreeNode | null;
  hasMissingParents: boolean;
  executionBreakdown: ExecutionBreakdown;
  executionGaps: ExecutionGap[];
} {
  const spans = deduplicateSpans(rawSpans);

  if (spans.length === 0) {
    const emptyBreakdown: ExecutionBreakdown = {
      totalDurationMs: totalTraceDurationMs,
      internalComputeMs: totalTraceDurationMs,
      internalComputePercent: 100,
      databaseMs: 0,
      databasePercent: 0,
      databaseCount: 0,
      httpMs: 0,
      httpPercent: 0,
      httpCount: 0,
      cacheMs: 0,
      cachePercent: 0,
      cacheCount: 0,
      otherMs: 0,
      otherPercent: 0,
      primaryBottleneckType: "internal_compute",
      primaryBottleneckLabel: "Internal Calculation / App Logic",
      primaryBottleneckMs: totalTraceDurationMs,
      primaryBottleneckPercent: 100,
    };
    return { tree: [], flatList: [], bottleneckNode: null, hasMissingParents: false, executionBreakdown: emptyBreakdown, executionGaps: [] };
  }

  // Calculate robust global start time and max duration across all spans
  const parseSpanTime = (s: TraceSpan): number => {
    const raw = s.startTime || s.occurredAt;
    if (!raw) return NaN;
    const t = new Date(raw).getTime();
    return isNaN(t) ? NaN : t;
  };

  const validStartTimes = spans
    .map(parseSpanTime)
    .filter((t) => !isNaN(t));

  if (rootOccurredAt) {
    const rootTime = new Date(rootOccurredAt).getTime();
    if (!isNaN(rootTime)) validStartTimes.push(rootTime);
  }

  const globalStartTime = validStartTimes.length > 0 ? Math.min(...validStartTimes) : 0;

  const maxEndTime = spans.reduce((max, s) => {
    const start = parseSpanTime(s);
    const validStart = !isNaN(start) ? start : globalStartTime;
    const dur = Math.max(0, s.durationMs ?? 0);
    return Math.max(max, validStart + dur);
  }, globalStartTime + (totalTraceDurationMs || 0));

  const effectiveTraceDuration = Math.max(
    totalTraceDurationMs > 0 ? totalTraceDurationMs : 0,
    maxEndTime - globalStartTime,
    ...spans.map((s) => s.durationMs ?? 0),
    1,
  );

  // First pass: Build individual nodes
  const nodeMap = new Map<string, SpanTreeNode>();
  let hasMissingParents = false;

  for (const span of spans) {
    const spanDuration = Math.max(0, span.durationMs ?? 0);
    const parsedStart = parseSpanTime(span);
    const spanStartTime = !isNaN(parsedStart) ? parsedStart : globalStartTime;
    const startOffsetMs = Math.max(0, spanStartTime - globalStartTime);

    const offsetPercent = Math.min(99.5, Math.max(0, (startOffsetMs / effectiveTraceDuration) * 100));
    const rawWidthPercent = (spanDuration / effectiveTraceDuration) * 100;
    // Ensure zero-duration or tiny microsecond spans have visible presence (min 0.6%)
    const widthPercent = Math.min(100 - offsetPercent, Math.max(0.6, rawWidthPercent));

    const status = (span.spanStatus || "ok").toLowerCase();
    const hasError =
      status === "error" ||
      status === "critical" ||
      status === "fatal" ||
      (span.httpStatusCode != null && span.httpStatusCode >= 500);

    const node: SpanTreeNode = {
      span,
      id: span.id || span.spanId,
      spanId: span.spanId || span.id,
      parentSpanId: span.parentSpanId || null,
      name: span.name || "unnamed-span",
      kind: (span.spanKind || span.spanType || "internal").toLowerCase(),
      status: span.spanStatus || "ok",
      service: span.service || null,
      durationMs: spanDuration,
      selfDurationMs: span.exclusiveDurationMs != null && !isNaN(span.exclusiveDurationMs) && span.exclusiveDurationMs >= 0
        ? span.exclusiveDurationMs
        : spanDuration, // updated in traversal pass if needed
      selfPercent: 0,
      startOffsetMs,
      offsetPercent,
      widthPercent,
      depth: span.depth ?? 0,
      isRoot: false,
      isBottleneck: false,
      hasError,
      isMissingParent: false,
      children: [],
    };

    nodeMap.set(node.spanId, node);
  }

  // Second pass: Wire hierarchy with cycle and orphan protection
  const rootNodes: SpanTreeNode[] = [];

  // Function to check whether adding child to parent creates an ancestry cycle
  const createsCycle = (parent: SpanTreeNode, childId: string): boolean => {
    let curr: SpanTreeNode | undefined = parent;
    const visited = new Set<string>();
    while (curr) {
      if (curr.spanId === childId) return true;
      if (visited.has(curr.spanId)) return true;
      visited.add(curr.spanId);
      curr = curr.parentSpanId ? nodeMap.get(curr.parentSpanId) : undefined;
    }
    return false;
  };

  for (const node of nodeMap.values()) {
    if (node.parentSpanId && nodeMap.has(node.parentSpanId) && node.parentSpanId !== node.spanId) {
      const parent = nodeMap.get(node.parentSpanId)!;
      if (!createsCycle(parent, node.spanId)) {
        parent.children.push(node);
      } else {
        // Cycle prevented, promote to root
        node.isRoot = true;
        rootNodes.push(node);
      }
    } else if (node.parentSpanId && !nodeMap.has(node.parentSpanId)) {
      // Orphan span: parentSpanId does not exist in dataset
      node.isMissingParent = true;
      hasMissingParents = true;
      node.isRoot = true;
      rootNodes.push(node);
    } else {
      node.isRoot = true;
      rootNodes.push(node);
    }
  }

  // If no root was identified (e.g. all had missing parents or cycles), promote highest duration
  if (rootNodes.length === 0 && nodeMap.size > 0) {
    const sorted = Array.from(nodeMap.values()).sort((a, b) => b.durationMs - a.durationMs);
    sorted[0].isRoot = true;
    rootNodes.push(sorted[0]);
  }

  // Sort root nodes chronologically
  rootNodes.sort((a, b) => a.startOffsetMs - b.startOffsetMs || b.durationMs - a.durationMs);

  // Third pass: Calculate self duration & identify bottlenecks
  const flatList: SpanTreeNode[] = [];
  let maxDuration = -1;
  let bottleneckNode: SpanTreeNode | null = null;
  const traversedIds = new Set<string>();

  function traverse(node: SpanTreeNode, currentDepth: number) {
    if (traversedIds.has(node.spanId)) return;
    traversedIds.add(node.spanId);

    node.depth = currentDepth;

    // Use exclusiveDurationMs if supplied by SDK/backend, otherwise compute
    if (node.span.exclusiveDurationMs != null && !isNaN(node.span.exclusiveDurationMs) && node.span.exclusiveDurationMs >= 0) {
      node.selfDurationMs = node.span.exclusiveDurationMs;
    } else {
      const childrenDuration = node.children.reduce((sum, child) => sum + child.durationMs, 0);
      node.selfDurationMs = Math.max(0, node.durationMs - childrenDuration);
    }
    node.selfPercent = effectiveTraceDuration > 0 ? (node.selfDurationMs / effectiveTraceDuration) * 100 : 0;

    // Track bottleneck span (longest duration span)
    if (node.durationMs > maxDuration) {
      maxDuration = node.durationMs;
      bottleneckNode = node;
    }

    flatList.push(node);

    // Sort children by start offset, then by duration desc
    node.children.sort((a, b) => a.startOffsetMs - b.startOffsetMs || b.durationMs - a.durationMs);
    for (const child of node.children) {
      traverse(child, currentDepth + 1);
    }
  }

  for (const root of rootNodes) {
    traverse(root, 0);
  }

  // Pick up any leftover unvisited nodes (if any)
  for (const node of nodeMap.values()) {
    if (!traversedIds.has(node.spanId)) {
      traverse(node, 0);
    }
  }

  if (bottleneckNode) {
    (bottleneckNode as SpanTreeNode).isBottleneck = true;
  }

  // ── Calculate Execution Breakdown (Attribution across Entire Trace) ──
  const dbIntervals: TimeInterval[] = [];
  const httpIntervals: TimeInterval[] = [];
  const cacheIntervals: TimeInterval[] = [];
  let dbCount = 0;
  let httpCount = 0;
  let cacheCount = 0;

  for (const span of spans) {
    const isRoot = span.parentSpanId == null;
    const isDb =
      Boolean(span.dbSystem) ||
      span.spanType === "database" ||
      Boolean(span.dbStatement) ||
      span.name.startsWith("db.") ||
      (span.spanKind === "client" &&
        (span.name.includes("find") ||
          span.name.includes("update") ||
          span.name.includes("query") ||
          span.name.includes("insert") ||
          span.name.includes("delete") ||
          span.name.includes("select")));

    const isCache =
      span.spanType === "cache" ||
      span.name.startsWith("cache.") ||
      span.name.includes("redis") ||
      span.name.includes("memcached");

    const isHttp =
      !isRoot &&
      !isDb &&
      !isCache &&
      (span.spanType === "http" ||
        span.spanKind === "client" ||
        Boolean(span.httpMethod) ||
        Boolean(span.httpUrl));

    const startMs = parseSpanTime(span);
    const validStart = !isNaN(startMs) ? Math.max(0, startMs - globalStartTime) : 0;
    const dur = Math.max(0, span.durationMs ?? 0);
    const interval = { start: validStart, end: validStart + dur };

    if (isDb) {
      dbCount++;
      dbIntervals.push(interval);
    } else if (isCache) {
      cacheCount++;
      cacheIntervals.push(interval);
    } else if (isHttp) {
      httpCount++;
      httpIntervals.push(interval);
    }
  }

  const databaseMs = sumMergedIntervals(dbIntervals);
  const httpMs = sumMergedIntervals(httpIntervals);
  const cacheMs = sumMergedIntervals(cacheIntervals);
  const totalIoMs = databaseMs + httpMs + cacheMs;

  const internalComputeMs = Math.max(0, effectiveTraceDuration - totalIoMs);
  const internalComputePercent = effectiveTraceDuration > 0 ? (internalComputeMs / effectiveTraceDuration) * 100 : 0;
  const databasePercent = effectiveTraceDuration > 0 ? (databaseMs / effectiveTraceDuration) * 100 : 0;
  const httpPercent = effectiveTraceDuration > 0 ? (httpMs / effectiveTraceDuration) * 100 : 0;
  const cachePercent = effectiveTraceDuration > 0 ? (cacheMs / effectiveTraceDuration) * 100 : 0;

  // Determine primary bottleneck type & label
  let primaryBottleneckType: ExecutionBreakdown["primaryBottleneckType"] = "internal_compute";
  let primaryBottleneckLabel = "Internal Calculation / App Logic";
  let primaryBottleneckMs = internalComputeMs;
  let primaryBottleneckPercent = internalComputePercent;

  if (databaseMs > internalComputeMs && databaseMs >= httpMs && databaseMs >= cacheMs) {
    primaryBottleneckType = "database";
    primaryBottleneckLabel = `Database Calls (${dbCount} ${dbCount === 1 ? "query" : "queries"})`;
    primaryBottleneckMs = databaseMs;
    primaryBottleneckPercent = databasePercent;
  } else if (httpMs > internalComputeMs && httpMs >= databaseMs && httpMs >= cacheMs) {
    primaryBottleneckType = "http";
    primaryBottleneckLabel = `External HTTP Calls (${httpCount} ${httpCount === 1 ? "call" : "calls"})`;
    primaryBottleneckMs = httpMs;
    primaryBottleneckPercent = httpPercent;
  }

  const executionBreakdown: ExecutionBreakdown = {
    totalDurationMs: effectiveTraceDuration,
    internalComputeMs,
    internalComputePercent,
    databaseMs,
    databasePercent,
    databaseCount: dbCount,
    httpMs,
    httpPercent,
    httpCount,
    cacheMs,
    cachePercent,
    cacheCount,
    otherMs: 0,
    otherPercent: 0,
    primaryBottleneckType,
    primaryBottleneckLabel,
    primaryBottleneckMs,
    primaryBottleneckPercent,
  };

  // ── Calculate Execution Gaps (Uninstrumented periods between sibling operations) ──
  const executionGaps: ExecutionGap[] = [];
  for (const node of nodeMap.values()) {
    if (node.children.length >= 2) {
      const sortedChildren = [...node.children].sort((a, b) => a.startOffsetMs - b.startOffsetMs);
      for (let i = 0; i < sortedChildren.length - 1; i++) {
        const prev = sortedChildren[i];
        const next = sortedChildren[i + 1];
        const prevEnd = prev.startOffsetMs + prev.durationMs;
        const gapMs = next.startOffsetMs - prevEnd;
        // Flag gaps >= 30ms as significant internal calculation / idle intervals
        if (gapMs >= 30) {
          const offsetPercent = Math.min(99.5, Math.max(0, (prevEnd / effectiveTraceDuration) * 100));
          const widthPercent = Math.min(100 - offsetPercent, Math.max(0.6, (gapMs / effectiveTraceDuration) * 100));
          executionGaps.push({
            id: `gap-${prev.spanId}-${next.spanId}`,
            parentSpanId: node.spanId,
            startOffsetMs: prevEnd,
            durationMs: gapMs,
            offsetPercent,
            widthPercent,
            precedingSpanName: prev.name,
            succeedingSpanName: next.name,
            depth: Math.max(prev.depth, next.depth),
          });
        }
      }
    }
  }

  return { tree: rootNodes, flatList, bottleneckNode, hasMissingParents, executionBreakdown, executionGaps };
}

export function sectionDomId(section: string): string {
  return `trace-section-${section}`;
}

export function toCopyableJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
