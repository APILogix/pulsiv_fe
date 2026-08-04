/**
 * Project module contracts.
 *
 * Mirrors `pulse/src/modules/projects/**` types 1:1. Dates arrive as ISO
 * strings over JSON, so every temporal field is typed `string` here and
 * rendered through `<Timestamp />`.
 */

// ── Core project ─────────────────────────────────────────────

export type ProjectStatus = "active" | "paused" | "archived";
export type ProjectVisibility = "private" | "organization" | "public";

export interface Project {
  id: string;
  /** Immutable public routing identifier, format: prj_XXXXXXXX */
  publicId: string;
  orgId: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  timezone: string;
  tags: string[];
  icon: string | null;
  color: string | null;
  metadata: Record<string, unknown>;
  archivedAt: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ProjectListItem extends Project {
  apiKeysCount: number;
  activeApiKeysCount: number;
}

export interface ProjectStats {
  totalRequests: number;
  apiKeysCount: number;
  activeKeysCount: number;
  environmentCount: number;
}

export interface ProjectWithStats extends Project {
  stats: ProjectStats;
}

export interface ListProjectsQuery {
  status?: ProjectStatus;
  search?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: "created_at" | "updated_at" | "name";
  sortOrder?: "asc" | "desc";
}

export interface CreateProjectBody {
  name: string;
  description?: string | null;
  visibility?: ProjectVisibility;
  status?: ProjectStatus;
  timezone?: string;
  tags?: string[];
  icon?: string | null;
  color?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateProjectBody {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  timezone?: string;
  tags?: string[];
  icon?: string | null;
  color?: string | null;
  metadata?: Record<string, unknown>;
  version?: number;
}

// ── Settings ─────────────────────────────────────────────────

export interface ProjectSettings {
  id: string;
  projectId: string;
  organizationId: string;
  dataRetentionDays: number;
  samplingRate: number;
  allowedDomains: string[];
  blockedDomains: string[];
  piiScrubbingEnabled: boolean;
  ipCollectionEnabled: boolean;
  releaseTrackingEnabled: boolean;
  sessionReplayEnabled: boolean;
  performanceMonitoringEnabled: boolean;
  errorMonitoringEnabled: boolean;
  logIngestionEnabled: boolean;
  metricIngestionEnabled: boolean;
  traceIngestionEnabled: boolean;
  profileIngestionEnabled: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type UpdateProjectSettingsBody = Partial<
  Omit<ProjectSettings, "id" | "projectId" | "organizationId" | "createdAt" | "updatedAt">
>;

// ── Overview ─────────────────────────────────────────────────

export interface HourlyUsageDto {
  hour: number;
  eventCount: number;
  eventBytes: number;
  categories: Record<string, number>;
  eventTypes: Record<string, number>;
}

export interface DailyTrendDto {
  date: string;
  totalEvents: number;
  totalBytes: number;
  changePercent: number;
}

export interface HeatmapCellDto {
  hour: number;
  value: number;
  intensity: number;
}

export interface ProjectOverview {
  project: Project;
  settings: ProjectSettings;
  memberCount: number;
  apiKeyCount: number;
  usage: {
    totalEventsToday: number;
    totalBytesToday: number;
    peakHour: number;
    currentHourEvents: number;
    categoryBreakdown: Record<string, number>;
    eventTypeBreakdown: Record<string, number>;
    hourlyBreakdown: HourlyUsageDto[];
    dailyTrend: DailyTrendDto[];
    heatmapData: HeatmapCellDto[];
  };
}

// ── Usage counters ───────────────────────────────────────────

export interface ProjectUsageCounter {
  counterType: string;
  totalValue: number;
  lastPeriodStart: string | null;
  lastPeriodEnd: string | null;
  lastFlushedAt: string | null;
}

// ── Environments ─────────────────────────────────────────────

export enum EnvironmentType {
  PRODUCTION = "production",
  PRE_PRODUCTION = "pre_production",
  STAGING = "staging",
  PRE_STAGING = "pre_staging",
  DEVELOPMENT = "development",
  TESTING = "testing",
  PREVIEW = "preview",
  PRE_DEPLOYMENT = "pre_deployment",
  CUSTOM = "custom",
}

export interface ProjectEnvironment {
  id: string;
  projectId: string;
  orgId: string;
  name: string;
  slug: string;
  type: EnvironmentType;
  description: string | null;
  color: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface EnvironmentBody {
  name?: string;
  slug?: string;
  type?: EnvironmentType;
  description?: string | null;
  color?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface CreateEnvironmentBody extends EnvironmentBody {
  name: string;
  slug: string;
  type: EnvironmentType;
  color: string;
}

// ── API keys ─────────────────────────────────────────────────

export type ApiKeyStatus = "active" | "revoked" | "expired" | "rotated" | "suspended";
export type ApiKeyUsageGranularity = "hourly" | "daily" | "monthly";

export interface ProjectApiKey {
  id: string;
  projectId: string;
  orgId: string;
  environmentId: string;
  name: string | null;
  publicKey: string;
  status: ApiKeyStatus;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdBy: string | null;
  rotatedFromKeyId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  /** Derived display data that may be expanded by list/detail endpoints. */
  environment?: { id: string; name: string; slug: string } | null;
}

export interface CreateApiKeyResponse {
  apiKey: ProjectApiKey;
  fullKey: string;
}

export interface ApiKeyUsageQuery {
  from: string;
  to: string;
  granularity: ApiKeyUsageGranularity;
}

export interface ApiKeyUsageSeriesPoint {
  bucket: string;
  requests: number;
  acceptedEvents: number;
  errorEvents: number;
  ingestionFailures: number;
  acceptedBytes: number;
  rateLimitedRequests: number;
}

export interface ApiKeyUsage {
  keyId: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  granularity: ApiKeyUsageGranularity;
  from: string;
  to: string;
  summary: {
    requests: number;
    acceptedEvents: number;
    errorEvents: number;
    ingestionFailures: number;
    acceptedBytes: number;
    rateLimitedRequests: number;
    errorRate: number;
  };
  series: ApiKeyUsageSeriesPoint[];
}

export interface BulkOperationResult {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{ apiKeyId: string; status: "ok" | "error"; newKeyId?: string; reason?: string }>;
}

export interface CreateApiKeyBody {
  environmentId: string;
  name?: string | null;
  expiresAt?: string | null;
}

export interface UpdateApiKeyBody {
  name?: string | null;
  expiresAt?: string | null;
}

export interface ListApiKeysQuery {
  environmentId?: string;
  status?: ApiKeyStatus;
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
}

// ── Members ──────────────────────────────────────────────────

export const PROJECT_MEMBER_ROLES = ["owner", "admin", "developer", "qa", "viewer"] as const;
export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number];

export type ProjectMemberStatus = "pending" | "active" | "inactive" | "removed";

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  organizationId: string;
  role: ProjectMemberRole;
  status: ProjectMemberStatus;
  /** Actor who added this member directly. */
  invitedByUserId: string | null;
  invitedAt: string | null;
  joinedAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string | null;
  user?: { id: string; email: string; fullName: string };
}

// ── Usage analytics ──────────────────────────────────────────

export type UsageGranularity = "minute" | "hourly" | "daily" | "monthly";

export interface UsageTimeSeriesPoint {
  bucket: string;
  totalEvents: number;
  errors: number;
  requests: number;
  transactions: number;
  traces: number;
  spans: number;
  logs: number;
  metrics: number;
  profiles: number;
  aiEvents: number;
  sdkRequests: number;
  activeApiKeys: number;
  activeEnvironments: number;
  activeUsers: number;
  activeMembers: number;
  alertCount: number;
  connectorDeliveries: number;
  failedNotifications: number;
  rateLimitUsage: number;
  latencyMsP50: number | null;
  latencyMsP95: number | null;
  latencyMsP99: number | null;
}

export type UsageSummary = Omit<UsageTimeSeriesPoint, "bucket">;

export interface UsageAnalyticsResponse {
  summary: UsageSummary;
  timeSeries: UsageTimeSeriesPoint[];
  hasMore: boolean;
  nextCursor: string | null;
}

export type HeatmapType = "calendar" | "hourly" | "dayOfWeek";

export interface HeatmapData {
  type: HeatmapType;
  cells: Array<{ x: string; y: string; value: number }>;
}

export const TOP_LIST_DIMENSIONS = [
  "endpoint",
  "service",
  "errorGroup",
  "sdkVersion",
  "country",
  "browser",
  "os",
  "device",
  "release",
] as const;
export type TopListDimension = (typeof TOP_LIST_DIMENSIONS)[number];

export interface TopListItem {
  key: string;
  totalEvents: number;
  errors: number;
  requests: number;
}

export interface ComparisonSeries {
  id: string;
  name: string;
  data: UsageTimeSeriesPoint[];
}

export interface MonthlyUsageVsPlan {
  yearMonth: string;
  totalEvents: number;
  totalBytes: number;
  apiKeyRequests: number;
  rateLimitedEvents: number;
  alertNotifications: number;
  activeUsers: number;
  planLimit: number | null;
  usagePercent: number | null;
}

// ── Connector subscriptions ──────────────────────────────────

export const ALERT_CATEGORIES = [
  "all",
  "error",
  "performance",
  "deployment",
  "cron",
  "release",
  "usage",
  "billing",
  "security",
  "ai",
] as const;
export type AlertCategory = (typeof ALERT_CATEGORIES)[number];

export interface ProjectConnectorSubscription {
  id: string;
  projectId: string;
  organizationId: string;
  connectorId: string;
  enabled: boolean;
  alertCategories: AlertCategory[];
  severityThreshold: string;
  memberIds: string[];
  channelOverrides: Record<string, unknown>;
  quietHours: Record<string, unknown> | null;
  digestMode: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Alert thresholds ─────────────────────────────────────────

export const THRESHOLD_OPERATORS = [">", ">=", "<", "<=", "=", "!="] as const;
export type ThresholdOperator = (typeof THRESHOLD_OPERATORS)[number];

export interface ProjectAlertThreshold {
  id: string;
  organizationId: string;
  projectId: string;
  environmentId: string | null;
  thresholdKey: string;
  metricName: string;
  metricSource: string;
  category: string;
  severity: string;
  comparisonOperator: ThresholdOperator;
  thresholdValue: number;
  thresholdUnit: string;
  evaluationWindowMinutes: number;
  cooldownMinutes: number;
  consecutiveBreaches: number;
  enabled: boolean;
  notifyOnRecovery: boolean;
  lastTriggeredAt: string | null;
  lastRecoveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ThresholdBody {
  environmentId?: string | null;
  thresholdKey: string;
  metricName: string;
  metricSource: string;
  category: string;
  severity: string;
  comparisonOperator: ThresholdOperator;
  thresholdValue: number;
  thresholdUnit: string;
  evaluationWindowMinutes?: number;
  cooldownMinutes?: number;
  consecutiveBreaches?: number;
  enabled?: boolean;
  notifyOnRecovery?: boolean;
}

// ── Alert channels ───────────────────────────────────────────

export const CHANNEL_SEVERITIES = ["info", "warning", "error", "critical"] as const;
export type ChannelSeverity = (typeof CHANNEL_SEVERITIES)[number];

export const CHANNEL_DIGEST_MODES = ["immediate", "hourly", "daily", "weekly"] as const;
export type ChannelDigestMode = (typeof CHANNEL_DIGEST_MODES)[number];

export interface ProjectAlertChannel {
  id: string;
  organizationId: string;
  projectId: string;
  connectorId: string | null;
  channelType: string;
  name: string;
  description: string | null;
  destination: string | null;
  destinationMetadata: Record<string, unknown>;
  isDefault: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface AlertChannelBody {
  connectorId?: string | null;
  channelType: string;
  name: string;
  description?: string | null;
  destination?: string | null;
  destinationMetadata?: Record<string, unknown>;
  isDefault?: boolean;
  enabled?: boolean;
}

export interface MemberChannelPreference {
  id: string;
  organizationId: string;
  projectId: string;
  userId: string;
  projectAlertChannelId: string;
  category: string;
  severityThreshold: ChannelSeverity;
  enabled: boolean;
  digestMode: ChannelDigestMode;
  quietHours: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  version: number;
  channel?: ProjectAlertChannel;
}

export interface MemberChannelPreferenceBody {
  category?: string;
  severityThreshold?: ChannelSeverity;
  enabled?: boolean;
  digestMode?: ChannelDigestMode;
  quietHours?: Record<string, unknown>;
}

// ── Shared list envelope ─────────────────────────────────────

export interface Paged<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
