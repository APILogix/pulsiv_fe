/**
 * Project membership API — direct member add and removal.
 *
 * Backend: `pulse/src/modules/projects/members` —
 * `/organizations/:orgId/projects/:projectId/members`. Members are added
 * directly from the organization roster; permissions are governed by their
 * organization-level role.
 */
import { apiClient } from "@/infrastructure/api-client/axios";
import { projectPath } from "./projects.api";
import type {
  Paged,
  ProjectMember,
  ProjectMemberStatus,
} from "./types";

export const membersApi = {
  list: async (
    orgId: string,
    projectId: string,
    query: {
      status?: ProjectMemberStatus;
      search?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<Paged<ProjectMember>> => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/members`, { params: query });
    return {
      data: data.data ?? [],
      total: data.meta?.total ?? 0,
      limit: data.meta?.limit ?? query.limit ?? 20,
      offset: data.meta?.offset ?? query.offset ?? 0,
    };
  },

  /** Add an existing active organization member to the project. */
  add: async (
    orgId: string,
    projectId: string,
    payload: { userId: string },
  ): Promise<ProjectMember> => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/members`, payload);
    return data.data;
  },

  remove: async (orgId: string, projectId: string, memberId: string): Promise<void> => {
    await apiClient.delete(`${projectPath(orgId, projectId)}/members/${memberId}`);
  },
};
