// ============================================================
// Pulse SDK event schema types (shared across observe surfaces)
// Single source of truth for the dummy-data layer + pages.
// ============================================================

export type SeverityLevel = "debug" | "info" | "warning" | "error" | "fatal";
export type BreadcrumbType = "default" | "http" | "navigation" | "error" | "query" | "ui";
export type SpanKind = "server" | "client" | "internal" | "producer" | "consumer";
export type SpanStatus = "ok" | "error" | "unset";
export type MetricType = "counter" | "gauge" | "histogram";
export type LogLevel = "debug" | "info" | "warn" | "error";
export type CronStatus = "ok" | "error" | "in_progress";

export interface EventMetadata {
  sdkName: string;
  sdkVersion: string;
  service: string;
  environment: string;
  release: string;
  serverName: string;
}

export interface StackFrame {
  filename: string;
  function: string;
  lineno: number;
  colno: number;
  inApp: boolean;
  module: string;
  sourceContext?: {
    pre: string[];
    line: string;
    post: string[];
  };
}

export interface Breadcrumb {
  timestamp: string;
  category: string;
  message: string;
  level: SeverityLevel;
  type: BreadcrumbType;
  data?: Record<string, unknown>;
}

export interface EventUser {
  id: string;
  email?: string;
  username?: string;
}

export interface ErrorEvent {
  type?: "error";
  id?: string;
  publicId?: string;
  tracePublicId?: string;
  eventId?: string;
  requestId?: string;
  message: string;
  name?: string;
  errorName?: string;
  stack?: StackFrame[];
  fingerprint: string;
  timestamp: number;
  occurredAt?: string;
  severity: SeverityLevel;
  context?: Record<string, unknown>;
  breadcrumbs?: Breadcrumb[];
  traceId?: string;
  spanId?: string;
  metadata: EventMetadata;
  user?: EventUser;
  tags?: Record<string, string>;
  mechanism?: string;
  handled?: boolean;
  isHandled?: boolean;
  statusCode?: number;
  environment?: string;
  route?: string;
  project?: string;
  projectName?: string;
  projectSlug?: string;
}

export interface ErrorGroup {
  fingerprint: string;
  name: string;
  message: string;
  severity: SeverityLevel;
  mechanism: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  affectedUsers: Set<string>;
  services: Set<string>;
  releases: Set<string>;
  occurrences: ErrorEvent[];
}

export interface RequestEvent {
  type: "request";
  id?: string;
  publicId?: string;
  tracePublicId?: string;
  eventId: string;
  requestId: string;
  endpoint?: string;
  url: string;
  method: string;
  statusCode: number;
  durationMs?: number;
  latency: number;
  occurredAt?: string | number;
  timestamp: number;
  environment?: string;
  project?: string;
  projectName?: string;
  projectSlug?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  bodySize?: number;
  responseSize?: number;
  userId?: string | null;
  tenantId?: string;
  sessionId?: string;
  clientIp?: string;
  userAgent: string;
  referer?: string;
  route: string;
  traceId: string;
  hasTrace?: boolean;
  hasError?: boolean;
  spanId?: string;
  metadata: EventMetadata;
  name?: string;
  service?: string;
}

export interface SpanEvent {
  type: "span";
  eventId: string;
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  kind: SpanKind;
  startTime: number;
  endTime: number;
  duration: number;
  exclusiveDuration: number;
  status: SpanStatus;
  statusMessage?: string;
  attributes: Record<string, unknown>;
  events?: { name: string; timestamp: number; attributes: Record<string, unknown> }[];
  links?: { traceId: string; spanId: string }[];
  metadata: EventMetadata;
  requestId?: string;
  sessionId?: string;
  userId?: string;
  tenantId: string;
  __pulseInternal: boolean;
}

export interface AggregatedSpanEvent {
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: string;
  startTime: number;
  endTime: number;
  duration: number;
  exclusiveDuration: number;
  status: SpanStatus;
  statusMessage?: string;
  attributes: Record<string, unknown>;
  events: { name: string; timestamp: number; attributes: Record<string, unknown> }[];
  links: { traceId: string; spanId: string }[];
  children: AggregatedSpanEvent[];
}

