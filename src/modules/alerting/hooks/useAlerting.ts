/**
 * Alerting React Query hooks.
 *
 * Every alerting route is organization-scoped, so each key embeds the active
 * org id and queries stay disabled until an org is selected. Events and dead
 * letters poll on an interval because the backend processes them out-of-band
 * via a pg-boss batch pipeline and exposes no websocket/SSE channel.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { orgApi } from "@/modules/organizations/api/org.api";
import { toIncidentView } from "../components/incident-view";
import {
  deadLettersApi,
  eventsApi,
  incidentsApi,
  projectAlertsApi,
  orgPoliciesApi,
  projectSubscriptionsApi,
  effectivePolicyApi,
  workspaceApi,
  metricsApi,
  policiesApi,
  routingApi,
  rulesApi,
  silencesApi,
  templatesApi,
} from "../api/alerting.api";
import type {
  AcknowledgeEventBody,
  CreateEscalationPolicyBody,
  CreateRoutingRuleBody,
  CreateRuleBindingBody,
  CreateRuleBody,
  CreateSilenceBody,
  CreateTemplateBody,
  DeadLetterListQuery,
  EffectiveRuleQuery,
  EventListQuery,
  IngestEventBody,
  Json,
  MetricsQuery,
  ResolveEventBody,
  RuleListQuery,
  SilenceFromEventBody,
  SilenceListQuery,
  TestRoutingBody,
  UpdateRuleBindingBody,
  UpdateRuleBody,
  UpsertEscalationStepBody,
  OrganizationAlertPolicy,
  IncidentListQuery,
} from "../api/types";

/** Live surfaces refresh on this cadence (rules.md: never poll under 5s). */
const LIVE_REFETCH_MS = 15_000;

export function useAlertingScope() {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);

  const requireOrgId = () => {
    if (!activeOrgId) throw new Error("No active organization selected");
    return activeOrgId;
  };

  return { activeOrgId, requireOrgId };
}

export const alertingKeys = {
  all: ["alerting"] as const,
  rules: (orgId: string | null, query?: unknown) => ["alerting", "rules", orgId, query] as const,
  rule: (orgId: string | null, id: string) => ["alerting", "rule", orgId, id] as const,
  ruleBindings: (orgId: string | null, id: string) => ["alerting", "rule-bindings", orgId, id] as const,
  ruleBinding: (orgId: string | null, ruleId: string, bindingId: string) =>
    ["alerting", "rule-binding", orgId, ruleId, bindingId] as const,
  effectiveRule: (orgId: string | null, ruleId: string, query?: unknown) =>
    ["alerting", "effective-rule", orgId, ruleId, query] as const,
  ruleRevisions: (orgId: string | null, ruleId: string) => ["alerting", "rule-revisions", orgId, ruleId] as const,
  ruleTemplates: (orgId: string | null) => ["alerting", "rule-templates", orgId] as const,
  events: (orgId: string | null, query?: unknown) => ["alerting", "events", orgId, query] as const,
  event: (orgId: string | null, id: string) => ["alerting", "event", orgId, id] as const,
  eventStats: (orgId: string | null) => ["alerting", "event-stats", orgId] as const,
  eventDeliveries: (orgId: string | null, id: string) => ["alerting", "event-deliveries", orgId, id] as const,
  deadLetters: (orgId: string | null, query?: unknown) => ["alerting", "dead-letters", orgId, query] as const,
  silences: (orgId: string | null, query?: unknown) => ["alerting", "silences", orgId, query] as const,
  policies: (orgId: string | null, query?: unknown) => ["alerting", "policies", orgId, query] as const,
  policy: (orgId: string | null, id: string) => ["alerting", "policy", orgId, id] as const,
  templates: (orgId: string | null, query?: unknown) => ["alerting", "templates", orgId, query] as const,
  routingRules: (orgId: string | null) => ["alerting", "routing-rules", orgId] as const,
  metrics: (orgId: string | null, query?: unknown) => ["alerting", "metrics", orgId, query] as const,
  workspace: (orgId: string | null) => ["alerting", "workspace", orgId] as const,
  orgPolicies: (orgId: string | null, query?: unknown) => ["alerting", "org-policies", orgId, query] as const,
  orgPolicy: (orgId: string | null, id: string) => ["alerting", "org-policy", orgId, id] as const,
  incidents: (orgId: string | null, query?: unknown) => ["alerting", "incidents", orgId, query] as const,
};

