import { apiClient } from "@/infrastructure/api-client/axios";
import type {
  ErrorGroup,
  ErrorGroupHistoryItem,
  RelatedErrorEvent,
  ErrorGroupFilterState,
  ErrorGroupStatus,
  ErrorGroupDetail,
} from "../types/error-group";

function normalizeErrorGroup(raw: any): ErrorGroup {
  if (!raw || typeof raw !== "object" || typeof raw.id !== "string") {
    throw new Error("Invalid error-group response");
  }
  const publicId = raw.publicId ?? raw.public_id ?? undefined;
  const occ = raw.occurrences && typeof raw.occurrences === "object" ? raw.occurrences : {};
  const firstSeen = occ.firstSeenAt ?? raw.firstSeen ?? raw.firstSeenAt ?? raw.first_seen_at;
  const lastSeen = occ.lastSeenAt ?? raw.lastSeen ?? raw.lastSeenAt ?? raw.last_seen_at;
  const occurrenceCount = Number(occ.count ?? raw.occurrenceCount ?? raw.occurrence_count ?? 1);

  const sevObj = raw.severity && typeof raw.severity === "object" ? raw.severity : {};
  const highestSev = String(sevObj.highest ?? raw.highestSeverity ?? raw.highest_severity ?? "error").toLowerCase() as any;
  const latestSev = String(sevObj.latest ?? raw.latestSeverity ?? raw.latest_severity ?? "error").toLowerCase() as any;

  const regObj = raw.regression && typeof raw.regression === "object" ? raw.regression : {};
  const regressionCount = Number(regObj.count ?? raw.regressionCount ?? raw.regression_count ?? 0);
  const lastRegressedAt = regObj.lastRegressedAt ?? raw.lastRegressedAt ?? raw.last_regressed_at ?? null;

  const relObj = raw.release && typeof raw.release === "object" ? raw.release : {};
  const latestRelease = relObj.latest ?? raw.latestRelease ?? raw.latest_release ?? null;
  const resolvedRelease = relObj.resolvedIn ?? raw.resolvedRelease ?? raw.resolved_release ?? null;

  const evtObj = raw.latestEvent && typeof raw.latestEvent === "object" ? raw.latestEvent : {};
  const traceObj = evtObj.trace && typeof evtObj.trace === "object" ? evtObj.trace : {};
  const lastErrorName = evtObj.errorName ?? raw.lastErrorName ?? raw.last_error_name ?? "Error";
  const lastErrorMessage = evtObj.message ?? raw.lastErrorMessage ?? raw.last_error_message ?? "";
  const lastStatusCode = evtObj.statusCode ?? raw.lastStatusCode ?? raw.last_status_code ?? null;
  const lastTraceId = traceObj.traceId ?? raw.traceId ?? raw.lastTraceId ?? raw.last_trace_id ?? "";
  const tracePublicId = traceObj.publicId ?? raw.tracePublicId ?? raw.last_trace_public_id ?? null;

  return {
    ...raw,
    id: raw.id,
    publicId,
    tracePublicId,
    fingerprint: raw.fingerprint ?? raw.publicId ?? raw.id,
    status: String(raw.status ?? "OPEN").toLowerCase() as ErrorGroupStatus,
    occurrences: {
      count: occurrenceCount,
      firstSeenAt: firstSeen,
      lastSeenAt: lastSeen,
    },
    severity: {
      highest: highestSev,
      latest: latestSev,
    },
    regression: {
      count: regressionCount,
      lastRegressedAt,
    },
    release: {
      latest: latestRelease,
      resolvedIn: resolvedRelease,
    },
    latestEvent: {
      publicId: evtObj.publicId ?? raw.latest_event_public_id ?? null,
      errorName: lastErrorName,
      message: lastErrorMessage,
      statusCode: lastStatusCode,
      trace: {
        publicId: tracePublicId,
        traceId: lastTraceId,
      },
    },
    occurrenceCount,
    occurrence_count: occurrenceCount,
    firstSeen,
    firstSeenAt: firstSeen,
    first_seen_at: firstSeen,
    lastSeen,
    lastSeenAt: lastSeen,
    last_seen_at: lastSeen,
    highestSeverity: highestSev,
    highest_severity: highestSev,
    latestSeverity: latestSev,
    latest_severity: latestSev,
    latestRelease,
    latest_release: latestRelease,
    lastErrorName,
    last_error_name: lastErrorName,
    lastErrorMessage,
    last_error_message: lastErrorMessage,
    lastStatusCode,
    last_status_code: lastStatusCode,
    isRegression: regressionCount > 0 && lastRegressedAt != null,
    regressionCount,
    regression_count: regressionCount,
    lastRegressedAt,
    latestSdkVersion: raw.latestSdkVersion ?? raw.latest_sdk_version ?? null,
    latestApplicationVersion: raw.latestApplicationVersion ?? raw.latest_application_version ?? null,
    environment: raw.environment ?? raw.latest_environment ?? null,
    service: raw.service ?? raw.latest_service ?? null,
    stackFrames: raw.stackFrames ?? [],
    route: raw.route ?? "",
    traceId: lastTraceId,
    fingerprintVersion: Number(raw.fingerprintVersion ?? raw.fingerprint_version ?? 1),
    resolvedAt: raw.resolvedAt ?? raw.resolved_at ?? null,
    resolvedRelease,
    mergedInto: raw.mergedInto ?? raw.merged_into ?? null,
    isMerged: Boolean(raw.isMerged ?? raw.is_merged),
  };
}

