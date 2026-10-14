import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api-client/axios";
import { useOrgStore } from "@/modules/organizations/store/org.store";

/** Mirrors `DeadLetterDto` in pulse/src/modules/projects/alerts/deliveries/delivery-log.service.ts. */
export interface DeadLetter {
  id: string;
  /** Epoch milliseconds. */
  timestamp: number;
  /** Connector name, or the notification type when the connector is gone. */
  routeName: string;
  /** Connector provider, e.g. "slack" or "webhook". */
  target: string;
  reason: string;
  /** Pre-formatted by the API, e.g. "2.4kb". */
  payloadSize: string;
}

export const dlqKeys = {
  all: ["dead-letter-queue"] as const,
  lists: (projectId: string) => [...dlqKeys.all, "list", projectId] as const,
};

export const useDeadLetterQueue = (projectId: string) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...dlqKeys.lists(projectId), activeOrgId],
    // Failures surface as errors. The queue never falls back to sample rows,
    // which would read as real failed notifications.
    queryFn: async (): Promise<DeadLetter[]> => {
      const { data } = await apiClient.get(`/organizations/${activeOrgId}/projects/${projectId}/dead-letters`);
      return (data.data ?? []) as DeadLetter[];
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
