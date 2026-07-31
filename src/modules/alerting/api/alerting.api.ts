/**
 * Alerting API client — covers every route exposed by
 * `pulse/src/modules/alerting/routes.ts`, mounted at
 * `/organizations/:orgId/alerting`.
 *
 * Response envelopes: `{ success, data, meta? }` for success,
 * `{ success: false, error: { code, message, details? } }` for failures
 * (handled by the shared axios error interceptor / `apiErrorMessage`).
 */
import { apiClient } from "@/infrastructure/api-client/axios";
import type {
  AcknowledgeEventBody,
  AlertDeadLetter,
  AlertDeliveryAttempt,
  AlertEscalationPolicy,
  AlertEscalationStep,
  AlertEvent,
  AlertMetric,
  AlertRoutingRule,
  AlertRule,
  AlertSilence,
  AlertTemplate,
  CreateEscalationPolicyBody,
  CreateRoutingRuleBody,
  CreateRuleBody,
  CreateSilenceBody,
  CreateTemplateBody,
  DeadLetterListQuery,
  EventListQuery,
  EventStats,
  IngestEventBody,
  Json,
  MetricsQuery,
  Paged,
  PreviewTemplateResult,
  ResolveEventBody,
  RuleListQuery,
  RuleTemplate,
  SilenceFromEventBody,
  SilenceListQuery,
  TestRoutingBody,
  TestRoutingResult,
  TestRuleResult,
  UpdateRuleBody,
  UpsertEscalationStepBody,
} from "./types";

export const alertingBase = (orgId: string) => `/organizations/${orgId}/alerting`;

interface ListEnvelope<T> {
  data?: T[];
  meta?: { total?: number; limit?: number; offset?: number };
}

/**
 * Deep snake_case → camelCase key converter.
 *
 * The alerting backend is inconsistent about DTO mapping: rules/events/
 * silences map their top-level fields via a `*ToDto()` helper, but escalation
 * policies, escalation steps, templates, routing rules, and every nested
 * array (rule conditions/actions, event history/deliveries, metric rows)
 * come straight from `RETURNING *` / `SELECT *` as raw Postgres rows. Rather
 * than special-case every endpoint, every response is normalized here so the
 * camelCase types in `./types` are accurate regardless of which service
 * method produced the JSON. Dates, arrays, and primitives pass through
 * untouched; only plain-object keys are renamed.
 */
function toCamelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function camelizeDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => camelizeDeep(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[toCamelKey(key)] = camelizeDeep(val);
    }
    return result as unknown as T;
  }
  return value;
}

const paged = <T,>(body: ListEnvelope<T>, fallbackLimit = 50): Paged<T> => ({
  data: camelizeDeep(body.data ?? []),
  total: body.meta?.total ?? 0,
  limit: body.meta?.limit ?? fallbackLimit,
  offset: body.meta?.offset ?? 0,
});

// ── Rules ────────────────────────────────────────────────────

export const rulesApi = {
  list: async (orgId: string, query: RuleListQuery = {}): Promise<Paged<AlertRule>> => {
    const { data } = await apiClient.get(`${alertingBase(orgId)}/rules`, { params: query });
    return paged<AlertRule>(data);
  },

  get: async (orgId: string, ruleId: string): Promise<AlertRule> => {
    const { data } = await apiClient.get(`${alertingBase(orgId)}/rules/${ruleId}`);
    return camelizeDeep(data.data);
  },

  create: async (orgId: string, body: CreateRuleBody): Promise<AlertRule> => {
    const { data } = await apiClient.post(`${alertingBase(orgId)}/rules`, body);
    return camelizeDeep(data.data);
  },

  update: async (orgId: string, ruleId: string, body: UpdateRuleBody): Promise<AlertRule> => {
    const { data } = await apiClient.patch(`${alertingBase(orgId)}/rules/${ruleId}`, body);
    return camelizeDeep(data.data);
  },

  /** 204 No Content on success. */
  remove: async (orgId: string, ruleId: string): Promise<void> => {
    await apiClient.delete(`${alertingBase(orgId)}/rules/${ruleId}`);
  },

  enable: async (orgId: string, ruleId: string): Promise<AlertRule> => {
    const { data } = await apiClient.post(`${alertingBase(orgId)}/rules/${ruleId}/enable`);
    return camelizeDeep(data.data);
  },

  disable: async (orgId: string, ruleId: string): Promise<AlertRule> => {
    const { data } = await apiClient.post(`${alertingBase(orgId)}/rules/${ruleId}/disable`);
    return camelizeDeep(data.data);
  },

  test: async (orgId: string, ruleId: string, payload: Json): Promise<TestRuleResult> => {
    const { data } = await apiClient.post(`${alertingBase(orgId)}/rules/${ruleId}/test`, { payload });
    return camelizeDeep(data.data);
  },

  clone: async (orgId: string, ruleId: string): Promise<AlertRule> => {
    const { data } = await apiClient.post(`${alertingBase(orgId)}/rules/${ruleId}/clone`);
    return camelizeDeep(data.data);
  },

  templates: async (orgId: string): Promise<RuleTemplate[]> => {
    const { data } = await apiClient.get(`${alertingBase(orgId)}/rules/templates`);
    return camelizeDeep(data.data ?? []);
  },

  createFromTemplate: async (
    orgId: string,
    templateKey: string,
    overrides: Partial<CreateRuleBody> = {},
  ): Promise<AlertRule> => {
    const { data } = await apiClient.post(
      `${alertingBase(orgId)}/rules/templates/${encodeURIComponent(templateKey)}`,
      overrides,
    );
    return camelizeDeep(data.data);
  },
};

