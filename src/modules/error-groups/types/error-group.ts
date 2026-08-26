export type ErrorGroupStatus = "open" | "resolved" | "ignored" | "archived";
export type ErrorGroupSeverity = "warning" | "error" | "fatal" | "critical" | "info" | "debug";

export interface StackFrameItem {
  filename: string;
  function: string;
  lineno: number;
  colno: number;
  inApp: boolean;
  module?: string;
  contextPre?: string[];
  contextLine?: string;
  contextPost?: string[];
}

export interface ErrorGroupOccurrences {
  count: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
}

export interface ErrorGroupSeverityObj {
  highest: ErrorGroupSeverity;
  latest: ErrorGroupSeverity;
}

export interface ErrorGroupRegression {
  count: number;
  lastRegressedAt: string | null;
}

export interface ErrorGroupRelease {
  latest: string | null;
  resolvedIn: string | null;
}

export interface ErrorGroupLatestEventTrace {
  publicId: string | null;
  traceId: string | null;
}

export interface ErrorGroupLatestEvent {
  publicId: string | null;
  errorName: string;
  message: string;
  statusCode: number | null;
  trace: ErrorGroupLatestEventTrace;
}

export interface ErrorGroup {
  id: string;
  publicId?: string;
  tracePublicId?: string;
  fingerprint: string;
  status: ErrorGroupStatus;

  // Canonical nested structures
  occurrences?: ErrorGroupOccurrences;
  severity?: ErrorGroupSeverityObj;
  regression?: ErrorGroupRegression;
  release?: ErrorGroupRelease;
  latestEvent?: ErrorGroupLatestEvent;

  // Backward-compatible flattened fields
  occurrenceCount: number;
  occurrence_count?: number;
  firstSeen: string;
  firstSeenAt?: string;
  first_seen_at?: string;
  lastSeen: string;
  lastSeenAt?: string;
  last_seen_at?: string;
  highestSeverity: ErrorGroupSeverity;
  highest_severity?: ErrorGroupSeverity;
  latestSeverity: ErrorGroupSeverity;
  latest_severity?: ErrorGroupSeverity;
  latestRelease?: string;
  latest_release?: string;
  latestSdkVersion?: string;
  latest_sdk_version?: string;
  latestApplicationVersion?: string;
  latest_application_version?: string;
  lastErrorMessage: string;
  last_error_message?: string;
  lastErrorName: string;
  last_error_name?: string;
  lastStatusCode?: number;
  last_status_code?: number;
  environment?: string;
  service?: string;
  isRegression: boolean;
  is_regression?: boolean;
  regressionCount: number;
  fingerprintVersion?: number;
  fingerprint_version?: number;
  resolvedAt?: string | null;
  resolved_at?: string | null;
  resolvedRelease?: string | null;
  resolved_release?: string | null;
  mergedInto?: string | null;
  merged_into?: string | null;
  isMerged?: boolean;
  is_merged?: boolean;
  regression_count?: number;
  lastRegressedAt?: string;
  last_regressed_at?: string;
  stackFrames?: StackFrameItem[];
  route?: string;
  traceId?: string;
  lastTraceId?: string;
  last_trace_id?: string;
  lastRequestId?: string;
  last_request_id?: string;
  trend24h?: number[];
  trend7d?: number[];
  trend30d?: number[];
}

export interface ErrorGroupHistoryItem {
  id: string;
  groupId: string;
  actor: string;
  timestamp: string;
  action: string;
  oldValue?: any;
  old_value?: any;
  newValue?: any;
  new_value?: any;
  metadata?: Record<string, any>;
  previousStatus?: ErrorGroupStatus | null;
  newStatus?: ErrorGroupStatus | null;
  eventId?: string | null;
  release?: string | null;
  occurredAt?: string | null;
  reason?: string | null;
}

export interface ErrorGroupDetail extends ErrorGroup {
  stackFrames?: StackFrameItem[];
  history?: ErrorGroupHistoryItem[];
  relatedEvents?: RelatedErrorEvent[];
  mergeSources?: ErrorGroup[];
  releaseHistory?: Array<Record<string, unknown>>;
  affectedUsers?: number;
  affectedSessions?: number;
}

export interface RelatedErrorEvent {
  id: string;
  publicId?: string;
  occurredAt: string;
  message: string;
  severity: ErrorGroupSeverity;
  handled: boolean;
  route: string;
  statusCode: number;
  traceId: string;
  tracePublicId?: string;
}

export interface ErrorGroupFilterState {
  status: string;
  severity: string;
  isRegression: string;
  environment: string;
  release: string;
  sdkVersion: string;
  appVersion: string;
  minOccurrences: string;
  search: string;
  project?: string;
  range?: string;
  from?: string;
  to?: string;
}

