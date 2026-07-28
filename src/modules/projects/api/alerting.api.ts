/**
 * Project alerting surfaces: connector subscriptions, metric thresholds, and
 * alert channels (plus the caller's own channel preferences).
 *
 * Backend: `pulse/src/modules/projects/alerts/*` mounted under
 * `/organizations/:orgId/projects/:projectId/{connectors,alert-thresholds,alert-channels}`.
 */
import { apiClient } from "@/infrastructure/api-client/axios";
import { projectPath } from "./projects.api";
import type {
  AlertCategory,
  AlertChannelBody,
  MemberChannelPreference,
  MemberChannelPreferenceBody,
  Paged,
  ProjectAlertChannel,
  ProjectAlertThreshold,
  ProjectConnectorSubscription,
  ThresholdBody,
} from "./types";

interface ListEnvelope<T> {
  data?: T[];
  meta?: { total?: number; limit?: number; offset?: number };
}

const paged = <T,>(body: ListEnvelope<T>): Paged<T> => ({
  data: body.data ?? [],
  total: body.meta?.total ?? 0,
  limit: body.meta?.limit ?? 20,
  offset: body.meta?.offset ?? 0,
});

// ── Connector subscriptions ──────────────────────────────────

const connectorBase = (orgId: string, projectId: string) => `${projectPath(orgId, projectId)}/connectors`;

export interface ConnectorSubscriptionBody {
  connectorId?: string;
  enabled?: boolean;
  alertCategories?: AlertCategory[];
  severityThreshold?: string;
  memberIds?: string[];
  channelOverrides?: Record<string, unknown>;
  quietHours?: Record<string, unknown> | null;
  digestMode?: string | null;
}

export const connectorSubscriptionsApi = {
  list: async (
    orgId: string,
    projectId: string,
    query: { enabled?: boolean; limit?: number; offset?: number } = {},
  ): Promise<Paged<ProjectConnectorSubscription>> => {
    const { data } = await apiClient.get(connectorBase(orgId, projectId), { params: query });
    return paged<ProjectConnectorSubscription>(data);
  },

  get: async (orgId: string, projectId: string, subscriptionId: string): Promise<ProjectConnectorSubscription> => {
    const { data } = await apiClient.get(`${connectorBase(orgId, projectId)}/${subscriptionId}`);
    return data.data;
  },

  create: async (
    orgId: string,
    projectId: string,
    payload: ConnectorSubscriptionBody & { connectorId: string },
  ): Promise<ProjectConnectorSubscription> => {
    const { data } = await apiClient.post(connectorBase(orgId, projectId), payload);
    return data.data;
  },

  update: async (
    orgId: string,
    projectId: string,
    subscriptionId: string,
    payload: ConnectorSubscriptionBody,
  ): Promise<ProjectConnectorSubscription> => {
    const { data } = await apiClient.patch(`${connectorBase(orgId, projectId)}/${subscriptionId}`, payload);
    return data.data;
  },

  remove: async (orgId: string, projectId: string, subscriptionId: string): Promise<void> => {
    await apiClient.delete(`${connectorBase(orgId, projectId)}/${subscriptionId}`);
  },
};

// ── Metric thresholds ────────────────────────────────────────

const thresholdBase = (orgId: string, projectId: string) =>
  `${projectPath(orgId, projectId)}/alert-thresholds`;

