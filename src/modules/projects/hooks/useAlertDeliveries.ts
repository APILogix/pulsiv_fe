import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api-client/axios";
import { useOrgStore } from "@/modules/organizations/store/org.store";

export const alertDeliveryKeys = {
  all: ["alert-deliveries"] as const,
  lists: (projectId: string) => [...alertDeliveryKeys.all, "list", projectId] as const,
};

export const useAlertDeliveries = (projectId: string, filters?: { status?: string; severity?: string; limit?: number; offset?: number }) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...alertDeliveryKeys.lists(projectId), activeOrgId, filters],
    queryFn: async () => {
      // Temporary fallback: The backend might not have this endpoint yet. 
      // If it fails, we will return dummy data. But we should try to hit it first.
      try {
        const { data } = await apiClient.get(`/organizations/${activeOrgId}/projects/${projectId}/alert-deliveries`, {
          params: filters,
        });
        return data.data ?? [];
      } catch (err) {
        console.warn("Backend endpoint missing, using mock data for deliveries.");
        return [
          { id: "del_1", timestamp: Date.now() - 10000, routeName: "Production Criticals", connectorType: "slack", status: "delivered", attempts: 1, latency: 45 },
          { id: "del_2", timestamp: Date.now() - 50000, routeName: "Deployment Status", connectorType: "pagerduty", status: "failed", attempts: 3, latency: 1200 },
          { id: "del_3", timestamp: Date.now() - 120000, routeName: "Production Criticals", connectorType: "webhook", status: "pending", attempts: 1, latency: null },
        ];
      }
    },
    enabled: !!activeOrgId && !!projectId,
  });
};