// ── Events ───────────────────────────────────────────────────

export const eventsApi = {
  list: async (orgId: string, query: EventListQuery = {}): Promise<Paged<AlertEvent>> => {
    const { data } = await apiClient.get(`${alertingBase(orgId)}/events`, { params: query });
    return paged<AlertEvent>(data);
  },

  get: async (orgId: string, eventId: string): Promise<AlertEvent> => {
    const { data } = await apiClient.get(`${alertingBase(orgId)}/events/${eventId}`);
    return camelizeDeep(data.data);
  },

  stats: async (orgId: string): Promise<EventStats> => {
    const { data } = await apiClient.get(`${alertingBase(orgId)}/events/stats`);
    return camelizeDeep(data.data);
  },

  /** 202 Accepted — event enters the async batch pipeline. */
  ingest: async (orgId: string, body: IngestEventBody): Promise<AlertEvent> => {
    const { data } = await apiClient.post(`${alertingBase(orgId)}/events`, body);
    return camelizeDeep(data.data);
  },

  acknowledge: async (orgId: string, eventId: string, body: AcknowledgeEventBody = {}): Promise<AlertEvent> => {
    const { data } = await apiClient.post(`${alertingBase(orgId)}/events/${eventId}/acknowledge`, body);
    return camelizeDeep(data.data);
  },

  resolve: async (orgId: string, eventId: string, body: ResolveEventBody = {}): Promise<AlertEvent> => {
    const { data } = await apiClient.post(`${alertingBase(orgId)}/events/${eventId}/resolve`, body);
    return camelizeDeep(data.data);
  },

  /** 201 Created — creates a silence scoped to this event. */
  silenceFromEvent: async (
    orgId: string,
    eventId: string,
    body: SilenceFromEventBody = {},
  ): Promise<AlertSilence> => {
    const { data } = await apiClient.post(`${alertingBase(orgId)}/events/${eventId}/silence`, body);
    return camelizeDeep(data.data);
  },

  deliveries: async (orgId: string, eventId: string): Promise<AlertDeliveryAttempt[]> => {
    const { data } = await apiClient.get(`${alertingBase(orgId)}/events/${eventId}/deliveries`);
    return camelizeDeep(data.data ?? []);
  },
};

// ── Dead-letter queue (admin) ─────────────────────────────────

export const deadLettersApi = {
  list: async (orgId: string, query: DeadLetterListQuery = {}): Promise<Paged<AlertDeadLetter>> => {
    const { data } = await apiClient.get(`${alertingBase(orgId)}/dead-letters`, { params: query });
    return paged<AlertDeadLetter>(data);
  },

  retry: async (orgId: string, id: string): Promise<AlertDeadLetter> => {
    const { data } = await apiClient.post(`${alertingBase(orgId)}/dead-letters/${id}/retry`);
    return camelizeDeep(data.data);
  },

  /** 200 with { success: true } — no dead-letter DTO returned on discard. */
  discard: async (orgId: string, id: string): Promise<void> => {
    await apiClient.delete(`${alertingBase(orgId)}/dead-letters/${id}`);
  },
};

// ── Silences ───────────────────────────────────────────────────

