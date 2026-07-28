/**
 * Automation API client — covers every route exposed by
 * `pulse/src/modules/automation/routes.ts`, mounted at
 * `/organizations/:orgId/automation`.
 *
 * Response envelopes: `{ success, data, meta? }` for success,
 * `{ error: { code, message, details? } }` for failures (handled by the
 * shared axios error interceptor / `apiErrorMessage`).
 */
import { apiClient } from "@/infrastructure/api-client/axios";
import type {
  Approval,
  ApprovalDetail,
  ApprovalListQuery,
  AutomationAuditLog,
  AutomationRun,
  AutomationTemplate,
  AuditListQuery,
  CreateFromTemplateBody,
  CreateWorkflowBody,
  IngestEventBody,
  IngestEventResult,
  InboxEvent,
  Json,
  Paged,
  PaginationQuery,
  RunListQuery,
  RunStep,
  RunSummary,
  RunWithSteps,
  TemplateDetail,
  TestWorkflowResult,
  UpdateWorkflowBody,
  Workflow,
  WorkflowDetail,
  WorkflowListQuery,
  WorkflowSummary,
  WorkflowVersion,
} from "./types";

export const automationBase = (orgId: string) => `/organizations/${orgId}/automation`;

interface ListEnvelope<T> {
  data?: T[];
  meta?: { total?: number; limit?: number; offset?: number };
}

const paged = <T,>(body: ListEnvelope<T>, fallbackLimit = 50): Paged<T> => ({
  data: body.data ?? [],
  total: body.meta?.total ?? 0,
  limit: body.meta?.limit ?? fallbackLimit,
  offset: body.meta?.offset ?? 0,
});

/** Manual runs are idempotent server-side via the `Idempotency-Key` header. */
const idempotencyHeaders = () => ({ headers: { "Idempotency-Key": crypto.randomUUID() } });

// ── Workflows ────────────────────────────────────────────────

export const workflowsApi = {
  list: async (orgId: string, query: WorkflowListQuery = {}): Promise<Paged<WorkflowSummary>> => {
    const { data } = await apiClient.get(`${automationBase(orgId)}/workflows`, { params: query });
    return paged<WorkflowSummary>(data);
  },

  get: async (orgId: string, workflowId: string): Promise<WorkflowDetail> => {
    const { data } = await apiClient.get(`${automationBase(orgId)}/workflows/${workflowId}`);
    return data.data;
  },

  create: async (orgId: string, body: CreateWorkflowBody): Promise<Workflow> => {
    const { data } = await apiClient.post(`${automationBase(orgId)}/workflows`, body);
    return data.data;
  },

  update: async (orgId: string, workflowId: string, body: UpdateWorkflowBody): Promise<Workflow> => {
    const { data } = await apiClient.patch(`${automationBase(orgId)}/workflows/${workflowId}`, body);
    return data.data;
  },

  /** Soft delete (archive). Returns 204 with no body. */
  remove: async (orgId: string, workflowId: string): Promise<void> => {
    await apiClient.delete(`${automationBase(orgId)}/workflows/${workflowId}`);
  },

  /** Requires a published version, else 400 AUTOMATION_VALIDATION_ERROR. */
  enable: async (orgId: string, workflowId: string): Promise<Workflow> => {
    const { data } = await apiClient.post(`${automationBase(orgId)}/workflows/${workflowId}/enable`);
    return data.data;
  },

  disable: async (orgId: string, workflowId: string): Promise<Workflow> => {
    const { data } = await apiClient.post(`${automationBase(orgId)}/workflows/${workflowId}/disable`);
    return data.data;
  },

  /** 409 AUTOMATION_CONFLICT when the draft checksum is unchanged. */
  publish: async (orgId: string, workflowId: string, activateOnPublish = false): Promise<WorkflowVersion> => {
    const { data } = await apiClient.post(`${automationBase(orgId)}/workflows/${workflowId}/publish`, {
      activateOnPublish,
    });
    return data.data;
  },

  /** `dryRun: true` evaluates conditions only; `false` performs a real run. */
  test: async (
    orgId: string,
    workflowId: string,
    body: { simulatedPayload?: Json; dryRun?: boolean } = {},
  ): Promise<TestWorkflowResult> => {
    const { data } = await apiClient.post(`${automationBase(orgId)}/workflows/${workflowId}/test`, {
      simulatedPayload: body.simulatedPayload ?? {},
      dryRun: body.dryRun ?? true,
    });
    return data.data;
  },

  run: async (
    orgId: string,
    workflowId: string,
    body: { inputPayload?: Json; metadata?: Json } = {},
  ): Promise<RunWithSteps> => {
    const { data } = await apiClient.post(
      `${automationBase(orgId)}/workflows/${workflowId}/run`,
      { inputPayload: body.inputPayload ?? {}, metadata: body.metadata ?? {} },
      idempotencyHeaders(),
    );
    return data.data;
  },

  runs: async (orgId: string, workflowId: string, query: PaginationQuery = {}): Promise<Paged<RunSummary>> => {
    const { data } = await apiClient.get(`${automationBase(orgId)}/workflows/${workflowId}/runs`, {
      params: query,
    });
    return paged<RunSummary>(data);
  },
};

