import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "../api/projects.api";
import type {
  CreateProjectBody,
  ListProjectsQuery,
  UpdateProjectBody,
  UpdateProjectSettingsBody,
} from "../api/types";
import { projectKeys, useProjectScope } from "./useProjectScope";

type Lifecycle = "archive" | "unarchive" | "pause" | "resume" | "restore";

const DEFAULT_PROJECTS_QUERY: ListProjectsQuery = Object.freeze({});

export const RECENT_PROJECTS_QUERY: ListProjectsQuery = Object.freeze({
  limit: 100,
  sortBy: "updated_at",
  sortOrder: "desc",
});

export function useProjects(query: ListProjectsQuery = DEFAULT_PROJECTS_QUERY) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.list(activeOrgId, query),
    queryFn: () => projectsApi.list(activeOrgId!, query),
    enabled: !!activeOrgId,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useProject(projectId: string) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.detail(activeOrgId, projectId),
    queryFn: () => projectsApi.get(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useProjectByPublicId(publicId: string) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: [...projectKeys.all, "by-public-id", activeOrgId, publicId] as const,
    queryFn: () => projectsApi.getByPublicId(activeOrgId!, publicId),
    enabled: !!activeOrgId && !!publicId && !UUID_REGEX.test(publicId),
    staleTime: 5 * 60 * 1000,
    meta: { nonBlocking: true },
  });
}

export function useProjectOverview(projectId: string) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.overview(activeOrgId, projectId),
    queryFn: () => projectsApi.getOverview(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProjectStats(projectId: string) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.stats(activeOrgId, projectId),
    queryFn: () => projectsApi.getStats(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProjectUsageCounters(projectId: string) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.usageCounters(activeOrgId, projectId),
    queryFn: () => projectsApi.getUsageCounters(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProjectSettings(projectId: string) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.settings(activeOrgId, projectId),
    queryFn: () => projectsApi.getSettings(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Mutations ────────────────────────────────────────────────

export function useProjectMutations(projectId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, requireOrgId } = useProjectScope();

  const invalidateLists = () =>
    queryClient.invalidateQueries({ queryKey: ["projects", "list"], exact: false });

  const invalidateProject = (id: string) => {
    queryClient.invalidateQueries({ queryKey: projectKeys.detail(activeOrgId, id) });
    queryClient.invalidateQueries({ queryKey: projectKeys.overview(activeOrgId, id) });
    queryClient.invalidateQueries({ queryKey: projectKeys.stats(activeOrgId, id) });
    invalidateLists();
  };

  return {
    createProject: useMutation({
      mutationFn: ({ payload, idempotencyKey }: { payload: CreateProjectBody; idempotencyKey: string }) =>
        projectsApi.create(requireOrgId(), payload, idempotencyKey),
      onSuccess: () => {
        // Refresh project lists in the background. Do not keep the create
        // dialog waiting on unrelated list queries after the API has committed.
        void invalidateLists();
      },
    }),

    updateProject: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: UpdateProjectBody }) =>
        projectsApi.update(requireOrgId(), id, payload),
      onSuccess: (_data, { id }) => invalidateProject(id),
    }),

    deleteProject: useMutation({
      mutationFn: (id: string) => projectsApi.remove(requireOrgId(), id),
      onSuccess: (_data, id) => {
        queryClient.removeQueries({ queryKey: projectKeys.detail(activeOrgId, id) });
        invalidateLists();
      },
    }),

    /** archive | unarchive | pause | resume | restore */
    transition: useMutation({
      mutationFn: ({ id, action }: { id: string; action: Lifecycle }) =>
        projectsApi.lifecycle(requireOrgId(), id, action),
      onSuccess: (_data, { id }) => invalidateProject(id),
    }),

    updateSettings: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: UpdateProjectSettingsBody }) =>
        projectsApi.updateSettings(requireOrgId(), id, payload),
      onSuccess: (_data, { id }) => {
        queryClient.invalidateQueries({ queryKey: projectKeys.settings(activeOrgId, id) });
        queryClient.invalidateQueries({ queryKey: projectKeys.overview(activeOrgId, id) });
      },
    }),

    invalidateProject: () => {
      if (projectId) invalidateProject(projectId);
    },
  };
}
