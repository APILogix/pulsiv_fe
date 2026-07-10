import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api-client/axios";
import { useOrgStore } from "@/modules/organizations/store/org.store";

const routeBase = (orgId: string, projectId: string) => `/organizations/${orgId}/projects/${projectId}/alert-routes`;

export const alertRouteKeys = {
  all: ["alert-routes"] as const,
  lists: (projectId: string) => [...alertRouteKeys.all, "list", projectId] as const,
  detail: (projectId: string, routeId: string) => [...alertRouteKeys.all, "detail", projectId, routeId] as const,
};

export const useAlertRoutes = (projectId: string) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...alertRouteKeys.lists(projectId), activeOrgId],
    queryFn: async () => {
      const { data } = await apiClient.get(routeBase(activeOrgId!, projectId));
      return data.data ?? [];
    },
    enabled: !!activeOrgId && !!projectId,
  });
};

export const useAlertRoute = (projectId: string, routeId?: string) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...alertRouteKeys.detail(projectId, routeId!), activeOrgId],
    queryFn: async () => {
      const { data } = await apiClient.get(`${routeBase(activeOrgId!, projectId)}/${routeId}`);
      return data.data;
    },
    enabled: !!activeOrgId && !!projectId && !!routeId && routeId !== "new",
  });
};

export const useAlertRouteMutations = (projectId: string) => {
  const queryClient = useQueryClient();
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const orgId = () => {
    if (!activeOrgId) throw new Error("No active organization selected");
    return activeOrgId;
  };

  return {
    createRoute: useMutation({
      mutationFn: (payload: any) => apiClient.post(routeBase(orgId(), projectId), payload),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: alertRouteKeys.lists(projectId) }),
    }),
    updateRoute: useMutation({
      mutationFn: ({ routeId, payload }: { routeId: string; payload: any }) => 
        apiClient.patch(`${routeBase(orgId(), projectId)}/${routeId}`, payload),
      onSuccess: (_, { routeId }) => {
        queryClient.invalidateQueries({ queryKey: alertRouteKeys.lists(projectId) });
        queryClient.invalidateQueries({ queryKey: alertRouteKeys.detail(projectId, routeId) });
      },
    }),
    deleteRoute: useMutation({
      mutationFn: (routeId: string) => apiClient.delete(`${routeBase(orgId(), projectId)}/${routeId}`),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: alertRouteKeys.lists(projectId) }),
    }),
  };
};
