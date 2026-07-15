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
  type: "error";
  eventId: string;
  requestId?: string;
  message: string;
  name: string;
  stack: StackFrame[];
  fingerprint: string;
  timestamp: number;
  severity: SeverityLevel;
  context: Record<string, unknown>;
  breadcrumbs?: Breadcrumb[];
  traceId?: string;
  spanId?: string;
  metadata: EventMetadata;
  user?: EventUser;
  tags: Record<string, string>;
  mechanism: string;
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
  eventId: string;
  requestId: string;
  url: string;
  method: string;
  statusCode: number;
  latency: number;
  timestamp: number;
  headers: Record<string, string>;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  bodySize?: number;
  responseSize: number;
  userId: string | null;
  tenantId: string;
  sessionId?: string;
  clientIp: string;
  userAgent: string;
  referer: string;
  route: string;
  traceId: string;
  spanId: string;
  metadata: EventMetadata;
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
  eventId: string;
  traceId: string;
  rootSpan: AggregatedSpanEvent;
  spanCount: number;
  totalDuration: number;
  isPartial: boolean;
  metadata: EventMetadata;
  requestId: string;
  sessionId: string;
  userId: string;
  tenantId: string;
  __pulseInternal: boolean;
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
  eventId: string;
  level: LogLevel;
  message: string;
  timestamp: number;
  args?: unknown[];
  requestId?: string;
  traceId?: string;
  spanId?: string;
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
  eventId: string;
  sessionId: string;
  segmentId: number;
  timestamp: number;
  events: { type: string; timestamp: number; data: Record<string, unknown> }[];
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
