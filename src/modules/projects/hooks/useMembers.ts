import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { membersApi } from "../api/members.api";
import type {
  InvitationStatus,
  ProjectMemberRole,
  ProjectMemberStatus,
} from "../api/types";
import { projectKeys, useProjectScope } from "./useProjectScope";

export function useProjectMembers(
  projectId: string,
  query: { status?: ProjectMemberStatus; role?: ProjectMemberRole; search?: string } = {},
) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.members(activeOrgId, projectId, query),
    queryFn: () => membersApi.list(activeOrgId!, projectId, query),
    enabled: !!activeOrgId && !!projectId,
  });
}

export function useProjectInvitations(projectId: string, query: { status?: InvitationStatus } = {}) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.invitations(activeOrgId, projectId, query),
    queryFn: () => membersApi.listInvitations(activeOrgId!, projectId, query),
    enabled: !!activeOrgId && !!projectId,
  });
}

export function useProjectRoles(projectId: string) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.roles(activeOrgId, projectId),
    queryFn: () => membersApi.listRoles(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
  });
}

export function useMemberMutations(projectId: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, requireOrgId } = useProjectScope();

  const invalidateMembers = () =>
    queryClient.invalidateQueries({ queryKey: ["projects", "members"], exact: false });
  const invalidateInvitations = () =>
    queryClient.invalidateQueries({ queryKey: ["projects", "invitations"], exact: false });
  const invalidateRoles = () =>
    queryClient.invalidateQueries({ queryKey: projectKeys.roles(activeOrgId, projectId) });

  return {
    addMember: useMutation({
      mutationFn: (payload: { userId: string; role: ProjectMemberRole }) =>
        membersApi.add(requireOrgId(), projectId, payload),
      onSuccess: invalidateMembers,
    }),
    updateMemberRole: useMutation({
      mutationFn: ({ memberId, role }: { memberId: string; role: ProjectMemberRole }) =>
        membersApi.updateMemberRole(requireOrgId(), projectId, memberId, role),
      onSuccess: invalidateMembers,
    }),
    removeMember: useMutation({
      mutationFn: (memberId: string) => membersApi.remove(requireOrgId(), projectId, memberId),
      onSuccess: invalidateMembers,
    }),
    transferOwnership: useMutation({
      mutationFn: (newOwnerUserId: string) =>
        membersApi.transferOwnership(requireOrgId(), projectId, newOwnerUserId),
      onSuccess: invalidateMembers,
    }),

    inviteMember: useMutation({
      mutationFn: (payload: { email: string; role: ProjectMemberRole }) =>
        membersApi.invite(requireOrgId(), projectId, payload),
      onSuccess: invalidateInvitations,
    }),
    acceptInvitation: useMutation({
      mutationFn: (token: string) => membersApi.acceptInvitation(requireOrgId(), projectId, token),
      onSuccess: () => {
        invalidateInvitations();
        invalidateMembers();
      },
    }),
    declineInvitation: useMutation({
      mutationFn: (invitationId: string) =>
        membersApi.declineInvitation(requireOrgId(), projectId, invitationId),
      onSuccess: invalidateInvitations,
    }),
    cancelInvitation: useMutation({
      mutationFn: (invitationId: string) =>
        membersApi.cancelInvitation(requireOrgId(), projectId, invitationId),
      onSuccess: invalidateInvitations,
    }),

    createRole: useMutation({
      mutationFn: (payload: {
        name: string;
        slug: string;
        description?: string | null;
        permissions?: string[];
        isDefault?: boolean;
      }) => membersApi.createRole(requireOrgId(), projectId, payload),
      onSuccess: invalidateRoles,
    }),
    updateRole: useMutation({
      mutationFn: ({
        roleId,
        payload,
      }: {
        roleId: string;
        payload: { name?: string; description?: string | null; permissions?: string[]; isDefault?: boolean };
      }) => membersApi.updateRole(requireOrgId(), projectId, roleId, payload),
      onSuccess: invalidateRoles,
    }),
    deleteRole: useMutation({
      mutationFn: (roleId: string) => membersApi.deleteRole(requireOrgId(), projectId, roleId),
      onSuccess: invalidateRoles,
    }),
  };
}