/** Broad invalidation used after any mutation that can move alerting state. */
function useInvalidateAlerting() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: alertingKeys.all, exact: false });
}

// ── Workspace and V2 policies ───────────────────────────────

export function useAlertingWorkspace() {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.workspace(activeOrgId),
    queryFn: () => workspaceApi.get(activeOrgId!),
    enabled: !!activeOrgId,
  });
}

export function useOrganizationAlertPolicies(query: { limit?: number; offset?: number } = {}) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.orgPolicies(activeOrgId, query),
    queryFn: () => orgPoliciesApi.list(activeOrgId!, query),
    enabled: !!activeOrgId,
  });
}

export function useOrganizationAlertPolicy(policyId: string | undefined) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.orgPolicy(activeOrgId, policyId ?? ""),
    queryFn: () => orgPoliciesApi.getById(activeOrgId!, policyId!),
    enabled: !!activeOrgId && !!policyId,
  });
}

export function useOrganizationAlertPolicyMutations() {
  const { requireOrgId } = useAlertingScope();
  const invalidate = useInvalidateAlerting();
  return {
    create: useMutation({
      mutationFn: (body: Partial<OrganizationAlertPolicy>) => orgPoliciesApi.create(requireOrgId(), body),
      onSuccess: invalidate,
    }),
    createVersion: useMutation({
      mutationFn: ({ policyId, definition }: { policyId: string; definition: Json }) =>
        orgPoliciesApi.createVersion(requireOrgId(), policyId, definition),
      onSuccess: invalidate,
    }),
  };
}

// ── Incidents ───────────────────────────────────────────────────────────────
// Backed by the real /alerting/incidents endpoints. Every list is SERVER
// paginated/filtered/sorted: the query object is forwarded verbatim and is part
// of the react-query key, so changing a filter refetches from the backend
// instead of narrowing an already-downloaded page.

/**
 * Paginated incident list.
 *
 * `keepPreviousData` keeps the current page visible while the next one loads, so
 * paging does not flash an empty table.
 */
export function useIncidents(query: IncidentListQuery = {}) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.incidents(activeOrgId, query),
    queryFn: () => incidentsApi.list(activeOrgId!, query),
    enabled: !!activeOrgId,
    refetchInterval: LIVE_REFETCH_MS,
    placeholderData: (previous) => previous,
  });
}

export function useIncident(incidentId: string | undefined) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: ["alerting", "incident", activeOrgId, incidentId],
    queryFn: () => incidentsApi.getById(activeOrgId!, incidentId!),
    enabled: !!activeOrgId && !!incidentId,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useIncidentSummary() {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: ["alerting", "incident-summary", activeOrgId],
    queryFn: () => incidentsApi.summary(activeOrgId!),
    enabled: !!activeOrgId,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useIncidentTimeline(
  incidentId: string | undefined,
  query: { limit?: number; offset?: number } = {},
) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: ["alerting", "incident-timeline", activeOrgId, incidentId, query],
    queryFn: () => incidentsApi.timeline(activeOrgId!, incidentId!, query),
    enabled: !!activeOrgId && !!incidentId,
  });
}

export function useIncidentNotifications(
  incidentId: string | undefined,
  query: { limit?: number; offset?: number } = {},
) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: ["alerting", "incident-notifications", activeOrgId, incidentId, query],
    queryFn: () => incidentsApi.notifications(activeOrgId!, incidentId!, query),
    enabled: !!activeOrgId && !!incidentId,
  });
}

/**
 * Incident lifecycle actions.
 *
 * Every mutation invalidates the incident list, the specific incident, its
 * timeline, and the overview summary, because a single transition changes all
 * four. Authorization is enforced by the backend; a 409 surfaces as a rejected
 * mutation the caller can toast.
 */
export function useIncidentMutations(incidentId?: string) {
  const { activeOrgId, requireOrgId } = useAlertingScope();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["alerting", "incidents", activeOrgId], exact: false });
    queryClient.invalidateQueries({ queryKey: ["alerting", "incident-summary", activeOrgId] });
    if (incidentId) {
      queryClient.invalidateQueries({ queryKey: ["alerting", "incident", activeOrgId, incidentId] });
      queryClient.invalidateQueries({ queryKey: ["alerting", "incident-timeline", activeOrgId, incidentId], exact: false });
    }
  };

  return {
    acknowledge: useMutation({
      mutationFn: (id: string) => incidentsApi.acknowledge(requireOrgId(), id),
      onSuccess: invalidate,
    }),
    resolve: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
        incidentsApi.resolve(requireOrgId(), id, reason ? { reason } : {}),
      onSuccess: invalidate,
    }),
    assign: useMutation({
      mutationFn: ({ id, assigneeUserId }: { id: string; assigneeUserId: string | null }) =>
        incidentsApi.assign(requireOrgId(), id, { assigneeUserId }),
      onSuccess: invalidate,
    }),
  };
}

