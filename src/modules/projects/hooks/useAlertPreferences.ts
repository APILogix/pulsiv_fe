import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api-client/axios";
import { useOrgStore } from "@/modules/organizations/store/org.store";

export const alertPreferenceKeys = {
  all: ["alert-preferences"] as const,
  lists: (projectId: string) => [...alertPreferenceKeys.all, projectId] as const,
};

export const useAlertPreferences = (projectId: string) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...alertPreferenceKeys.lists(projectId), activeOrgId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/organizations/${activeOrgId}/projects/${projectId}/members/me/alert-preferences`);
      return data.data ?? [];
    },
    enabled: !!activeOrgId && !!projectId,
  });
};

export const useUpdateAlertPreference = (projectId: string) => {
  const queryClient = useQueryClient();
  const activeOrgId = useOrgStore((state) => state.activeOrgId);

  return useMutation({
    mutationFn: (payload: { routeId: string; isSubscribed: boolean; minSeverity?: string; quietHours?: any }) =>
      apiClient.put(`/organizations/${activeOrgId}/projects/${projectId}/members/me/alert-preferences`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertPreferenceKeys.lists(projectId) });
    },
  });
};
