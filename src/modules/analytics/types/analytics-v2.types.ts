/**
 * Analytics V2 API Type Definitions
 * Matches backend Fastify /analytics/v2 contracts.
 */

export interface FreshnessMeta {
  watermark: string | null;
  lagSeconds: number | null;
  stale: boolean;
  /** Backwards compatibility alias for timestamp */
  asOf?: string;
  /** Backwards compatibility alias for stale flag */
  isStale?: boolean;
}

export interface QueryScopeMeta {
  window: '1m' | '5m' | '1h' | '1d';
  range: {
    from: string;
    to: string;
  };
  compareRange?: {
    from: string;
    to: string;
  } | null;
  environment?: string;
  sampleRate?: number;
}

export interface AnalyticsResponseMeta {
  scope: 'org' | 'project' | QueryScopeMeta;
  organizationId?: string;
  projectId?: string | null;
  environment?: string;
  window?: '1m' | '5m' | '1h' | '1d';
  range?: {
    from: string;
    to: string;
  };
  compareRange?: {
    from: string;
    to: string;
  } | null;
  generatedAt?: string;
  freshness: FreshnessMeta;
  queryTimeMs: number;
  cache?: { hit: boolean; layer?: 'lru' | string };
  cacheHit?: boolean;
  refresh?: { suggestedIntervalMs: number };
  pagination?: { hasMore: boolean; nextCursor: string | null };
}

export interface AnalyticsResponse<T> {
  meta: AnalyticsResponseMeta;
  data: T;
}

export type MetricUnit = 'count' | 'ms' | 'bytes' | 'percent' | 'ratio' | 'micros' | 'score';
export type MetricDirection = 'higher_is_better' | 'lower_is_better' | 'neutral';
export type MetricTrend = 'up' | 'down' | 'flat' | 'unknown';

export interface MetricCard {
  key: string;
  label: string;
  value: number | null;
  formatted?: string;
  unit: MetricUnit;
  direction: MetricDirection;
  delta?: number | null;
  deltaPct?: number | null;
  deltaAbsolute?: number | null;
  trend?: MetricTrend;
  status?: 'ok' | 'warn' | 'critical' | 'neutral';
  previous?: number | null;
  context?: string;
  sparkline?: number[];
  aiContext?: string;
}

export interface MetricSeriesPoint {
  t: string;
  v: number | null;
  /** @deprecated Backwards compatibility alias for `t` */
  bucket?: string;
  /** @deprecated Backwards compatibility alias for `v` */
  value?: number | null;
}

export interface MetricSeries {
  key: string;
  label: string;
  unit: MetricUnit;
  window: '1m' | '5m' | '1h' | '1d' | string;
  points: MetricSeriesPoint[];
}

export interface TableColumn {
  key: string;
  label: string;
  align: 'left' | 'right' | 'center';
  format: 'text' | 'mono' | 'number' | 'compact' | 'percent' | 'latency' | 'bytes' | 'severity' | 'timestamp' | string;
  sortable: boolean;
}

export type DataTableColumn = TableColumn;

export interface DataTable<T = Record<string, unknown>> {
  key?: string;
  id?: string;
  columns: TableColumn[];
  rows: T[];
  total: number;
  totalRows?: number;
  sort?: { column: string; direction: 'asc' | 'desc' };
  page?: number;
  pageSize?: number;
}

export interface RankedListItem {
  key: string;
  label: string;
  value: number;
  formatted?: string;
  secondary?: string;
  severity?: 'ok' | 'warn' | 'critical';
  href?: string;
}

export interface RankedList {
  key: string;
  label: string;
  total?: number;
  unit?: string;
  items: RankedListItem[];
}

export interface StatusDistributionItem {
  class: '2xx' | '3xx' | '4xx' | '5xx';
  count: number;
  pct: number;
}

export interface StatusDistributionData {
  total: number;
  distribution: StatusDistributionItem[];
}

export interface LatencyHistogramBucket {
  fromMs: number;
  toMs: number | null;
  count: number;
  cumulativePct: number;
}