export function useProjectPolicySubscriptions(projectId: string | undefined) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: ["alerting", "project-subscriptions", activeOrgId, projectId],
    queryFn: () => projectSubscriptionsApi.list(activeOrgId!, projectId!),
    enabled: !!activeOrgId && !!projectId,
  });
}

export function useProjectPolicyMutations(projectId: string) {
  const { activeOrgId, requireOrgId } = useAlertingScope();
  const queryClient = useQueryClient();
  const key = ["alerting", "project-subscriptions", activeOrgId, projectId];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  return {
    subscribe: useMutation({ mutationFn: (policyId: string) => projectSubscriptionsApi.subscribe(requireOrgId(), projectId, policyId), onSuccess: invalidate }),
    updateState: useMutation({ mutationFn: ({ subscriptionId, state }: { subscriptionId: string; state: import("../api/types").SubscriptionState }) => projectSubscriptionsApi.updateState(requireOrgId(), projectId, subscriptionId, state), onSuccess: invalidate }),
    updateOverride: useMutation({ mutationFn: ({ subscriptionId, override }: { subscriptionId: string; override: Record<string, unknown> }) => projectSubscriptionsApi.updateOverride(requireOrgId(), projectId, subscriptionId, override), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (subscriptionId: string) => projectSubscriptionsApi.delete(requireOrgId(), projectId, subscriptionId), onSuccess: invalidate }),
  };
}

export function useProjectEffectivePolicies(projectId: string | undefined) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: ["alerting", "effective-policies", activeOrgId, projectId],
    queryFn: () => effectivePolicyApi.listAll(activeOrgId!, projectId!),
    enabled: !!activeOrgId && !!projectId,
  });
}

// ── Rules ────────────────────────────────────────────────────

export function useAlertRules(query: RuleListQuery = {}) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.rules(activeOrgId, query),
    queryFn: () => rulesApi.list(activeOrgId!, query),
    enabled: !!activeOrgId,
  });
}

export function useAlertRule(ruleId: string | undefined) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.rule(activeOrgId, ruleId ?? ""),
    queryFn: () => rulesApi.get(activeOrgId!, ruleId!),
    enabled: !!activeOrgId && !!ruleId,
  });
}

export function useAlertRuleTemplates() {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.ruleTemplates(activeOrgId),
    queryFn: () => rulesApi.templates(activeOrgId!),
    enabled: !!activeOrgId,
  });
}

export function useAlertRuleBindings(ruleId: string | undefined) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.ruleBindings(activeOrgId, ruleId ?? ""),
    queryFn: () => rulesApi.listBindings(activeOrgId!, ruleId!),
    enabled: !!activeOrgId && !!ruleId,
  });
}

export function useAlertRuleBinding(ruleId: string | undefined, bindingId: string | undefined) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.ruleBinding(activeOrgId, ruleId ?? "", bindingId ?? ""),
    queryFn: () => rulesApi.getBinding(activeOrgId!, ruleId!, bindingId!),
    enabled: !!activeOrgId && !!ruleId && !!bindingId,
  });
}

export function useEffectiveAlertRule(ruleId: string | undefined, query: EffectiveRuleQuery = {}) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.effectiveRule(activeOrgId, ruleId ?? "", query),
    queryFn: () => rulesApi.effective(activeOrgId!, ruleId!, query),
    enabled: !!activeOrgId && !!ruleId,
  });
}

export function useAlertRuleRevisions(ruleId: string | undefined) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.ruleRevisions(activeOrgId, ruleId ?? ""),
    queryFn: () => rulesApi.revisions(activeOrgId!, ruleId!),
    enabled: !!activeOrgId && !!ruleId,
  });
}

