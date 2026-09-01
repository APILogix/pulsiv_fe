/** Canonical request detail contract — mirrors pulse `RequestDetailResponse`. */

export interface RequestDetailHeader {
  publicId: string;
  method: string | null;
  endpoint: string | null;
  statusCode: number | null;
  duration: number | null;
  timestamp: string | null;
  environment: string | null;
  project: string | null;
  service: string | null;
  release: string | null;
  tracePublicId: string | null;
}

export interface RequestSummaryCards {
  duration: number | null;
  status: number | null;
  responseSize: number | null;
  requestSize: number | null;
  spanCount: number | null;
}

export interface RequestHttpDetail {
  url: string | null;
  endpoint: string | null;
  method: string | null;
  queryParameters: unknown;
  routeParameters: unknown;
  requestHeaders: unknown;
  responseHeaders: unknown;
  requestBody: unknown;
  responseBody: unknown;
}

export interface RequestPerformanceDetail {
  totalDuration: number | null;
  isSlow: boolean | null;
}

export interface RequestContextDetail {
  user: string | null;
  session: string | null;
  tenant: string | null;
  sdk: string | null;
  release: string | null;
  server: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  geo: {
    country: string | null;
    region: string | null;
    asn: number | null;
  };
}

export interface RequestMetadataDetail {
  attributes: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface RequestRelatedError {
  publicId: string;
  message: string;
}

export interface RequestRelatedDetail {
  trace: { publicId: string | null };
  errors: RequestRelatedError[];
  logs: { count: number };
}

export interface RequestTag {
  key: string;
  label: string;
  value: string;
}

export interface RequestDetailResponse {
  header: RequestDetailHeader;
  summaryCards: RequestSummaryCards;
  http: RequestHttpDetail;
  trace: { publicId: string | null };
  performance: RequestPerformanceDetail;
  context: RequestContextDetail;
  metadata: RequestMetadataDetail;
  ai: { aiResponse: unknown };
  related: RequestRelatedDetail;
  tags: RequestTag[];
}

export interface RequestDeveloperToolsResponse {
  rawSdkEvent: unknown;
  normalizedEvent: unknown;
  rawDatabaseRecord: unknown;
}

export interface NormalizedAiResponse {
  summary: string | null;
  rootCause: string | null;
  recommendations: string[];
  confidence: number | null;
  generatedAt: string | null;
}

export type RequestSectionId =
  | "overview"
  | "http"
  | "performance"
  | "context"
  | "metadata"
  | "ai"
  | "related"
  | "tags";
