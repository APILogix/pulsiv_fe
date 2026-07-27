import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api-client/axios";
import { projectKeys, useProjectScope } from "./useProjectScope";

/**
 * Caller-scoped notification preferences for a project.
 *
 * Backend: `pulse/src/modules/projects/alerts/preferences` mounted at
 * `/organizations/:orgId/projects/:projectId/members/me/alert-preferences`
 * — GET `/`, PATCH `/:prefId`, POST `/sync`.
 *
 * The PATCH body is validated without key normalisation on the server, so
 * fields must be sent in snake_case.
 */

export type NotificationChannel = "slack" | "email" | "webhook" | "push" | "sms";

export interface MemberNotificationPreference {
  id: string;
  projectId: string;
  userId: string;
  channel: NotificationChannel;
  category: string;
  enabled: boolean;
  severityThreshold: string;
  digestMode: string;
  quietHours: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePreferencePayload {
  enabled?: boolean;
  severityThreshold?: string;
  digestMode?: string;
  quietHours?: Record<string, unknown> | null;
}

const preferencesBase = (orgId: string, projectId: string) =>
  `/organizations/${orgId}/projects/${projectId}/members/me/alert-preferences`;

export const alertPreferenceKeys = {
  all: ["alert-preferences"] as const,
  lists: (projectId: string) => [...alertPreferenceKeys.all, projectId] as const,
};

export function useAlertPreferences(projectId: string) {
  const { activeOrgId } = useProjectScope();
  return useQuery({
    queryKey: [...alertPreferenceKeys.lists(projectId), activeOrgId],
    queryFn: async (): Promise<MemberNotificationPreference[]> => {
      const { data } = await apiClient.get(preferencesBase(activeOrgId!, projectId));
      return data.data ?? [];
    },
    enabled: !!activeOrgId && !!projectId,
  });
}

export function useAlertPreferenceMutations(projectId: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, requireOrgId } = useProjectScope();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: alertPreferenceKeys.lists(projectId) });
    queryClient.invalidateQueries({ queryKey: projectKeys.channelPreferences(activeOrgId, projectId) });
  };

  return {
    updatePreference: useMutation({
      mutationFn: async ({ prefId, payload }: { prefId: string; payload: UpdatePreferencePayload }) => {
        const body: Record<string, unknown> = {};
        if (payload.enabled !== undefined) body.enabled = payload.enabled;
        if (payload.severityThreshold !== undefined) body.severity_threshold = payload.severityThreshold;
        if (payload.digestMode !== undefined) body.digest_mode = payload.digestMode;
        if (payload.quietHours !== undefined) body.quiet_hours = payload.quietHours;
        const { data } = await apiClient.patch(`${preferencesBase(requireOrgId(), projectId)}/${prefId}`, body);
        return data.data as MemberNotificationPreference;
      },
      onSuccess: invalidate,
    }),

    /** Seeds preference rows for every channel/category this project supports. */
    syncPreferences: useMutation({
      mutationFn: async () => {
        const { data } = await apiClient.post(`${preferencesBase(requireOrgId(), projectId)}/sync`);
        return data;
      },
      onSuccess: invalidate,
    }),
  };
}