export function useAlertRuleMutations() {
  const { requireOrgId } = useAlertingScope();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAlerting();

  return {
    createRule: useMutation({
      mutationFn: (body: CreateRuleBody) => rulesApi.create(requireOrgId(), body),
      onSuccess: invalidate,
    }),
    updateRule: useMutation({
      mutationFn: ({ id, body }: { id: string; body: UpdateRuleBody }) =>
        rulesApi.update(requireOrgId(), id, body),
      onSuccess: invalidate,
    }),
    deleteRule: useMutation({
      mutationFn: (id: string) => rulesApi.remove(requireOrgId(), id),
      onSuccess: invalidate,
    }),
    toggleRule: useMutation({
      mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
        enabled ? rulesApi.enable(requireOrgId(), id) : rulesApi.disable(requireOrgId(), id),
      onMutate: async ({ id, enabled }) => {
        await queryClient.cancelQueries({ queryKey: alertingKeys.all });

        const previousRulesQueries = queryClient.getQueriesData({ queryKey: ["alerting", "rules"] });
        const previousSingleQueries = queryClient.getQueriesData({ queryKey: ["alerting", "rule"] });

        queryClient.setQueriesData(
          { queryKey: ["alerting", "rules"] },
          (oldData: any) => {
            if (!oldData) return oldData;
            if (Array.isArray(oldData)) {
              return oldData.map((rule: any) =>
                rule.id === id ? { ...rule, enabled } : rule
              );
            }
            if (oldData.data && Array.isArray(oldData.data)) {
              return {
                ...oldData,
                data: oldData.data.map((rule: any) =>
                  rule.id === id ? { ...rule, enabled } : rule
                ),
              };
            }
            return oldData;
          }
        );

        queryClient.setQueriesData(
          { queryKey: ["alerting", "rule"] },
          (oldData: any) => {
            if (!oldData) return oldData;
            if (oldData.id === id) {
              return { ...oldData, enabled };
            }
            return oldData;
          }
        );

        return { previousRulesQueries, previousSingleQueries };
      },
      onError: (_err, _variables, context) => {
        if (context?.previousRulesQueries) {
          context.previousRulesQueries.forEach(([key, data]) => {
            queryClient.setQueryData(key, data);
          });
        }
        if (context?.previousSingleQueries) {
          context.previousSingleQueries.forEach(([key, data]) => {
            queryClient.setQueryData(key, data);
          });
        }
      },
      onSuccess: (updatedRule) => {
        if (updatedRule && updatedRule.id) {
          queryClient.setQueriesData(
            { queryKey: ["alerting", "rules"] },
            (oldData: any) => {
              if (!oldData) return oldData;
              if (Array.isArray(oldData)) {
                return oldData.map((rule: any) =>
                  rule.id === updatedRule.id ? updatedRule : rule
                );
              }
              if (oldData.data && Array.isArray(oldData.data)) {
                return {
                  ...oldData,
                  data: oldData.data.map((rule: any) =>
                    rule.id === updatedRule.id ? updatedRule : rule
                  ),
                };
              }
              return oldData;
            }
          );
        }
      },
    }),
    testRule: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Json }) =>
        rulesApi.test(requireOrgId(), id, payload),
    }),
    cloneRule: useMutation({
      mutationFn: (id: string) => rulesApi.clone(requireOrgId(), id),
      onSuccess: invalidate,
    }),
    createFromTemplate: useMutation({
      mutationFn: ({ templateKey, overrides }: { templateKey: string; overrides?: Partial<CreateRuleBody> }) =>
        rulesApi.createFromTemplate(requireOrgId(), templateKey, overrides),
      onSuccess: invalidate,
    }),
    createBinding: useMutation({
      mutationFn: ({ ruleId, body }: { ruleId: string; body: CreateRuleBindingBody }) =>
        rulesApi.createBinding(requireOrgId(), ruleId, body),
      onSuccess: invalidate,
    }),
    updateBinding: useMutation({
      mutationFn: ({ ruleId, bindingId, body }: { ruleId: string; bindingId: string; body: UpdateRuleBindingBody }) =>
        rulesApi.updateBinding(requireOrgId(), ruleId, bindingId, body),
      onSuccess: invalidate,
    }),
    deleteBinding: useMutation({
      mutationFn: ({ ruleId, bindingId }: { ruleId: string; bindingId: string }) =>
        rulesApi.removeBinding(requireOrgId(), ruleId, bindingId),
      onSuccess: invalidate,
    }),
  };
}

// ── Events ───────────────────────────────────────────────────

