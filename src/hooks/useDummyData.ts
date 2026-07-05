// ============================================================
// Dummy-data query hooks (rules.md §6 — TanStack Query only).
// No useEffect-based fetching. staleTime/gcTime configured per hook.
// ============================================================
import { useSuspenseQuery } from "@tanstack/react-query";
import * as dummy from "@/lib/dummy-data";
import type { ErrorFilters, RequestFilters, LogFilters } from "@/types/events";

// Keep a tiny delay so Suspense boundaries render consistently without
// making the app feel slow (previously +1200ms was added to every query).
const delay = (ms: number) => new Promise((r) => setTimeout(r, Math.min(ms, 50)));

const STALE_FAST = 15 * 1000;
const STALE = 30 * 1000;
const STALE_SLOW = 60 * 1000;
const GC = 5 * 60 * 1000;

// ---- Errors ----
export const useErrorEvents = (filters?: ErrorFilters) =>
  useSuspenseQuery({
    queryKey: ["errors", filters],
    queryFn: async () => {
      await delay(300);
      let data = dummy.dummyErrorEvents;
      if (filters?.service) data = data.filter((e) => e.metadata.service === filters.service);
      if (filters?.severity) data = data.filter((e) => e.severity === filters.severity);
      if (filters?.fingerprint) data = data.filter((e) => e.fingerprint === filters.fingerprint);
      return data;
    },
    staleTime: STALE,
    gcTime: GC,
  });

export const useErrorGroups = () =>
  useSuspenseQuery({
    queryKey: ["errorGroups"],
    queryFn: async () => {
      await delay(400);
      return Object.values(dummy.dummyErrorGroups);
    },
    staleTime: STALE,
    gcTime: GC,
  });

export const useErrorGroup = (fingerprint: string) =>
  useSuspenseQuery({
    queryKey: ["errorGroup", fingerprint],
    queryFn: async () => {
      await delay(300);
      return dummy.dummyErrorGroups[fingerprint] ?? null;
    },
    staleTime: STALE,
  });

// ---- Requests ----
export const useRequestEvents = (filters?: RequestFilters) =>
  useSuspenseQuery({
    queryKey: ["requests", filters],
    queryFn: async () => {
      await delay(300);
      let data = dummy.dummyRequestEvents;
      if (filters?.statusCode) data = data.filter((r) => r.statusCode === filters.statusCode);
      if (filters?.method) data = data.filter((r) => r.method === filters.method);
      if (filters?.requestId) data = data.filter((r) => r.requestId === filters.requestId);
      return data;
    },
    staleTime: STALE,
    gcTime: GC,
  });

export const useRequestEvent = (requestId: string) =>
  useSuspenseQuery({
    queryKey: ["request", requestId],
    queryFn: async () => {
      await delay(200);
      return dummy.dummyRequestEvents.find((r) => r.requestId === requestId) ?? null;
    },
  });

// ---- Spans / Traces ----
export const useSpanEvents = () =>
  useSuspenseQuery({ queryKey: ["spans"], queryFn: async () => { await delay(300); return dummy.dummySpanEvents; }, staleTime: STALE });

export const useTraceEvents = () =>
  useSuspenseQuery({ queryKey: ["traces"], queryFn: async () => { await delay(400); return dummy.dummyTraceEvents; }, staleTime: STALE });

export const useTraceEvent = (traceId: string) =>
  useSuspenseQuery({
    queryKey: ["trace", traceId],
    queryFn: async () => {
      await delay(300);
      return dummy.dummyTraceEvents.find((t) => t.traceId === traceId) ?? null;
    },
  });

// ---- Logs ----
export const useLogEvents = (filters?: LogFilters) =>
  useSuspenseQuery({
    queryKey: ["logs", filters],
    queryFn: async () => {
      await delay(300);
      let data = dummy.dummyLogEvents;
      if (filters?.level) data = data.filter((l) => l.level === filters.level);
      if (filters?.query) data = data.filter((l) => l.message.toLowerCase().includes(filters.query!.toLowerCase()));
      return data;
    },
    staleTime: STALE_FAST,
    gcTime: GC,
  });

export const useLogEvent = (eventId: string) =>
  useSuspenseQuery({
    queryKey: ["log", eventId],
    queryFn: async () => {
      await delay(200);
      return dummy.dummyLogEvents.find((l) => l.eventId === eventId) ?? null;
    },
  });

