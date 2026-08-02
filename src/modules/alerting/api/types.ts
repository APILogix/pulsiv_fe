/**
 * Alerting module types.
 *
 * Hand-mirrored from `pulse/src/modules/alerting/{types.ts,common.ts,rules/rules.types.ts,
 * events/events.types.ts,silences/silences.types.ts,policies/policies.types.ts,
 * templates/templates.types.ts,routing/routing.types.ts,metrics/metrics.types.ts}`,
 * mounted under `/organizations/:orgId/alerting`.
 *
 * Keep the const arrays in sync with the backend Zod enums — the API rejects
 * unknown values with a 422 `ALERT_VALIDATION_ERROR`.
 */

export interface Json {
  [key: string]: unknown;
}

export interface Paged<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface PaginationQuery {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ── Enums (mirror backend `common.ts` + submodule types) ─────

export const ALERT_SEVERITIES = ["info", "warning", "error", "critical"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const CONDITION_TYPES = ["threshold", "change", "anomaly", "static", "composite"] as const;
export type ConditionType = (typeof CONDITION_TYPES)[number];

export const CONDITION_OPERATORS = [
  "gt", "lt", "gte", "lte", "eq", "neq", "contains", "regex", "in", "exists",
] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

export const AGGREGATE_FUNCTIONS = ["avg", "sum", "count", "max", "min", "p99"] as const;
export type AggregateFunction = (typeof AGGREGATE_FUNCTIONS)[number];

export const ACTION_TYPES = ["notify", "webhook", "suppress", "escalate", "group"] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const ALERT_EVENT_STATUSES = [
  "pending", "processing", "firing", "resolved", "acknowledged", "suppressed", "silenced", "error",
] as const;
export type AlertEventStatus = (typeof ALERT_EVENT_STATUSES)[number];

export const DELIVERY_ATTEMPT_STATUSES = [
  "pending", "queued", "sent", "delivered", "failed", "retrying", "cancelled",
] as const;
export type DeliveryAttemptStatus = (typeof DELIVERY_ATTEMPT_STATUSES)[number];

export const BATCH_STATUSES = ["pending", "processing", "completed", "failed", "partial"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const HISTORY_ACTIONS = [
  "triggered", "acknowledged", "resolved", "escalated", "suppressed", "notified",
  "silenced", "grouped", "auto_resolved", "rule_modified",
  "escalation_step", "throttled", "dead_lettered", "requeued",
] as const;
export type HistoryAction = (typeof HISTORY_ACTIONS)[number];

export const DEAD_LETTER_STATUSES = ["pending_retry", "retried", "exhausted", "discarded"] as const;
export type DeadLetterStatus = (typeof DEAD_LETTER_STATUSES)[number];

export const METRIC_GRANULARITIES = ["hour", "day", "week", "month"] as const;
export type MetricGranularity = (typeof METRIC_GRANULARITIES)[number];

// ── Rules ──────────────────────────────────────────────────────

export interface RuleCondition {
  conditionType?: ConditionType;
  conditionGroupId?: string;
  fieldPath: string;
  operator: ConditionOperator;
  thresholdValue?: unknown;
  lookbackMinutes?: number;
  aggregateFunction?: AggregateFunction;
  isRequired?: boolean;
  orderIndex?: number;
}

export interface RuleAction {
  actionType?: ActionType;
  priority?: number;
  orderIndex?: number;
  connectorId?: string;
  routeId?: string;
  templateId?: string;
  escalationPolicyId?: string;
  throttleDurationSeconds?: number;
  maxNotificationsPerHour?: number;
  actionConditions?: Json;
  isActive?: boolean;
}

export interface AlertRule {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  severity: AlertSeverity;
  enabled: boolean;
  projectId: string | null;
  evaluationIntervalSeconds: number;
  cooldownSeconds: number;
  autoResolveAfterMinutes: number | null;
  deduplicationWindowSeconds: number;
  deduplicationKeyTemplate: string | null;
  groupingEnabled: boolean;
  groupingKeyTemplate: string | null;
  groupingWaitSeconds: number;
  labels: Json;
  annotations: Json;
  metadata: Json;
  createdBy: string;
  updatedBy: string | null;
  enabledAt: string | null;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
  presetKey: string | null;
  isDefault: boolean;
  lastEvaluatedAt: string | null;
  conditions?: RuleCondition[];
  actions?: RuleAction[];
}

export interface CreateRuleBody {
  name: string;
  description?: string;
  severity?: AlertSeverity;
  enabled?: boolean;
  projectId?: string;
  evaluationIntervalSeconds?: number;
  cooldownSeconds?: number;
  autoResolveAfterMinutes?: number;
  deduplicationWindowSeconds?: number;
  deduplicationKeyTemplate?: string;
  groupingEnabled?: boolean;
  groupingKeyTemplate?: string;
  groupingWaitSeconds?: number;
  labels?: Json;
  annotations?: Json;
  metadata?: Json;
  conditions?: RuleCondition[];
  actions?: RuleAction[];
}

export type UpdateRuleBody = Partial<Omit<CreateRuleBody, "conditions" | "actions">> & {
  conditions?: RuleCondition[];
  actions?: RuleAction[];
};

export interface RuleListQuery extends PaginationQuery {
  enabled?: boolean;
  severity?: AlertSeverity;
  search?: string;
}

export interface RuleTemplate {
  key: string;
  name: string;
  description?: string;
  severity?: AlertSeverity;
  category?: string;
  [key: string]: unknown;
}

export interface TestRuleResult {
  matched: boolean;
  [key: string]: unknown;
}

export const ALERT_SCOPE_TYPES = ["organization", "project", "environment", "service", "endpoint"] as const;
export type AlertScopeType = (typeof ALERT_SCOPE_TYPES)[number];

export const ALERT_BINDING_MODES = ["inherit", "override", "disable"] as const;
export type AlertBindingMode = (typeof ALERT_BINDING_MODES)[number];

export const ALERT_ACTION_MERGE_MODES = ["inherit", "merge", "replace"] as const;
export type AlertActionMergeMode = (typeof ALERT_ACTION_MERGE_MODES)[number];

export const NOTIFICATION_CHANNEL_KINDS = [
  "in_app", "email", "slack", "discord", "teams", "pagerduty", "webhook", "sms",
] as const;
export type NotificationChannelKind = (typeof NOTIFICATION_CHANNEL_KINDS)[number];

export interface AlertRuleBinding {
  id: string;
  organizationId: string;
  ruleId: string;
  scopeType: AlertScopeType;
  scopeLevel: number;
  projectId: string | null;
  environment: string | null;
  service: string | null;
  endpoint: string | null;
  mode: AlertBindingMode;
  enabled: boolean;
  priority: number;
  severity: AlertSeverity | null;
  cooldownSeconds: number | null;
  deduplicationWindowSeconds: number | null;
  autoResolveAfterMinutes: number | null;
  evaluationIntervalSeconds: number | null;
  consecutiveBreaches: number | null;
  thresholdOverrides: Json;
  actionMode: AlertActionMergeMode;
  requestedChannels: NotificationChannelKind[] | null;
  recipientOverrides: Json | null;
  escalationPolicyId: string | null;
  notes: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export type CreateRuleBindingBody = {
  scopeType: AlertScopeType;
  projectId?: string;
  environment?: string;
  service?: string;
  endpoint?: string;
  mode?: AlertBindingMode;
  enabled?: boolean;
  priority?: number;
  severity?: AlertSeverity | null;
  cooldownSeconds?: number | null;
  deduplicationWindowSeconds?: number | null;
  autoResolveAfterMinutes?: number | null;
  evaluationIntervalSeconds?: number | null;
  consecutiveBreaches?: number | null;
  thresholdOverrides?: Json;
  actionMode?: AlertActionMergeMode;
  requestedChannels?: NotificationChannelKind[] | null;
  recipientOverrides?: Json | null;
  escalationPolicyId?: string | null;
  notes?: string | null;
};

export type UpdateRuleBindingBody = Partial<Omit<CreateRuleBindingBody,
  "scopeType" | "projectId" | "environment" | "service" | "endpoint"
>>;

export interface EffectiveRuleQuery {
  projectId?: string;
  environment?: string;
  service?: string;
  endpoint?: string;
}

export interface EffectiveRuleTraceEntry {
  bindingId: string | null;
  scopeType: AlertScopeType | "base";
  scopeLevel: number;
  applied: string[];
}

export interface EffectiveRule extends AlertRule {
  bindingId: string | null;
  resolvedScopeType: AlertScopeType | null;
  resolvedScopeLevel: number;
  mode: AlertBindingMode;
  consecutiveBreaches: number;
  actionMode: AlertActionMergeMode;
  requestedChannels: NotificationChannelKind[];
  recipientOverrides: Json | null;
  escalationPolicyId: string | null;
  trace: EffectiveRuleTraceEntry[];
}

export interface EffectiveRuleResult {
  rule: EffectiveRule;
  thresholds: unknown[];
  appliedBindingIds: string[];
}

export interface AlertRuleRevision {
  id: string;
  organizationId: string;
  ruleId: string;
  revision: number;
  operation: string;
  actorId: string | null;
  bindingId: string | null;
  previousState: Json | null;
  newState: Json | null;
  changesSummary: Json | null;
  createdAt: string;
}

// ── Events ─────────────────────────────────────────────────────

export interface IngestEventBody {
  ruleId?: string;
  projectId?: string;
  severity: AlertSeverity;
  source: string;
  sourceId?: string;
  payload: Json;
  labels?: Json;
  annotations?: Json;
  fingerprint?: string;
}

export interface AlertEvent {
  id: string;
  organizationId: string;
  ruleId: string | null;
  projectId: string | null;
  status: AlertEventStatus;
  severity: AlertSeverity;
  fingerprint: string;
  source: string;
  sourceId: string | null;
  payload: Json;
  payloadSizeBytes: number | null;
  normalizedPayload: Json | null;
  groupId: string | null;
  groupKey: string | null;
  isGroupParent: boolean;
  parentEventId: string | null;
  duplicateCount: number;
  startedAt: string;
  endedAt: string | null;
  lastNotifiedAt: string | null;
  nextEscalationAt: string | null;
  escalationPolicyId: string | null;
  escalationStepNumber: number;
  escalationRepeatCount: number;
  autoResolveAt: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  acknowledgmentExpiresAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionReason: string | null;
  suppressedBy: string | null;
  suppressedAt: string | null;
  suppressionReason: string | null;
  labels: Json;
  annotations: Json;
  createdAt: string;
  updatedAt: string;
}

export interface EventListQuery extends PaginationQuery {
  status?: AlertEventStatus;
  severity?: AlertSeverity;
  source?: string;
  ruleId?: string;
}

export interface AcknowledgeEventBody {
  comment?: string;
  expiresInMinutes?: number;
}

export interface ResolveEventBody {
  reason?: string;
  comment?: string;
}

export interface SilenceFromEventBody {
  durationMinutes?: number;
  comment?: string;
}

export interface AlertDeliveryAttempt {
  id: string;
  organizationId: string;
  eventId: string;
  connectorId: string | null;
  routeId: string | null;
  batchId: string | null;
  status: DeliveryAttemptStatus;
  requestPayload: Json | null;
  responsePayload: string | null;
  responseStatusCode: number | null;
  errorMessage: string | null;
  errorCategory: string | null;
  latencyMs: number | null;
  retryCount: number;
  externalMessageId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventStats {
  [key: string]: unknown;
}

export interface DeadLetterListQuery extends PaginationQuery {
  status?: DeadLetterStatus;
}

export interface AlertDeadLetter {
  id: string;
  organizationId: string;
  sourceQueue: string;
  pgBossJobId: string | null;
  batchId: string | null;
  eventIds: string[];
  jobPayload: Json;
  errorMessage: string | null;
  status: DeadLetterStatus;
  retryCount: number;
  maxRetries: number;
  lastRetryAt: string | null;
  retriedAt: string | null;
  discardedAt: string | null;
  discardedBy: string | null;
  metadata: Json;
  createdAt: string;
  updatedAt: string;
}

// ── Silences ───────────────────────────────────────────────────

export interface CreateSilenceBody {
  ruleId?: string;
  comment?: string;
  startsAt: string;
  endsAt: string;
  matchers?: Json;
}

export interface SilenceListQuery extends PaginationQuery {
  active?: boolean;
}

export interface AlertSilence {
  id: string;
  organizationId: string;
  ruleId: string | null;
  createdBy: string;
  comment: string | null;
  startsAt: string;
  endsAt: string;
  matchers: Json;
  isActive: boolean;
  expiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Escalation policies ──────────────────────────────────────────

export interface CreateEscalationPolicyBody {
  name: string;
  description?: string;
  repeatIntervalMinutes?: number;
  maxRepeats?: number;
  isActive?: boolean;
}

export interface UpsertEscalationStepBody {
  stepNumber: number;
  waitMinutes?: number;
  connectorIds?: string[];
  routeIds?: string[];
  notifyOnCall?: boolean;
  customMessageTemplate?: string;
  templateId?: string;
  isActive?: boolean;
}

export interface AlertEscalationStep {
  id: string;
  policyId: string;
  stepNumber: number;
  waitMinutes: number;
  connectorIds: string[];
  routeIds: string[];
  notifyOnCall: boolean;
  customMessageTemplate: string | null;
  templateId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlertEscalationPolicy {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  repeatIntervalMinutes: number | null;
  maxRepeats: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  steps?: AlertEscalationStep[];
}

// ── Templates ────────────────────────────────────────────────────

export interface CreateTemplateBody {
  name: string;
  templateType?: string;
  content: string;
  variablesSchema?: unknown[];
  defaultForSeverity?: AlertSeverity;
  connectorType?: string;
  isDefault?: boolean;
  sampleData?: Json;
}

export interface AlertTemplate {
  id: string;
  organizationId: string;
  name: string;
  templateType: string;
  content: string;
  variablesSchema: unknown[];
  defaultForSeverity: AlertSeverity | null;
  connectorType: string | null;
  isDefault: boolean;
  sampleData: Json;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PreviewTemplateResult {
  rendered: string;
  [key: string]: unknown;
}

// ── Routing rules ────────────────────────────────────────────────

export interface RoutingConditions {
  severity?: AlertSeverity[];
  source?: string[];
  labels?: Record<string, string>;
}

export interface CreateRoutingRuleBody {
  name: string;
  description?: string;
  priority?: number;
  conditions?: RoutingConditions;
  targetConnectorIds?: string[];
  targetRouteIds?: string[];
  fallbackConnectorIds?: string[];
  templateId?: string;
  isActive?: boolean;
}

export interface AlertRoutingRule {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  priority: number;
  conditions: RoutingConditions;
  targetConnectorIds: string[];
  targetRouteIds: string[];
  fallbackConnectorIds: string[];
  templateId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface TestRoutingBody {
  severity: AlertSeverity;
  source: string;
  labels?: Record<string, string>;
}

export interface TestRoutingResult {
  matchedRules: AlertRoutingRule[];
  [key: string]: unknown;
}

// ── Metrics ──────────────────────────────────────────────────────

export interface MetricsQuery {
  metricType?: string;
  ruleId?: string;
  granularity?: MetricGranularity;
  from?: string;
  to?: string;
  limit?: number;
}

export interface AlertMetric {
  id: string;
  organizationId: string;
  ruleId: string | null;
  metricType: string;
  value: string;
  bucketStart: string;
  bucketEnd: string;
  granularity: MetricGranularity;
  labels: Json;
  createdAt: string;
}
