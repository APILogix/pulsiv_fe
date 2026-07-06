import { apiClient } from "@/infrastructure/api-client/axios";

const projectBase = (orgId: string) => `/organizations/${orgId}/projects`;
const projectPath = (orgId: string, projectId: string) => `${projectBase(orgId)}/${projectId}`;

export type ProjectView = {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description: string | null;
  status: "active" | "paused" | "archived";
  environment: "development" | "staging" | "production";
  environments: string[];
  eventVolume24h: number;
  errorRate: number;
  healthScore: number;
  memberCount: number;
  apiKeysCount: number;
  activeApiKeysCount: number;
  createdAt: number;
  updatedAt: number;
  lastActivityAt: number;
};

export type ProjectEnvironmentView = {
  id: string;
  projectId: string;
  orgId: string;
  environment: string;
  name: string;
  slug: string;
  type: string;
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
  keyType: string;
  type: string;
  environment: string;
  name: string;
  isActive: boolean;
  status: string;
  lastUsedAt: number | null;
  usage24h: number;
  usageCount: number;
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
  description: project.description ?? "",
  environments: Array.isArray(project.environments) ? project.environments : [project.environment].filter(Boolean),
  eventVolume24h: Number(project.eventVolume24h ?? project.stats?.totalRequests ?? 0),
  errorRate: Number(project.errorRate ?? 0),
  healthScore: Number(project.healthScore ?? (project.status === "active" ? 100 : project.status === "paused" ? 70 : 0)),
  memberCount: Number(project.memberCount ?? 0),
  apiKeysCount: Number(project.apiKeysCount ?? project.stats?.apiKeysCount ?? 0),
  activeApiKeysCount: Number(project.activeApiKeysCount ?? project.stats?.activeKeysCount ?? 0),
  createdAt: toTime(project.createdAt),
  updatedAt: toTime(project.updatedAt),
  lastActivityAt: toTime(project.lastActivityAt ?? project.updatedAt ?? project.createdAt),
});

const normalizeEnvironment = (environment: any): ProjectEnvironmentView => ({
  ...environment,
  environment: environment.environment,
  name: environment.name ?? environment.environment,
  slug: environment.slug ?? environment.environment,
  type: environment.type ?? environment.environment,
  isActive: Boolean(environment.isActive ?? true),
  createdAt: toTime(environment.createdAt),
  updatedAt: toTime(environment.updatedAt),
});

const normalizeApiKey = (apiKey: any): ProjectApiKeyView => ({
  ...apiKey,
  keyPrefix: apiKey.keyPrefix ?? apiKey.prefix ?? "",
  prefix: apiKey.prefix ?? apiKey.keyPrefix ?? "",
  keyType: apiKey.keyType ?? apiKey.type ?? "standard",
  type: apiKey.type ?? apiKey.keyType ?? "standard",
  name: apiKey.name ?? "API key",
  isActive: Boolean(apiKey.isActive ?? apiKey.status === "active"),
  lastUsedAt: apiKey.lastUsedAt ? toTime(apiKey.lastUsedAt) : null,
  usage24h: Number(apiKey.usage24h ?? apiKey.usageCount ?? 0),
  usageCount: Number(apiKey.usageCount ?? apiKey.usage24h ?? 0),
  createdAt: toTime(apiKey.createdAt),
  updatedAt: toTime(apiKey.updatedAt),
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
  create: async (orgId: string, payload: { name: string; description?: string; environment?: string }): Promise<ProjectView> => {
    const { data } = await apiClient.post(projectBase(orgId), payload);
    return normalizeProject(data.data);
  },
  update: async (orgId: string, projectId: string, payload: Partial<{ name: string; description: string; environment: string; status: string }>): Promise<ProjectView> => {
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
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/environments`);
    return (data.data ?? []).map(normalizeEnvironment);
  },
  getEnvironment: async (orgId: string, projectId: string, env: string): Promise<ProjectEnvironmentView> => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/environments/${env}`);
    return normalizeEnvironment(data.data);
  },
  createEnvironment: async (orgId: string, projectId: string, payload: { environment: string; isActive?: boolean }): Promise<ProjectEnvironmentView> => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/environments`, payload);
    return normalizeEnvironment(data.data);
  },
  updateEnvironment: async (orgId: string, projectId: string, env: string, payload: Record<string, unknown>): Promise<ProjectEnvironmentView> => {
    const { data } = await apiClient.patch(`${projectPath(orgId, projectId)}/environments/${env}`, payload);
    return normalizeEnvironment(data.data);
  },
  deleteEnvironment: async (orgId: string, projectId: string, env: string) => {
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
  createApiKey: async (orgId: string, projectId: string, payload: { name?: string; keyType?: string; environment: string }) => {
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
    return normalizeApiKey(data.data);
  },
  regenerateApiKey: async (orgId: string, projectId: string, keyId: string) => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/api-keys/${keyId}/regenerate`);
    return normalizeApiKey(data.data);
  },
  enableApiKey: async (orgId: string, projectId: string, keyId: string) => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/api-keys/${keyId}/enable`);
    return normalizeApiKey(data.data);
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
};
