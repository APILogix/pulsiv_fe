/**
 * Project environment API.
 *
 * Backend: `pulse/src/modules/projects/environments` —
 * `/organizations/:orgId/projects/:projectId/environments`.
 */
import { apiClient } from "@/infrastructure/api-client/axios";
import { projectPath } from "./projects.api";
import type { CreateEnvironmentBody, EnvironmentBody, ProjectEnvironment } from "./types";

const envBase = (orgId: string, projectId: string) => `${projectPath(orgId, projectId)}/environments`;

export const environmentsApi = {
  list: async (
    orgId: string,
    projectId: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<ProjectEnvironment[]> => {
    const { data } = await apiClient.get(envBase(orgId, projectId), { params: options });
    return data.data ?? [];
  },

  get: async (orgId: string, projectId: string, environmentId: string): Promise<ProjectEnvironment> => {
    const { data } = await apiClient.get(`${envBase(orgId, projectId)}/${environmentId}`);
    return data.data;
  },

  create: async (
    orgId: string,
    projectId: string,
    payload: CreateEnvironmentBody,
  ): Promise<ProjectEnvironment> => {
    const { data } = await apiClient.post(envBase(orgId, projectId), payload);
    return data.data;
  },

  update: async (
    orgId: string,
    projectId: string,
    environmentId: string,
    payload: EnvironmentBody,
  ): Promise<ProjectEnvironment> => {
    const { data } = await apiClient.patch(`${envBase(orgId, projectId)}/${environmentId}`, payload);
    return data.data;
  },

  remove: async (orgId: string, projectId: string, environmentId: string): Promise<void> => {
    await apiClient.delete(`${envBase(orgId, projectId)}/${environmentId}`);
  },

  restore: async (orgId: string, projectId: string, environmentId: string): Promise<ProjectEnvironment> => {
    const { data } = await apiClient.post(`${envBase(orgId, projectId)}/${environmentId}/restore`);
    return data.data;
  },

  setDefault: async (orgId: string, projectId: string, environmentId: string): Promise<ProjectEnvironment> => {
    const { data } = await apiClient.post(`${envBase(orgId, projectId)}/${environmentId}/set-default`);
    return data.data;
  },

  deactivate: async (orgId: string, projectId: string, environmentId: string): Promise<ProjectEnvironment> => {
    const { data } = await apiClient.post(`${envBase(orgId, projectId)}/${environmentId}/deactivate`);
    return data.data;
  },
};
