import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { RefreshCw } from "lucide-react";

import { useProjectAlerts, useProjectAlertingStatus } from "@/modules/alerting/hooks/useAlerting";
import { toIncidentView } from "@/modules/alerting/components/incident-view";
import { EntitlementRestrictedBanner } from "@/modules/alerting/components/EntitlementRestrictedBanner";
import type { AlertEvent, AlertEventStatus, AlertIncident, IncidentState } from "@/modules/alerting/api/types";
import { projectPath } from "@/modules/projects/navigation/project-routes";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  HIDE_BELOW_XL,
  ProjectPageHeader,
  Readouts,
  RowTitle,
  SearchField,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  TextLink,
  ToolbarCount,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Pill, SegmentedControl, type SegmentOption, type SurfaceTone } from "@/shared/ui/pulse";
import {
  FilterSelect,
  SeverityBadge,
  Timestamp,
  formatAbsoluteTime,
  formatNumber,
  formatRelativeTime,
} from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrentProject } from "./ProjectShellPage";

// ── module-level constants (rules.md §1.2) ───────────────────

type StateFilter = "all" | "active" | "triggered" | "acknowledged" | "resolved";

// The newest 100 alerts; the endpoint caps a page at 100.
const ALERTS_QUERY = { limit: 100 };

const SEVERITY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "error", label: "Error" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
];

// Red while it fires, amber while someone holds it, green once it is over.
const STATE_PILL: Record<IncidentState, { label: string; tone: SurfaceTone }> = {
  triggered: { label: "Firing", tone: "red" },
  escalated: { label: "Escalated", tone: "red" },
  pending: { label: "Pending", tone: "amber" },
  acknowledged: { label: "Acknowledged", tone: "amber" },
  muted: { label: "Muted", tone: "neutral" },
  resolved: { label: "Resolved", tone: "green" },
  closed: { label: "Closed", tone: "neutral" },
  healthy: { label: "Healthy", tone: "green" },
};

const COLUMNS: SheetColumn[] = [
  { key: "incident", header: "Incident" },
  { key: "severity", header: "Severity", className: "w-[112px]" },
  { key: "state", header: "State", className: "w-[136px]" },
  { key: "started", header: "Started", className: `w-[120px] ${HIDE_BELOW_MD}` },
  { key: "duration", header: "Duration", className: `w-[112px] ${HIDE_BELOW_LG}` },
  { key: "resolved", header: "Resolved", className: `w-[120px] ${HIDE_BELOW_XL}` },
  { key: "occurrences", header: "Occurrences", className: `w-[112px] ${HIDE_BELOW_XL}`, align: "right" },
];

// Organization-level alert detail, unchanged from the previous list.
const incidentPath = (id: string) => `/alerts/${id}`;

// ── data helpers ─────────────────────────────────────────────

/**
 * The project alerts endpoint returns runtime rows that carry `state`,
 * `firstSeenAt`, and `lastSeenAt` where `AlertEvent` declares `status`,
 * `startedAt`, and `updatedAt`. Fill the declared fields from those when they
 * are missing, so the shared incident view reads the real state and times.
 */
type ProjectAlertRow = AlertEvent & {
  state?: AlertEventStatus;
  firstSeenAt?: string;
  lastSeenAt?: string;
  occurredAt?: string;
};

function toProjectIncident(event: AlertEvent): AlertIncident {
  const row = event as ProjectAlertRow;
  return toIncidentView({
    ...row,
    status: (row.status ?? row.state) as AlertEventStatus,
    startedAt: row.startedAt ?? row.firstSeenAt ?? row.occurredAt ?? row.createdAt,
    updatedAt: row.updatedAt ?? row.lastSeenAt ?? row.createdAt,
  });
}

const isOpen = (state: IncidentState) => state === "triggered" || state === "acknowledged";

function matchesState(incident: AlertIncident, filter: StateFilter): boolean {
  if (filter === "all") return true;
  if (filter === "active") return isOpen(incident.state);
  return incident.state === filter;
}

function summarize(incidents: AlertIncident[]) {
  let firing = 0;
  let acknowledged = 0;
  let resolved = 0;
  let critical = 0;
  let lastResolvedAt: string | null = null;
  let lastResolvedMs = Number.NEGATIVE_INFINITY;

  for (const incident of incidents) {
    if (incident.state === "triggered") firing += 1;
    if (incident.state === "acknowledged") acknowledged += 1;
    if (incident.severity === "critical" && isOpen(incident.state)) critical += 1;
    if (incident.state === "resolved") {
      resolved += 1;
      const ms = incident.resolvedAt ? Date.parse(incident.resolvedAt) : Number.NaN;
      if (!Number.isNaN(ms) && ms > lastResolvedMs) {
        lastResolvedMs = ms;
        lastResolvedAt = incident.resolvedAt ?? null;
      }
    }
  }

  return { firing, acknowledged, resolved, critical, open: firing + acknowledged, lastResolvedAt };
}

