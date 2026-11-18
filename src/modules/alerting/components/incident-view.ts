import type { AlertEvent, AlertIncident, IncidentState } from "../api/types";

function incidentState(status: AlertEvent["status"]): IncidentState {
  if (status === "pending") return "pending";
  if (status === "firing") return "triggered";
  if (status === "acknowledged") return "acknowledged";
  if (status === "resolved") return "resolved";
  if (status === "silenced" || status === "suppressed") return "muted";
  return "healthy";
}

function labelValue(event: AlertEvent, key: string): string {
  const labels = (typeof event.labels === 'object' && event.labels !== null && !Array.isArray(event.labels) ? event.labels : {}) as Record<string, unknown>;
  const value = labels[key];
  return typeof value === "string" ? value : "unknown";
}

export function toIncidentView(event: AlertEvent): AlertIncident {
  const labels = (typeof event.labels === 'object' && event.labels !== null && !Array.isArray(event.labels) ? event.labels : {}) as Record<string, unknown>;
  return {
    id: event.id,
    organizationId: event.organizationId,
    projectId: event.projectId,
    policyId: event.ruleId,
    fingerprint: event.fingerprint,
    state: incidentState(event.status),
    severity: event.severity,
    title: event.source,
    summary: JSON.stringify(event.payload ?? {}),
    occurrenceCount: event.duplicateCount ?? 1,
    firstTriggeredAt: event.startedAt,
    lastTriggeredAt: event.updatedAt,
    acknowledgedAt: event.acknowledgedAt,
    acknowledgedBy: event.acknowledgedBy,
    resolvedAt: event.resolvedAt,
    resolvedBy: event.resolvedBy,
    mutedAt: event.suppressedAt,
    mutedUntil: null,
    assignedToUser: null,
    tags: Object.entries(labels).map(([key, value]) => `${key}:${String(value)}`),
    environment: labelValue(event, "environment") !== "unknown" ? labelValue(event, "environment") : (event.environment ?? "unknown"),
    service: labelValue(event, "service") !== "unknown" ? labelValue(event, "service") : (event.service ?? "unknown"),
  };
}
