/**
 * Latency Frontend Module - Type Definitions
 * Matches backend contracts from pulse/src/modules/latency/latency.types.ts
 */

export interface LatencyQueryParams {
  from?: string;
  to?: string;
  environment?: string;
  service?: string;
  endpoint?: string;
  route?: string;
  method?: string;
  statusClass?: '2xx' | '3xx' | '4xx' | '5xx';
  statusCode?: number;
  interval?: '1m' | '5m' | '15m' | '1h' | '1d' | 'auto';
  compare?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'p95' | 'p99' | 'p50' | 'avg' | 'requests' | 'errors' | 'errorRate';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface StatusCounts {
  c2xx: number;
  c3xx: number;
  c4xx: number;
  c5xx: number;
}

export interface PeriodComparison {
  previousPeriod: {
    from: string;
    to: string;
    totalRequests: number;
    avgLatencyMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    errorRatePct: number;
  };
  deltas: {
    totalRequestsPct: number;
    avgLatencyPct: number;
    p50Pct: number;
    p95Pct: number;
    p99Pct: number;
    errorRatePct: number;
  };
}

export interface LatencyOverview {
  totalRequests: number;
  avgLatencyMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxLatencyMs: number;
  statusCodes: StatusCounts;
  errorRate4xxPct: number;
  errorRate5xxPct: number;
  totalErrorRatePct: number;
  slowCount: number;
  slowRatePct: number;
  timeRange: {
    from: string;
    to: string;
    durationMs: number;
  };
  comparison: PeriodComparison | null;
  dataQuality: {
    sampleCount: number;
    isSampled: boolean;
    confidence: 'high' | 'medium' | 'low';
    unit: 'ms';
  };
}

export interface LatencyBucket {
  bucket: string;
  requestCount: number;
  avgLatencyMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status5xx: number;
  errorCount: number;
  errorRatePct: number;
  throughputRps: number;
}

export interface LatencyTimeSeriesResponse {
  buckets: LatencyBucket[];
  interval: string;
  timeRange: {
    from: string;
    to: string;
  };
  summary: {
    totalRequests: number;
    avgLatencyMs: number;
    p95Ms: number;
  };
}

export interface HttpStatusSeriesBucket {
  bucket: string;
  total: number;
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status5xx: number;
  pct2xx: number;
  pct3xx: number;
  pct4xx: number;
  pct5xx: number;
}

export interface HttpStatusSeriesResponse {
  buckets: HttpStatusSeriesBucket[];
  interval: string;
  timeRange: {
    from: string;
    to: string;
  };
  totals: {
    total: number;
    status2xx: number;
    status3xx: number;
    status4xx: number;
    status5xx: number;
  };
}

export interface LatencyDistributionBucket {
  fromMs: number;
  toMs: number | null;
  label: string;
  count: number;
  percentage: number;
  cumulativePercentage: number;
  isSlow: boolean;
}

export interface LatencyDistributionResponse {
  buckets: LatencyDistributionBucket[];
  totalRequests: number;
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxLatencyMs: number;
}

export interface EndpointPerformanceItem {
  endpoint: string;
  method: string;
  route: string | null;
  service: string | null;
  requestCount: number;
  avgLatencyMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status5xx: number;
  errorRatePct: number;
  slowCount: number;
  slowRatePct: number;
}

export interface EndpointsResponse {
  items: EndpointPerformanceItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
  timeRange: {
    from: string;
    to: string;
  };
}

export interface SlowRequestItem {
  id: string;
  publicId: string | null;
  traceId: string | null;
  spanId: string | null;
  requestId: string | null;
  method: string;
  endpoint: string;
  route: string | null;
  statusCode: number;
  durationMs: number;
  occurredAt: string;
}

export interface EndpointDetailResponse {
  endpoint: string;
  method: string;
  route: string | null;
  overview: LatencyOverview;
  timeseries: LatencyBucket[];
  distribution: LatencyDistributionBucket[];
  recentSlowRequests: SlowRequestItem[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string | null;
  requestId?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