export function useAlertEvents(query: EventListQuery = {}) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.events(activeOrgId, query),
    queryFn: () => eventsApi.list(activeOrgId!, query),
    enabled: !!activeOrgId,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useAlertEvent(eventId: string | undefined) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.event(activeOrgId, eventId ?? ""),
    queryFn: () => eventsApi.get(activeOrgId!, eventId!),
    enabled: !!activeOrgId && !!eventId,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useAlertEventStats() {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.eventStats(activeOrgId),
    queryFn: () => eventsApi.stats(activeOrgId!),
    enabled: !!activeOrgId,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useAlertEventDeliveries(eventId: string | undefined) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.eventDeliveries(activeOrgId, eventId ?? ""),
    queryFn: () => eventsApi.deliveries(activeOrgId!, eventId!),
    enabled: !!activeOrgId && !!eventId,
  });
}

export function useIngestAlertEvent() {
  const { requireOrgId } = useAlertingScope();
  const invalidate = useInvalidateAlerting();
  return useMutation({
    mutationFn: (body: IngestEventBody) => eventsApi.ingest(requireOrgId(), body),
    onSuccess: invalidate,
  });
}

export function useAlertEventMutations() {
  const { requireOrgId } = useAlertingScope();
  const invalidate = useInvalidateAlerting();

  return {
    acknowledge: useMutation({
      mutationFn: ({ id, body }: { id: string; body?: AcknowledgeEventBody }) =>
        eventsApi.acknowledge(requireOrgId(), id, body),
      onSuccess: invalidate,
    }),
    resolve: useMutation({
      mutationFn: ({ id, body }: { id: string; body?: ResolveEventBody }) =>
        eventsApi.resolve(requireOrgId(), id, body),
      onSuccess: invalidate,
    }),
    silenceFromEvent: useMutation({
      mutationFn: ({ id, body }: { id: string; body?: SilenceFromEventBody }) =>
        eventsApi.silenceFromEvent(requireOrgId(), id, body),
      onSuccess: invalidate,
    }),
  };
}

// ── Dead-letter queue (admin) ─────────────────────────────────

export function useDeadLetters(query: DeadLetterListQuery = {}) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.deadLetters(activeOrgId, query),
    queryFn: () => deadLettersApi.list(activeOrgId!, query),
    enabled: !!activeOrgId,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useDeadLetterMutations() {
  const { requireOrgId } = useAlertingScope();
  const invalidate = useInvalidateAlerting();

  return {
    retry: useMutation({
      mutationFn: (id: string) => deadLettersApi.retry(requireOrgId(), id),
      onSuccess: invalidate,
    }),
    discard: useMutation({
      mutationFn: (id: string) => deadLettersApi.discard(requireOrgId(), id),
      onSuccess: invalidate,
    }),
  };
}

// ── Silences ───────────────────────────────────────────────────

export function useSilences(query: SilenceListQuery = {}) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.silences(activeOrgId, query),
    queryFn: () => silencesApi.list(activeOrgId!, query),
    enabled: !!activeOrgId,
  });
}

export function useSilenceMutations() {
  const { requireOrgId } = useAlertingScope();
  const invalidate = useInvalidateAlerting();

  return {
    create: useMutation({
      mutationFn: (body: CreateSilenceBody) => silencesApi.create(requireOrgId(), body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => silencesApi.remove(requireOrgId(), id),
      onSuccess: invalidate,
    }),
  };
}

// ── Escalation policies ────────────────────────────────────────

export function useEscalationPolicies(query: { limit?: number; offset?: number } = {}) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.policies(activeOrgId, query),
    queryFn: () => policiesApi.list(activeOrgId!, query),
    enabled: !!activeOrgId,
  });
}

export function useEscalationPolicy(policyId: string | undefined) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.policy(activeOrgId, policyId ?? ""),
    queryFn: () => policiesApi.get(activeOrgId!, policyId!),
    enabled: !!activeOrgId && !!policyId,
  });
}

export function useEscalationPolicyMutations() {
  const { requireOrgId } = useAlertingScope();
  const invalidate = useInvalidateAlerting();

  return {
    create: useMutation({
      mutationFn: (body: CreateEscalationPolicyBody) => policiesApi.create(requireOrgId(), body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => policiesApi.remove(requireOrgId(), id),
      onSuccess: invalidate,
    }),
    upsertStep: useMutation({
      mutationFn: ({ policyId, body }: { policyId: string; body: UpsertEscalationStepBody }) =>
        policiesApi.upsertStep(requireOrgId(), policyId, body),
      onSuccess: invalidate,
    }),
  };
}

// ── Templates ────────────────────────────────────────────────────

export function useAlertTemplates(query: { limit?: number; offset?: number } = {}) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.templates(activeOrgId, query),
    queryFn: () => templatesApi.list(activeOrgId!, query),
    enabled: !!activeOrgId,
  });
}