export const silencesApi = {
  list: async (orgId: string, query: SilenceListQuery = {}): Promise<Paged<AlertSilence>> => {
    const { data } = await apiClient.get(`${alertingBase(orgId)}/silences`, { params: query });
    return paged<AlertSilence>(data);
  },

  create: async (orgId: string, body: CreateSilenceBody): Promise<AlertSilence> => {
    const { data } = await apiClient.post(`${alertingBase(orgId)}/silences`, body);
    return camelizeDeep(data.data);
  },

  /** 204 No Content — expires (soft-deletes) the silence. */
  remove: async (orgId: string, id: string): Promise<void> => {
    await apiClient.delete(`${alertingBase(orgId)}/silences/${id}`);
  },
};

// ── Escalation policies ────────────────────────────────────────

export const policiesApi = {
  list: async (orgId: string, query: { limit?: number; offset?: number } = {}): Promise<Paged<AlertEscalationPolicy>> => {
    const { data } = await apiClient.get(`${alertingBase(orgId)}/escalation-policies`, { params: query });
    return paged<AlertEscalationPolicy>(data);
  },

  get: async (orgId: string, id: string): Promise<AlertEscalationPolicy> => {
    const { data } = await apiClient.get(`${alertingBase(orgId)}/escalation-policies/${id}`);
    return camelizeDeep(data.data);
  },

  create: async (orgId: string, body: CreateEscalationPolicyBody): Promise<AlertEscalationPolicy> => {
    const { data } = await apiClient.post(`${alertingBase(orgId)}/escalation-policies`, body);
    return camelizeDeep(data.data);
  },

  /** 204 No Content. */
  remove: async (orgId: string, id: string): Promise<void> => {
    await apiClient.delete(`${alertingBase(orgId)}/escalation-policies/${id}`);
  },

  /** Upserts exactly one ordered step (by stepNumber) on the policy. */
  upsertStep: async (
    orgId: string,
    policyId: string,
    body: UpsertEscalationStepBody,
  ): Promise<AlertEscalationStep> => {
    const { data } = await apiClient.put(`${alertingBase(orgId)}/escalation-policies/${policyId}/steps`, body);
    return camelizeDeep(data.data);
  },
};

// ── Templates ────────────────────────────────────────────────────

export const templatesApi = {
  list: async (orgId: string, query: { limit?: number; offset?: number } = {}): Promise<Paged<AlertTemplate>> => {
    const { data } = await apiClient.get(`${alertingBase(orgId)}/templates`, { params: query });
    return paged<AlertTemplate>(data);
  },

  create: async (orgId: string, body: CreateTemplateBody): Promise<AlertTemplate> => {
    const { data } = await apiClient.post(`${alertingBase(orgId)}/templates`, body);
    return camelizeDeep(data.data);
  },

  /** 204 No Content. */
  remove: async (orgId: string, id: string): Promise<void> => {
    await apiClient.delete(`${alertingBase(orgId)}/templates/${id}`);
  },

  preview: async (orgId: string, id: string, sampleData?: Json): Promise<PreviewTemplateResult> => {
    const { data } = await apiClient.post(`${alertingBase(orgId)}/templates/${id}/preview`, { sampleData });
    return camelizeDeep(data.data);
  },
};

// ── Routing rules ────────────────────────────────────────────────

export const routingApi = {
  list: async (orgId: string): Promise<AlertRoutingRule[]> => {
    const { data } = await apiClient.get(`${alertingBase(orgId)}/routing-rules`);
    return camelizeDeep(data.data ?? []);
  },

  create: async (orgId: string, body: CreateRoutingRuleBody): Promise<AlertRoutingRule> => {
    const { data } = await apiClient.post(`${alertingBase(orgId)}/routing-rules`, body);
    return camelizeDeep(data.data);
  },

  /** 204 No Content. */
  remove: async (orgId: string, id: string): Promise<void> => {
    await apiClient.delete(`${alertingBase(orgId)}/routing-rules/${id}`);
  },

  test: async (orgId: string, body: TestRoutingBody): Promise<TestRoutingResult> => {
    const { data } = await apiClient.post(`${alertingBase(orgId)}/routing-rules/test`, body);
    return camelizeDeep(data.data);
  },
};

// ── Metrics ──────────────────────────────────────────────────────

export const metricsApi = {
  query: async (orgId: string, query: MetricsQuery = {}): Promise<AlertMetric[]> => {
    const { data } = await apiClient.get(`${alertingBase(orgId)}/metrics`, { params: query });
    return camelizeDeep(data.data ?? []);
  },
};
