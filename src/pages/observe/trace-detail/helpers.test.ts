import { describe, it, expect } from "vitest";
import { buildSpanTree, deduplicateSpans, formatDurationMs, formatPercent } from "./helpers";
import type { TraceSpan } from "./types";

describe("Trace Hierarchy Reconstruction (buildSpanTree)", () => {
  it("reconstructs normal parent-child hierarchy regardless of input arrival order", () => {
    // Spans arriving out-of-order (grandchild, child, root)
    const rawSpans: TraceSpan[] = [
      {
        id: "span-3",
        spanId: "span-3",
        parentSpanId: "span-2",
        name: "db.users.find",
        occurredAt: "2026-09-22T12:00:00.050Z",
        durationMs: 40,
        traceId: "trace-1",
        spanKind: "client",
      },
      {
        id: "span-2",
        spanId: "span-2",
        parentSpanId: "span-1",
        name: "authenticate",
        occurredAt: "2026-09-22T12:00:00.020Z",
        durationMs: 80,
        traceId: "trace-1",
        spanKind: "internal",
      },
      {
        id: "span-1",
        spanId: "span-1",
        parentSpanId: null,
        name: "GET /api/orders",
        occurredAt: "2026-09-22T12:00:00.000Z",
        durationMs: 200,
        traceId: "trace-1",
        spanKind: "server",
      },
    ];

    const { tree, flatList, bottleneckNode } = buildSpanTree(rawSpans, 200);

    // Only 1 root node
    expect(tree).toHaveLength(1);
    const root = tree[0];
    expect(root.spanId).toBe("span-1");
    expect(root.depth).toBe(0);
    expect(root.children).toHaveLength(1);

    // Child
    const child = root.children[0];
    expect(child.spanId).toBe("span-2");
    expect(child.depth).toBe(1);
    expect(child.children).toHaveLength(1);

    // Grandchild
    const grandchild = child.children[0];
    expect(grandchild.spanId).toBe("span-3");
    expect(grandchild.depth).toBe(2);
    expect(grandchild.children).toHaveLength(0);

    // Flat list contains all 3 in depth-first traversal
    expect(flatList).toHaveLength(3);
    expect(flatList.map((n) => n.spanId)).toEqual(["span-1", "span-2", "span-3"]);
  });

  it("handles missing parents and orphan spans gracefully without dropping telemetry", () => {
    const rawSpans: TraceSpan[] = [
      {
        id: "root-1",
        spanId: "root-1",
        parentSpanId: null,
        name: "POST /api/checkout",
        occurredAt: "2026-09-22T12:00:00.000Z",
        durationMs: 150,
        traceId: "trace-2",
      },
      {
        id: "orphan-span",
        spanId: "orphan-span",
        parentSpanId: "missing-parent-999", // parent not in dataset
        name: "async.event.publish",
        occurredAt: "2026-09-22T12:00:00.030Z",
        durationMs: 60,
        traceId: "trace-2",
      },
    ];

    const { tree, flatList, hasMissingParents } = buildSpanTree(rawSpans, 150);

    expect(hasMissingParents).toBe(true);
    // Both spans are preserved at the root level
    expect(tree).toHaveLength(2);
    expect(flatList).toHaveLength(2);

    const orphanNode = flatList.find((n) => n.spanId === "orphan-span");
    expect(orphanNode).toBeDefined();
    expect(orphanNode?.isMissingParent).toBe(true);
    expect(orphanNode?.isRoot).toBe(true);
  });

  it("prevents infinite loops and stack overflow on circular parentSpanId references", () => {
    const rawSpans: TraceSpan[] = [
      {
        id: "span-a",
        spanId: "span-a",
        parentSpanId: "span-b", // A points to B
        name: "operation-a",
        occurredAt: "2026-09-22T12:00:00.000Z",
        durationMs: 50,
        traceId: "trace-cycle",
      },
      {
        id: "span-b",
        spanId: "span-b",
        parentSpanId: "span-a", // B points to A (circular loop)
        name: "operation-b",
        occurredAt: "2026-09-22T12:00:00.010Z",
        durationMs: 40,
        traceId: "trace-cycle",
      },
    ];

    // Must not crash or exceed call stack
    expect(() => buildSpanTree(rawSpans, 100)).not.toThrow();
    const { flatList } = buildSpanTree(rawSpans, 100);
    expect(flatList).toHaveLength(2);
  });

  it("handles zero-duration spans and ensures visible timeline rendering width", () => {
    const rawSpans: TraceSpan[] = [
      {
        id: "root-zero",
        spanId: "root-zero",
        parentSpanId: null,
        name: "instant.check",
        occurredAt: "2026-09-22T12:00:00.000Z",
        durationMs: 0, // 0 ms instant span
        traceId: "trace-zero",
      },
    ];

    const { tree } = buildSpanTree(rawSpans, 0);
    expect(tree).toHaveLength(1);
    expect(tree[0].durationMs).toBe(0);
    // Width percent must be positive (at least 0.6%) so the visual bar is visible to user
    expect(tree[0].widthPercent).toBeGreaterThan(0);
  });

  it("deduplicates spans and retains the highest fidelity record", () => {
    const rawSpans: TraceSpan[] = [
      {
        id: "dup-1",
        spanId: "dup-1",
        name: "partial-span",
        occurredAt: "2026-09-22T12:00:00.000Z",
        durationMs: 10,
        traceId: "trace-dup",
        service: null,
      },
      {
        id: "dup-1",
        spanId: "dup-1",
        name: "enriched-span",
        occurredAt: "2026-09-22T12:00:00.000Z",
        durationMs: 50,
        traceId: "trace-dup",
        service: "order-service",
      },
    ];

    const deduplicated = deduplicateSpans(rawSpans);
    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].service).toBe("order-service");
    expect(deduplicated[0].durationMs).toBe(50);
  });

  it("accurately identifies the bottleneck span and calculates exclusive self-duration", () => {
    const rawSpans: TraceSpan[] = [
      {
        id: "root",
        spanId: "root",
        parentSpanId: null,
        name: "handler",
        occurredAt: "2026-09-22T12:00:00.000Z",
        durationMs: 500,
        traceId: "trace-bn",
      },
      {
        id: "fast-child",
        spanId: "fast-child",
        parentSpanId: "root",
        name: "cache.get",
        occurredAt: "2026-09-22T12:00:00.010Z",
        durationMs: 15,
        traceId: "trace-bn",
      },
      {
        id: "slow-child",
        spanId: "slow-child",
        parentSpanId: "root",
        name: "db.heavy.query",
        occurredAt: "2026-09-22T12:00:00.030Z",
        durationMs: 400, // Slowest operation
        traceId: "trace-bn",
      },
    ];

    const { bottleneckNode, flatList } = buildSpanTree(rawSpans, 500);

    const rootNode = flatList.find((n) => n.spanId === "root");
    expect(rootNode).toBeDefined();
    // Exclusive self-duration: 500 - (15 + 400) = 85ms
    expect(rootNode?.selfDurationMs).toBe(85);

    const slowNode = flatList.find((n) => n.spanId === "slow-child");
    expect(slowNode?.selfDurationMs).toBe(400);

    // Bottleneck node should be identified
    expect(bottleneckNode).toBeDefined();
    expect(bottleneckNode?.spanId).toBe("root"); // root had 500ms total duration
    expect(bottleneckNode?.isBottleneck).toBe(true);
  });
});

