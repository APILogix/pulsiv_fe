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
import {
  deadLettersApi,
  eventsApi,
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
};

/** Broad invalidation used after any mutation that can move alerting state. */
function useInvalidateAlerting() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: alertingKeys.all, exact: false });
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
