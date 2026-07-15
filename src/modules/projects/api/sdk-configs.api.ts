import { apiClient } from "@/infrastructure/api-client/axios";

export type SdkConfigView = {
  id: string;
  orgId: string;
  projectId?: string | null;
  configKey: string;
  configType: string;
  version: number;
  versionHash?: string;
  configValue: Record<string, any>;
  schemaVersion?: string | null;
  environment: string;
  rolloutPercentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SdkConfigVersionView = {
  id: string;
  configId?: string;
  version: number;
  changeType?: string;
  changeSummary?: string | null;
  changeDiff?: Record<string, any> | null;
  configValue?: Record<string, any>;
  createdAt: string;
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

export const sdkConfigsApi = {
  // --- Org-Scoped SDK Configs ---
  listOrgConfigs: async (orgId: string): Promise<SdkConfigView[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/sdk-configs`);
    return data.data;
  },
  createOrgConfig: async (orgId: string, payload: any): Promise<SdkConfigView> => {
    const { data } = await apiClient.post(`/organizations/${orgId}/sdk-configs`, payload);
    return data.data;
  },
  resolveOrgConfig: async (orgId: string, params: { environment: string; platform?: string }) => {
    const { data } = await apiClient.get(`/organizations/${orgId}/sdk-configs/resolve`, { params });
    return data.data;
  },
  getOrgConfig: async (orgId: string, configId: string): Promise<SdkConfigView> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/sdk-configs/${configId}`);
    return data.data;
  },
  updateOrgConfig: async (orgId: string, configId: string, payload: any): Promise<SdkConfigView> => {
    const { data } = await apiClient.patch(`/organizations/${orgId}/sdk-configs/${configId}`, payload);
    return data.data;
  },
  rollbackOrgConfig: async (orgId: string, configId: string, toVersion: number, reason: string): Promise<SdkConfigView> => {
    const { data } = await apiClient.post(`/organizations/${orgId}/sdk-configs/${configId}/rollback`, { toVersion, reason });
    return data.data;
  },
  listOrgConfigVersions: async (orgId: string, configId: string): Promise<SdkConfigVersionView[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/sdk-configs/${configId}/versions`);
    return data.data;
  },
  getOrgConfigVersion: async (orgId: string, configId: string, version: number) => {
    const { data } = await apiClient.get(`/organizations/${orgId}/sdk-configs/${configId}/versions/${version}`);
    return data.data;
  },
  listOrgConfigDeployments: async (orgId: string, configId: string): Promise<SdkConfigDeploymentView[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/sdk-configs/${configId}/deployments`);
    return data.data;
  },
  ackOrgConfigVersion: async (orgId: string, configId: string, version: number) => {
    await apiClient.post(`/organizations/${orgId}/sdk-configs/${configId}/versions/${version}/ack`);
  },

  // --- Project-Scoped SDK Configs ---
  listProjectConfigs: async (orgId: string, projectId: string, params?: { environment?: string; configKey?: string; includeInactive?: boolean }): Promise<SdkConfigView[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/projects/${projectId}/sdk-configs`, { params });
    return data.data;
  },
  resolveProjectConfig: async (orgId: string, projectId: string, params: { environment: string; platform?: string }) => {
    const { data } = await apiClient.get(`/organizations/${orgId}/projects/${projectId}/sdk-configs/resolve`, { params });
    return data.data;
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