export function useAlertTemplateMutations() {
  const { requireOrgId } = useAlertingScope();
  const invalidate = useInvalidateAlerting();

  return {
    create: useMutation({
      mutationFn: (body: CreateTemplateBody) => templatesApi.create(requireOrgId(), body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => templatesApi.remove(requireOrgId(), id),
      onSuccess: invalidate,
    }),
    preview: useMutation({
      mutationFn: ({ id, sampleData }: { id: string; sampleData?: Json }) =>
        templatesApi.preview(requireOrgId(), id, sampleData),
    }),
  };
}

// ── Routing rules ────────────────────────────────────────────────

export function useRoutingRules() {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.routingRules(activeOrgId),
    queryFn: () => routingApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  });
}

export function useRoutingRuleMutations() {
  const { requireOrgId } = useAlertingScope();
  const invalidate = useInvalidateAlerting();

  return {
    create: useMutation({
      mutationFn: (body: CreateRoutingRuleBody) => routingApi.create(requireOrgId(), body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => routingApi.remove(requireOrgId(), id),
      onSuccess: invalidate,
    }),
    test: useMutation({
      mutationFn: (body: TestRoutingBody) => routingApi.test(requireOrgId(), body),
    }),
  };
}

// ── Metrics ──────────────────────────────────────────────────────

export function useAlertMetrics(query: MetricsQuery = {}) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: alertingKeys.metrics(activeOrgId, query),
    queryFn: () => metricsApi.query(activeOrgId!, query),
    enabled: !!activeOrgId,
  });
}

// ── Project Scoped Alerts ────────────────────────────────────────

export function useProjectAlerts(
  projectId: string | undefined,
  query: { status?: string; severity?: string; limit?: number; offset?: number } = {},
) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: ["alerting", "project-alerts", activeOrgId, projectId, query],
    queryFn: () => projectAlertsApi.list(activeOrgId!, projectId!, query),
    enabled: !!activeOrgId && !!projectId,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useProjectAlert(projectId: string | undefined, alertEventId: string | undefined) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: ["alerting", "project-alert", activeOrgId, projectId, alertEventId],
    queryFn: () => projectAlertsApi.get(activeOrgId!, projectId!, alertEventId!),
    enabled: !!activeOrgId && !!projectId && !!alertEventId,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

// ── Entitlement Decision Hook ────────────────────────────────────

export const CONNECTOR_FEATURE_KEYS = {
  email: "integrations.email",
  slack: "integrations.slack",
  discord: "integrations.discord",
  teams: "integrations.microsoft_teams",
  pagerduty: "integrations.pagerduty",
  webhook: "integrations.webhook",
  sms: "integrations.sms",
} as const;

export const CONNECTOR_ALIAS_KEYS = {
  teams: "integrations.teams",
} as const;

export const CONNECTOR_LEGACY_KEYS = {
  email: "email_alerts",
  slack: "slack_connector",
  discord: "discord_connector",
  teams: "teams_connector",
  pagerduty: "pagerduty_connector",
  webhook: "webhook_connector",
  sms: "sms_connector",
} as const;

export interface NotificationEntitlementDecision {
  mode: "NORMAL_CONNECTOR" | "EMAIL_ONLY_RESTRICTED";
  connectorAccess: boolean;
  alertingEnabled: boolean;
  externalConnectorsEnabled: boolean;
  managedEmailEnabled: boolean;
  reason: "CONNECTOR_ACCESS_ALLOWED" | "CONNECTOR_ENTITLEMENT_REQUIRED" | "ENTITLEMENT_UNKNOWN";
  featureKeys: string[];
  providers: {
    slack: boolean;
    discord: boolean;
    teams: boolean;
    pagerduty: boolean;
    webhook: boolean;
    sms: boolean;
    email: boolean;
  };
  isProviderAllowed: (channelKind: string, connectorBacked?: boolean) => boolean;
}

