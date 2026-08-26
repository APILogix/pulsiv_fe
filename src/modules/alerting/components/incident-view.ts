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
  const value = event.labels[key];
  return typeof value === "string" ? value : "unknown";
}

export function toIncidentView(event: AlertEvent): AlertIncident {
  return {
    id: event.id,
    organizationId: event.organizationId,
    projectId: event.projectId,
    policyId: event.ruleId,
    fingerprint: event.fingerprint,
    state: incidentState(event.status),
    severity: event.severity,
    title: event.source,
    summary: JSON.stringify(event.payload),
    occurrenceCount: event.duplicateCount,
    firstTriggeredAt: event.startedAt,
    lastTriggeredAt: event.updatedAt,
    acknowledgedAt: event.acknowledgedAt,
    acknowledgedBy: event.acknowledgedBy,
    resolvedAt: event.resolvedAt,
    resolvedBy: event.resolvedBy,
    mutedAt: event.suppressedAt,
    mutedUntil: null,
    assignedToUser: null,
    tags: Object.entries(event.labels).map(([key, value]) => `${key}:${String(value)}`),
    environment: labelValue(event, "environment"),
    service: labelValue(event, "service"),
  };
}