export interface LatencyHistogramData {
  buckets: LatencyHistogramBucket[];
  percentiles: {
    p50?: number | null;
    p75?: number | null;
    p90?: number | null;
    p95?: number | null;
    p99?: number | null;
    [key: string]: number | null | undefined;
  };
  heatmap: {
    columns: string[];
    rows: Array<{
      label: string;
      cells: number[];
    }>;
  };
}

export interface EndpointRow {
  endpoint: string;
  requests: number;
  errorRatePct: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  bytesOut: number;
  service: string | null;
}

export interface ErrorGroupRow {
  fingerprint: string;
  errorName: string;
  message: string;
  occurrences: number;
  affectedUsers: number;
  severity: string;
  mechanism: string;
  regressionScore: number;
  status: 'resolved' | 'unresolved' | 'ignored' | string;
  priority: number;
  isNew: boolean;
  services: string[];
  releases: string[];
  firstSeen: string;
  lastSeen: string;
  href: string;
  aiContext: string;
}

export interface ServiceRow {
  service: string;
  requests: number;
  errorRatePct: number | null;
  p95Ms: number | null;
  availabilityPct: number | null;
  apdex: number | null;
  healthScore?: number;
  release?: string;
  status?: 'healthy' | 'degraded' | 'critical' | string;
  tone?: string;
}

export interface RequestSummaryData {
  cards: MetricCard[];
  latency: {
    percentiles: {
      p50?: number | null;
      p75?: number | null;
      p90?: number | null;
      p95?: number | null;
      p99?: number | null;
      [key: string]: number | null | undefined;
    };
    avgMs: number | null;
  };
}

export interface ErrorSummaryData {
  cards: MetricCard[];
}

export interface TracesSummaryData {
  cards: MetricCard[];
}

export interface LogLevelCount {
  level: 'error' | 'warn' | 'info' | 'debug' | string;
  count: number;
}

export interface LogsSummaryData {
  cards: MetricCard[];
  byLevel: LogLevelCount[];
}

export interface AnalyticsOverviewData {
  cards: MetricCard[];
  series?: {
    requests: MetricSeries;
    errors: MetricSeries;
  };
  latency?: {
    percentiles: {
      p50?: number | null;
      p75?: number | null;
      p90?: number | null;
      p95?: number | null;
      p99?: number | null;
      [key: string]: number | null | undefined;
    };
    avgMs: number | null;
  };
  services?: ServiceRow[];
  topSlowEndpoints?: RankedList;
  /** Direct access aliases for frontend compatibility */
  requestSeries?: MetricSeries;
  errorSeries?: MetricSeries;
  statusDistribution?: StatusDistributionData;
  topErrors?: ErrorGroupRow[];
  slowestEndpoints?: RankedListItem[];
}

export interface ProjectsHealthItem {
  project_id: string;
  projectId?: string;
  environment: string;
  bucket: string;
  request_count: number;
  requestCount?: number;
  error_count: number;
  errorCount?: number;
  error_rate_pct: number | null;
  errorRatePct?: number | null;
  latency_p95_ms: number | null;
  latencyP95Ms?: number | null;
  availability_pct: number | null;
  availabilityPct?: number | null;
  open_alert_count: number;
  openAlertCount?: number;
  health_score: number | null;
  healthScore?: number | null;
  status: 'healthy' | 'degraded' | 'critical' | string;
}

export type ProjectHealthItem = ProjectsHealthItem;

export interface ProjectsHealthData {
  items: ProjectsHealthItem[];
}

export interface WorkerHealthSnapshot {
  id: string;
  lagSeconds: number;
  consecutiveFailures: number;
  lastRunAt: string | null;
  rowsProcessedLastRun: number;
  status: 'healthy' | 'degraded' | 'unhealthy' | string;
}

export interface SystemHealthData {
  status: 'healthy' | 'degraded' | 'unhealthy' | string;
  worstLagSeconds: number;
  workers: WorkerHealthSnapshot[];
}

