import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sdkConfigsApi } from "../api/sdk-configs.api";

export const sdkConfigQueryKeys = {
  all: ["sdkConfigs"] as const,
  orgList: (orgId: string) => [...sdkConfigQueryKeys.all, "org", orgId] as const,
  projectList: (orgId: string, projectId: string) => [...sdkConfigQueryKeys.all, "project", orgId, projectId] as const,
  detail: (orgId: string, configId: string, projectId?: string) => 
    projectId ? [...sdkConfigQueryKeys.projectList(orgId, projectId), configId] as const : [...sdkConfigQueryKeys.orgList(orgId), configId] as const,
  versions: (orgId: string, configId: string) => [...sdkConfigQueryKeys.detail(orgId, configId), "versions"] as const,
  deployments: (orgId: string, configId: string) => [...sdkConfigQueryKeys.detail(orgId, configId), "deployments"] as const,
};

export const useSdkConfigs = (orgId: string, projectId?: string, filters?: { environmentId?: string }) => {
  return useQuery({
    queryKey: [...(projectId ? sdkConfigQueryKeys.projectList(orgId, projectId) : sdkConfigQueryKeys.orgList(orgId)), filters],
    queryFn: () => projectId ? sdkConfigsApi.listProjectConfigs(orgId, projectId, filters) : sdkConfigsApi.listOrgConfigs(orgId),
    enabled: !!orgId,
  });
};

export const useSdkConfigVersions = (orgId: string, configId: string) => {
  return useQuery({
    queryKey: sdkConfigQueryKeys.versions(orgId, configId),
    queryFn: () => sdkConfigsApi.listOrgConfigVersions(orgId, configId),
    enabled: !!orgId && !!configId,
  });
};

export const useSdkConfigDeployments = (orgId: string, configId: string) => {
  return useQuery({
    queryKey: sdkConfigQueryKeys.deployments(orgId, configId),
    queryFn: () => sdkConfigsApi.listOrgConfigDeployments(orgId, configId),
    enabled: !!orgId && !!configId,
  });
};

export const useResolveSdkConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, projectId, environmentId, platform }: { orgId: string; projectId?: string; environmentId: string; platform?: string }) =>
      projectId ? sdkConfigsApi.resolveProjectConfig(orgId, projectId, { environmentId, platform }) : sdkConfigsApi.resolveOrgConfig(orgId, { environmentId, platform }),
    onSuccess: (_data, { orgId, projectId }) => {
      queryClient.invalidateQueries({
        queryKey: projectId ? sdkConfigQueryKeys.projectList(orgId, projectId) : sdkConfigQueryKeys.orgList(orgId),
      });
    },
  });
};

export const useSdkConfigMutations = () => {
  const queryClient = useQueryClient();

  return {
    updateConfig: useMutation({
      mutationFn: ({ orgId, configId, projectId, data }: { orgId: string; configId: string; projectId?: string; data: any }) => 
        projectId ? sdkConfigsApi.updateProjectConfig(orgId, projectId, configId, data) : sdkConfigsApi.updateOrgConfig(orgId, configId, data),
      onSuccess: (_, { orgId, configId, projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
        queryClient.invalidateQueries({ queryKey: projectId ? sdkConfigQueryKeys.projectList(orgId, projectId) : sdkConfigQueryKeys.orgList(orgId) });
        queryClient.invalidateQueries({ queryKey: sdkConfigQueryKeys.detail(orgId, configId, projectId) });
      },
    }),
    rollbackConfig: useMutation({
      mutationFn: ({ orgId, configId, revision, reason }: { orgId: string; configId: string; revision: number; reason?: string }) =>
        sdkConfigsApi.rollbackOrgConfig(orgId, configId, revision, reason ?? `Rollback to revision ${revision}`),
      onSuccess: (_, { orgId, configId }) => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
        queryClient.invalidateQueries({ queryKey: sdkConfigQueryKeys.detail(orgId, configId) });
        queryClient.invalidateQueries({ queryKey: sdkConfigQueryKeys.versions(orgId, configId) });
      }
    }),
  };
};
