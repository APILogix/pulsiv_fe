import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  alertChannelsApi,
  connectorSubscriptionsApi,
  thresholdsApi,
  type ConnectorSubscriptionBody,
} from "../api/alerting.api";
import type {
  AlertChannelBody,
  MemberChannelPreferenceBody,
  ThresholdBody,
} from "../api/types";
import { projectKeys, useProjectScope } from "./useProjectScope";

// ── Connector subscriptions ──────────────────────────────────

export function useConnectorSubscriptions(projectId: string) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.connectors(activeOrgId, projectId),
    queryFn: () => connectorSubscriptionsApi.list(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
  });
}

export function useConnectorSubscriptionMutations(projectId: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, requireOrgId } = useProjectScope();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: projectKeys.connectors(activeOrgId, projectId) });

  return {
    createSubscription: useMutation({
      mutationFn: (payload: ConnectorSubscriptionBody & { connectorId: string }) =>
        connectorSubscriptionsApi.create(requireOrgId(), projectId, payload),
      onSuccess: invalidate,
    }),
    updateSubscription: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: ConnectorSubscriptionBody }) =>
        connectorSubscriptionsApi.update(requireOrgId(), projectId, id, payload),
      onSuccess: invalidate,
    }),
    deleteSubscription: useMutation({
      mutationFn: (id: string) => connectorSubscriptionsApi.remove(requireOrgId(), projectId, id),
      onSuccess: invalidate,
    }),
  };
}

// ── Metric thresholds ────────────────────────────────────────

export function useThresholds(
  projectId: string,
  query: { environmentId?: string; enabled?: boolean; category?: string; severity?: string } = {},
) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.thresholds(activeOrgId, projectId, query),
    queryFn: () => thresholdsApi.list(activeOrgId!, projectId, query),
    enabled: !!activeOrgId && !!projectId,
  });
}

export function useThresholdMutations(projectId: string) {
  const queryClient = useQueryClient();
  const { requireOrgId } = useProjectScope();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["projects", "thresholds"], exact: false });

  return {
    createThreshold: useMutation({
      mutationFn: (payload: ThresholdBody) => thresholdsApi.create(requireOrgId(), projectId, payload),
      onSuccess: invalidate,
    }),
    updateThreshold: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Partial<ThresholdBody> }) =>
        thresholdsApi.update(requireOrgId(), projectId, id, payload),
      onSuccess: invalidate,
    }),
    deleteThreshold: useMutation({
      mutationFn: (id: string) => thresholdsApi.remove(requireOrgId(), projectId, id),
      onSuccess: invalidate,
    }),
    toggleThreshold: useMutation({
      mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
        thresholdsApi.toggle(requireOrgId(), projectId, id, enabled),
      onSuccess: invalidate,
    }),
  };
}

// ── Alert channels ───────────────────────────────────────────

export function useAlertChannels(projectId: string, query: { channelType?: string; enabled?: boolean } = {}) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.channels(activeOrgId, projectId, query),
    queryFn: () => alertChannelsApi.list(activeOrgId!, projectId, query),
    enabled: !!activeOrgId && !!projectId,
  });
}

export function useMyChannelPreferences(projectId: string) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: projectKeys.channelPreferences(activeOrgId, projectId),
    queryFn: () => alertChannelsApi.listMyPreferences(activeOrgId!, projectId),
    enabled: !!activeOrgId && !!projectId,
  });
}

export function useAlertChannelMutations(projectId: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, requireOrgId } = useProjectScope();
  const invalidateChannels = () =>
    queryClient.invalidateQueries({ queryKey: ["projects", "channels"], exact: false });
  const invalidatePrefs = () =>
    queryClient.invalidateQueries({ queryKey: projectKeys.channelPreferences(activeOrgId, projectId) });

  return {
    createChannel: useMutation({
      mutationFn: (payload: AlertChannelBody) => alertChannelsApi.create(requireOrgId(), projectId, payload),
      onSuccess: invalidateChannels,
    }),
    updateChannel: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Partial<AlertChannelBody> & { version?: number } }) =>
        alertChannelsApi.update(requireOrgId(), projectId, id, payload),
      onSuccess: invalidateChannels,
    }),
    toggleChannel: useMutation({
      mutationFn: ({ id, enabled, version }: { id: string; enabled: boolean; version?: number }) =>
        alertChannelsApi.toggle(requireOrgId(), projectId, id, enabled, version),
      onSuccess: invalidateChannels,
    }),
    deleteChannel: useMutation({
      mutationFn: (id: string) => alertChannelsApi.remove(requireOrgId(), projectId, id),
      onSuccess: () => {
        invalidateChannels();
        invalidatePrefs();
      },
    }),
    upsertPreference: useMutation({
      mutationFn: ({ channelId, payload }: { channelId: string; payload: MemberChannelPreferenceBody }) =>
        alertChannelsApi.upsertMyPreference(requireOrgId(), projectId, channelId, payload),
      onSuccess: invalidatePrefs,
    }),
    deletePreference: useMutation({
      mutationFn: ({ channelId, category }: { channelId: string; category?: string }) =>
        alertChannelsApi.deleteMyPreference(requireOrgId(), projectId, channelId, category),
      onSuccess: invalidatePrefs,
    }),
  };
}
