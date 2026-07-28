/**
 * Automation React Query hooks.
 *
 * Every automation route is organization-scoped, so each key embeds the active
 * org id and queries stay disabled until an org is selected. Runs and approvals
 * poll on an interval because the backend executes workflows out-of-band via
 * pg-boss and exposes no websocket/SSE channel.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import {
  approvalsApi,
  automationAuditApi,
  automationEventsApi,
  runsApi,
  templatesApi,
  workflowsApi,
} from "../api/automation.api";
import type {
  ApprovalListQuery,
  AuditListQuery,
  CreateFromTemplateBody,
  CreateWorkflowBody,
  IngestEventBody,
  Json,
  PaginationQuery,
  RunListQuery,
  UpdateWorkflowBody,
  WorkflowListQuery,
} from "../api/types";

/** Live surfaces refresh on this cadence (rules.md: never poll under 5s). */
const LIVE_REFETCH_MS = 15_000;

export function useAutomationScope() {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);

  const requireOrgId = () => {
    if (!activeOrgId) throw new Error("No active organization selected");
    return activeOrgId;
  };

  return { activeOrgId, requireOrgId };
}

export const automationKeys = {
  all: ["automation"] as const,
  workflows: (orgId: string | null, query?: unknown) => ["automation", "workflows", orgId, query] as const,
  workflow: (orgId: string | null, id: string) => ["automation", "workflow", orgId, id] as const,
  workflowRuns: (orgId: string | null, id: string, query?: unknown) =>
    ["automation", "workflow-runs", orgId, id, query] as const,
  runs: (orgId: string | null, query?: unknown) => ["automation", "runs", orgId, query] as const,
  run: (orgId: string | null, id: string) => ["automation", "run", orgId, id] as const,
  runSteps: (orgId: string | null, id: string) => ["automation", "run-steps", orgId, id] as const,
  approvals: (orgId: string | null, query?: unknown) => ["automation", "approvals", orgId, query] as const,
  approval: (orgId: string | null, id: string) => ["automation", "approval", orgId, id] as const,
  templates: (orgId: string | null, query?: unknown) => ["automation", "templates", orgId, query] as const,
  template: (orgId: string | null, key: string) => ["automation", "template", orgId, key] as const,
  audit: (orgId: string | null, query?: unknown) => ["automation", "audit", orgId, query] as const,
};

/** Broad invalidation used after any mutation that can move workflow/run state. */
function useInvalidateAutomation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: automationKeys.all, exact: false });
}

// ── Workflows ────────────────────────────────────────────────

export function useWorkflows(query: WorkflowListQuery = {}) {
  const { activeOrgId } = useAutomationScope();
  return useQuery({
    queryKey: automationKeys.workflows(activeOrgId, query),
    queryFn: () => workflowsApi.list(activeOrgId!, query),
    enabled: !!activeOrgId,
  });
}

export function useWorkflow(workflowId: string | undefined) {
  const { activeOrgId } = useAutomationScope();
  return useQuery({
    queryKey: automationKeys.workflow(activeOrgId, workflowId ?? ""),
    queryFn: () => workflowsApi.get(activeOrgId!, workflowId!),
    enabled: !!activeOrgId && !!workflowId,
  });
}

