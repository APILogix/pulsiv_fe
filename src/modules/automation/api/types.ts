/**
 * Automation module types.
 *
 * Hand-mirrored from `pulse/src/modules/automation/{types.ts,schemas.ts,repository.ts}`,
 * mounted under `/organizations/:orgId/automation`.
 *
 * Keep the const arrays in sync with the backend enums — the API rejects
 * unknown values with `AUTOMATION_VALIDATION_ERROR`.
 */

// ── Enums (mirror backend `types.ts`) ────────────────────────

export const WORKFLOW_TYPES = [
  "alert_routing",
  "escalation",
  "incident_creation",
  "incident_timeline",
  "postmortem",
  "release_guard",
  "rollback_recommendation",
  "noise_reduction",
  "remediation",
  "runbook",
  "connector",
  "data_retention",
  "quota",
  "anomaly",
  "dead_letter",
  "security",
  "report",
  "custom",
] as const;
export type WorkflowType = (typeof WORKFLOW_TYPES)[number];

export const TRIGGER_KINDS = ["event", "schedule", "manual", "webhook"] as const;
export type TriggerKind = (typeof TRIGGER_KINDS)[number];

export const TRIGGER_TYPES = [
  "alert.event.created",
  "alert.event.acknowledged",
  "alert.event.resolved",
  "alert.event.escalated",
  "alert.rule.firing",
  "error.group.created",
  "error.group.regressed",
  "trace.latency.baseline_breached",
  "log.pattern.spike",
  "metric.threshold_breached",
  "cron.missed",
  "uptime.failed",
  "slo.burn_rate_breached",
  "release.deployed",
  "release.health_degraded",
  "ai.root_cause.confidence_breached",
  "billing.usage.threshold_breached",
  "billing.plan.changed",
  "connector.delivery.failed",
  "connector.delivery.dead_lettered",
  "billing.webhook.dead_lettered",
  "ingestion.dead_letter.created",
  "security.api_key.suspicious_usage",
  "security.sso.failed_spike",
  "security.scim.failed_spike",
  "security.export.spike",
  "schedule.cron",
  "manual.run",
  "webhook.received",
] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const ACTION_TYPES = [
  "notification.send",
  "incident.create",
  "incident.assign_owner",
  "incident.timeline.append",
  "incident.postmortem.generate_draft",
  "ticket.github.create",
  "ticket.jira.create",
  "pagerduty.trigger",
  "runbook.open",
  "runbook.step.create",
  "status_page.update",
  "approval.request",
  "connector.delivery.retry",
  "alert.severity.change",
  "alert.silence.create",
  "ai.summary.generate",
  "ai.root_cause.generate",
  "report.export",
  "rollback.recommend",
  "release.guard.warn",
  "release.guard.pause",
  "quota.notify",
  "quota.throttle_recommend",
  "retention.archive",
  "retention.purge_request",
  "security.notify",
  "webhook.call",
  "noop",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

/**
 * Backend forces `requiresApproval: true` for these action types regardless of
 * the risk level the caller sends (`service.validateActions`).
 */
export const DANGEROUS_ACTIONS: readonly ActionType[] = [
  "release.guard.pause",
  "retention.purge_request",
  "quota.throttle_recommend",
  "status_page.update",
  "webhook.call",
];

export const CONDITION_OPERATORS = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "not_in",
  "contains",
  "not_contains",
  "matches",
  "exists",
  "not_exists",
  "between",
] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

/** Operators that take no right-hand value. */
export const UNARY_OPERATORS: readonly ConditionOperator[] = ["exists", "not_exists"];

export const WORKFLOW_STATUSES = ["draft", "active", "paused", "archived", "disabled"] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const WORKFLOW_SCOPES = ["organization", "project"] as const;
export type WorkflowScope = (typeof WORKFLOW_SCOPES)[number];

export const ACTION_RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
export type ActionRiskLevel = (typeof ACTION_RISK_LEVELS)[number];

