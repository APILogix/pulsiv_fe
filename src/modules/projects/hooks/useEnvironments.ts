import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { environmentsApi } from "../api/environments.api";
import type { CreateEnvironmentBody, EnvironmentBody } from "../api/types";
import { projectKeys, useProjectScope } from "./useProjectScope";

export function useEnvironments(projectId: string, options: { includeDeleted?: boolean } = {}) {
  const { activeOrgId } = useProjectScope();
  const includeDeleted = options.includeDeleted ?? false;
  return useQuery({
    queryKey: [...projectKeys.environments(activeOrgId, projectId), { includeDeleted }],
    queryFn: () => environmentsApi.list(activeOrgId!, projectId, { includeDeleted }),
    enabled: !!activeOrgId && !!projectId,
    staleTime: 60_000,
  });
}

export function useEnvironment(projectId: string, environmentId?: string) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.environment(activeOrgId, projectId, environmentId ?? ""),
    queryFn: () => environmentsApi.get(activeOrgId!, projectId, environmentId!),
    enabled: !!activeOrgId && !!projectId && !!environmentId,
  });
}

export function useEnvironmentMutations(projectId: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, requireOrgId } = useProjectScope();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: projectKeys.environments(activeOrgId, projectId) });
    queryClient.invalidateQueries({ queryKey: projectKeys.stats(activeOrgId, projectId) });
  };

  return {
    createEnvironment: useMutation({
      mutationFn: (payload: CreateEnvironmentBody) =>
        environmentsApi.create(requireOrgId(), projectId, payload),
      onSuccess: invalidate,
    }),
    updateEnvironment: useMutation({
      mutationFn: ({ environmentId, payload }: { environmentId: string; payload: EnvironmentBody }) =>
        environmentsApi.update(requireOrgId(), projectId, environmentId, payload),
      onSuccess: invalidate,
    }),
    deleteEnvironment: useMutation({
      mutationFn: (environmentId: string) =>
        environmentsApi.remove(requireOrgId(), projectId, environmentId),
      onSuccess: invalidate,
    }),
    restoreEnvironment: useMutation({
      mutationFn: (environmentId: string) =>
        environmentsApi.restore(requireOrgId(), projectId, environmentId),
      onSuccess: invalidate,
    }),
    setDefaultEnvironment: useMutation({
      mutationFn: (environmentId: string) =>
        environmentsApi.setDefault(requireOrgId(), projectId, environmentId),
      onSuccess: invalidate,
    }),
    deactivateEnvironment: useMutation({
      mutationFn: (environmentId: string) =>
        environmentsApi.deactivate(requireOrgId(), projectId, environmentId),
      onSuccess: invalidate,
    }),
  };
}
