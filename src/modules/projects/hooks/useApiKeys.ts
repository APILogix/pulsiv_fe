import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiKeysApi } from "../api/api-keys.api";
import type { CreateApiKeyBody, ListApiKeysQuery } from "../api/types";
import { projectKeys, useProjectScope } from "./useProjectScope";

export function useApiKeys(projectId: string, query: ListApiKeysQuery = {}) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.apiKeys(activeOrgId, projectId, query),
    queryFn: () => apiKeysApi.list(activeOrgId!, projectId, query),
    enabled: !!activeOrgId && !!projectId,
  });
}

export function useApiKey(projectId: string, apiKeyId?: string) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.apiKey(activeOrgId, projectId, apiKeyId ?? ""),
    queryFn: () => apiKeysApi.get(activeOrgId!, projectId, apiKeyId!),
    enabled: !!activeOrgId && !!projectId && !!apiKeyId,
  });
}

export function useApiKeyUsage(projectId: string, apiKeyId?: string) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.apiKeyUsage(activeOrgId, projectId, apiKeyId ?? ""),
    queryFn: () => apiKeysApi.usage(activeOrgId!, projectId, apiKeyId!),
    enabled: !!activeOrgId && !!projectId && !!apiKeyId,
  });
}

export function useApiKeyMutations(projectId: string) {
  const queryClient = useQueryClient();
  const { requireOrgId } = useProjectScope();

  // Key lists are filtered by query params, so invalidate the whole api-keys
  // branch rather than a single exact key.
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["projects", "api-keys"], exact: false });

  return {
    createKey: useMutation({
      mutationFn: (payload: CreateApiKeyBody) => apiKeysApi.create(requireOrgId(), projectId, payload),
      onSuccess: invalidate,
    }),
    updateKey: useMutation({
      mutationFn: ({ apiKeyId, payload }: { apiKeyId: string; payload: Record<string, unknown> }) =>
        apiKeysApi.update(requireOrgId(), projectId, apiKeyId, payload),
      onSuccess: invalidate,
    }),
    revokeKey: useMutation({
      mutationFn: ({ apiKeyId, reason }: { apiKeyId: string; reason?: string }) =>
        apiKeysApi.revoke(requireOrgId(), projectId, apiKeyId, reason),
      onSuccess: invalidate,
    }),
    rotateKey: useMutation({
      mutationFn: ({
        apiKeyId,
        rotationReason,
        gracePeriodHours,
      }: {
        apiKeyId: string;
        rotationReason?: string;
        gracePeriodHours?: number;
      }) => apiKeysApi.rotate(requireOrgId(), projectId, apiKeyId, { rotationReason, gracePeriodHours }),
      onSuccess: invalidate,
    }),
    regenerateKey: useMutation({
      mutationFn: (apiKeyId: string) => apiKeysApi.regenerate(requireOrgId(), projectId, apiKeyId),
      onSuccess: invalidate,
    }),
    setKeyEnabled: useMutation({
      mutationFn: ({ apiKeyId, enabled }: { apiKeyId: string; enabled: boolean }) =>
        apiKeysApi.setEnabled(requireOrgId(), projectId, apiKeyId, enabled),
      onSuccess: invalidate,
    }),
    bulkRotate: useMutation({
      mutationFn: (payload: { environmentId?: string; rotationReason?: string; gracePeriodHours?: number }) =>
        apiKeysApi.bulkRotate(requireOrgId(), projectId, payload),
      onSuccess: invalidate,
    }),
    bulkRevoke: useMutation({
      mutationFn: (payload: { environmentId?: string; apiKeyIds?: string[]; revokedReason?: string }) =>
        apiKeysApi.bulkRevoke(requireOrgId(), projectId, payload),
      onSuccess: invalidate,
    }),
  };
}
