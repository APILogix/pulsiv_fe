/**
 * Project core API — CRUD, lifecycle, overview, stats, usage counters,
 * and settings.
 *
 * Backend: `pulse/src/modules/projects/{core,settings}` mounted at
 * `/organizations/:orgId/projects`.
 */
import { apiClient } from "@/infrastructure/api-client/axios";
import type {
  CreateProjectBody,
  ListProjectsQuery,
  Paged,
  Project,
  ProjectListItem,
  ProjectOverview,
  ProjectSettings,
  ProjectUsageCounter,
  ProjectWithStats,
  UpdateProjectBody,
  UpdateProjectSettingsBody,
} from "./types";

export const projectBase = (orgId: string) => `/organizations/${orgId}/projects`;
export const projectPath = (orgId: string, projectId: string) => `${projectBase(orgId)}/${projectId}`;

/** Mutating project routes require an Idempotency-Key header. */
export function idempotencyHeaders() {
  return { headers: { "Idempotency-Key": crypto.randomUUID() } };
}

export const projectsApi = {
  list: async (orgId: string, query: ListProjectsQuery = {}): Promise<Paged<ProjectListItem>> => {
    const { data } = await apiClient.get(projectBase(orgId), { params: query });
    return {
      data: data.data ?? [],
      total: data.meta?.total ?? 0,
      limit: data.meta?.limit ?? 20,
      offset: data.meta?.offset ?? 0,
    };
  },

  get: async (orgId: string, projectId: string): Promise<Project> => {
    const { data } = await apiClient.get(projectPath(orgId, projectId));
    return data.data;
  },

  getByPublicId: async (orgId: string, publicId: string): Promise<Project> => {
    const { data } = await apiClient.get(`${projectBase(orgId)}/by-public-id/${publicId}`);
    return data.data;
  },

  create: async (orgId: string, payload: CreateProjectBody): Promise<Project> => {
    const { data } = await apiClient.post(projectBase(orgId), payload, idempotencyHeaders());
    return data.data.project;
  },

  update: async (orgId: string, projectId: string, payload: UpdateProjectBody): Promise<Project> => {
    const { data } = await apiClient.patch(projectPath(orgId, projectId), payload, idempotencyHeaders());
    return data.data;
  },

  remove: async (orgId: string, projectId: string): Promise<void> => {
    await apiClient.delete(projectPath(orgId, projectId), idempotencyHeaders());
  },

  // ── Lifecycle transitions ──────────────────────────────────
  lifecycle: async (
    orgId: string,
    projectId: string,
    action: "archive" | "unarchive" | "pause" | "resume" | "restore",
  ): Promise<Project> => {
    const { data } = await apiClient.post(
      `${projectPath(orgId, projectId)}/${action}`,
      undefined,
      idempotencyHeaders(),
    );
    return data.data;
  },

  // ── Read models ────────────────────────────────────────────
  getOverview: async (orgId: string, projectId: string): Promise<ProjectOverview> => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/overview`);
    return data.data;
  },

  getStats: async (orgId: string, projectId: string): Promise<ProjectWithStats> => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/stats`);
    return data.data;
  },

  getUsageCounters: async (orgId: string, projectId: string): Promise<ProjectUsageCounter[]> => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/usage`);
    return data.data ?? [];
  },

  // ── Settings ───────────────────────────────────────────────
  getSettings: async (orgId: string, projectId: string): Promise<ProjectSettings> => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/settings`);
    return data.data;
  },

  updateSettings: async (
    orgId: string,
    projectId: string,
    payload: UpdateProjectSettingsBody,
  ): Promise<ProjectSettings> => {
    const { data } = await apiClient.patch(`${projectPath(orgId, projectId)}/settings`, payload);
    return data.data;
  },
};
