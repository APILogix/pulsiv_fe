import { apiClient } from "@/infrastructure/api-client/axios";

const projectBase = (orgId: string) => `/organizations/${orgId}/projects`;
const projectPath = (orgId: string, projectId: string) => `${projectBase(orgId)}/${projectId}`;

export type ProjectView = {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description: string | null;
  status: "active" | "suspended" | "archived";
  environment: "development" | "production";
  defaultEnvironment: "development" | "production";
  apiKeysCount: number;
  activeApiKeysCount: number;
  createdAt: number;
  updatedAt: number;
};

export type ProjectEnvironmentView = {
  id: string;
  projectId: string;
  orgId: string;
  environment: "development" | "production";
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ProjectApiKeyView = {
  id: string;
  projectId: string;
  orgId: string | null;
  keyPrefix: string;
  prefix: string;
  environment: "development" | "production";
  name: string | null;
  description: string | null;
  isActive: boolean;
  status: "active" | "revoked" | "expired";
  lastUsedAt: number | null;
  expiresAt: number | null;
  revokedAt: number | null;
  createdAt: number;
  updatedAt: number;
};


export type ProjectSettingsView = {
  retentionDays: number;
  maxEventsPerSecond: number;
  autoArchive: boolean;
  alertingEnabled: boolean;
  ingestionEnabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ProjectOverviewView = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "active" | "suspended" | "archived";
  settings: ProjectSettingsView;
  memberCount: number;
  apiKeysCount: number;
  activeApiKeysCount: number;
  usage: {
    totalEvents: number;
    totalBytes: number;
  };
  createdAt: number;
  updatedAt: number;
};

const toTime = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }
  if (value instanceof Date) return value.getTime();
  return Date.now();
};

const normalizeProject = (project: any): ProjectView => ({
  ...project,
  description: project.description ?? null,
  defaultEnvironment: project.defaultEnvironment ?? project.default_environment ?? project.environment ?? "production",
  environment: project.defaultEnvironment ?? project.default_environment ?? project.environment ?? "production",
  apiKeysCount: Number(project.apiKeysCount ?? project.stats?.apiKeysCount ?? 0),
  activeApiKeysCount: Number(project.activeApiKeysCount ?? project.stats?.activeKeysCount ?? 0),
  createdAt: toTime(project.createdAt),
  updatedAt: toTime(project.updatedAt),
});

const normalizeEnvironment = (environment: any): ProjectEnvironmentView => ({
  ...environment,
  environment: environment.environment,
  isActive: Boolean(environment.isActive ?? true),
  createdAt: toTime(environment.createdAt),
  updatedAt: toTime(environment.updatedAt),
});

const normalizeApiKey = (apiKey: any): ProjectApiKeyView => ({
  ...apiKey,
  keyPrefix: apiKey.keyPrefix ?? apiKey.prefix ?? "",
  prefix: apiKey.prefix ?? apiKey.keyPrefix ?? "",
  name: apiKey.name ?? null,
  description: apiKey.description ?? null,
  isActive: Boolean(apiKey.isActive ?? apiKey.status === "active"),
  lastUsedAt: apiKey.lastUsedAt ? toTime(apiKey.lastUsedAt) : null,
  expiresAt: apiKey.expiresAt ? toTime(apiKey.expiresAt) : null,
  revokedAt: apiKey.revokedAt ? toTime(apiKey.revokedAt) : null,
  createdAt: toTime(apiKey.createdAt),
  updatedAt: toTime(apiKey.updatedAt ?? apiKey.createdAt),
});