function normalizeHistoryItem(raw: any): ErrorGroupHistoryItem {
  if (!raw || typeof raw !== "object" || typeof raw.id !== "string") {
    throw new Error("Invalid error-group history response");
  }
  return {
    ...raw,
    id: raw.id,
    groupId: raw.groupId ?? raw.group_id,
    actor: raw.actor ?? raw.actor_id ?? "System",
    timestamp: raw.timestamp ?? raw.created_at,
    action: raw.action,
    oldValue: raw.oldValue ?? raw.old_value,
    newValue: raw.newValue ?? raw.new_value,
    metadata: raw.metadata ?? {},
    previousStatus: raw.previousStatus ?? raw.previous_status ?? null,
    newStatus: raw.newStatus ?? raw.new_status ?? null,
    eventId: raw.eventId ?? raw.event_id ?? null,
    release: raw.release ?? null,
    occurredAt: raw.occurredAt ?? raw.occurred_at ?? null,
    reason: raw.reason ?? null,
  };
}

function listPayload(response: any): any[] {
  const items = response.data?.items ?? response.data?.data?.items ?? response.data?.data ?? response.data;
  if (!Array.isArray(items)) throw new Error("Invalid error-group list response");
  return items;
}

export async function fetchErrorGroupsApi(orgId: string | null, filters: ErrorGroupFilterState): Promise<ErrorGroup[]> {
  if (!orgId) return [];
  const cleanParams: Record<string, string> = {};
  if (filters.status) cleanParams.status = filters.status.toUpperCase();
  if (filters.severity) cleanParams.severity = filters.severity;
  if (filters.isRegression) cleanParams.isRegression = filters.isRegression;
  if (filters.environment) cleanParams.environment = filters.environment;
  if (filters.release) cleanParams.release = filters.release;
  if (filters.sdkVersion) cleanParams.sdkVersion = filters.sdkVersion;
  if (filters.appVersion) cleanParams.appVersion = filters.appVersion;
  if (filters.search) cleanParams.search = filters.search;
  if (filters.project) cleanParams.project = filters.project;
  if (filters.range) cleanParams.range = filters.range;
  if (filters.from) cleanParams.from = filters.from;
  if (filters.to) cleanParams.to = filters.to;
  const response = await apiClient.get(`/organizations/${orgId}/observability/error-groups`, { params: cleanParams });
  return listPayload(response).map(normalizeErrorGroup);
}

export async function fetchErrorGroupDetailApi(orgId: string | null, groupId: string): Promise<ErrorGroupDetail | null> {
  if (!orgId || !groupId) return null;
  const response = await apiClient.get(`/organizations/${orgId}/observability/error-groups/${groupId}`);
  const data = response.data?.data ?? response.data;
  if (!data || typeof data !== "object" || !data.id) return null;
  return normalizeErrorGroup(data) as ErrorGroupDetail;
}

export async function fetchErrorGroupHistoryApi(orgId: string | null, groupId: string): Promise<ErrorGroupHistoryItem[]> {
  if (!orgId || !groupId) return [];
  const response = await apiClient.get(`/organizations/${orgId}/observability/error-groups/${groupId}/history`);
  return listPayload(response).map(normalizeHistoryItem);
}

export async function fetchRelatedErrorEventsApi(orgId: string | null, groupId: string): Promise<RelatedErrorEvent[]> {
  if (!orgId || !groupId) return [];
  const response = await apiClient.get(`/organizations/${orgId}/observability/error-groups/${groupId}/events`);
  const items = listPayload(response);
  return items as RelatedErrorEvent[];
}

export async function updateErrorGroupStatusApi(
  orgId: string | null,
  groupId: string,
  status: ErrorGroupStatus,
  reason?: string,
  expectedVersion?: number,
): Promise<boolean> {
  if (!orgId || !groupId) throw new Error("Organization and group are required");
  await apiClient.patch(`/organizations/${orgId}/observability/error-groups/${groupId}/status`, {
    status,
    reason,
    comment: reason,
    ...(expectedVersion !== undefined ? { expectedVersion } : {}),
  });
  return true;
}

export async function mergeErrorGroupsApi(
  orgId: string | null,
  sourceGroupId: string,
  targetGroupId: string,
  reason?: string,
  expectedVersion?: number,
): Promise<boolean> {
  if (!orgId || !sourceGroupId || !targetGroupId) throw new Error("Organization and groups are required");
  await apiClient.post(`/organizations/${orgId}/observability/error-groups/${sourceGroupId}/merge`, {
    targetGroupId,
    reason,
    ...(expectedVersion !== undefined ? { expectedVersion } : {}),
  });
  return true;
}

export async function unmergeErrorGroupApi(
  orgId: string | null,
  groupId: string,
  reason?: string,
  expectedVersion?: number,
): Promise<boolean> {
  if (!orgId || !groupId) throw new Error("Organization and group are required");
  await apiClient.post(`/organizations/${orgId}/observability/error-groups/${groupId}/unmerge`, {
    reason,
    ...(expectedVersion !== undefined ? { expectedVersion } : {}),
  });
  return true;
}