// ---- Metrics ----
export const useMetricEvents = () =>
  useSuspenseQuery({ queryKey: ["metrics"], queryFn: async () => { await delay(300); return dummy.dummyMetricEvents; }, staleTime: STALE });

// ---- Profiles / Replays / Cron ----
export const useProfileEvents = () =>
  useSuspenseQuery({ queryKey: ["profiles"], queryFn: async () => { await delay(300); return dummy.dummyProfileEvents; }, staleTime: STALE_SLOW });

export const useReplayEvents = () =>
  useSuspenseQuery({ queryKey: ["replays"], queryFn: async () => { await delay(300); return dummy.dummyReplayEvents; }, staleTime: STALE_SLOW });

export const useCronEvents = () =>
  useSuspenseQuery({ queryKey: ["cronEvents"], queryFn: async () => { await delay(300); return dummy.dummyCronEvents; }, staleTime: STALE });

// ---- Projects ----
export const useProjects = () =>
  useSuspenseQuery({ queryKey: ["projects"], queryFn: async () => { await delay(400); return dummy.dummyProjects; }, staleTime: STALE_SLOW });

export const useProject = (projectId: string) =>
  useSuspenseQuery({
    queryKey: ["project", projectId],
    queryFn: async () => { await delay(300); return dummy.dummyProjects.find((p) => p.id === projectId) ?? null; },
  });

// ---- Members ----
export const useMembers = () =>
  useSuspenseQuery({ queryKey: ["members"], queryFn: async () => { await delay(300); return dummy.dummyMembers; }, staleTime: STALE_SLOW });

export const useMember = (userId: string) =>
  useSuspenseQuery({
    queryKey: ["member", userId],
    queryFn: async () => { await delay(200); return dummy.dummyMembers.find((m) => m.id === userId) ?? null; },
  });

// ---- Incidents ----
export const useIncidents = () =>
  useSuspenseQuery({ queryKey: ["incidents"], queryFn: async () => { await delay(400); return dummy.dummyIncidents; }, staleTime: STALE_FAST });

export const useIncident = (incidentId: string) =>
  useSuspenseQuery({
    queryKey: ["incident", incidentId],
    queryFn: async () => { await delay(300); return dummy.dummyIncidents.find((inc) => inc.id === incidentId) ?? null; },
  });

// ---- Alert rules ----
export const useAlertRules = () =>
  useSuspenseQuery({ queryKey: ["alertRules"], queryFn: async () => { await delay(300); return dummy.dummyAlertRules; }, staleTime: STALE_SLOW });

export const useAlertRule = (ruleId: string) =>
  useSuspenseQuery({
    queryKey: ["alertRule", ruleId],
    queryFn: async () => { await delay(200); return dummy.dummyAlertRules.find((r) => r.id === ruleId) ?? null; },
  });

// ---- Escalations ----
export const useEscalations = () =>
  useSuspenseQuery({ queryKey: ["escalations"], queryFn: async () => { await delay(300); return dummy.dummyEscalations; }, staleTime: STALE_SLOW });

export const useEscalation = (policyId: string) =>
  useSuspenseQuery({
    queryKey: ["escalation", policyId],
    queryFn: async () => { await delay(200); return dummy.dummyEscalations.find((e) => e.id === policyId) ?? null; },
  });

// ---- Channels ----
export const useChannels = () =>
  useSuspenseQuery({ queryKey: ["channels"], queryFn: async () => { await delay(300); return dummy.dummyChannels; }, staleTime: STALE_SLOW });

export const useChannel = (channelId: string) =>
  useSuspenseQuery({
    queryKey: ["channel", channelId],
    queryFn: async () => { await delay(200); return dummy.dummyChannels.find((c) => c.id === channelId) ?? null; },
  });

// ---- API keys ----
export const useApiKeys = () =>
  useSuspenseQuery({ queryKey: ["apiKeys"], queryFn: async () => { await delay(300); return dummy.dummyApiKeys; }, staleTime: STALE_SLOW });

export const useApiKey = (keyId: string) =>
  useSuspenseQuery({
    queryKey: ["apiKey", keyId],
    queryFn: async () => { await delay(200); return dummy.dummyApiKeys.find((k) => k.id === keyId) ?? null; },
  });

