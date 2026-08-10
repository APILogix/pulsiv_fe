import { apiClient } from "@/infrastructure/api-client/axios";
import { orgApi } from "@/modules/organizations/api/org.api";
import type {
  AiAnswer,
  AiCreditUsage,
  AiJob,
  AiOrgSettings,
  ChatRequest,
  ChatResponse,
  CreatedJob,
  InvestigationInput,
  InvestigationKind,
  KnowledgeDoc,
  ReportKind,
} from "../types";

const base = (orgId: string) => `/organizations/${orgId}/ai`;

// The AI endpoints require a per-request Idempotency-Key so retries never
// double-charge credits. The key must match ^[A-Za-z0-9._:-]+$ (8–200 chars).
function idempotencyConfig() {
  const key =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { headers: { "Idempotency-Key": key } };
}

// Resource kind → backend feature endpoint. Kept internal so the UI never
// exposes backend implementation details.
const INVESTIGATION_ROUTES: Record<InvestigationKind, string> = {
  error: "/error-explanation",
  stack_trace: "/stack-trace-analysis",
  trace: "/trace-analysis",
  span: "/span-analysis",
  log: "/log-summary",
  deployment: "/deployment-correlation",
};

const REPORT_QUERY: Record<ReportKind, string> = {
  weekly: "Generate the weekly reliability report for this organization.",
  incident: "Summarize the current incident situation for this organization.",
  executive:
    "Generate an executive reliability summary highlighting business impact and trends.",
};

// Weekly/executive reports run as AI_WEEKLY_REPORT jobs; incident summaries as
// AI_INCIDENT_SUMMARY. Only these two modes support asynchronous jobs.
const REPORT_MODE: Record<ReportKind, string> = {
  weekly: "AI_WEEKLY_REPORT",
  executive: "AI_WEEKLY_REPORT",
  incident: "AI_INCIDENT_SUMMARY",
};

export const aiApi = {
  investigate: (
    orgId: string,
    resourceOrInput: InvestigationResource | InvestigationInput,
    maybePublicId?: string,
  ) => {
    const payload =
      typeof resourceOrInput === 'object' && resourceOrInput !== null
        ? { resource: resourceOrInput.resource, publicId: resourceOrInput.publicId }
        : { resource: resourceOrInput, publicId: maybePublicId! };

    return apiClient
      .post(`${base(orgId)}/investigate`, payload, idempotencyConfig())
      .then((r) => r.data as AiAnswer);
  },

  chat: (orgId: string, input: ChatRequest) =>
    apiClient
      .post(`${base(orgId)}/chat`, input, idempotencyConfig())
      .then((r) => r.data as ChatResponse),

  createReportJob: (orgId: string, kind: ReportKind, extraQuery?: string) =>
    apiClient
      .post(
        `${base(orgId)}/jobs`,
        {
          ai_mode: REPORT_MODE[kind],
          user_query: extraQuery?.trim() ? extraQuery.trim() : REPORT_QUERY[kind],
        },
        idempotencyConfig(),
      )
      .then((r) => r.data.data as CreatedJob),

  getJob: (orgId: string, jobId: string) =>
    apiClient.get(`${base(orgId)}/jobs/${jobId}`).then((r) => r.data.data as AiJob),

  submitFeedback: (
    orgId: string,
    responseId: string,
    body: { helpful?: boolean; rating?: number; comment?: string; correction?: string },
  ) =>
    apiClient
      .post(`${base(orgId)}/responses/${responseId}/feedback`, body)
      .then((r) => r.data.data as { feedbackId: string }),

  // ── Credit usage (backed by the billing usage surface) ──
  getCreditUsage: (orgId: string): Promise<AiCreditUsage> =>
    orgApi.getCurrentUsage(orgId).then((u) => ({
      used: u.aiCreditsUsed,
      limit: u.aiCreditLimit,
      remaining: u.remainingAiCredits,
    })),

  // ── Knowledge base (management API — may not be available in every
  // deployment; callers render loading / empty / error states accordingly) ──
  listKnowledge: (orgId: string, params?: { type?: string; search?: string }) =>
    apiClient
      .get(`${base(orgId)}/knowledge`, { params })
      .then((r) => (r.data.data ?? r.data) as KnowledgeDoc[]),

  uploadKnowledge: (
    orgId: string,
    body: { title: string; type: string; content: string },
  ) =>
    apiClient
      .post(`${base(orgId)}/knowledge`, body)
      .then((r) => (r.data.data ?? r.data) as KnowledgeDoc),

  deleteKnowledge: (orgId: string, docId: string) =>
    apiClient.delete(`${base(orgId)}/knowledge/${docId}`).then(() => undefined),

  // ── Organization AI configuration (governance API — may not be available in
  // every deployment; callers render loading / empty / error states) ──
  getSettings: (orgId: string) =>
    apiClient
      .get(`${base(orgId)}/settings`)
      .then((r) => (r.data.data ?? r.data) as AiOrgSettings),

  updateSettings: (orgId: string, body: Partial<AiOrgSettings>) =>
    apiClient
      .patch(`${base(orgId)}/settings`, body)
      .then((r) => (r.data.data ?? r.data) as AiOrgSettings),
};