export const RUN_STATUSES = [
  "queued",
  "running",
  "waiting_approval",
  "succeeded",
  "failed",
  "cancelled",
  "skipped",
  "timed_out",
] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const STEP_STATUSES = [
  "queued",
  "running",
  "waiting_approval",
  "succeeded",
  "failed",
  "skipped",
  "cancelled",
  "timed_out",
] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "rejected", "expired", "cancelled"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const AUDIT_ACTIONS = [
  "workflow.created",
  "workflow.updated",
  "workflow.enabled",
  "workflow.disabled",
  "workflow.paused",
  "workflow.archived",
  "workflow.version_published",
  "trigger.received",
  "run.queued",
  "run.started",
  "run.completed",
  "run.failed",
  "run.cancelled",
  "step.started",
  "step.completed",
  "step.failed",
  "approval.requested",
  "approval.approved",
  "approval.rejected",
  "template.created",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Mirrors backend `LIMITS` — used for client-side field constraints. */
export const AUTOMATION_LIMITS = {
  NAME: 150,
  DESCRIPTION: 2000,
  TAGS: 20,
  TAG: 50,
  CONDITIONS: 50,
  ACTIONS: 25,
  PAYLOAD_BYTES: 262144,
  METADATA_BYTES: 32768,
  ACTION_KEY: 100,
  LEFT_PATH: 300,
  DEDUPE_KEY: 300,
  CRON: 120,
  TIMEZONE: 80,
  TIMEOUT_MIN: 1,
  TIMEOUT_MAX: 3600,
  ATTEMPTS_MIN: 1,
  ATTEMPTS_MAX: 10,
  COOLDOWN_MIN: 0,
  COOLDOWN_MAX: 86400,
  RETRY_BACKOFF_MAX: 3600,
} as const;

// ── Shared envelope ──────────────────────────────────────────

export interface Paged<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export type Json = Record<string, unknown>;

/** Entitlement metadata the backend decorates onto workflow/template reads. */
export interface EntitlementInfo {
  requiredFeatureKeys: string[];
  automationAvailable: boolean;
  entitlementUnavailable: boolean;
  unavailableReason: string | null;
}

// ── Rows ─────────────────────────────────────────────────────

export interface Workflow {
  id: string;
  organizationId: string | null;
  projectId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  templateId: string | null;
  name: string;
  slug: string;
  description: string | null;
  workflowType: string;
  scope: string;
  status: string;
  isEnabled: boolean;
  currentVersion: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  timezone: string;
  tags: string[];
  metadata: Json;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WorkflowSummary extends Workflow, Partial<EntitlementInfo> {
  triggerCount: number;
  triggerType: string | null;
  actionCount: number;
  actionTypes: string[];
  actionRequiresApproval: boolean[];
  lastRunStatus: string | null;
  lastRunCreatedAt: string | null;
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;
  status: string;
  definition: Json;
  triggerSummary: unknown[];
  conditionSummary: unknown[];
  actionSummary: unknown[];
  publishedBy: string | null;
  publishedAt: string | null;
  checksum: string;
  metadata: Json;
  createdAt: string;
}

export interface WorkflowTrigger {
  id: string;
  workflowId: string;
  workflowVersionId: string | null;
  triggerKind: string;
  triggerType: string;
  sourceModule: string;
  sourceEvent: string | null;
  scheduleCron: string | null;
  timezone: string;
  isEnabled: boolean;
  dedupeKeyTemplate: string | null;
  cooldownSeconds: number;
  config: Json;
  metadata: Json;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WorkflowCondition {
  id: string;
  workflowId: string;
  workflowVersionId: string | null;
  conditionGroup: string;
  sortOrder: number;
  leftPath: string;
  operator: string;
  rightValue: unknown;
  valueType: string;
  isRequired: boolean;
  metadata: Json;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WorkflowAction {
  id: string;
  workflowId: string;
  workflowVersionId: string | null;
  actionKey: string;
  actionType: string;
  integrationKey: string | null;
  sortOrder: number;
  isEnabled: boolean;
  requiresApproval: boolean;
  riskLevel: string;
  timeoutSeconds: number;
  maxAttempts: number;
  retryBackoffSeconds: number;
  idempotencyKeyTemplate: string | null;
  config: Json;
  metadata: Json;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WorkflowDetail extends EntitlementInfo {
  workflow: Workflow;
  triggers: WorkflowTrigger[];
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  activeVersion: WorkflowVersion | null;
}

export interface AutomationRun {
  id: string;
  organizationId: string | null;
  projectId: string | null;
  workflowId: string;
  workflowVersionId: string;
  triggerId: string | null;
  inboxEventId: string | null;
  status: string;
  triggerType: string;
  sourceModule: string;
  sourceEventId: string | null;
  dedupeKey: string | null;
  idempotencyKey: string;
  priority: number;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  expiresAt: string | null;
  attempt: number;
  maxAttempts: number;
  inputPayload: Json;
  outputPayload: Json;
  errorCode: string | null;
  errorMessage: string | null;
  metadata: Json;
  createdAt: string;
  updatedAt: string;
}

export interface RunSummary {
  runId: string;
  workflowId: string;
  workflowName: string;
  organizationId: string | null;
  status: string;
  triggerType: string;
  sourceModule: string;
  priority: number;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  stepCount: number;
  failedStepCount: number;
  pendingApprovalCount: number;
}

export interface RunStep {
  id: string;
  runId: string;
  workflowId: string;
  actionId: string | null;
  stepKey: string;
  actionType: string;
  status: string;
  sortOrder: number;
  attempt: number;
  maxAttempts: number;
  startedAt: string | null;
  completedAt: string | null;
  nextRetryAt: string | null;
  timeoutAt: string | null;
  requiresApproval: boolean;
  approvalId: string | null;
  idempotencyKey: string | null;
  inputPayload: Json;
  outputPayload: Json;
  errorCode: string | null;
  errorMessage: string | null;
  metadata: Json;
  createdAt: string;
  updatedAt: string;
}

export interface RunWithSteps {
  run: AutomationRun;
  steps: RunStep[];
}

export interface Approval {
  id: string;
  organizationId: string;
  workflowId: string;
  runId: string;
  stepId: string | null;
  requestedBy: string | null;
  approvedBy: string | null;
  rejectedBy: string | null;
  status: string;
  riskLevel: string;
  approvalReason: string | null;
  rejectionReason: string | null;
  expiresAt: string;
  decidedAt: string | null;
  requestPayload: Json;
  decisionPayload: Json;
  metadata: Json;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalDetail extends Approval {
  workflowName: string;
  actionType: string | null;
}

export interface AutomationTemplate extends EntitlementInfo {
  templateKey: string;
  name: string;
  description: string | null;
  workflowType: string;
  category: string;
  minimumPlanTier: string | null;
  requiredFeatureKey: string | null;
  tags: string[];
  isFeatured: boolean;
  sortOrder: number;
  metadata: Json;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  isCurrent: boolean;
  definition: Json;
  triggerSummary: unknown[];
  conditionSummary: unknown[];
  actionSummary: unknown[];
  createdBy: string | null;
  publishedAt: string;
  checksum: string;
  metadata: Json;
  createdAt: string;
}

export interface TemplateDetail extends EntitlementInfo {
  template: {
    id: string;
    templateKey: string;
    scope: string;
    organizationId: string | null;
    name: string;
    description: string | null;
    workflowType: string;
    category: string;
    isActive: boolean;
    isPublic: boolean;
    isFeatured: boolean;
    minimumPlanTier: string | null;
    requiredFeatureKey: string | null;
    tags: string[];
    sortOrder: number;
    metadata: Json;
    createdAt: string;
    updatedAt: string;
  };
  version: TemplateVersion | null;
}

export interface AutomationAuditLog {
  id: string;
  organizationId: string | null;
  projectId: string | null;
  workflowId: string | null;
  runId: string | null;
  stepId: string | null;
  approvalId: string | null;
  actorUserId: string | null;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string | null;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  beforeState: Json | null;
  afterState: Json | null;
  metadata: Json;
  occurredAt: string;
}

export interface InboxEvent {
  id: string;
  organizationId: string | null;
  projectId: string | null;
  sourceModule: string;
  eventType: string;
  sourceEventId: string | null;
  dedupeKey: string;
  payload: Json;
  headers: Json;
  status: string;
  receivedAt: string;
  lockedAt: string | null;
  lockedBy: string | null;
  processedAt: string | null;
  attempts: number;
  nextRetryAt: string | null;
  lastError: string | null;
  metadata: Json;
}

export interface IngestEventResult {
  event: InboxEvent;
  /** true when the backend returned 201 (newly queued), false on 200 (deduped). */
  created: boolean;
}

// ── Dry-run / test result ────────────────────────────────────

export interface ConditionResult {
  leftPath: string;
  operator: string;
  actual: unknown;
  expected: unknown;
  passed: boolean;
}

export interface DryRunResult {
  matched: boolean;
  conditionResults: ConditionResult[];
  dryRun: true;
}

export type TestWorkflowResult = DryRunResult | RunWithSteps;

export function isDryRunResult(result: TestWorkflowResult): result is DryRunResult {
  return (result as DryRunResult).dryRun === true;
}

// ── Request bodies ───────────────────────────────────────────

export interface TriggerInput {
  triggerKind: TriggerKind;
  triggerType: TriggerType;
  sourceModule: string;
  /** Required when `triggerKind === "event"`. */
  sourceEvent?: string;
  /** Required when `triggerKind === "schedule"`. 5-field cron. */
  scheduleCron?: string;
  timezone?: string;
  isEnabled?: boolean;
  dedupeKeyTemplate?: string;
  cooldownSeconds?: number;
  config?: Json;
  metadata?: Json;
}

export interface ConditionInput {
  conditionGroup?: string;
  sortOrder?: number;
  leftPath: string;
  operator: ConditionOperator;
  rightValue?: unknown;
  valueType?: string;
  isRequired?: boolean;
  metadata?: Json;
}

export interface ActionInput {
  actionKey: string;
  actionType: ActionType;
  integrationKey?: string;
  sortOrder?: number;
  isEnabled?: boolean;
  /** Must be true for high/critical risk and for every DANGEROUS_ACTIONS entry. */
  requiresApproval?: boolean;
  riskLevel?: ActionRiskLevel;
  timeoutSeconds?: number;
  maxAttempts?: number;
  retryBackoffSeconds?: number;
  idempotencyKeyTemplate?: string;
  config?: Json;
  metadata?: Json;
}

export interface SafetyInput {
  maxRunsPerHour?: number;
  dedupeWindowSeconds?: number;
  requiresApprovalAboveRisk?: ActionRiskLevel;
}

export interface CreateWorkflowBody {
  name: string;
  description?: string;
  workflowType: WorkflowType;
  scope?: WorkflowScope;
  projectId?: string;
  trigger: TriggerInput;
  conditions?: ConditionInput[];
  actions: ActionInput[];
  safety?: SafetyInput;
  tags?: string[];
  metadata?: Json;
  timezone?: string;
}

export interface UpdateWorkflowBody {
  name?: string;
  description?: string;
  trigger?: TriggerInput;
  conditions?: ConditionInput[];
  actions?: ActionInput[];
  safety?: SafetyInput;
  tags?: string[];
  metadata?: Json;
  timezone?: string;
}

export interface CreateFromTemplateBody {
  name: string;
  description?: string;
  projectId?: string;
  configOverrides?: Json;
  tags?: string[];
  metadata?: Json;
}

export interface IngestEventBody {
  sourceModule: string;
  eventType: TriggerType;
  sourceEventId?: string;
  dedupeKey: string;
  payload?: Json;
  headers?: Record<string, string>;
  metadata?: Json;
  projectId?: string;
}

// ── List queries ─────────────────────────────────────────────

export interface PaginationQuery {
  limit?: number;
  offset?: number;
}

export interface WorkflowListQuery extends PaginationQuery {
  status?: WorkflowStatus;
  workflowType?: WorkflowType;
  /**
   * Backend coerces this with `z.coerce.boolean()`, so `false` arrives as
   * `true`. Only ever send `true`; omit for "all".
   */
  isEnabled?: true;
  projectId?: string;
  search?: string;
  /** Comma-separated tag list. */
  tags?: string;
}

export interface RunListQuery extends PaginationQuery {
  status?: RunStatus;
  workflowId?: string;
  triggerType?: TriggerType;
}

export interface ApprovalListQuery extends PaginationQuery {
  status?: ApprovalStatus;
  workflowId?: string;
  riskLevel?: ActionRiskLevel;
}

export interface AuditListQuery extends PaginationQuery {
  workflowId?: string;
  runId?: string;
  action?: string;
  actorUserId?: string;
}