// ---- Invoices ----
export const useInvoices = () =>
  useSuspenseQuery({ queryKey: ["invoices"], queryFn: async () => { await delay(300); return dummy.dummyInvoices; }, staleTime: STALE_SLOW });

export const useInvoice = (invoiceId: string) =>
  useSuspenseQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => { await delay(200); return dummy.dummyInvoices.find((inv) => inv.id === invoiceId) ?? null; },
  });

// ---- Audit logs ----
export const useAuditLogs = () =>
  useSuspenseQuery({ queryKey: ["auditLogs"], queryFn: async () => { await delay(400); return dummy.dummyAuditLogs; }, staleTime: STALE_SLOW });

// ---- Webhooks ----
export const useWebhooks = () =>
  useSuspenseQuery({ queryKey: ["webhooks"], queryFn: async () => { await delay(300); return dummy.dummyWebhooks; }, staleTime: STALE_SLOW });

export const useWebhook = (webhookId: string) =>
  useSuspenseQuery({
    queryKey: ["webhook", webhookId],
    queryFn: async () => { await delay(200); return dummy.dummyWebhooks.find((w) => w.id === webhookId) ?? null; },
  });

// ---- Integrations ----
export const useIntegrations = () =>
  useSuspenseQuery({ queryKey: ["integrations"], queryFn: async () => { await delay(300); return dummy.dummyIntegrations; }, staleTime: STALE_SLOW });

export const useIntegration = (integrationId: string) =>
  useSuspenseQuery({
    queryKey: ["integration", integrationId],
    queryFn: async () => { await delay(200); return dummy.dummyIntegrations.find((int) => int.id === integrationId) ?? null; },
  });

// ---- Environments ----
export const useEnvironments = () =>
  useSuspenseQuery({ queryKey: ["environments"], queryFn: async () => { await delay(300); return dummy.dummyEnvironments; }, staleTime: STALE_SLOW });

export const useEnvironment = (envId: string) =>
  useSuspenseQuery({
    queryKey: ["environment", envId],
    queryFn: async () => { await delay(200); return dummy.dummyEnvironments.find((e) => e.id === envId) ?? null; },
  });

// ---- Security / Invitations / Quotas ----
export const useSecurityEvents = () =>
  useSuspenseQuery({ queryKey: ["securityEvents"], queryFn: async () => { await delay(400); return dummy.dummySecurityEvents; }, staleTime: STALE });

export const useInvitations = () =>
  useSuspenseQuery({ queryKey: ["invitations"], queryFn: async () => { await delay(300); return dummy.dummyInvitations; }, staleTime: STALE_SLOW });

export const useQuotaRequests = () =>
  useSuspenseQuery({ queryKey: ["quotaRequests"], queryFn: async () => { await delay(300); return dummy.dummyQuotaRequests; }, staleTime: STALE_SLOW });

// ---- Billing extras ----
export const usePaymentMethods = () =>
  useSuspenseQuery({ queryKey: ["paymentMethods"], queryFn: async () => { await delay(300); return dummy.dummyPaymentMethods; }, staleTime: STALE_SLOW });

export const usePromotions = () =>
  useSuspenseQuery({ queryKey: ["promotions"], queryFn: async () => { await delay(300); return dummy.dummyPromotions; }, staleTime: STALE_SLOW });

// ---- Connections / Insights ----
export const useEndpoints = () =>
  useSuspenseQuery({ queryKey: ["endpoints"], queryFn: async () => { await delay(300); return dummy.dummyEndpoints; }, staleTime: STALE_SLOW });

export const useCompliance = () =>
  useSuspenseQuery({ queryKey: ["compliance"], queryFn: async () => { await delay(300); return dummy.dummyCompliance; }, staleTime: STALE_SLOW });

export const useAnomalies = () =>
  useSuspenseQuery({ queryKey: ["anomalies"], queryFn: async () => { await delay(300); return dummy.dummyAnomalies; }, staleTime: STALE });

export const useReleases = () =>
  useSuspenseQuery({ queryKey: ["releases"], queryFn: async () => { await delay(300); return dummy.dummyReleases; }, staleTime: STALE_SLOW });
