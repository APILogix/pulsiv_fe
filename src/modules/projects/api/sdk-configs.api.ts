import { apiClient } from "@/infrastructure/api-client/axios";

export type SdkConfigView = {
  id: string;
  orgId: string;
  projectId: string;
  environmentId: string;
  environmentName: string;
  environmentSlug: string;
  publishedRevisionId: string;
  revision: number;
  revisionHash: string;
  configValue: Record<string, any>;
  schemaVersion: string | null;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type SdkConfigVersionView = {
  id: string;
  configId?: string;
  revision: number;
  revisionHash: string;
  environmentId: string;
  environmentName: string;
  environmentSlug: string;
  changeType?: string;
  changeSummary?: string | null;
  changeDiff?: Record<string, any> | null;
  configValue?: Record<string, any>;
  publishedAt: string;
};

export type SdkConfigDeploymentView = {
  id: string;
  configId?: string;
  version: number;
  rolloutPercentage: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

type ApiListEnvelope<T> = {
  data?: T[] | { data?: T[] };
};

function unwrapList<T>(payload: ApiListEnvelope<T>): T[] {
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
}

function unwrapData<T>(payload: { data?: T }): T {
  return payload.data as T;
}

export const sdkConfigsApi = {
  // --- Org-Scoped SDK Configs ---
  listOrgConfigs: async (orgId: string): Promise<SdkConfigView[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/sdk-configs`);
    return unwrapList<SdkConfigView>(data);
  },
  resolveOrgConfig: async (orgId: string, params: { environmentId: string; platform?: string }) => {
    const { data } = await apiClient.get(`/organizations/${orgId}/sdk-configs/resolve`, { params });
    return unwrapData(data);
  },
  getOrgConfig: async (orgId: string, configId: string): Promise<SdkConfigView> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/sdk-configs/${configId}`);
    return data.data;
  },
  updateOrgConfig: async (orgId: string, configId: string, payload: any): Promise<SdkConfigView> => {
    const { data } = await apiClient.patch(`/organizations/${orgId}/sdk-configs/${configId}`, payload);
    return data.data;
  },
  rollbackOrgConfig: async (orgId: string, configId: string, toRevision: number, reason: string): Promise<SdkConfigView> => {
    const { data } = await apiClient.post(`/organizations/${orgId}/sdk-configs/${configId}/rollback`, { toRevision, reason });
    return data.data;
  },
  listOrgConfigVersions: async (orgId: string, configId: string): Promise<SdkConfigVersionView[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/sdk-configs/${configId}/versions`);
    return unwrapList<SdkConfigVersionView>(data);
  },
  getOrgConfigVersion: async (orgId: string, configId: string, version: number) => {
    const { data } = await apiClient.get(`/organizations/${orgId}/sdk-configs/${configId}/versions/${version}`);
    return data.data;
  },
  listOrgConfigDeployments: async (orgId: string, configId: string): Promise<SdkConfigDeploymentView[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/sdk-configs/${configId}/deployments`);
    return unwrapList<SdkConfigDeploymentView>(data);
  },

  // --- Project-Scoped SDK Configs ---
  listProjectConfigs: async (orgId: string, projectId: string, params?: { environmentId?: string }): Promise<SdkConfigView[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/projects/${projectId}/sdk-configs`, { params });
    return unwrapList<SdkConfigView>(data);
  },
  resolveProjectConfig: async (orgId: string, projectId: string, params: { environmentId: string; platform?: string }) => {
    const { data } = await apiClient.get(`/organizations/${orgId}/projects/${projectId}/sdk-configs/resolve`, { params });
    return unwrapData(data);
  },
  getProjectConfig: async (orgId: string, projectId: string, configId: string): Promise<SdkConfigView> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/projects/${projectId}/sdk-configs/${configId}`);
    return data.data;
  },
  updateProjectConfig: async (orgId: string, projectId: string, configId: string, payload: any): Promise<SdkConfigView> => {
    const { data } = await apiClient.patch(`/organizations/${orgId}/projects/${projectId}/sdk-configs/${configId}`, payload);
    return data.data;
  }
};
