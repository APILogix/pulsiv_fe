import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api-client/axios";
import { useOrgStore } from "@/modules/organizations/store/org.store";

/** Mirrors `AlertDeliveryDto` in pulse/src/modules/projects/alerts/deliveries/delivery-log.service.ts. */
export interface AlertDelivery {
  id: string;
  /** Epoch milliseconds. */
  timestamp: number;
  /** Connector name, or the notification type when the connector is gone. */
  routeName: string;
  /** Connector provider, e.g. "slack" or "webhook". */
  connectorType: string;
  status: string;
  severity: string;
  attempts: number;
  /** Delivery latency in milliseconds. */
  latency: number | null;
}

export interface AlertDeliveryFilters {
  status?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}

export const alertDeliveryKeys = {
  all: ["alert-deliveries"] as const,
  lists: (projectId: string) => [...alertDeliveryKeys.all, "list", projectId] as const,
};

export const useAlertDeliveries = (projectId: string, filters?: AlertDeliveryFilters) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...alertDeliveryKeys.lists(projectId), activeOrgId, filters],
    // Failures surface as errors. The list never falls back to sample rows,
    // which would read as real delivery history.
    queryFn: async (): Promise<AlertDelivery[]> => {
      const { data } = await apiClient.get(`/organizations/${activeOrgId}/projects/${projectId}/alert-deliveries`, {
        params: filters,
      });
      return (data.data ?? []) as AlertDelivery[];
    },
    enabled: !!activeOrgId && !!projectId,
  });
};
