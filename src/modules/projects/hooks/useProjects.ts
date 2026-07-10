import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "../api/projects.api";
import { useOrgStore } from "@/modules/organizations/store/org.store";

export const projectQueryKeys = {
  all: ["projects"] as const,
  lists: () => [...projectQueryKeys.all, "list"] as const,
  detail: (id: string) => [...projectQueryKeys.all, "detail", id] as const,
  settings: (id: string) => [...projectQueryKeys.all, "settings", id] as const,
  overview: (id: string) => [...projectQueryKeys.all, "overview", id] as const,
  stats: (id: string) => [...projectQueryKeys.all, "stats", id] as const,
  usage: (id: string) => [...projectQueryKeys.all, "usage", id] as const,
  activity: (id: string) => [...projectQueryKeys.all, "activity", id] as const,
  environments: (id: string) => [...projectQueryKeys.all, "environments", id] as const,
  apiKeys: (id: string) => [...projectQueryKeys.all, "apiKeys", id] as const,
  apiKeyUsage: (id: string, keyId: string) => [...projectQueryKeys.apiKeys(id), keyId, "usage"] as const,
  members: (id: string) => [...projectQueryKeys.all, "members", id] as const,
};

// --- Queries ---

export const useProjects = () => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...projectQueryKeys.lists(), activeOrgId],
    queryFn: () => projectsApi.list(activeOrgId!),
    enabled: !!activeOrgId,
  });
};

export const useProject = (projectId: string) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...projectQueryKeys.detail(projectId), activeOrgId],
    queryFn: () => projectsApi.get(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
  });
};


export const useProjectSettings = (projectId: string) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...projectQueryKeys.settings(projectId), activeOrgId],
    queryFn: () => projectsApi.getSettings(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
  });
};

export const useProjectOverview = (projectId: string) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...projectQueryKeys.overview(projectId), activeOrgId],
    queryFn: () => projectsApi.getOverview(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
  });
};

export const useProjectStats = (projectId: string) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...projectQueryKeys.stats(projectId), activeOrgId],
    queryFn: () => projectsApi.getStats(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
  });
};

export const useProjectUsage = (projectId: string) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...projectQueryKeys.usage(projectId), activeOrgId],
    queryFn: () => projectsApi.getUsage(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
  });
};

export const useProjectActivity = (projectId: string) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...projectQueryKeys.activity(projectId), activeOrgId],
    queryFn: () => projectsApi.getActivity(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
  });
};

export const useEnvironments = (projectId: string) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...projectQueryKeys.environments(projectId), activeOrgId],
    queryFn: () => projectsApi.listEnvironments(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
  });
};

export const useApiKeys = (projectId: string) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...projectQueryKeys.apiKeys(projectId), activeOrgId],
    queryFn: () => projectsApi.listApiKeys(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
  });
};

export const useProjectMembers = (projectId: string) => {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  return useQuery({
    queryKey: [...projectQueryKeys.members(projectId), activeOrgId],
    queryFn: () => projectsApi.listMembers(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
  });
};

// --- Mutations ---
export const useProjectMutations = () => {
  const queryClient = useQueryClient();
  const activeOrgId = useOrgStore((state) => state.activeOrgId);
  const orgId = () => {
    if (!activeOrgId) throw new Error("No active organization selected");
    return activeOrgId;
  };

  return {
    createProject: useMutation({
      mutationFn: (data: any) => projectsApi.create(orgId(), data),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: projectQueryKeys.lists() }),
    }),

    updateSettings: useMutation({
      mutationFn: ({ id, data }: { id: string; data: any }) => projectsApi.updateSettings(orgId(), id, data),
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.settings(id) });
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.overview(id) });
      },
    }),

    updateProject: useMutation({
      mutationFn: ({ id, data }: { id: string; data: any }) => projectsApi.update(orgId(), id, data),
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.lists() });
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(id) });
      },
    }),
    deleteProject: useMutation({
      mutationFn: (id: string) => projectsApi.delete(orgId(), id),
      onSuccess: (_, id) => {
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.lists() });
        queryClient.removeQueries({ queryKey: projectQueryKeys.detail(id) });
      },
    }),
    archiveProject: useMutation({
      mutationFn: (id: string) => projectsApi.archive(orgId(), id),
      onSuccess: (_, id) => queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(id) }),
    }),
    unarchiveProject: useMutation({
      mutationFn: (id: string) => projectsApi.unarchive(orgId(), id),
      onSuccess: (_, id) => queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(id) }),
    }),
    pauseProject: useMutation({
      mutationFn: (id: string) => projectsApi.pause(orgId(), id),
      onSuccess: (_, id) => queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(id) }),
    }),
    resumeProject: useMutation({
      mutationFn: (id: string) => projectsApi.resume(orgId(), id),
      onSuccess: (_, id) => queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(id) }),
    }),
    createEnvironment: useMutation({
      mutationFn: ({ projectId, data }: { projectId: string; data: any }) => projectsApi.createEnvironment(orgId(), projectId, data),
      onSuccess: (_, { projectId }) => queryClient.invalidateQueries({ queryKey: projectQueryKeys.environments(projectId) }),
    }),
    deleteEnvironment: useMutation({
      mutationFn: ({ projectId, env }: { projectId: string; env: string }) => projectsApi.deleteEnvironment(orgId(), projectId, env as "development" | "production"),
      onSuccess: (_, { projectId }) => queryClient.invalidateQueries({ queryKey: projectQueryKeys.environments(projectId) }),
    }),
    createApiKey: useMutation({
      mutationFn: ({ projectId, data }: { projectId: string; data: any }) => projectsApi.createApiKey(orgId(), projectId, data),
      onSuccess: (_, { projectId }) => queryClient.invalidateQueries({ queryKey: projectQueryKeys.apiKeys(projectId) }),
    }),
    rotateApiKey: useMutation({
      mutationFn: ({ projectId, keyId }: { projectId: string; keyId: string }) => projectsApi.rotateApiKey(orgId(), projectId, keyId),
      onSuccess: (_, { projectId }) => queryClient.invalidateQueries({ queryKey: projectQueryKeys.apiKeys(projectId) }),
    }),
    regenerateApiKey: useMutation({
      mutationFn: ({ projectId, keyId }: { projectId: string; keyId: string }) => projectsApi.regenerateApiKey(orgId(), projectId, keyId),
      onSuccess: (_, { projectId }) => queryClient.invalidateQueries({ queryKey: projectQueryKeys.apiKeys(projectId) }),
    }),
    revokeApiKey: useMutation({
      mutationFn: ({ projectId, keyId }: { projectId: string; keyId: string }) => projectsApi.revokeApiKey(orgId(), projectId, keyId),
      onSuccess: (_, { projectId }) => queryClient.invalidateQueries({ queryKey: projectQueryKeys.apiKeys(projectId) }),
    }),
    disableApiKey: useMutation({
      mutationFn: ({ projectId, keyId }: { projectId: string; keyId: string }) => projectsApi.disableApiKey(orgId(), projectId, keyId),
      onSuccess: (_, { projectId }) => queryClient.invalidateQueries({ queryKey: projectQueryKeys.apiKeys(projectId) }),
    }),
    addMember: useMutation({
      mutationFn: ({ projectId, userId, role }: { projectId: string; userId: string; role: string }) => projectsApi.addMember(orgId(), projectId, { userId, role }),
      onSuccess: (_, { projectId }) => {
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.members(projectId) });
      },
    }),
    removeMember: useMutation({
      mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) => projectsApi.removeMember(orgId(), projectId, userId),
      onSuccess: (_, { projectId }) => {
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.members(projectId) });
      },
    }),
  };
};
