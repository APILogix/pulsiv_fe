import type { TraceSpan, SpanTreeNode } from "./types";

export function formatDurationMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || isNaN(ms)) return "0 ms";
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

export function buildSpanTree(
  rawSpans: TraceSpan[],
  totalTraceDurationMs: number,
  rootOccurredAt?: string,
): { tree: SpanTreeNode[]; flatList: SpanTreeNode[]; bottleneckNode: SpanTreeNode | null } {
  const spans = deduplicateSpans(rawSpans);

  if (spans.length === 0) {
    return { tree: [], flatList: [], bottleneckNode: null };
  }

  // Calculate robust global start time and max duration across all spans
  const validStartTimes = spans
    .map((s) => (s.occurredAt ? new Date(s.occurredAt).getTime() : NaN))
    .filter((t) => !isNaN(t));

  if (rootOccurredAt) {
    const rootTime = new Date(rootOccurredAt).getTime();
    if (!isNaN(rootTime)) validStartTimes.push(rootTime);
  }

  const globalStartTime = validStartTimes.length > 0 ? Math.min(...validStartTimes) : 0;

  const maxEndTime = spans.reduce((max, s) => {
    const start = s.occurredAt ? new Date(s.occurredAt).getTime() : globalStartTime;
    const dur = s.durationMs ?? 0;
    return Math.max(max, start + dur);
  }, globalStartTime + (totalTraceDurationMs || 0));

  const effectiveTraceDuration = Math.max(
    totalTraceDurationMs > 0 ? totalTraceDurationMs : 0,
    maxEndTime - globalStartTime,
    ...spans.map((s) => s.durationMs ?? 0),
    1,
  );

  // First pass: Build individual nodes
  const nodeMap = new Map<string, SpanTreeNode>();
  let maxDuration = -1;
  let bottleneckNode: SpanTreeNode | null = null;

  for (const span of spans) {
    const spanDuration = Math.max(0, span.durationMs ?? 0);
    const spanStartTime = span.occurredAt ? new Date(span.occurredAt).getTime() : globalStartTime;
    const startOffsetMs = Math.max(0, spanStartTime - globalStartTime);

    const offsetPercent = Math.min(99, Math.max(0, (startOffsetMs / effectiveTraceDuration) * 100));
    const rawWidthPercent = (spanDuration / effectiveTraceDuration) * 100;
    const widthPercent = Math.min(100 - offsetPercent, Math.max(0.8, rawWidthPercent));

    const status = (span.spanStatus || "ok").toLowerCase();
    const hasError = status === "error" || status === "critical" || status === "fatal" || (span.httpStatusCode != null && span.httpStatusCode >= 500);

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
      selfDurationMs: spanDuration, // updated in second pass
      startOffsetMs,
      offsetPercent,
      widthPercent,
      depth: span.depth ?? 0,
      isRoot: false,
      isBottleneck: false,
      hasError,
      children: [],
    };

    nodeMap.set(node.spanId, node);
  }

  // Second pass: Wire hierarchy
  const rootNodes: SpanTreeNode[] = [];

  for (const node of nodeMap.values()) {
    if (node.parentSpanId && nodeMap.has(node.parentSpanId) && node.parentSpanId !== node.spanId) {
      const parent = nodeMap.get(node.parentSpanId)!;
      parent.children.push(node);
      node.depth = Math.max(node.depth, parent.depth + 1);
    } else {
      node.isRoot = true;
      rootNodes.push(node);
    }
  }

  // If no root was identified because all had orphan parentSpanIds, promote top level
  if (rootNodes.length === 0 && nodeMap.size > 0) {
    const sorted = Array.from(nodeMap.values()).sort((a, b) => b.durationMs - a.durationMs);
    sorted[0].isRoot = true;
    rootNodes.push(sorted[0]);
  }

  // Third pass: Calculate self duration & identify bottlenecks
  const flatList: SpanTreeNode[] = [];

  function traverse(node: SpanTreeNode, currentDepth: number) {
    node.depth = currentDepth;
    const childrenDuration = node.children.reduce((sum, child) => sum + child.durationMs, 0);
    node.selfDurationMs = Math.max(0, node.durationMs - childrenDuration);

    // Track bottleneck (longest duration span among leaves/sub-spans)
    if (node.durationMs > maxDuration) {
      maxDuration = node.durationMs;
      bottleneckNode = node;
    }

    flatList.push(node);

    // Sort children by start offset or duration
    node.children.sort((a, b) => a.startOffsetMs - b.startOffsetMs || b.durationMs - a.durationMs);
    for (const child of node.children) {
      traverse(child, currentDepth + 1);
    }
  }

  for (const root of rootNodes) {
    traverse(root, 0);
  }

  if (bottleneckNode) {
    (bottleneckNode as SpanTreeNode).isBottleneck = true;
  }

  return { tree: rootNodes, flatList, bottleneckNode };
}

export function sectionDomId(section: string): string {
  return `trace-section-${section}`;
}

export function toCopyableJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
