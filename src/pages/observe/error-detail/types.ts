/** Canonical Error Detail contract — matching pulse backend response specification. */

export interface ErrorDetailHeaderInfo {
  id: string;
  publicId: string;
  occurredAt: string | null;
  environment: string | null;
  service: string | null;
  release: string | null;
}

export interface ErrorObjectDetail {
  name: string | null;
  message: string | null;
  severity: string | null;
  handled: boolean | null;
  mechanism: string | null;
}

export interface ErrorHttpDetail {
  method: string | null;
  route: string | null;
  url: string | null;
  statusCode: number | null;
  statusText: string | null;
}

export interface ErrorProjectDetail {
  name: string | null;
  slug: string | null;
}

export interface ErrorServerDetail {
  name: string | null;
}

export interface ErrorSdkDetail {
  name: string | null;
  version: string | null;
}

export interface ErrorTraceRef {
  publicId: string | null;
  traceId: string | null;
}

export interface ErrorGroupRef {
  publicId: string | null;
}

export interface ErrorRequestRef {
  publicId: string | null;
}

export interface StackFrame {
  filename?: string | null;
  file?: string | null;
  function?: string | null;
  functionName?: string | null;
  lineno?: number | string | null;
  colno?: number | string | null;
  inApp?: boolean | null;
  in_app?: boolean | null;
  contextLine?: string | null;
  context_line?: string | null;
  preContext?: string[] | null;
  pre_context?: string[] | null;
  postContext?: string[] | null;
  post_context?: string[] | null;
  module?: string | null;
  sourceContext?: unknown;
}

export interface Breadcrumb {
  type?: string | null;
  category?: string | null;
  message?: string | null;
  level?: string | null;
  timestamp?: string | null;
  occurredAt?: string | null;
  data?: Record<string, unknown> | null;
}

export interface ErrorDebuggingDetail {
  stackFrames?: StackFrame[] | null;
  breadcrumbs?: Breadcrumb[] | null;
}

export interface ErrorRelatedDetail {
  logs?: {
    count: number;
  } | null;
  trace?: ErrorTraceRef | null;
  request?: ErrorRequestRef | null;
  errorGroup?: ErrorGroupRef | null;
}

export interface ErrorDetailResponse {
  id: string;
  publicId: string;
  occurredAt: string;
  error?: ErrorObjectDetail | null;
  http?: ErrorHttpDetail | null;
  environment?: string | null;
  project?: ErrorProjectDetail | string | null;
  service?: string | null;
  server?: ErrorServerDetail | string | null;
  release?: string | null;
  sdk?: ErrorSdkDetail | null;
  trace?: ErrorTraceRef | null;
  errorGroup?: ErrorGroupRef | null;
  request?: ErrorRequestRef | null;
  debugging?: ErrorDebuggingDetail | null;
  context?: Record<string, unknown> | null;
  tags?: Record<string, unknown> | Array<{ key: string; label?: string; value: string }> | null;
  extra?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  aiResponse?: unknown | null;
  related?: ErrorRelatedDetail | null;
  // Attributes / payload compatibility fallback for generic list navigation
  attributes?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
}

export interface ErrorSummaryCardsData {
  errorName: string;
  severity: string;
  handledStatus: string;
  occurredAt: string | null;
  issuePublicId: string | null;
  tracePublicId: string | null;
  requestPublicId: string | null;
}

export interface ErrorDeveloperToolsResponse {
  rawSdkEvent: unknown;
  normalizedEvent: unknown;
  rawDatabaseRecord: unknown;
}

export interface NormalizedErrorAiResponse {
  summary: string | null;
  rootCause: string | null;
  recommendations: string[];
  confidence: number | null;
  generatedAt: string | null;
}

export type ErrorSectionId =
  | "overview"
  | "stack-trace"
  | "breadcrumbs"
  | "http"
  | "context"
  | "metadata"
  | "ai"
  | "related"
  | "tags";
