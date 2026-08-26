import { useMutation, useQuery } from "@tanstack/react-query";
import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { aiApi } from "../api/ai.api";
import type {
  AiOrgSettings,
  ChatRequest,
  InvestigationInput,
  InvestigationKind,
  InvestigationResource,
  ReportKind,
} from "../types";

export const aiQueryKeys = {
  all: (orgId: string) => ["ai", orgId] as const,
  creditUsage: (orgId: string) => [...aiQueryKeys.all(orgId), "credit-usage"] as const,
  billingSummary: (orgId: string) => [...aiQueryKeys.all(orgId), "billing-summary"] as const,
  knowledge: (orgId: string, params?: unknown) =>
    [...aiQueryKeys.all(orgId), "knowledge", params ?? {}] as const,
  settings: (orgId: string) => [...aiQueryKeys.all(orgId), "settings"] as const,
  job: (orgId: string, jobId: string) => [...aiQueryKeys.all(orgId), "job", jobId] as const,
};

/** Resolves the active organization id once for every AI surface. */
export function useActiveOrgId() {
  const { activeOrgId } = useOrganizations();
  return activeOrgId ?? null;
}

export function useAiCreditUsage() {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: aiQueryKeys.creditUsage(orgId ?? "none"),
    queryFn: () => aiApi.getCreditUsage(orgId!),
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });
}

export function useInvestigation() {
  const orgId = useActiveOrgId();
  return useMutation({
    mutationFn: (
      vars:
        | { resource: InvestigationResource; publicId: string }
        | { kind?: InvestigationKind; input?: InvestigationInput },
    ) => {
      const resource = (
        'resource' in vars ? vars.resource : vars.kind ?? vars.input?.resource
      ) as InvestigationResource;
      const publicId = ('publicId' in vars ? vars.publicId : vars.input?.publicId) ?? '';
      return aiApi.investigate(orgId!, resource, publicId);
    },
  });
}

export function useAssistantChat() {
  const orgId = useActiveOrgId();
  return useMutation({
    mutationFn: (input: ChatRequest) => aiApi.chat(orgId!, input),
  });
}

export function useCreateReport() {
  const orgId = useActiveOrgId();
  return useMutation({
    mutationFn: (vars: { kind: ReportKind; query?: string }) =>
      aiApi.createReportJob(orgId!, vars.kind, vars.query),
  });
}

export function useReportJob(jobId: string | null, poll: boolean) {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: aiQueryKeys.job(orgId ?? "none", jobId ?? "none"),
    queryFn: () => aiApi.getJob(orgId!, jobId!),
    enabled: !!orgId && !!jobId,
    refetchInterval: (query) => {
      if (!poll) return false;
      const status = String(query.state.data?.status ?? "").toLowerCase();
      const done = ["succeeded", "completed", "failed", "cancelled"].includes(status);
      return done ? false : 4000;
    },
  });
}

export function useKnowledge(params: { type?: string; search?: string }) {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: aiQueryKeys.knowledge(orgId ?? "none", params),
    queryFn: () => aiApi.listKnowledge(orgId!, params),
    enabled: !!orgId,
    retry: false,
  });
}

export function useAiSettings() {
  const orgId = useActiveOrgId();
  return useQuery({
    queryKey: aiQueryKeys.settings(orgId ?? "none"),
    queryFn: () => aiApi.getSettings(orgId!),
    enabled: !!orgId,
    retry: false,
  });
}

export function useUpdateAiSettings() {
  const orgId = useActiveOrgId();
  return useMutation({
    mutationFn: (body: Partial<AiOrgSettings>) => aiApi.updateSettings(orgId!, body),
  });
}
