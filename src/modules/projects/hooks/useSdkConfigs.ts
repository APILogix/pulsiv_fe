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

export const useSdkConfigs = (orgId: string, projectId?: string, filters?: { environment?: string; configKey?: string; includeInactive?: boolean }) => {
  return useQuery({
    queryKey: [...(projectId ? sdkConfigQueryKeys.projectList(orgId, projectId) : sdkConfigQueryKeys.orgList(orgId)), filters],
    queryFn: () => projectId ? sdkConfigsApi.listProjectConfigs(orgId, projectId, filters) : sdkConfigsApi.listOrgConfigs(orgId),
    enabled: !!orgId,
  });
};

export const useSdkConfig = (orgId: string, configId: string, projectId?: string) => {
  return useQuery({
    queryKey: sdkConfigQueryKeys.detail(orgId, configId, projectId),
    queryFn: () => projectId ? sdkConfigsApi.getProjectConfig(orgId, projectId, configId) : sdkConfigsApi.getOrgConfig(orgId, configId),
    enabled: !!orgId && !!configId,
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
  return useMutation({
    mutationFn: ({ orgId, projectId, environment, platform }: { orgId: string; projectId?: string; environment: string; platform?: string }) => 
      projectId ? sdkConfigsApi.resolveProjectConfig(orgId, projectId, { environment, platform }) : sdkConfigsApi.resolveOrgConfig(orgId, { environment, platform })
  });
};

export const useSdkConfigMutations = () => {
  const queryClient = useQueryClient();

  return {
    createConfig: useMutation({
      mutationFn: ({ orgId, projectId, data }: { orgId: string; projectId?: string; data: any }) =>
        sdkConfigsApi.createOrgConfig(orgId, projectId ? { ...data, projectId } : data),
      onSuccess: (_, { orgId, projectId }) => {
        queryClient.invalidateQueries({ queryKey: projectId ? sdkConfigQueryKeys.projectList(orgId, projectId) : sdkConfigQueryKeys.orgList(orgId) });
      },
    }),
    updateConfig: useMutation({
      mutationFn: ({ orgId, configId, projectId, data }: { orgId: string; configId: string; projectId?: string; data: any }) => 
        projectId ? sdkConfigsApi.updateProjectConfig(orgId, projectId, configId, data) : sdkConfigsApi.updateOrgConfig(orgId, configId, data),
      onSuccess: (_, { orgId, configId, projectId }) => {
        queryClient.invalidateQueries({ queryKey: projectId ? sdkConfigQueryKeys.projectList(orgId, projectId) : sdkConfigQueryKeys.orgList(orgId) });
        queryClient.invalidateQueries({ queryKey: sdkConfigQueryKeys.detail(orgId, configId, projectId) });
      },
    }),
    rollbackConfig: useMutation({
      mutationFn: ({ orgId, configId, version, reason }: { orgId: string; configId: string; version: number; reason?: string }) =>
        sdkConfigsApi.rollbackOrgConfig(orgId, configId, version, reason ?? `Rollback to version ${version}`),
      onSuccess: (_, { orgId, configId }) => {
        queryClient.invalidateQueries({ queryKey: sdkConfigQueryKeys.detail(orgId, configId) });
        queryClient.invalidateQueries({ queryKey: sdkConfigQueryKeys.versions(orgId, configId) });
      }
    }),
    ackVersion: useMutation({
      mutationFn: ({ orgId, configId, version }: { orgId: string; configId: string; version: number }) => sdkConfigsApi.ackOrgConfigVersion(orgId, configId, version),
      onSuccess: (_, { orgId, configId }) => {
        queryClient.invalidateQueries({ queryKey: sdkConfigQueryKeys.deployments(orgId, configId) });
        queryClient.invalidateQueries({ queryKey: sdkConfigQueryKeys.versions(orgId, configId) });
      }
    })
  };
};