export function useWorkflowRuns(workflowId: string | undefined, query: PaginationQuery = {}) {
  const { activeOrgId } = useAutomationScope();
  return useQuery({
    queryKey: automationKeys.workflowRuns(activeOrgId, workflowId ?? "", query),
    queryFn: () => workflowsApi.runs(activeOrgId!, workflowId!, query),
    enabled: !!activeOrgId && !!workflowId,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useWorkflowMutations() {
  const { requireOrgId } = useAutomationScope();
  const invalidate = useInvalidateAutomation();

  return {
    createWorkflow: useMutation({
      mutationFn: (body: CreateWorkflowBody) => workflowsApi.create(requireOrgId(), body),
      onSuccess: invalidate,
    }),
    updateWorkflow: useMutation({
      mutationFn: ({ id, body }: { id: string; body: UpdateWorkflowBody }) =>
        workflowsApi.update(requireOrgId(), id, body),
      onSuccess: invalidate,
    }),
    deleteWorkflow: useMutation({
      mutationFn: (id: string) => workflowsApi.remove(requireOrgId(), id),
      onSuccess: invalidate,
    }),
    /** The list/detail on-off switch. Enable requires a published version. */
    toggleWorkflow: useMutation({
      mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
        enabled ? workflowsApi.enable(requireOrgId(), id) : workflowsApi.disable(requireOrgId(), id),
      onSuccess: invalidate,
    }),
    publishWorkflow: useMutation({
      mutationFn: ({ id, activateOnPublish }: { id: string; activateOnPublish?: boolean }) =>
        workflowsApi.publish(requireOrgId(), id, activateOnPublish ?? false),
      onSuccess: invalidate,
    }),
    testWorkflow: useMutation({
      mutationFn: ({ id, simulatedPayload, dryRun }: { id: string; simulatedPayload?: Json; dryRun?: boolean }) =>
        workflowsApi.test(requireOrgId(), id, { simulatedPayload, dryRun }),
      onSuccess: invalidate,
    }),
    runWorkflow: useMutation({
      mutationFn: ({ id, inputPayload, metadata }: { id: string; inputPayload?: Json; metadata?: Json }) =>
        workflowsApi.run(requireOrgId(), id, { inputPayload, metadata }),
      onSuccess: invalidate,
    }),
  };
}

// ── Runs ─────────────────────────────────────────────────────

export function useRuns(query: RunListQuery = {}) {
  const { activeOrgId } = useAutomationScope();
  return useQuery({
    queryKey: automationKeys.runs(activeOrgId, query),
    queryFn: () => runsApi.list(activeOrgId!, query),
    enabled: !!activeOrgId,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useRun(runId: string | undefined) {
  const { activeOrgId } = useAutomationScope();
  return useQuery({
    queryKey: automationKeys.run(activeOrgId, runId ?? ""),
    queryFn: () => runsApi.get(activeOrgId!, runId!),
    enabled: !!activeOrgId && !!runId,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useRunSteps(runId: string | undefined) {
  const { activeOrgId } = useAutomationScope();
  return useQuery({
    queryKey: automationKeys.runSteps(activeOrgId, runId ?? ""),
    queryFn: () => runsApi.steps(activeOrgId!, runId!),
    enabled: !!activeOrgId && !!runId,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useRunMutations() {
  const { requireOrgId } = useAutomationScope();
  const invalidate = useInvalidateAutomation();

  return {
    cancelRun: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
        runsApi.cancel(requireOrgId(), id, reason),
      onSuccess: invalidate,
    }),
    retryRun: useMutation({
      mutationFn: ({ id, fromStep }: { id: string; fromStep?: string }) =>
        runsApi.retry(requireOrgId(), id, fromStep),
      onSuccess: invalidate,
    }),
  };
}

// ── Approvals ────────────────────────────────────────────────

export function useApprovals(query: ApprovalListQuery = {}) {
  const { activeOrgId } = useAutomationScope();
  return useQuery({
    queryKey: automationKeys.approvals(activeOrgId, query),
    queryFn: () => approvalsApi.list(activeOrgId!, query),
    enabled: !!activeOrgId,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useApproval(approvalId: string | undefined) {
  const { activeOrgId } = useAutomationScope();
  return useQuery({
    queryKey: automationKeys.approval(activeOrgId, approvalId ?? ""),
    queryFn: () => approvalsApi.get(activeOrgId!, approvalId!),
    enabled: !!activeOrgId && !!approvalId,
  });
}

export function useApprovalMutations() {
  const { requireOrgId } = useAutomationScope();
  const invalidate = useInvalidateAutomation();

  return {
    approve: useMutation({
      mutationFn: ({ id, reason, decisionPayload }: { id: string; reason?: string; decisionPayload?: Json }) =>
        approvalsApi.approve(requireOrgId(), id, { reason, decisionPayload }),
      onSuccess: invalidate,
    }),
    reject: useMutation({
      mutationFn: ({ id, reason, decisionPayload }: { id: string; reason: string; decisionPayload?: Json }) =>
        approvalsApi.reject(requireOrgId(), id, { reason, decisionPayload }),
      onSuccess: invalidate,
    }),
  };
}

// ── Templates ────────────────────────────────────────────────

export function useAutomationTemplates(query: PaginationQuery = {}) {
  const { activeOrgId } = useAutomationScope();
  return useQuery({
    queryKey: automationKeys.templates(activeOrgId, query),
    queryFn: () => templatesApi.list(activeOrgId!, query),
    enabled: !!activeOrgId,
  });
}

export function useAutomationTemplate(templateKey: string | undefined) {
  const { activeOrgId } = useAutomationScope();
  return useQuery({
    queryKey: automationKeys.template(activeOrgId, templateKey ?? ""),
    queryFn: () => templatesApi.get(activeOrgId!, templateKey!),
    enabled: !!activeOrgId && !!templateKey,
  });
}

export function useTemplateMutations() {
  const { requireOrgId } = useAutomationScope();
  const invalidate = useInvalidateAutomation();

  return {
    createFromTemplate: useMutation({
      mutationFn: ({ templateKey, body }: { templateKey: string; body: CreateFromTemplateBody }) =>
        templatesApi.createWorkflow(requireOrgId(), templateKey, body),
      onSuccess: invalidate,
    }),
  };
}

// ── Audit ────────────────────────────────────────────────────

export function useAutomationAudit(query: AuditListQuery = {}) {
  const { activeOrgId } = useAutomationScope();
  return useQuery({
    queryKey: automationKeys.audit(activeOrgId, query),
    queryFn: () => automationAuditApi.list(activeOrgId!, query),
    enabled: !!activeOrgId,
  });
}

// ── Event inbox ──────────────────────────────────────────────

export function useIngestAutomationEvent() {
  const { requireOrgId } = useAutomationScope();
  const invalidate = useInvalidateAutomation();

  return useMutation({
    mutationFn: (body: IngestEventBody) => automationEventsApi.ingest(requireOrgId(), body),
    onSuccess: invalidate,
  });
}
