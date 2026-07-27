/**
 * Project membership API — members, invitations, custom roles, and ownership
 * transfer.
 *
 * Backend: `pulse/src/modules/projects/members` —
 * `/organizations/:orgId/projects/:projectId/{members,invitations,roles}`.
 */
import { apiClient } from "@/infrastructure/api-client/axios";
import { projectPath } from "./projects.api";
import type {
  InvitationStatus,
  Paged,
  ProjectInvitation,
  ProjectMember,
  ProjectMemberRole,
  ProjectMemberStatus,
  ProjectRole,
} from "./types";

export const membersApi = {
  // ── Members ────────────────────────────────────────────────
  list: async (
    orgId: string,
    projectId: string,
    query: { status?: ProjectMemberStatus; role?: ProjectMemberRole; search?: string; limit?: number; offset?: number } = {},
  ): Promise<Paged<ProjectMember>> => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/members`, { params: query });
    return {
      data: data.data ?? [],
      total: data.meta?.total ?? 0,
      limit: data.meta?.limit ?? 20,
      offset: data.meta?.offset ?? 0,
    };
  },

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
  ): Promise<unknown> => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/transfer-ownership`, {
      newOwnerUserId,
    });
    return data.data;
  },

  // ── Invitations ────────────────────────────────────────────
  listInvitations: async (
    orgId: string,
    projectId: string,
    query: { status?: InvitationStatus; email?: string; limit?: number; offset?: number } = {},
  ): Promise<Paged<ProjectInvitation>> => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/invitations`, { params: query });
    return {
      data: data.data ?? [],
      total: data.meta?.total ?? 0,
      limit: data.meta?.limit ?? 20,
      offset: data.meta?.offset ?? 0,
    };
  },

  /** The one-time invitation token is returned only on creation. */
  invite: async (
    orgId: string,
    projectId: string,
    payload: { email: string; role: ProjectMemberRole },
  ): Promise<{ invitation: ProjectInvitation; token: string }> => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/invitations`, payload);
    return data.data;
  },

  acceptInvitation: async (orgId: string, projectId: string, token: string): Promise<ProjectMember> => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/invitations/accept`, { token });
    return data.data;
  },

  declineInvitation: async (
    orgId: string,
    projectId: string,
    invitationId: string,
  ): Promise<ProjectInvitation> => {
    const { data } = await apiClient.post(
      `${projectPath(orgId, projectId)}/invitations/${invitationId}/decline`,
    );
    return data.data;
  },

  cancelInvitation: async (
    orgId: string,
    projectId: string,
    invitationId: string,
  ): Promise<ProjectInvitation> => {
    const { data } = await apiClient.delete(`${projectPath(orgId, projectId)}/invitations/${invitationId}`);
    return data.data;
  },

  // ── Custom roles ───────────────────────────────────────────
  listRoles: async (orgId: string, projectId: string): Promise<ProjectRole[]> => {
    const { data } = await apiClient.get(`${projectPath(orgId, projectId)}/roles`);
    return data.data ?? [];
  },

  createRole: async (
    orgId: string,
    projectId: string,
    payload: { name: string; slug: string; description?: string | null; permissions?: string[]; isDefault?: boolean },
  ): Promise<ProjectRole> => {
    const { data } = await apiClient.post(`${projectPath(orgId, projectId)}/roles`, payload);
    return data.data;
  },

  updateRole: async (
    orgId: string,
    projectId: string,
    roleId: string,
    payload: { name?: string; description?: string | null; permissions?: string[]; isDefault?: boolean },
  ): Promise<ProjectRole> => {
    const { data } = await apiClient.patch(`${projectPath(orgId, projectId)}/roles/${roleId}`, payload);
    return data.data;
  },

  deleteRole: async (orgId: string, projectId: string, roleId: string): Promise<void> => {
    await apiClient.delete(`${projectPath(orgId, projectId)}/roles/${roleId}`);
  },
};
