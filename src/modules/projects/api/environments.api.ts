/**
 * Project environment API.
 *
 * Backend: `pulse/src/modules/projects/environments` —
 * `/organizations/:orgId/projects/:projectId/environments`.
 */
import { apiClient } from "@/infrastructure/api-client/axios";
import { projectPath } from "./projects.api";
import type { EnvironmentBody, ProjectEnvironment } from "./types";

const envBase = (orgId: string, projectId: string) => `${projectPath(orgId, projectId)}/environments`;

export const environmentsApi = {
  list: async (orgId: string, projectId: string): Promise<ProjectEnvironment[]> => {
    const { data } = await apiClient.get(envBase(orgId, projectId));
    return data.data ?? [];
  },

  get: async (orgId: string, projectId: string, environmentId: string): Promise<ProjectEnvironment> => {
    const { data } = await apiClient.get(`${envBase(orgId, projectId)}/${environmentId}`);
    return data.data;
  },

  create: async (
    orgId: string,
    projectId: string,
    payload: EnvironmentBody & { name: string },
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
};
