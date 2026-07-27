/**
 * Project API-key API — full lifecycle including rotation, regeneration,
 * enable/disable, per-key usage, and bulk operations.
 *
 * Backend: `pulse/src/modules/projects/api-keys` —
 * `/organizations/:orgId/projects/:projectId/api-keys`.
 */
import { apiClient } from "@/infrastructure/api-client/axios";
import { projectPath } from "./projects.api";
import type {
  ApiKeyUsage,
  BulkOperationResult,
  CreateApiKeyBody,
  CreateApiKeyResponse,
  ListApiKeysQuery,
  Paged,
  ProjectApiKey,
} from "./types";

const keyBase = (orgId: string, projectId: string) => `${projectPath(orgId, projectId)}/api-keys`;

export const apiKeysApi = {
  list: async (
    orgId: string,
    projectId: string,
    query: ListApiKeysQuery = {},
  ): Promise<Paged<ProjectApiKey>> => {
    const { data } = await apiClient.get(keyBase(orgId, projectId), { params: query });
    return {
      data: data.data ?? [],
      total: data.meta?.total ?? 0,
      limit: data.meta?.limit ?? 20,
      offset: data.meta?.offset ?? 0,
    };
  },

  get: async (orgId: string, projectId: string, apiKeyId: string): Promise<ProjectApiKey> => {
    const { data } = await apiClient.get(`${keyBase(orgId, projectId)}/${apiKeyId}`);
    return data.data;
  },

  create: async (
    orgId: string,
    projectId: string,
    payload: CreateApiKeyBody,
  ): Promise<CreateApiKeyResponse> => {
    const { data } = await apiClient.post(keyBase(orgId, projectId), payload);
    return data.data;
  },

  update: async (
    orgId: string,
    projectId: string,
    apiKeyId: string,
    payload: Record<string, unknown>,
  ): Promise<ProjectApiKey> => {
    const { data } = await apiClient.patch(`${keyBase(orgId, projectId)}/${apiKeyId}`, payload);
    return data.data;
  },

  /** DELETE accepts an optional revocation reason in the body. */
  revoke: async (
    orgId: string,
    projectId: string,
    apiKeyId: string,
    revokedReason?: string,
  ): Promise<void> => {
    await apiClient.delete(`${keyBase(orgId, projectId)}/${apiKeyId}`, {
      data: revokedReason ? { revokedReason } : {},
    });
  },

  rotate: async (
    orgId: string,
    projectId: string,
    apiKeyId: string,
    payload: { rotationReason?: string; gracePeriodHours?: number } = {},
  ): Promise<CreateApiKeyResponse> => {
    const { data } = await apiClient.post(`${keyBase(orgId, projectId)}/${apiKeyId}/rotate`, payload);
    return data.data;
  },

  regenerate: async (
    orgId: string,
    projectId: string,
    apiKeyId: string,
  ): Promise<CreateApiKeyResponse> => {
    const { data } = await apiClient.post(`${keyBase(orgId, projectId)}/${apiKeyId}/regenerate`);
    return data.data;
  },

  setEnabled: async (
    orgId: string,
    projectId: string,
    apiKeyId: string,
    enabled: boolean,
  ): Promise<ProjectApiKey> => {
    const action = enabled ? "enable" : "disable";
    const { data } = await apiClient.post(`${keyBase(orgId, projectId)}/${apiKeyId}/${action}`);
    return data.data;
  },

  usage: async (orgId: string, projectId: string, apiKeyId: string): Promise<ApiKeyUsage> => {
    const { data } = await apiClient.get(`${keyBase(orgId, projectId)}/${apiKeyId}/usage`);
    return data.data;
  },

  bulkRotate: async (
    orgId: string,
    projectId: string,
    payload: { environmentId?: string; rotationReason?: string; gracePeriodHours?: number } = {},
  ): Promise<BulkOperationResult> => {
    const { data } = await apiClient.post(`${keyBase(orgId, projectId)}/bulk-rotate`, payload);
    return data.data;
  },

  bulkRevoke: async (
    orgId: string,
    projectId: string,
    payload: { environmentId?: string; apiKeyIds?: string[]; revokedReason?: string } = {},
  ): Promise<BulkOperationResult> => {
    const { data } = await apiClient.post(`${keyBase(orgId, projectId)}/bulk-revoke`, payload);
    return data.data;
  },
};
