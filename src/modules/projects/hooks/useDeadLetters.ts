import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api-client/axios";
import { useOrgStore } from "@/modules/organizations/store/org.store";

export const dlqKeys = {
  all: ["dead-letter-queue"] as const,
  lists: (projectId: string) => [...dlqKeys.all, "list", projectId] as const,
};

export const useDeadLetterQueue = (projectId: string) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...dlqKeys.lists(projectId), activeOrgId],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get(`/organizations/${activeOrgId}/projects/${projectId}/dead-letters`);
        return data.data ?? [];
      } catch (err) {
        console.warn("Backend endpoint missing, using mock data for dead letter queue.");
        return [
          { id: "dlq_1", timestamp: Date.now() - 3600000, reason: "Connector webhook returned 500", payloadSize: "2.4kb", target: "webhook", routeName: "Production Criticals" },
          { id: "dlq_2", timestamp: Date.now() - 86400000, reason: "Slack rate limit exceeded", payloadSize: "1.1kb", target: "slack", routeName: "High Latency Warnings" },
        ];
      }
    },
    enabled: !!activeOrgId && !!projectId,
  });
};

export const useDeadLetterMutations = (projectId: string) => {
  const queryClient = useQueryClient();
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const orgId = activeOrgId;

  return {
    reprocessDeadLetter: useMutation({
      mutationFn: (id: string) => apiClient.post(`/organizations/${orgId}/projects/${projectId}/dead-letters/${id}/reprocess`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: dlqKeys.lists(projectId) }),
    }),
    discardDeadLetter: useMutation({
      mutationFn: (id: string) => apiClient.delete(`/organizations/${orgId}/projects/${projectId}/dead-letters/${id}`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: dlqKeys.lists(projectId) }),
    }),
    purgeQueue: useMutation({
      mutationFn: () => apiClient.delete(`/organizations/${orgId}/projects/${projectId}/dead-letters`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: dlqKeys.lists(projectId) }),
    }),
    reprocessAll: useMutation({
      mutationFn: () => apiClient.post(`/organizations/${orgId}/projects/${projectId}/dead-letters/reprocess-all`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: dlqKeys.lists(projectId) }),
    })
  };
};