export function useNotificationEntitlement() {
  const { activeOrgId } = useAlertingScope();
  const query = useQuery({
    queryKey: ["organizations", activeOrgId, "entitlements"],
    queryFn: () => orgApi.getEntitlements(activeOrgId!),
    enabled: !!activeOrgId,
    staleTime: 60_000,
  });

  const raw = query.data ?? {};
  const alertRulesLimit = raw["alert_rules"]?.integerValue ?? raw["quota.alert_rules"]?.integerValue ?? 0;
  const alertingEnabled =
    raw["alerting.enabled"]?.booleanValue === true ||
    raw["in_app_alerts"]?.booleanValue === true ||
    raw["email_alerts"]?.booleanValue === true ||
    alertRulesLimit > 0 ||
    alertRulesLimit === -1;

  const connectorLimit = raw["quota.connectors"]?.integerValue ?? raw["connectors"]?.integerValue ?? 0;
  const integrationLimit = raw["quota.integrations"]?.integerValue ?? 0;
  const effectiveLimit =
    connectorLimit > 0 || connectorLimit === -1 ? connectorLimit : integrationLimit;

  const isProviderActive = (channel: keyof typeof CONNECTOR_FEATURE_KEYS): boolean => {
    const canonicalKey = CONNECTOR_FEATURE_KEYS[channel];
    const aliasKey = channel in CONNECTOR_ALIAS_KEYS ? CONNECTOR_ALIAS_KEYS[channel as keyof typeof CONNECTOR_ALIAS_KEYS] : null;
    const legacyKey = CONNECTOR_LEGACY_KEYS[channel];
    return (
      (Boolean(canonicalKey) && raw[canonicalKey]?.booleanValue === true) ||
      (Boolean(aliasKey) && raw[aliasKey as string]?.booleanValue === true) ||
      (Boolean(legacyKey) && raw[legacyKey]?.booleanValue === true)
    );
  };

  const providers = {
    slack: isProviderActive("slack"),
    discord: isProviderActive("discord"),
    teams: isProviderActive("teams"),
    pagerduty: isProviderActive("pagerduty"),
    webhook: isProviderActive("webhook"),
    sms: isProviderActive("sms"),
    email: isProviderActive("email"),
  };

  const enabledProviders = (Object.keys(CONNECTOR_FEATURE_KEYS) as Array<keyof typeof CONNECTOR_FEATURE_KEYS>).filter(
    (ch) => providers[ch],
  );

  const externalConnectorsEnabled = (effectiveLimit === -1 || effectiveLimit > 0) && enabledProviders.length > 0;
  const connectorAccess = alertingEnabled && externalConnectorsEnabled;
  const managedEmailEnabled = alertingEnabled || raw["email_alerts"]?.booleanValue === true;

  const featureKeys = [
    "alerting.enabled",
    "quota.connectors",
    "quota.integrations",
    "connectors",
    "alert_rules",
    ...Object.values(CONNECTOR_FEATURE_KEYS),
    ...Object.values(CONNECTOR_ALIAS_KEYS),
    ...Object.values(CONNECTOR_LEGACY_KEYS),
  ];

  const decision: NotificationEntitlementDecision = {
    mode: connectorAccess ? "NORMAL_CONNECTOR" : "EMAIL_ONLY_RESTRICTED",
    connectorAccess,
    alertingEnabled,
    externalConnectorsEnabled,
    managedEmailEnabled,
    reason: query.isError
      ? "ENTITLEMENT_UNKNOWN"
      : connectorAccess
        ? "CONNECTOR_ACCESS_ALLOWED"
        : "CONNECTOR_ENTITLEMENT_REQUIRED",
    featureKeys,
    providers,
    isProviderAllowed: (channelKind: string, connectorBacked = true) => {
      if (channelKind === "in_app") return true;
      if (channelKind === "email" && !connectorBacked) return true;
      if (channelKind in providers) {
        return providers[channelKind as keyof typeof providers];
      }
      return false;
    },
  };

  return {
    ...query,
    decision,
    connectorAccess,
    isRestricted: decision.mode === "EMAIL_ONLY_RESTRICTED",
  };
}

export function useProjectAlertingStatus(projectId?: string | null) {
  const { activeOrgId } = useAlertingScope();
  return useQuery({
    queryKey: ["alerting", "status", activeOrgId, projectId],
    queryFn: () => {
      if (!activeOrgId || !projectId) throw new Error("Missing org or project");
      return projectAlertsApi.getStatus(activeOrgId, projectId);
    },
    enabled: !!activeOrgId && !!projectId,
    staleTime: 30_000,
  });
}


