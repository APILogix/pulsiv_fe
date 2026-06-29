// ============================================================
// Dummy-data query hooks (rules.md §6 — TanStack Query only).
// No useEffect-based fetching. staleTime/gcTime configured per hook.
// ============================================================
import { useQuery } from "@tanstack/react-query";
import * as dummy from "@/lib/dummy-data";
import type { ErrorFilters, RequestFilters, LogFilters } from "@/types/events";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms + 1200));

const STALE_FAST = 15 * 1000;
const STALE = 30 * 1000;
const STALE_SLOW = 60 * 1000;
const GC = 5 * 60 * 1000;

// ---- Errors ----
export const useErrorEvents = (filters?: ErrorFilters) =>
  useQuery({
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
  useQuery({
    queryKey: ["errorGroups"],
    queryFn: async () => {
      await delay(400);
      return Object.values(dummy.dummyErrorGroups);
    },
    staleTime: STALE,
    gcTime: GC,
  });

export const useErrorGroup = (fingerprint: string) =>
  useQuery({
    queryKey: ["errorGroup", fingerprint],
    queryFn: async () => {
      await delay(300);
      return dummy.dummyErrorGroups[fingerprint] ?? null;
    },
    enabled: !!fingerprint,
    staleTime: STALE,
  });

// ---- Requests ----
export const useRequestEvents = (filters?: RequestFilters) =>
  useQuery({
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
  useQuery({
    queryKey: ["request", requestId],
    queryFn: async () => {
      await delay(200);
      return dummy.dummyRequestEvents.find((r) => r.requestId === requestId) ?? null;
    },
    enabled: !!requestId,
  });

// ---- Spans / Traces ----
export const useSpanEvents = () =>
  useQuery({ queryKey: ["spans"], queryFn: async () => { await delay(300); return dummy.dummySpanEvents; }, staleTime: STALE });

export const useTraceEvents = () =>
  useQuery({ queryKey: ["traces"], queryFn: async () => { await delay(400); return dummy.dummyTraceEvents; }, staleTime: STALE });

export const useTraceEvent = (traceId: string) =>
  useQuery({
    queryKey: ["trace", traceId],
    queryFn: async () => {
      await delay(300);
      return dummy.dummyTraceEvents.find((t) => t.traceId === traceId) ?? null;
    },
    enabled: !!traceId,
  });

// ---- Logs ----
export const useLogEvents = (filters?: LogFilters) =>
  useQuery({
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
  useQuery({
    queryKey: ["log", eventId],
    queryFn: async () => {
      await delay(200);
      return dummy.dummyLogEvents.find((l) => l.eventId === eventId) ?? null;
    },
    enabled: !!eventId,
  });

// ---- Metrics ----
export const useMetricEvents = () =>
  useQuery({ queryKey: ["metrics"], queryFn: async () => { await delay(300); return dummy.dummyMetricEvents; }, staleTime: STALE });

// ---- Profiles / Replays / Cron ----
export const useProfileEvents = () =>
  useQuery({ queryKey: ["profiles"], queryFn: async () => { await delay(300); return dummy.dummyProfileEvents; }, staleTime: STALE_SLOW });

export const useReplayEvents = () =>
  useQuery({ queryKey: ["replays"], queryFn: async () => { await delay(300); return dummy.dummyReplayEvents; }, staleTime: STALE_SLOW });

export const useCronEvents = () =>
  useQuery({ queryKey: ["cronEvents"], queryFn: async () => { await delay(300); return dummy.dummyCronEvents; }, staleTime: STALE });

// ---- Projects ----
export const useProjects = () =>
  useQuery({ queryKey: ["projects"], queryFn: async () => { await delay(400); return dummy.dummyProjects; }, staleTime: STALE_SLOW });

export const useProject = (projectId: string) =>
  useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => { await delay(300); return dummy.dummyProjects.find((p) => p.id === projectId) ?? null; },
    enabled: !!projectId,
  });

// ---- Members ----
export const useMembers = () =>
  useQuery({ queryKey: ["members"], queryFn: async () => { await delay(300); return dummy.dummyMembers; }, staleTime: STALE_SLOW });

export const useMember = (userId: string) =>
  useQuery({
    queryKey: ["member", userId],
    queryFn: async () => { await delay(200); return dummy.dummyMembers.find((m) => m.id === userId) ?? null; },
    enabled: !!userId,
  });

// ---- Incidents ----
export const useIncidents = () =>
  useQuery({ queryKey: ["incidents"], queryFn: async () => { await delay(400); return dummy.dummyIncidents; }, staleTime: STALE_FAST });

export const useIncident = (incidentId: string) =>
  useQuery({
    queryKey: ["incident", incidentId],
    queryFn: async () => { await delay(300); return dummy.dummyIncidents.find((inc) => inc.id === incidentId) ?? null; },
    enabled: !!incidentId,
  });

// ---- Alert rules ----
export const useAlertRules = () =>
  useQuery({ queryKey: ["alertRules"], queryFn: async () => { await delay(300); return dummy.dummyAlertRules; }, staleTime: STALE_SLOW });

export const useAlertRule = (ruleId: string) =>
  useQuery({
    queryKey: ["alertRule", ruleId],
    queryFn: async () => { await delay(200); return dummy.dummyAlertRules.find((r) => r.id === ruleId) ?? null; },
    enabled: !!ruleId,
  });

// ---- Escalations ----
export const useEscalations = () =>
  useQuery({ queryKey: ["escalations"], queryFn: async () => { await delay(300); return dummy.dummyEscalations; }, staleTime: STALE_SLOW });

export const useEscalation = (policyId: string) =>
  useQuery({
    queryKey: ["escalation", policyId],
    queryFn: async () => { await delay(200); return dummy.dummyEscalations.find((e) => e.id === policyId) ?? null; },
    enabled: !!policyId,
  });

// ---- Channels ----
export const useChannels = () =>
  useQuery({ queryKey: ["channels"], queryFn: async () => { await delay(300); return dummy.dummyChannels; }, staleTime: STALE_SLOW });

export const useChannel = (channelId: string) =>
  useQuery({
    queryKey: ["channel", channelId],
    queryFn: async () => { await delay(200); return dummy.dummyChannels.find((c) => c.id === channelId) ?? null; },
    enabled: !!channelId,
  });

// ---- API keys ----
export const useApiKeys = () =>
  useQuery({ queryKey: ["apiKeys"], queryFn: async () => { await delay(300); return dummy.dummyApiKeys; }, staleTime: STALE_SLOW });

export const useApiKey = (keyId: string) =>
  useQuery({
    queryKey: ["apiKey", keyId],
    queryFn: async () => { await delay(200); return dummy.dummyApiKeys.find((k) => k.id === keyId) ?? null; },
    enabled: !!keyId,
  });

// ---- Invoices ----
export const useInvoices = () =>
  useQuery({ queryKey: ["invoices"], queryFn: async () => { await delay(300); return dummy.dummyInvoices; }, staleTime: STALE_SLOW });

export const useInvoice = (invoiceId: string) =>
  useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => { await delay(200); return dummy.dummyInvoices.find((inv) => inv.id === invoiceId) ?? null; },
    enabled: !!invoiceId,
  });

// ---- Audit logs ----
export const useAuditLogs = () =>
  useQuery({ queryKey: ["auditLogs"], queryFn: async () => { await delay(400); return dummy.dummyAuditLogs; }, staleTime: STALE_SLOW });

// ---- Webhooks ----
export const useWebhooks = () =>
  useQuery({ queryKey: ["webhooks"], queryFn: async () => { await delay(300); return dummy.dummyWebhooks; }, staleTime: STALE_SLOW });

export const useWebhook = (webhookId: string) =>
  useQuery({
    queryKey: ["webhook", webhookId],
    queryFn: async () => { await delay(200); return dummy.dummyWebhooks.find((w) => w.id === webhookId) ?? null; },
    enabled: !!webhookId,
  });

// ---- Integrations ----
export const useIntegrations = () =>
  useQuery({ queryKey: ["integrations"], queryFn: async () => { await delay(300); return dummy.dummyIntegrations; }, staleTime: STALE_SLOW });

export const useIntegration = (integrationId: string) =>
  useQuery({
    queryKey: ["integration", integrationId],
    queryFn: async () => { await delay(200); return dummy.dummyIntegrations.find((int) => int.id === integrationId) ?? null; },
    enabled: !!integrationId,
  });

// ---- Environments ----
export const useEnvironments = () =>
  useQuery({ queryKey: ["environments"], queryFn: async () => { await delay(300); return dummy.dummyEnvironments; }, staleTime: STALE_SLOW });

export const useEnvironment = (envId: string) =>
  useQuery({
    queryKey: ["environment", envId],
    queryFn: async () => { await delay(200); return dummy.dummyEnvironments.find((e) => e.id === envId) ?? null; },
    enabled: !!envId,
  });

// ---- Security / Invitations / Quotas ----
export const useSecurityEvents = () =>
  useQuery({ queryKey: ["securityEvents"], queryFn: async () => { await delay(400); return dummy.dummySecurityEvents; }, staleTime: STALE });

export const useInvitations = () =>
  useQuery({ queryKey: ["invitations"], queryFn: async () => { await delay(300); return dummy.dummyInvitations; }, staleTime: STALE_SLOW });

export const useQuotaRequests = () =>
  useQuery({ queryKey: ["quotaRequests"], queryFn: async () => { await delay(300); return dummy.dummyQuotaRequests; }, staleTime: STALE_SLOW });

// ---- Billing extras ----
export const usePaymentMethods = () =>
  useQuery({ queryKey: ["paymentMethods"], queryFn: async () => { await delay(300); return dummy.dummyPaymentMethods; }, staleTime: STALE_SLOW });

export const usePromotions = () =>
  useQuery({ queryKey: ["promotions"], queryFn: async () => { await delay(300); return dummy.dummyPromotions; }, staleTime: STALE_SLOW });

// ---- Connections / Insights ----
export const useEndpoints = () =>
  useQuery({ queryKey: ["endpoints"], queryFn: async () => { await delay(300); return dummy.dummyEndpoints; }, staleTime: STALE_SLOW });

export const useCompliance = () =>
  useQuery({ queryKey: ["compliance"], queryFn: async () => { await delay(300); return dummy.dummyCompliance; }, staleTime: STALE_SLOW });

export const useAnomalies = () =>
  useQuery({ queryKey: ["anomalies"], queryFn: async () => { await delay(300); return dummy.dummyAnomalies; }, staleTime: STALE });

export const useReleases = () =>
  useQuery({ queryKey: ["releases"], queryFn: async () => { await delay(300); return dummy.dummyReleases; }, staleTime: STALE_SLOW });
