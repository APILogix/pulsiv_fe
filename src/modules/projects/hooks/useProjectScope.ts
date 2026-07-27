import { useOrgStore } from "@/modules/organizations/store/org.store";

/**
 * Every project route is organization-scoped. This centralises the active-org
 * lookup so query hooks can stay disabled until an org is selected, and
 * mutations fail loudly rather than firing at `/organizations/undefined/...`.
 */
export function useProjectScope() {
  const activeOrgId = useOrgStore((state) => state.activeOrgId);

  const requireOrgId = () => {
    if (!activeOrgId) throw new Error("No active organization selected");
    return activeOrgId;
  };

  return { activeOrgId, requireOrgId };
}

export const projectKeys = {
  all: ["projects"] as const,
  list: (orgId: string | null, query?: unknown) => ["projects", "list", orgId, query] as const,
  detail: (orgId: string | null, id: string) => ["projects", "detail", orgId, id] as const,
  overview: (orgId: string | null, id: string) => ["projects", "overview", orgId, id] as const,
  stats: (orgId: string | null, id: string) => ["projects", "stats", orgId, id] as const,
  usageCounters: (orgId: string | null, id: string) => ["projects", "usage-counters", orgId, id] as const,
  settings: (orgId: string | null, id: string) => ["projects", "settings", orgId, id] as const,
  activity: (orgId: string | null, id: string, query?: unknown) =>
    ["projects", "activity", orgId, id, query] as const,
  environments: (orgId: string | null, id: string) => ["projects", "environments", orgId, id] as const,
  environment: (orgId: string | null, id: string, envId: string) =>
    ["projects", "environments", orgId, id, envId] as const,
  apiKeys: (orgId: string | null, id: string, query?: unknown) =>
    ["projects", "api-keys", orgId, id, query] as const,
  apiKey: (orgId: string | null, id: string, keyId: string) =>
    ["projects", "api-keys", orgId, id, keyId] as const,
  apiKeyUsage: (orgId: string | null, id: string, keyId: string) =>
    ["projects", "api-keys", orgId, id, keyId, "usage"] as const,
  members: (orgId: string | null, id: string, query?: unknown) =>
    ["projects", "members", orgId, id, query] as const,
  analytics: (orgId: string | null, id: string, kind: string, query?: unknown) =>
    ["projects", "analytics", orgId, id, kind, query] as const,
  connectors: (orgId: string | null, id: string) => ["projects", "connectors", orgId, id] as const,
  thresholds: (orgId: string | null, id: string, query?: unknown) =>
    ["projects", "thresholds", orgId, id, query] as const,
  channels: (orgId: string | null, id: string, query?: unknown) =>
    ["projects", "channels", orgId, id, query] as const,
  channelPreferences: (orgId: string | null, id: string) =>
    ["projects", "channel-preferences", orgId, id] as const,
};
