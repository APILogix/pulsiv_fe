import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { membersApi } from "../api/members.api";
import type { ProjectMemberRole, ProjectMemberStatus } from "../api/types";
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

export function useMemberMutations(projectId: string) {
  const queryClient = useQueryClient();
  const { requireOrgId } = useProjectScope();

  const invalidateMembers = () =>
    queryClient.invalidateQueries({ queryKey: ["projects", "members"], exact: false });

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
  };
}
