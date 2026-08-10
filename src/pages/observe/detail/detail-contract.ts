import type { ObservabilityEventDetail } from "../hooks/useObservabilityApi";

export const DETAIL_RESOURCES = [
  "errors",
  "requests",
  "traces",
  "spans",
  "logs",
  "metrics",
  "profiles",
  "crons",
] as const;

export type DetailResource = (typeof DETAIL_RESOURCES)[number];
export type JsonRecord = Record<string, unknown>;
export type FieldKind = "text" | "id" | "number" | "duration" | "bytes" | "date" | "boolean";

export interface FieldDescriptor {
  label: string;
  keys: readonly string[];
  kind?: FieldKind;
  sensitive?: boolean;
}

export function isDetailResource(value: string): value is DetailResource {
  return DETAIL_RESOURCES.includes(value as DetailResource);
}

export function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

export function hasValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

export function pick(record: JsonRecord | null | undefined, keys: readonly string[]): unknown {
  if (!record) return undefined;
  for (const key of keys) {
    if (hasValue(record[key])) return record[key];
  }
  return undefined;
}

export function stringValue(value: unknown): string | null {
  if (!hasValue(value)) return null;
  return typeof value === "string" ? value : String(value);
}

export function numberValue(value: unknown): number | null {
  if (!hasValue(value)) return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function booleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function detailId(detail: ObservabilityEventDetail | null, fallback = ""): string {
  const entity = detail?.entity ?? null;
  return stringValue(pick(entity, ["id", "eventId", "event_id"])) ?? fallback;
}

export function labelize(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export const COMMON_FIELDS: readonly FieldDescriptor[] = [
  { label: "Resource ID", keys: ["id", "eventId", "event_id"], kind: "id" },
  { label: "Organization", keys: ["organizationId", "organization_id"], kind: "id" },
  { label: "Project", keys: ["projectId", "project_id"], kind: "id" },
  { label: "Tenant", keys: ["tenantId", "tenant_id"], kind: "id" },
  { label: "API key", keys: ["apiKeyName", "api_key_name"] },
  { label: "Service", keys: ["service"] },
  { label: "Endpoint", keys: ["endpoint", "route"] },
  { label: "Release", keys: ["release"] },
  { label: "SDK", keys: ["sdkName", "sdk_name"] },
  { label: "SDK version", keys: ["sdkVersion", "sdk_version"] },
  { label: "Occurred", keys: ["occurredAt", "occurred_at", "timestamp"], kind: "date" },
  { label: "Ingested", keys: ["ingestedAt", "ingested_at"], kind: "date" },
  { label: "Created", keys: ["createdAt", "created_at"], kind: "date" },
];

export const RESOURCE_FIELDS: Record<DetailResource, readonly FieldDescriptor[]> = {
  errors: [
    { label: "Public ID", keys: ["publicId", "public_id"], kind: "id" },
    { label: "Fingerprint", keys: ["fingerprint"], kind: "id" },
    { label: "Error group", keys: ["errorGroup.publicId", "errorGroupPublicId", "error_group_public_id", "errorGroupId", "error_group_id"], kind: "id" },
    { label: "Trace", keys: ["trace.publicId", "tracePublicId", "trace_public_id", "trace.traceId", "traceId", "trace_id"], kind: "id" },
    { label: "Exception", keys: ["errorName", "error_name", "name"] },
    { label: "Message", keys: ["message"] },
    { label: "Severity", keys: ["severity"] },
    { label: "Handled", keys: ["handled"], kind: "boolean" },
    { label: "Status code", keys: ["statusCode", "status_code"], kind: "number" },
    { label: "Route", keys: ["route", "endpoint"] },
    { label: "Mechanism", keys: ["mechanism"] },
    { label: "Request ID", keys: ["requestId", "request_id"], kind: "id" },
    { label: "User email", keys: ["userEmail", "user_email"], sensitive: true },
    { label: "User IP", keys: ["userIp", "user_ip"], sensitive: true },
    { label: "Server", keys: ["serverName", "server_name"] },
    { label: "Application", keys: ["appName", "applicationName", "application_name"] },
    { label: "Application version", keys: ["appVersion", "applicationVersion", "application_version"] },
  ],
  requests: [
    { label: "Request ID", keys: ["requestId", "request_id"], kind: "id" },
    { label: "Method", keys: ["method"] },
    { label: "Endpoint", keys: ["endpoint", "url", "route"] },
    { label: "Name", keys: ["name"] },
    { label: "Duration", keys: ["durationMs", "duration_ms", "latencyMs", "latency_ms"], kind: "duration" },
    { label: "Framework", keys: ["framework"] },
    { label: "Request size", keys: ["bodySize", "body_size"], kind: "bytes" },
    { label: "Response size", keys: ["responseSize", "response_size"], kind: "bytes" },
    { label: "Client IP hash", keys: ["clientIpHash", "client_ip_hash"] },
    { label: "User agent", keys: ["userAgent", "user_agent"] },
    { label: "Referer", keys: ["referer"] },
    { label: "Country", keys: ["geoCountry", "geo_country_code"] },
    { label: "Region", keys: ["geoRegion", "geo_region"] },
    { label: "ASN", keys: ["geoAsn", "geo_asn"], kind: "number" },
    { label: "Browser", keys: ["browser", "browser_family"] },
    { label: "Browser version", keys: ["browserVersion", "browser_version_major"] },
    { label: "OS", keys: ["os", "os_name"] },
    { label: "OS version", keys: ["osVersion", "os_version_major"] },
    { label: "Device", keys: ["device", "device_type"] },
    { label: "Bot", keys: ["isBot", "is_bot"], kind: "boolean" },
    { label: "Slow", keys: ["isSlow", "is_slow"], kind: "boolean" },
    { label: "Has error", keys: ["hasError", "is_error"], kind: "boolean" },
    { label: "Has trace", keys: ["hasTrace"], kind: "boolean" },
  ],
  traces: [
    { label: "Root operation", keys: ["rootSpanName", "root_span_name", "name"] },
    { label: "Root span", keys: ["rootSpanId", "root_span_id"], kind: "id" },
    { label: "Span kind", keys: ["spanKind", "span_kind"] },
    { label: "Root status", keys: ["rootSpanStatus", "root_span_status", "status"] },
    { label: "HTTP method", keys: ["httpMethod", "http_method"] },
    { label: "Response size", keys: ["responseSize", "response_size"], kind: "bytes" },
    { label: "Span count", keys: ["spanCount", "span_count"], kind: "number" },
    { label: "Total duration", keys: ["totalDurationMs", "total_duration_ms", "durationMs"], kind: "duration" },
    { label: "Partial", keys: ["isPartial", "is_partial"], kind: "boolean" },
    { label: "Request ID", keys: ["requestId", "request_id"], kind: "id" },
  ],
  spans: [
    { label: "Span ID", keys: ["spanId", "span_id"], kind: "id" },
    { label: "Parent span", keys: ["parentSpanId", "parent_span_id"], kind: "id" },
    { label: "Name", keys: ["name"] },
    { label: "Kind", keys: ["spanKind", "span_kind", "kind"] },
    { label: "Type", keys: ["spanType", "span_type"] },
    { label: "Status", keys: ["spanStatus", "span_status", "status"] },
    { label: "Message", keys: ["message"] },
    { label: "Duration", keys: ["durationMs", "duration_ms"], kind: "duration" },
    { label: "Self time", keys: ["exclusiveDurationMs", "exclusive_duration_ms"], kind: "duration" },
    { label: "Depth", keys: ["depth"], kind: "number" },
    { label: "DB system", keys: ["dbSystem", "db_system"] },
    { label: "DB name", keys: ["dbName", "db_name"] },
    { label: "DB operation", keys: ["dbOperation", "db_operation"] },
    { label: "DB collection", keys: ["dbCollection", "db_collection"] },
    { label: "DB statement", keys: ["dbStatement", "db_statement"] },
    { label: "HTTP method", keys: ["httpMethod", "http_method"] },
    { label: "HTTP URL", keys: ["httpUrl", "http_url"] },
    { label: "HTTP route", keys: ["httpRoute", "http_route"] },
    { label: "HTTP status", keys: ["httpStatusCode", "http_status_code"], kind: "number" },
    { label: "HTTP host", keys: ["httpHost", "http_host"] },
    { label: "Network host", keys: ["netHostName", "net_host_name"] },
    { label: "Network transport", keys: ["netTransport", "net_transport"] },
    { label: "Messaging system", keys: ["messagingSystem", "messaging_system"] },
    { label: "Messaging destination", keys: ["messagingDestination", "messaging_destination"] },
    { label: "Messaging operation", keys: ["messagingOperation", "messaging_operation"] },
    { label: "Request ID", keys: ["requestId", "request_id"], kind: "id" },
  ],
  logs: [
    { label: "Level", keys: ["level", "severity"] },
    { label: "Name", keys: ["name"] },
    { label: "Logger", keys: ["logger"] },
    { label: "Logger name", keys: ["loggerName", "logger_name"] },
    { label: "Category", keys: ["logCategory", "log_category"] },
    { label: "Source", keys: ["logSource", "log_source"] },
    { label: "Endpoint", keys: ["endpoint"] },
    { label: "HTTP method", keys: ["httpMethod", "http_method"] },
    { label: "Status code", keys: ["statusCode", "status_code"], kind: "number" },
    { label: "Duration", keys: ["durationMs", "duration_ms"], kind: "duration" },
    { label: "User IP", keys: ["userIp", "user_ip"], sensitive: true },
    { label: "Message", keys: ["message"] },
  ],
  metrics: [
    { label: "Metric", keys: ["metricName", "metric_name"] },
    { label: "Type", keys: ["metricType", "metric_type"] },
    { label: "Unit", keys: ["metricUnit", "metric_unit", "unit"] },
    { label: "Namespace", keys: ["metricNamespace", "metric_namespace"] },
    { label: "Description", keys: ["metricDescription", "metric_description"] },
    { label: "Category", keys: ["metricCategory", "metric_category"] },
    { label: "Aggregation", keys: ["aggregationType", "aggregation_type"] },
    { label: "Temporality", keys: ["temporality"] },
    { label: "Monotonic", keys: ["isMonotonic", "is_monotonic"], kind: "boolean" },
    { label: "Value", keys: ["value"], kind: "number" },
    { label: "Count", keys: ["count"], kind: "number" },
    { label: "Sum", keys: ["sum"], kind: "number" },
    { label: "Minimum", keys: ["min"], kind: "number" },
    { label: "Maximum", keys: ["max"], kind: "number" },
    { label: "Average", keys: ["avg"], kind: "number" },
    { label: "Rate", keys: ["rate"], kind: "number" },
    { label: "p50", keys: ["p50"], kind: "number" },
    { label: "p75", keys: ["p75"], kind: "number" },
    { label: "p90", keys: ["p90"], kind: "number" },
    { label: "p95", keys: ["p95"], kind: "number" },
    { label: "p99", keys: ["p99"], kind: "number" },
    { label: "HTTP method", keys: ["httpMethod", "http_method"] },
    { label: "Status code", keys: ["statusCode", "status_code"], kind: "number" },
  ],
  profiles: [
    { label: "Profile type", keys: ["profileType", "profile_type"] },
    { label: "Request ID", keys: ["requestId", "request_id"], kind: "id" },
    { label: "Start time", keys: ["startTime", "start_time"], kind: "date" },
    { label: "End time", keys: ["endTime", "end_time"], kind: "date" },
    { label: "Duration", keys: ["durationMs", "duration_ms"], kind: "duration" },
  ],
  crons: [
    { label: "Monitor slug", keys: ["monitorSlug", "monitor_slug"] },
    { label: "Monitor name", keys: ["monitorName", "monitor_name"] },
    { label: "Status", keys: ["status"] },
    { label: "Success", keys: ["isSuccess", "is_success"], kind: "boolean" },
    { label: "Duration", keys: ["durationMs", "duration_ms"], kind: "duration" },
    { label: "Started", keys: ["startedAt", "started_at"], kind: "date" },
    { label: "Finished", keys: ["finishedAt", "finished_at"], kind: "date" },
    { label: "Check-in type", keys: ["checkinType", "checkin_type"] },
    { label: "Schedule type", keys: ["scheduleType", "schedule_type"] },
  ],
};

export const CORRELATION_FIELDS: readonly FieldDescriptor[] = [
  { label: "Trace", keys: ["tracePublicId", "trace_public_id", "trace.publicId", "traceId", "trace_id"], kind: "id" },
  { label: "Trace ID", keys: ["traceId", "trace_id"], kind: "id" },
  { label: "Error group", keys: ["errorGroupPublicId", "error_group_public_id", "errorGroup.publicId", "errorGroupId", "error_group_id"], kind: "id" },
  { label: "Request ID", keys: ["requestPublicId", "request_public_id", "requestId", "request_id"], kind: "id" },
  { label: "Span ID", keys: ["spanPublicId", "span_public_id", "spanId", "span_id"], kind: "id" },
  { label: "Parent span", keys: ["parentSpanId", "parent_span_id"], kind: "id" },
  { label: "Session ID", keys: ["sessionPublicId", "session_public_id", "sessionId", "session_id"], kind: "id" },
  { label: "User ID", keys: ["userId", "user_id"], kind: "id" },
];