describe("Formatting Helpers", () => {
  it("formats duration accurately across microsecond, millisecond, and second boundaries", () => {
    expect(formatDurationMs(0)).toBe("0 ms");
    expect(formatDurationMs(0.0005)).toBe("< 1 µs");
    expect(formatDurationMs(0.45)).toBe("450 µs");
    expect(formatDurationMs(8.2345)).toBe("8.235 ms");
    expect(formatDurationMs(345.67)).toBe("345.67 ms");
    expect(formatDurationMs(2500)).toBe("2.50 s");
    expect(formatDurationMs(65000)).toBe("1m 5.0s");
  });

  it("formats percentages cleanly", () => {
    expect(formatPercent(0)).toBe("0.0%");
    expect(formatPercent(0.05)).toBe("< 0.1%");
    expect(formatPercent(42.345)).toBe("42.3%");
    expect(formatPercent(100)).toBe("100.0%");
  });
});

describe("Execution Breakdown & Internal Calculation Attribution", () => {
  it("accurately breaks down a 5-second trace into internal compute vs database calls", () => {
    // Mimics the real /api/auth/login trace: 5900ms total, 3 quick Mongo queries totaling ~118ms
    const rawSpans: TraceSpan[] = [
      {
        id: "root-login",
        spanId: "root-login",
        parentSpanId: null,
        name: "HTTP POST /api/auth/login",
        occurredAt: "2026-09-23T04:55:44.888Z",
        durationMs: 5906,
        exclusiveDurationMs: 5787,
        traceId: "trace-login-test",
        spanKind: "server",
      },
      {
        id: "span-find-accounts",
        spanId: "span-find-accounts",
        parentSpanId: "root-login",
        name: "find accounts",
        occurredAt: "2026-09-23T04:55:45.813Z",
        durationMs: 40.5,
        exclusiveDurationMs: 40.5,
        dbSystem: "mongodb",
        spanKind: "client",
        spanType: "database",
        traceId: "trace-login-test",
      },
      {
        id: "span-find-users",
        spanId: "span-find-users",
        parentSpanId: "root-login",
        name: "find users",
        occurredAt: "2026-09-23T04:55:45.872Z",
        durationMs: 39.3,
        exclusiveDurationMs: 39.3,
        dbSystem: "mongodb",
        spanKind: "client",
        spanType: "database",
        traceId: "trace-login-test",
      },
      {
        id: "span-update-users",
        spanId: "span-update-users",
        parentSpanId: "root-login",
        name: "update users",
        occurredAt: "2026-09-23T04:55:50.734Z",
        durationMs: 38.9,
        exclusiveDurationMs: 38.9,
        dbSystem: "mongodb",
        spanKind: "client",
        spanType: "database",
        traceId: "trace-login-test",
      },
    ];

    const { executionBreakdown, executionGaps, flatList } = buildSpanTree(rawSpans, 5906);

    // Total duration should be 5906ms
    expect(executionBreakdown.totalDurationMs).toBe(5906);

    // Database time should be ~118.7ms (around 2%)
    expect(executionBreakdown.databaseMs).toBeCloseTo(118.7, 0);
    expect(executionBreakdown.databaseCount).toBe(3);
    expect(executionBreakdown.databasePercent).toBeCloseTo(2.0, 0);

    // Internal Compute time should be ~5787.3ms (around 98%)
    expect(executionBreakdown.internalComputeMs).toBeCloseTo(5787.3, 0);
    expect(executionBreakdown.internalComputePercent).toBeCloseTo(98.0, 0);

    // Primary Bottleneck must be correctly attributed to Internal Calculation
    expect(executionBreakdown.primaryBottleneckType).toBe("internal_compute");
    expect(executionBreakdown.primaryBottleneckLabel).toBe("Internal Calculation / App Logic");

    // Uninstrumented gap between `find users` and `update users` (~4823ms) should be detected
    expect(executionGaps.length).toBeGreaterThanOrEqual(1);
    const largeGap = executionGaps.find((g) => g.durationMs > 4000);
    expect(largeGap).toBeDefined();
    expect(largeGap?.durationMs).toBeGreaterThan(4800);
    expect(largeGap?.precedingSpanName).toBe("find users");
    expect(largeGap?.succeedingSpanName).toBe("update users");

    // FlatList root node should have selfDurationMs ~ 5787
    const rootNode = flatList.find((n) => n.spanId === "root-login");
    expect(rootNode?.selfDurationMs).toBe(5787);
  });

  it("accurately attributes bottleneck to database when queries dominate trace duration", () => {
    const rawSpans: TraceSpan[] = [
      {
        id: "root-api",
        spanId: "root-api",
        parentSpanId: null,
        name: "GET /api/reports",
        occurredAt: "2026-09-23T05:00:00.000Z",
        durationMs: 1200,
        traceId: "trace-db-heavy",
      },
      {
        id: "span-db-slow",
        spanId: "span-db-slow",
        parentSpanId: "root-api",
        name: "SELECT FROM orders",
        occurredAt: "2026-09-23T05:00:00.050Z",
        durationMs: 1100,
        dbSystem: "postgres",
        spanType: "database",
        traceId: "trace-db-heavy",
      },
    ];

    const { executionBreakdown } = buildSpanTree(rawSpans, 1200);
    expect(executionBreakdown.databaseMs).toBe(1100);
    expect(executionBreakdown.databasePercent).toBeCloseTo(91.7, 0);
    expect(executionBreakdown.internalComputeMs).toBe(100);
    expect(executionBreakdown.primaryBottleneckType).toBe("database");
  });
});

