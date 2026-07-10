import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api-client/axios";
import { useOrgStore } from "@/modules/organizations/store/org.store";

export const connectorKeys = {
  all: ["connectors"] as const,
  lists: (orgId: string) => [...connectorKeys.all, "list", orgId] as const,
};

export const useConnectors = () => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: connectorKeys.lists(activeOrgId!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/organizations/${activeOrgId}/connectors`);
      return data.data ?? [];
    },
    enabled: !!activeOrgId,
  });
};

export const useConnectorMutations = () => {
  const queryClient = useQueryClient();
  const activeOrgId = useOrgStore((state) => state.activeOrgId);

  return {
    createConnector: useMutation({
      mutationFn: (payload: any) => apiClient.post(`/organizations/${activeOrgId}/connectors`, payload),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: connectorKeys.lists(activeOrgId!) }),
    }),
    updateConnector: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: any }) => apiClient.patch(`/organizations/${activeOrgId}/connectors/${id}`, payload),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: connectorKeys.lists(activeOrgId!) }),
    }),
    deleteConnector: useMutation({
      mutationFn: (id: string) => apiClient.delete(`/organizations/${activeOrgId}/connectors/${id}`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: connectorKeys.lists(activeOrgId!) }),
    }),
  };
};