// --- Project API ---
export const projectsApi = {
  list: async (orgId: string): Promise<ProjectView[]> => {
    const { data } = await apiClient.get(projectBase(orgId));
    return (data.data ?? []).map(normalizeProject);
  },
  get: async (orgId: string, projectId: string): Promise<ProjectView> => {
    const { data } = await apiClient.get(projectPath(orgId, projectId));
    return normalizeProject(data.data);
  },
  create: async (
    orgId: string,
    payload: { name: string; description?: string; environment?: "development" | "production" },
  ): Promise<ProjectView> => {
    const { data } = await apiClient.post(projectBase(orgId), payload);
    return normalizeProject(data.data);
  },
  update: async (
    orgId: string,
    projectId: string,
    payload: Partial<{
      name: string;
      description: string | null;
      environment: "development" | "production";
      status: "active" | "suspended" | "archived";
    }>,
  ): Promise<ProjectView> => {
    const { data } = await apiClient.patch(projectPath(orgId, projectId), payload);
    return normalizeProject(data.data);
  },
  delete: async (orgId: string, projectId: string) => {
    const { data } = await apiClient.delete(projectPath(orgId, projectId));
    return data;
  },
  archive: async (orgId: string, projectId: string) => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/archive`);
    return normalizeProject(data.data);
  },
  unarchive: async (orgId: string, projectId: string) => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/unarchive`);
    return normalizeProject(data.data);
  },
  pause: async (orgId: string, projectId: string) => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/pause`);
    return normalizeProject(data.data);
  },
  resume: async (orgId: string, projectId: string) => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/resume`);
    return normalizeProject(data.data);
  },
  restore: async (orgId: string, projectId: string) => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/restore`);
    return normalizeProject(data.data);
  },

  // --- New Core Endpoints ---
  getSettings: async (orgId: string, projectId: string): Promise<ProjectSettingsView> => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/settings`);
    return data.data;
  },
  updateSettings: async (orgId: string, projectId: string, payload: Partial<ProjectSettingsView>): Promise<ProjectSettingsView> => {
    const { data } = await apiClient.patch(`${projectPath(orgId, projectId)}/settings`, payload);
    return data.data;
  },
  getOverview: async (orgId: string, projectId: string): Promise<ProjectOverviewView> => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/overview`);
    return data.data;
  },

  getStats: async (orgId: string, projectId: string) => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/stats`);
    return data.data;
  },
  getUsage: async (orgId: string, projectId: string) => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/usage`);
    return data.data;
  },
  getActivity: async (orgId: string, projectId: string) => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/activity`);
    return data.data;
  },

  // --- Environments API ---
  listEnvironments: async (orgId: string, projectId: string): Promise<ProjectEnvironmentView[]> => {
    const project = await projectsApi.get(orgId, projectId);
    return [{
      id: `${project.id}:${project.defaultEnvironment}`,
      projectId: project.id,
      orgId: project.orgId,
      environment: project.defaultEnvironment,
      isActive: project.status === "active",
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }];
  },
  getEnvironment: async (
    orgId: string,
    projectId: string,
    env: "development" | "production",
  ): Promise<ProjectEnvironmentView> => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/environments/${env}`);
    return normalizeEnvironment(data.data);
  },
  createEnvironment: async (
    orgId: string,
    projectId: string,
    payload: { environment: "development" | "production" },
  ): Promise<ProjectEnvironmentView> => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/environments`, payload);
    return normalizeEnvironment(data.data);
  },
  updateEnvironment: async (
    orgId: string,
    projectId: string,
    env: "development" | "production",
    payload: Record<string, unknown>,
  ): Promise<ProjectEnvironmentView> => {
    const { data } = await apiClient.patch(`${projectPath(orgId, projectId)}/environments/${env}`, payload);
    return normalizeEnvironment(data.data);
  },
  deleteEnvironment: async (orgId: string, projectId: string, env: "development" | "production") => {
    const { data } = await apiClient.delete(`${projectPath(orgId, projectId)}/environments/${env}`);
    return data;
  },

  // --- API Keys API ---
  listApiKeys: async (orgId: string, projectId: string): Promise<ProjectApiKeyView[]> => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/api-keys`);
    return (data.data ?? []).map(normalizeApiKey);
  },
  getApiKey: async (orgId: string, projectId: string, keyId: string): Promise<ProjectApiKeyView> => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/api-keys/${keyId}`);
    return normalizeApiKey(data.data);
  },
  createApiKey: async (
    orgId: string,
    projectId: string,
    payload: { name?: string; environment: "development" | "production" },
  ) => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/api-keys`, payload);
    return data.data?.apiKey ? { ...data.data, apiKey: normalizeApiKey(data.data.apiKey) } : normalizeApiKey(data.data);
  },
  updateApiKey: async (orgId: string, projectId: string, keyId: string, payload: Record<string, unknown>): Promise<ProjectApiKeyView> => {
    const { data } = await apiClient.patch(`${projectPath(orgId, projectId)}/api-keys/${keyId}`, payload);
    return normalizeApiKey(data.data);
  },
  revokeApiKey: async (orgId: string, projectId: string, keyId: string) => {
    const { data } = await apiClient.delete(`${projectPath(orgId, projectId)}/api-keys/${keyId}`);
    return data;
  },
  rotateApiKey: async (orgId: string, projectId: string, keyId: string) => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/api-keys/${keyId}/rotate`);
    return data.data?.apiKey ? { ...data.data, apiKey: normalizeApiKey(data.data.apiKey) } : normalizeApiKey(data.data);
  },
  regenerateApiKey: async (orgId: string, projectId: string, keyId: string) => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/api-keys/${keyId}/regenerate`);
    return data.data?.apiKey ? { ...data.data, apiKey: normalizeApiKey(data.data.apiKey) } : normalizeApiKey(data.data);
  },
  disableApiKey: async (orgId: string, projectId: string, keyId: string) => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/api-keys/${keyId}/disable`);
    return normalizeApiKey(data.data);
  },
  getApiKeyUsage: async (orgId: string, projectId: string, keyId: string) => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/api-keys/${keyId}/usage`);
    return data.data;
  },
  bulkRotateApiKeys: async (orgId: string, projectId: string, payload: { keyIds: string[] }) => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/api-keys/bulk-rotate`, payload);
    return data.data;
  },
  bulkRevokeApiKeys: async (orgId: string, projectId: string, payload: { keyIds: string[] }) => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/api-keys/bulk-revoke`, payload);
    return data.data;
  },

  // --- Members API ---
  listMembers: async (orgId: string, projectId: string) => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/members`);
    return data.data ?? [];
  },
  addMember: async (orgId: string, projectId: string, payload: { userId: string; role: string }) => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/members`, payload);
    return data.data;
  },
  removeMember: async (orgId: string, projectId: string, userId: string) => {
    const { data } = await apiClient.delete(`${projectPath(orgId, projectId)}/members/${userId}`);
    return data.data;
  },
};
