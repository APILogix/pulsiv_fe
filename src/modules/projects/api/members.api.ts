/**
 * Project membership API — direct member add, role changes, removal, and
 * ownership transfer.
 *
 * Backend: `pulse/src/modules/projects/members` —
 * `/organizations/:orgId/projects/:projectId/members`. Members are added
 * directly from the organization roster; there is no project invitation flow
 * and no project-local custom roles.
 */
import { apiClient } from "@/infrastructure/api-client/axios";
import { projectPath } from "./projects.api";
import type {
  Paged,
  ProjectMember,
  ProjectMemberRole,
  ProjectMemberStatus,
} from "./types";

export const membersApi = {
  list: async (
    orgId: string,
    projectId: string,
    query: {
      status?: ProjectMemberStatus;
      role?: ProjectMemberRole;
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
    payload: { userId: string; role: ProjectMemberRole },
  ): Promise<ProjectMember> => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/members`, payload);
    return data.data;
  },

  updateMemberRole: async (
    orgId: string,
    projectId: string,
    memberId: string,
    role: ProjectMemberRole,
  ): Promise<ProjectMember> => {
    const { data } = await apiClient.patch(`${projectPath(orgId, projectId)}/members/${memberId}`, { role });
    return data.data;
  },

  remove: async (orgId: string, projectId: string, memberId: string): Promise<void> => {
    await apiClient.delete(`${projectPath(orgId, projectId)}/members/${memberId}`);
  },

  transferOwnership: async (
    orgId: string,
    projectId: string,
    newOwnerUserId: string,
  ): Promise<{ fromMember: ProjectMember; toMember: ProjectMember }> => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/transfer-ownership`, {
      newOwnerUserId,
    });
    return data.data;
  },
};
