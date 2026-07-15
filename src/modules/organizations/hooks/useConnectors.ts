import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api-client/axios";
import { useOrgStore } from "@/modules/organizations/store/org.store";

export const connectorKeys = {
  all: ["connectors"] as const,
  lists: (orgId: string) => [...connectorKeys.all, "list", orgId] as const,
  types: (orgId: string) => [...connectorKeys.all, "types", orgId] as const,
  detail: (orgId: string, id: string) => [...connectorKeys.all, "detail", orgId, id] as const,
  healthHistory: (orgId: string, id: string) => [...connectorKeys.all, "health-history", orgId, id] as const,
  testRuns: (orgId: string, id: string) => [...connectorKeys.all, "test-runs", orgId, id] as const,
  deliveries: (orgId: string, id?: string) => [...connectorKeys.all, "deliveries", orgId, id ?? "all"] as const,
  deliveryAttempts: (orgId: string, id: string, deliveryId: string) => [...connectorKeys.all, "delivery-attempts", orgId, id, deliveryId] as const,
  audit: (orgId: string, id?: string) => [...connectorKeys.all, "audit", orgId, id ?? "all"] as const,
  routes: (orgId: string, id: string) => [...connectorKeys.all, "routes", orgId, id] as const,
};

// --- Queries ---

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

export const useConnectorTypes = () => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: connectorKeys.types(activeOrgId!),
    queryFn: async () => {
      const { data } = await apiClient.get(`/organizations/${activeOrgId}/connectors/types`);
      return data.data ?? [];
    },
    enabled: !!activeOrgId,
  });
};

export const useConnector = (id: string, withDetails = false) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: connectorKeys.detail(activeOrgId!, id),
    queryFn: async () => {
      const path = withDetails 
        ? `/organizations/${activeOrgId}/connectors/${id}/details`
        : `/organizations/${activeOrgId}/connectors/${id}`;
      const { data } = await apiClient.get(path);
      return data.data;
    },
    enabled: !!activeOrgId && !!id,
  });
};

export const useConnectorHealthHistory = (id: string, params?: Record<string, any>) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...connectorKeys.healthHistory(activeOrgId!, id), params],
    queryFn: async () => {
      const { data } = await apiClient.get(`/organizations/${activeOrgId}/connectors/${id}/health-history`, { params });
      return data;
    },
    enabled: !!activeOrgId && !!id,
  });
};

export const useConnectorTestRuns = (id: string, params?: Record<string, any>) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...connectorKeys.testRuns(activeOrgId!, id), params],
    queryFn: async () => {
      const { data } = await apiClient.get(`/organizations/${activeOrgId}/connectors/${id}/test-runs`, { params });
      return data;
    },
    enabled: !!activeOrgId && !!id,
  });
};

export const useConnectorDeliveries = (id: string, params?: Record<string, any>) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...connectorKeys.deliveries(activeOrgId!, id), params],
    queryFn: async () => {
      const { data } = await apiClient.get(`/organizations/${activeOrgId}/connectors/${id}/deliveries`, { params });
      return data;
    },
    enabled: !!activeOrgId && !!id,
  });
};