export const thresholdsApi = {
  list: async (
    orgId: string,
    projectId: string,
    query: {
      environmentId?: string;
      enabled?: boolean;
      category?: string;
      severity?: string;
      metricName?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<Paged<ProjectAlertThreshold>> => {
    const { data } = await apiClient.get(thresholdBase(orgId, projectId), { params: query });
    return paged<ProjectAlertThreshold>(data);
  },

  get: async (orgId: string, projectId: string, thresholdId: string): Promise<ProjectAlertThreshold> => {
    const { data } = await apiClient.get(`${thresholdBase(orgId, projectId)}/${thresholdId}`);
    return data.data;
  },

  create: async (orgId: string, projectId: string, payload: ThresholdBody): Promise<ProjectAlertThreshold> => {
    const { data } = await apiClient.post(thresholdBase(orgId, projectId), payload);
    return data.data;
  },

  update: async (
    orgId: string,
    projectId: string,
    thresholdId: string,
    payload: Partial<ThresholdBody>,
  ): Promise<ProjectAlertThreshold> => {
    const { data } = await apiClient.patch(`${thresholdBase(orgId, projectId)}/${thresholdId}`, payload);
    return data.data;
  },

  remove: async (orgId: string, projectId: string, thresholdId: string): Promise<void> => {
    await apiClient.delete(`${thresholdBase(orgId, projectId)}/${thresholdId}`);
  },

  toggle: async (
    orgId: string,
    projectId: string,
    thresholdId: string,
    enabled: boolean,
  ): Promise<ProjectAlertThreshold> => {
    const { data } = await apiClient.post(`${thresholdBase(orgId, projectId)}/${thresholdId}/toggle`, {
      enabled,
    });
    return data.data;
  },
};

// ── Alert channels + personal preferences ────────────────────

const channelBase = (orgId: string, projectId: string) => `${projectPath(orgId, projectId)}/alert-channels`;

export const alertChannelsApi = {
  list: async (
    orgId: string,
    projectId: string,
    query: { channelType?: string; enabled?: boolean; limit?: number; offset?: number } = {},
  ): Promise<Paged<ProjectAlertChannel>> => {
    const { data } = await apiClient.get(channelBase(orgId, projectId), { params: query });
    return paged<ProjectAlertChannel>(data);
  },

  get: async (orgId: string, projectId: string, channelId: string): Promise<ProjectAlertChannel> => {
    const { data } = await apiClient.get(`${channelBase(orgId, projectId)}/${channelId}`);
    return data.data;
  },

  create: async (orgId: string, projectId: string, payload: AlertChannelBody): Promise<ProjectAlertChannel> => {
    const { data } = await apiClient.post(channelBase(orgId, projectId), payload);
    return data.data;
  },

  update: async (
    orgId: string,
    projectId: string,
    channelId: string,
    payload: Partial<AlertChannelBody> & { version?: number },
  ): Promise<ProjectAlertChannel> => {
    const { data } = await apiClient.patch(`${channelBase(orgId, projectId)}/${channelId}`, payload);
    return data.data;
  },

  toggle: async (
    orgId: string,
    projectId: string,
    channelId: string,
    enabled: boolean,
    version?: number,
  ): Promise<ProjectAlertChannel> => {
    const { data } = await apiClient.post(`${channelBase(orgId, projectId)}/${channelId}/toggle`, {
      enabled,
      ...(version !== undefined ? { version } : {}),
    });
    return data.data;
  },

  remove: async (orgId: string, projectId: string, channelId: string): Promise<void> => {
    await apiClient.delete(`${channelBase(orgId, projectId)}/${channelId}`);
  },

  // Caller-scoped delivery preferences per channel + category.
  listMyPreferences: async (orgId: string, projectId: string): Promise<MemberChannelPreference[]> => {
    const { data } = await apiClient.get(`${channelBase(orgId, projectId)}/preferences`);
    return data.data ?? [];
  },

  upsertMyPreference: async (
    orgId: string,
    projectId: string,
    channelId: string,
    payload: MemberChannelPreferenceBody,
  ): Promise<MemberChannelPreference> => {
    const { data } = await apiClient.put(`${channelBase(orgId, projectId)}/preferences/${channelId}`, payload);
    return data.data;
  },

  deleteMyPreference: async (
    orgId: string,
    projectId: string,
    channelId: string,
    category = "all",
  ): Promise<void> => {
    await apiClient.delete(`${channelBase(orgId, projectId)}/preferences/${channelId}`, {
      params: { category },
    });
  },
};