// ── Runs ─────────────────────────────────────────────────────

export const runsApi = {
  list: async (orgId: string, query: RunListQuery = {}): Promise<Paged<RunSummary>> => {
    const { data } = await apiClient.get(`${automationBase(orgId)}/runs`, { params: query });
    return paged<RunSummary>(data);
  },

  get: async (orgId: string, runId: string): Promise<AutomationRun> => {
    const { data } = await apiClient.get(`${automationBase(orgId)}/runs/${runId}`);
    return data.data;
  },

  steps: async (orgId: string, runId: string): Promise<RunStep[]> => {
    const { data } = await apiClient.get(`${automationBase(orgId)}/runs/${runId}/steps`);
    return data.data ?? [];
  },

  cancel: async (orgId: string, runId: string, reason?: string): Promise<AutomationRun> => {
    const { data } = await apiClient.post(
      `${automationBase(orgId)}/runs/${runId}/cancel`,
      reason ? { reason } : {},
    );
    return data.data;
  },

  /** Only for failed / cancelled / timed_out runs with attempts remaining. */
  retry: async (orgId: string, runId: string, fromStep?: string): Promise<AutomationRun> => {
    const { data } = await apiClient.post(
      `${automationBase(orgId)}/runs/${runId}/retry`,
      fromStep ? { fromStep } : {},
    );
    return data.data;
  },
};

// ── Approvals ────────────────────────────────────────────────

export const approvalsApi = {
  list: async (orgId: string, query: ApprovalListQuery = {}): Promise<Paged<ApprovalDetail>> => {
    const { data } = await apiClient.get(`${automationBase(orgId)}/approvals`, { params: query });
    return paged<ApprovalDetail>(data);
  },

  get: async (orgId: string, approvalId: string): Promise<ApprovalDetail> => {
    const { data } = await apiClient.get(`${automationBase(orgId)}/approvals/${approvalId}`);
    return data.data;
  },

  approve: async (
    orgId: string,
    approvalId: string,
    body: { reason?: string; decisionPayload?: Json } = {},
  ): Promise<Approval> => {
    const { data } = await apiClient.post(`${automationBase(orgId)}/approvals/${approvalId}/approve`, {
      ...(body.reason ? { reason: body.reason } : {}),
      decisionPayload: body.decisionPayload ?? {},
    });
    return data.data;
  },

  /** `reason` is required by the backend schema (1-1000 chars). */
  reject: async (
    orgId: string,
    approvalId: string,
    body: { reason: string; decisionPayload?: Json },
  ): Promise<Approval> => {
    const { data } = await apiClient.post(`${automationBase(orgId)}/approvals/${approvalId}/reject`, {
      reason: body.reason,
      decisionPayload: body.decisionPayload ?? {},
    });
    return data.data;
  },
};

// ── Templates ────────────────────────────────────────────────

export const templatesApi = {
  list: async (orgId: string, query: PaginationQuery = {}): Promise<Paged<AutomationTemplate>> => {
    const { data } = await apiClient.get(`${automationBase(orgId)}/templates`, { params: query });
    return paged<AutomationTemplate>(data);
  },

  get: async (orgId: string, templateKey: string): Promise<TemplateDetail> => {
    const { data } = await apiClient.get(
      `${automationBase(orgId)}/templates/${encodeURIComponent(templateKey)}`,
    );
    return data.data;
  },

  createWorkflow: async (
    orgId: string,
    templateKey: string,
    body: CreateFromTemplateBody,
  ): Promise<Workflow> => {
    const { data } = await apiClient.post(
      `${automationBase(orgId)}/templates/${encodeURIComponent(templateKey)}/create-workflow`,
      body,
    );
    return data.data;
  },
};

// ── Audit ────────────────────────────────────────────────────

export const automationAuditApi = {
  list: async (orgId: string, query: AuditListQuery = {}): Promise<Paged<AutomationAuditLog>> => {
    const { data } = await apiClient.get(`${automationBase(orgId)}/audit`, { params: query });
    return paged<AutomationAuditLog>(data);
  },
};

// ── Event inbox ──────────────────────────────────────────────

export const automationEventsApi = {
  /** 201 = queued, 200 = deduplicated against an existing inbox row. */
  ingest: async (orgId: string, body: IngestEventBody): Promise<IngestEventResult> => {
    const response = await apiClient.post(`${automationBase(orgId)}/events`, {
      ...body,
      payload: body.payload ?? {},
      headers: body.headers ?? {},
      metadata: body.metadata ?? {},
    });
    return { event: response.data.data as InboxEvent, created: response.status === 201 };
  },
};