export const useDelivery = (deliveryId: string) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...connectorKeys.deliveries(activeOrgId!), "detail", deliveryId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/organizations/${activeOrgId}/connectors/deliveries/${deliveryId}`);
      return data.data;
    },
    enabled: !!activeOrgId && !!deliveryId,
  });
};

export const useDeliveryAttempts = (id: string, deliveryId: string, params?: Record<string, any>) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...connectorKeys.deliveryAttempts(activeOrgId!, id, deliveryId), params],
    queryFn: async () => {
      const { data } = await apiClient.get(`/organizations/${activeOrgId}/connectors/${id}/deliveries/${deliveryId}/attempts`, { params });
      return data;
    },
    enabled: !!activeOrgId && !!id && !!deliveryId,
  });
};

export const useConnectorAudit = (id?: string, params?: Record<string, any>) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...connectorKeys.audit(activeOrgId!, id), params],
    queryFn: async () => {
      const path = id 
        ? `/organizations/${activeOrgId}/connectors/${id}/audit` 
        : `/organizations/${activeOrgId}/connectors/audit`;
      const { data } = await apiClient.get(path, { params });
      return data;
    },
    enabled: !!activeOrgId,
  });
};

export const useConnectorRoutes = (id: string, params?: Record<string, any>) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...connectorKeys.routes(activeOrgId!, id), params],
    queryFn: async () => {
      const { data } = await apiClient.get(`/organizations/${activeOrgId}/connectors/${id}/routes`, { params });
      return data;
    },
    enabled: !!activeOrgId && !!id,
  });
};

// --- Mutations ---

export const useConnectorMutations = () => {
  const queryClient = useQueryClient();
  const activeOrgId = useOrgStore((state) => state.activeOrgId);

  const invalidateLists = () => {
    queryClient.invalidateQueries({ queryKey: connectorKeys.lists(activeOrgId!) });
  };
  
  const invalidateDetail = (id: string) => {
    queryClient.invalidateQueries({ queryKey: connectorKeys.detail(activeOrgId!, id) });
    invalidateLists();
  };

  return {
    // CRUD
    createConnector: useMutation({
      mutationFn: (payload: any) => apiClient.post(`/organizations/${activeOrgId}/connectors`, payload),
      onSuccess: invalidateLists,
    }),
    updateConnector: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: any }) => apiClient.patch(`/organizations/${activeOrgId}/connectors/${id}`, payload),
      onSuccess: (_, { id }) => invalidateDetail(id),
    }),
    deleteConnector: useMutation({
      mutationFn: (id: string) => apiClient.delete(`/organizations/${activeOrgId}/connectors/${id}`),
      onSuccess: invalidateLists,
    }),
    
    // State & Security
    enableConnector: useMutation({
      mutationFn: (id: string) => apiClient.post(`/organizations/${activeOrgId}/connectors/${id}/enable`),
      onSuccess: (_, id) => invalidateDetail(id),
    }),
    disableConnector: useMutation({
      mutationFn: (id: string) => apiClient.post(`/organizations/${activeOrgId}/connectors/${id}/disable`),
      onSuccess: (_, id) => invalidateDetail(id),
    }),
    rotateSecret: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: any }) => apiClient.post(`/organizations/${activeOrgId}/connectors/${id}/rotate-secret`, payload),
      onSuccess: (_, { id }) => invalidateDetail(id),
    }),

    // Testing
    testConnector: useMutation({
      mutationFn: (id: string) => apiClient.post(`/organizations/${activeOrgId}/connectors/${id}/test`),
      onSuccess: (_, id) => {
        queryClient.invalidateQueries({ queryKey: connectorKeys.testRuns(activeOrgId!, id) });
      },
    }),
    healthCheck: useMutation({
      mutationFn: (id: string) => apiClient.post(`/organizations/${activeOrgId}/connectors/${id}/health-check`),
      onSuccess: (_, id) => {
        queryClient.invalidateQueries({ queryKey: connectorKeys.healthHistory(activeOrgId!, id) });
      },
    }),
    sendTest: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: any }) => apiClient.post(`/organizations/${activeOrgId}/connectors/${id}/send`, payload),
    }),
    previewNotification: useMutation({
      mutationFn: (payload: any) => apiClient.post(`/organizations/${activeOrgId}/connectors/preview`, payload),
    }),
    validateConfiguration: useMutation({
      mutationFn: (payload: any) => apiClient.post(`/organizations/${activeOrgId}/connectors/validate-configuration`, payload),
    }),

    // Deliveries
    retryDelivery: useMutation({
      mutationFn: (deliveryId: string) => apiClient.post(`/organizations/${activeOrgId}/connectors/deliveries/${deliveryId}/retry`),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: connectorKeys.deliveries(activeOrgId!) });
      }
    }),

    // Routes
    createRoute: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: any }) => apiClient.post(`/organizations/${activeOrgId}/connectors/${id}/routes`, payload),
      onSuccess: (_, { id }) => queryClient.invalidateQueries({ queryKey: connectorKeys.routes(activeOrgId!, id) }),
    }),
    updateRoute: useMutation({
      mutationFn: ({ id, routeId, payload }: { id: string; routeId: string; payload: any }) => apiClient.patch(`/organizations/${activeOrgId}/connectors/${id}/routes/${routeId}`, payload),
      onSuccess: (_, { id }) => queryClient.invalidateQueries({ queryKey: connectorKeys.routes(activeOrgId!, id) }),
    }),
    deleteRoute: useMutation({
      mutationFn: ({ id, routeId }: { id: string; routeId: string }) => apiClient.delete(`/organizations/${activeOrgId}/connectors/${id}/routes/${routeId}`),
      onSuccess: (_, { id }) => queryClient.invalidateQueries({ queryKey: connectorKeys.routes(activeOrgId!, id) }),
    }),

    // OAuth
    startOAuth: useMutation({
      mutationFn: (id: string) => apiClient.post(`/organizations/${activeOrgId}/connectors/${id}/oauth/start`),
    }),
    startSlackOAuth: useMutation({
      mutationFn: () => apiClient.post(`/organizations/${activeOrgId}/connectors/slack/oauth/start`),
    }),
    callbackOAuth: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: any }) => apiClient.post(`/organizations/${activeOrgId}/connectors/${id}/oauth/callback`, payload),
      onSuccess: (_, { id }) => invalidateDetail(id),
    }),
    refreshOAuth: useMutation({
      mutationFn: (id: string) => apiClient.post(`/organizations/${activeOrgId}/connectors/${id}/oauth/refresh`),
      onSuccess: (_, id) => invalidateDetail(id),
    }),
    disconnectOAuth: useMutation({
      mutationFn: (id: string) => apiClient.post(`/organizations/${activeOrgId}/connectors/${id}/oauth/disconnect`),
      onSuccess: (_, id) => invalidateDetail(id),
    }),
  };
};

export const useSlackChannels = (id: string) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...connectorKeys.detail(activeOrgId!, id), "slack-channels"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/organizations/${activeOrgId}/connectors/${id}/slack/channels`);
      return data.data;
    },
    enabled: !!activeOrgId && !!id,
  });
};
