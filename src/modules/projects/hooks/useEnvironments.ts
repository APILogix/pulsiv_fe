import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { environmentsApi } from "../api/environments.api";
import type { EnvironmentBody } from "../api/types";
import { projectKeys, useProjectScope } from "./useProjectScope";

export function useEnvironments(projectId: string) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.environments(activeOrgId, projectId),
    queryFn: () => environmentsApi.list(activeOrgId!, projectId),
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
      mutationFn: (payload: EnvironmentBody & { name: string }) =>
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
  };
}