export interface TraceEvent {
  type: "trace";
  id?: string;
  publicId?: string;
  tracePublicId?: string;
  eventId: string;
  traceId: string;
  occurredAt?: string | number;
  timestamp: number;
  rootSpanName?: string;
  rootSpan?: AggregatedSpanEvent;
  rootSpanId?: string;
  spanKind?: string;
  rootSpanStatus?: string;
  endpoint?: string;
  httpMethod?: string;
  statusCode?: number;
  spanCount: number;
  durationMs?: number;
  totalDurationMs?: number;
  totalDuration: number;
  isPartial?: boolean;
  environment?: string;
  service?: string;
  metadata: EventMetadata;
  requestId?: string;
  sessionId?: string;
  userId?: string;
  tenantId?: string;
  status?: string;
  __pulseInternal?: boolean;
}

export interface MetricEvent {
  type: "metric";
  eventId: string;
  metricName: string;
  metricType: MetricType;
  value: number;
  unit: string;
  tags: Record<string, string>;
  timestamp: number;
  metadata: EventMetadata;
  count?: number;
  sum?: number;
  min?: number;
  max?: number;
  avg?: number;
  rate: number;
  buckets?: {
    scale: number;
    offset: number;
    positiveCounts: number[];
    zeroCount: number;
  };
}

export interface LogEvent {
  type: "log";
  id?: string;
  eventId: string;
  level: LogLevel;
  severity?: LogLevel;
  message: string;
  timestamp: number;
  occurredAt?: number | string;
  args?: unknown[];
  requestId?: string;
  traceId?: string;
  spanId?: string;
  environment?: string;
  service?: string;
  metadata: EventMetadata;
}

export interface ProfileEvent {
  type: "profile";
  eventId: string;
  profileType: "cpu";
  requestId: string;
  traceId: string;
  spanId: string;
  startTime: number;
  endTime: number;
  duration: number;
  profile: {
    nodes: {
      id: number;
      callFrame: {
        functionName: string;
        scriptId: string;
        url: string;
        lineNumber: number;
        columnNumber: number;
      };
      hitCount: number;
      children: number[];
    }[];
    startTime: number;
    endTime: number;
    samples: { timestamp: number; nodeId: number }[];
    timeDeltas: number[];
  };
  timestamp: number;
  metadata: EventMetadata;
}

export interface CronCheckInEvent {
  type: "cron_checkin";
  eventId: string;
  monitorSlug: string;
  status: CronStatus;
  timestamp: number;
  duration?: number;
  environment: string;
  metadata: EventMetadata;
}

export interface ReplayEvent {
  type: "replay";
  id?: string;
  eventId: string;
  sessionId: string;
  segmentId: number;
  timestamp: number;
  durationMs?: number;
  environment?: string;
  events: { type: string; timestamp: number; data: Record<string, unknown> }[];
  metadata: EventMetadata;
}

// ---- Advanced diagnostics (runtime metrics / event loop / GC) ----
export interface RuntimeMetricSample {
  type: "runtime_metric";
  eventId: string;
  timestamp: number;
  heapUsedMb: number;
  heapTotalMb: number;
  externalMb: number;
  rssMb: number;
  activeHandles: number;
  metadata: EventMetadata;
}

export interface EventLoopSample {
  type: "event_loop";
  eventId: string;
  timestamp: number;
  lagMs: number;
  p95LagMs: number;
  utilizationPercent: number;
  metadata: EventMetadata;
}

export type GcType = "scavenge" | "mark-sweep-compact" | "incremental-marking" | "weak-callback";

export interface GcPauseEvent {
  type: "gc_pause";
  eventId: string;
  timestamp: number;
  gcType: GcType;
  pauseDurationMs: number;
  heapBeforeMb: number;
  heapAfterMb: number;
  metadata: EventMetadata;
}

// ---- filter shapes used by query hooks ----
export interface ErrorFilters {
  service?: string;
  severity?: SeverityLevel;
  fingerprint?: string;
}
export interface RequestFilters {
  statusCode?: number;
  method?: string;
  requestId?: string;
}
export interface LogFilters {
  level?: LogLevel;
  query?: string;
}
