export interface TraceSpan {
  id: string;
  publicId?: string;
  environment?: string;
  occurredAt: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string | null;
  name: string;
  spanKind?: string;
  spanType?: string;
  spanStatus?: string;
  endpoint?: string | null;
  depth?: number | null;
  service?: string | null;
  durationMs?: number;
  exclusiveDurationMs?: number;
  dbSystem?: string | null;
  dbName?: string | null;
  dbOperation?: string | null;
  dbCollection?: string | null;
  dbStatement?: string | null;
  netPeerIp?: string | null;
  netPeerPort?: number | null;
  httpMethod?: string | null;
  httpStatusCode?: number | null;
  httpUrl?: string | null;
  httpRoute?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  attributes?: Record<string, unknown>;
  events?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}

export interface TraceEntity {
  id: string;
  publicId?: string;
  eventId?: string;
  environment?: string;
  traceId: string;
  tracePublicId?: string;
  spanId?: string;
  parentSpanId?: string | null;
  sessionId?: string | null;
  userId?: string | null;
  service?: string | null;
  endpoint?: string | null;
  release?: string | null;
  sdkName?: string | null;
  sdkVersion?: string | null;
  severity?: string | null;
  message?: string | null;
  name?: string | null;
  durationMs?: number;
  statusCode?: number | null;
  occurredAt: string;
  project?: string;
  projectSlug?: string;
  projectName?: string;
  rootSpanName?: string;
  rootSpanId?: string;
  spanKind?: string;
  rootSpanStatus?: string;
  status?: string;
  httpMethod?: string | null;
  responseSize?: number | null;
  spanCount?: number;
  totalDurationMs?: number;
  isPartial?: boolean;
  requestId?: string | null;
  trace?: {
    publicId?: string;
    traceId?: string;
  };
}

export interface TraceCorrelations {
  traceId?: string | null;
  requestId?: string | null;
  spanId?: string | null;
  sessionId?: string | null;
  userId?: string | null;
  tracePublicId?: string | null;
}

export interface TraceCounts {
  spans?: number;
  logs?: number;
  errors?: number;
  requests?: number;
  metrics?: number;
  profiles?: number;
  crons?: number;
}

export interface TraceAiContext {
  intents?: string[];
  facts?: string[];
}

export interface TraceDetailData {
  id: string;
  publicId: string;
  resource: "traces";
  entity: TraceEntity;
  errorGroup?: unknown;
  attributes?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
  trace?: Record<string, unknown> | null;
  spanTree?: unknown;
  spans: TraceSpan[];
  logs?: Array<Record<string, unknown>>;
  relatedErrors?: Array<Record<string, unknown>>;
  relatedRequests?: Array<Record<string, unknown>>;
  metrics?: Array<Record<string, unknown>>;
  profiles?: Array<Record<string, unknown>>;
  crons?: Array<Record<string, unknown>>;
  correlations?: TraceCorrelations;
  counts?: TraceCounts;
  timeline?: Array<{ bucket: string; count: number; errorCount: number }>;
  aiContext?: TraceAiContext;
  ai?: {
    aiResponse?: unknown;
  };
}

export interface ExecutionBreakdown {
  totalDurationMs: number;
  internalComputeMs: number;
  internalComputePercent: number;
  databaseMs: number;
  databasePercent: number;
  databaseCount: number;
  httpMs: number;
  httpPercent: number;
  httpCount: number;
  cacheMs: number;
  cachePercent: number;
  cacheCount: number;
  otherMs: number;
  otherPercent: number;
  primaryBottleneckType: "internal_compute" | "database" | "http" | "cache" | "leaf_span";
  primaryBottleneckLabel: string;
  primaryBottleneckMs: number;
  primaryBottleneckPercent: number;
}

export interface SpanTreeNode {
  span: TraceSpan;
  id: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  kind: string;
  status: string;
  service: string | null;
  durationMs: number;
  selfDurationMs: number;
  selfPercent: number;
  startOffsetMs: number;
  offsetPercent: number;
  widthPercent: number;
  depth: number;
  isRoot: boolean;
  isBottleneck: boolean;
  hasError: boolean;
  isMissingParent?: boolean;
  isGap?: boolean;
  gapDurationMs?: number;
  gapPrecedingSpanName?: string;
  gapSucceedingSpanName?: string;
  children: SpanTreeNode[];
}