/**
 * Start to resolution, or start to the last refresh while it is still open.
 * `null` when the incident has neither, so the cell shows a dash instead of a
 * made-up length.
 */
function incidentDuration(incident: AlertIncident, refreshedAt: number): number | null {
  const start = Date.parse(incident.firstTriggeredAt);
  if (Number.isNaN(start)) return null;
  if (incident.resolvedAt) {
    const end = Date.parse(incident.resolvedAt);
    return Number.isNaN(end) ? null : Math.max(0, end - start);
  }
  if (!isOpen(incident.state) || refreshedAt <= 0) return null;
  return Math.max(0, refreshedAt - start);
}

/** Two units at most: 42s, 3m 12s, 5h 40m, 2d 3h. */
function formatElapsed(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    const seconds = totalSeconds % 60;
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest > 0 ? `${days}d ${rest}h` : `${days}d`;
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectAlertsPage() {
  const { projectId, orgSlug, publicId } = useCurrentProject();
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<StateFilter>("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [search, setSearch] = useState("");

  const {
    data: alertsData,
    isLoading,
    error,
    refetch,
    isRefetching,
    dataUpdatedAt,
  } = useProjectAlerts(projectId, ALERTS_QUERY);
  const { data: alertingStatus } = useProjectAlertingStatus(projectId);

  const incidents = useMemo(() => (alertsData?.data ?? []).map(toProjectIncident), [alertsData]);

  const filtered = useMemo(() => {
    return incidents.filter((incident) => {
      const matchesStatus = matchesState(incident, selectedStatus);

      const matchesSeverity = selectedSeverity === "all" || incident.severity === selectedSeverity;

      const matchesSearch =
        search.trim() === "" ||
        `${incident.title} ${incident.service} ${incident.fingerprint}`.toLowerCase().includes(search.toLowerCase());

      return matchesStatus && matchesSeverity && matchesSearch;
    });
  }, [incidents, selectedStatus, selectedSeverity, search]);

  const summary = useMemo(() => summarize(incidents), [incidents]);
  const total = alertsData?.total ?? incidents.length;
  const partial = total > incidents.length;
  const loading = isLoading && !alertsData;
  const loadFailed = Boolean(error) && !alertsData;
  const primaryDestination = alertingStatus?.connectorStatus.primary;
  const rulesPath = projectPath(orgSlug, publicId, "alert-rules");

  const clearFilters = () => {
    setSearch("");
    setSelectedStatus("all");
    setSelectedSeverity("all");
  };

  // Readings describe every loaded incident, never the current filter.
  const readouts: Readout[] = [
    {
      label: "Incidents",
      value: formatNumber(total),
      sub: partial ? `Readings use the latest ${formatNumber(incidents.length)}` : "Recorded for this project",
    },
    {
      label: "Firing",
      value: formatNumber(summary.firing),
      tone: summary.firing > 0 ? "bad" : "neutral",
      sub: summary.firing > 0 ? "Not acknowledged yet" : "Nothing firing",
    },
    {
      label: "Acknowledged",
      value: formatNumber(summary.acknowledged),
      tone: summary.acknowledged > 0 ? "warn" : "neutral",
      sub: summary.acknowledged > 0 ? "Awaiting resolution" : "None awaiting resolution",
    },
    {
      label: "Critical",
      value: formatNumber(summary.critical),
      tone: summary.critical > 0 ? "bad" : "neutral",
      sub: "Firing or acknowledged",
    },
    {
      label: "Resolved",
      value: formatNumber(summary.resolved),
      sub: summary.lastResolvedAt ? `Last ${formatRelativeTime(summary.lastResolvedAt)}` : "None resolved yet",
    },
  ];

  const stateOptions: SegmentOption<StateFilter>[] = [
    { value: "all", label: "All", count: incidents.length },
    { value: "active", label: "Open", count: summary.open },
    { value: "triggered", label: "Firing", count: summary.firing },
    { value: "acknowledged", label: "Acknowledged", count: summary.acknowledged },
    { value: "resolved", label: "Resolved", count: summary.resolved },
  ];

  let body: ReactNode;
  if (loading) {
    body = <SheetLoading rows={6} label="Loading incidents" />;
  } else if (loadFailed) {
    body = (
      <SheetError
        title="Could not load incidents"
        message={apiErrorMessage(error, "The incident list is unavailable right now.")}
        onRetry={() => void refetch()}
      />
    );
  } else if (incidents.length === 0) {
    body = (
      <SheetEmpty
        title="No incidents yet"
        description="An incident appears here when one of this project's alert rules breaches its threshold. Subscribe the project to rules and tune their thresholds in Alert rules."
        action={
          <TextLink to={rulesPath} arrow>
            Open alert rules
          </TextLink>
        }
      />
    );
  } else if (filtered.length === 0) {
    body = (
      <SheetEmpty
        title="No incidents match"
        description={
          search.trim()
            ? `Nothing matches “${search.trim()}” with the current filters.`
            : "No incident matches the current state and severity filters."
        }
        action={
          <UiButton variant="outline" size="lg" onClick={clearFilters}>
            Clear filters
          </UiButton>
        }
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Incidents for this project" minWidth={520}>
        {filtered.map((incident) => {
          const to = incidentPath(incident.id);
          const pill = STATE_PILL[incident.state] ?? STATE_PILL.healthy;
          const elapsed = incidentDuration(incident, dataUpdatedAt);
          return (
            <SheetRow key={incident.id} onActivate={() => navigate(to)}>
              <SheetCell>
                <RowTitle
                  title={incident.title || "Untitled incident"}
                  to={to}
                  subtitle={incident.fingerprint}
                  subtitleMono
                />
              </SheetCell>
              <SheetCell>
                <SeverityBadge severity={incident.severity} />
              </SheetCell>
              <SheetCell>
                <Pill tone={pill.tone} dot>
                  {pill.label}
                </Pill>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD}>
                <Timestamp value={incident.firstTriggeredAt} />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                {elapsed === null ? (
                  <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">—</span>
                ) : (
                  <span
                    className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]"
                    title={incident.resolvedAt ? undefined : "Still open. Measured to the last refresh."}
                  >
                    {formatElapsed(elapsed)}
                  </span>
                )}
              </SheetCell>
              <SheetCell className={HIDE_BELOW_XL}>
                {incident.resolvedAt ? (
                  <Timestamp value={incident.resolvedAt} />
                ) : (
                  <span className="text-[12px] text-[var(--text3)]">Not resolved</span>
                )}
              </SheetCell>
              <SheetCell className={HIDE_BELOW_XL} align="right">
                <span
                  className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]"
                  title={`Last seen ${formatAbsoluteTime(incident.lastTriggeredAt)}`}
                >
                  {formatNumber(incident.occurrenceCount ?? 0)}
                </span>
              </SheetCell>
            </SheetRow>
          );
        })}
      </SheetTable>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Incidents"
        description="Triggered incidents and threshold breaches evaluated for this project."
        meta={[
          primaryDestination
            ? { label: "Primary destination", value: `${primaryDestination.name} (${primaryDestination.type})` }
            : null,
        ]}
        actions={
          <UiButton variant="outline" size="lg" onClick={() => void refetch()} disabled={isRefetching}>
            <RefreshCw className={cn("size-4", isRefetching && "animate-spin")} aria-hidden="true" />
            Refresh
          </UiButton>
        }
      />

      <EntitlementRestrictedBanner projectId={projectId} />

      {!loadFailed && <Readouts cells={readouts} loading={loading} label="Incident summary" />}

      <Sheet
        label="Incident list"
        toolbar={
          <>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search by title, service, or fingerprint"
              label="Search incidents"
            />
            {/* Scrolls sideways on narrow screens instead of widening the page. */}
            <div className="sidebar-scroll max-w-full overflow-x-auto">
              <SegmentedControl
                value={selectedStatus}
                onChange={setSelectedStatus}
                options={stateOptions}
                ariaLabel="Filter incidents by state"
              />
            </div>
            <FilterSelect
              label="Severity"
              value={selectedSeverity}
              onChange={setSelectedSeverity}
              options={SEVERITY_OPTIONS}
            />
            {!loading && !loadFailed && (
              <ToolbarCount>
                {formatNumber(filtered.length)} {filtered.length === 1 ? "incident" : "incidents"}
              </ToolbarCount>
            )}
          </>
        }
        footer={
          partial && !loadFailed ? (
            <span>
              Showing the latest {formatNumber(incidents.length)} of {formatNumber(total)} incidents. Search and filters
              apply to these.
            </span>
          ) : undefined
        }
      >
        {body}
      </Sheet>
    </WorkspacePage>
  );
}
