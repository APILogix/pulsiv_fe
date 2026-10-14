/**
 * Incident detail (design/alerting/DESIGN.md, detail anatomy).
 *
 * Header on the canvas, a readout band, then three views: overview (what fired
 * and the lifecycle), timeline, and notifications.
 *
 * Data comes from three separately-paginated endpoints (incident, timeline,
 * notifications) rather than one fat payload, so the detail view cannot become an
 * unbounded response. Telemetry evidence is deliberately NOT embedded: the
 * incident carries the observed/threshold snapshot only, and deeper forensics
 * link out to the telemetry surfaces.
 */
import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import {
  useIncident,
  useIncidentMutations,
  useIncidentNotifications,
  useIncidentTimeline,
} from "@/modules/alerting/hooks/useAlerting";
import { IncidentStateBadge } from "@/modules/alerting/components/IncidentStateBadge";
import { deliveryTone, labelize } from "@/modules/alerting/components/alerting-ui";
import type { Incident, IncidentNotification, IncidentTimelineEntry } from "@/modules/alerting/api/types";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_MD,
  HIDE_BELOW_SM,
  PageTabs,
  ProjectPageHeader,
  Readouts,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  TextLink,
  WorkspacePage,
  pageTabPanelProps,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import {
  CodeBlock,
  KeyValueList,
  SeverityBadge,
  Timestamp,
  formatAbsoluteTime,
  formatNumber,
  formatRelativeTime,
  type KeyValueItem,
} from "@/shared/observe";
import { Panel, Pill, type SurfaceTone } from "@/shared/ui/pulse";
import { Button as UiButton } from "@/components/ui/button";

type DetailTab = "overview" | "timeline" | "notifications";

const TAB_ID = "incident-detail";
const INCIDENTS_PATH = "/alerts/incidents";
const INCIDENT_CRUMB = { label: "Incidents", to: INCIDENTS_PATH };

const TIMELINE_QUERY = { limit: 100 };
const NOTIFICATIONS_QUERY = { limit: 50 };

/** Timeline entry kinds emitted by the incidents service, as state pills. */
const TIMELINE_KIND: Record<string, { label: string; tone: SurfaceTone }> = {
  incident_opened: { label: "Opened", tone: "red" },
  condition_still_breaching: { label: "Still breaching", tone: "red" },
  incident_acknowledged: { label: "Acknowledged", tone: "amber" },
  incident_resolved: { label: "Resolved", tone: "green" },
};

const NOTIFICATION_COLUMNS: SheetColumn[] = [
  { key: "channel", header: "Channel" },
  { key: "status", header: "Status", className: "w-[120px]" },
  { key: "attempt", header: "Attempt", className: `w-[88px] ${HIDE_BELOW_SM}`, align: "right" },
  { key: "latency", header: "Latency", className: `w-[96px] ${HIDE_BELOW_MD}`, align: "right" },
  { key: "failure", header: "Failure", className: `w-[160px] ${HIDE_BELOW_MD}` },
  { key: "at", header: "At", className: "w-[120px]" },
];

const MONO = "font-[family-name:var(--mono)] tabular-nums";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

/** Seconds from the incident opening to its acknowledgement, or null. */
function secondsToAcknowledge(incident: Incident): number | null {
  if (!incident.acknowledgedAt) return null;
  const start = Date.parse(incident.startedAt);
  const ack = Date.parse(incident.acknowledgedAt);
  if (Number.isNaN(start) || Number.isNaN(ack)) return null;
  return Math.max(0, Math.round((ack - start) / 1000));
}

const sans = (value: ReactNode) => <span className="font-[family-name:var(--sans)]">{value}</span>;

function buildReadouts(incident: Incident): Readout[] {
  const ackSeconds = secondsToAcknowledge(incident);
  return [
    {
      label: "Occurrences",
      value: formatNumber(incident.occurrenceCount),
      sub: "Matched evaluations folded in",
    },
    {
      label: "Observed",
      value: incident.observedValue === null ? "—" : String(incident.observedValue),
      sub: incident.thresholdValue === null ? "No threshold recorded" : `Threshold ${incident.thresholdValue}`,
    },
    {
      label: "Last seen",
      value: formatRelativeTime(incident.lastSeenAt),
      sub: formatAbsoluteTime(incident.lastSeenAt),
      title: formatAbsoluteTime(incident.lastSeenAt),
    },
    ackSeconds !== null
      ? { label: "Time to acknowledge", value: formatDuration(ackSeconds), sub: "From opening" }
      : incident.status === "open"
        ? { label: "Time to acknowledge", value: sans("Not yet"), tone: "bad", sub: "Needs a human" }
        : { label: "Time to acknowledge", value: sans("Skipped"), sub: "Resolved without acknowledgement" },
  ];
}

// ── Timeline ─────────────────────────────────────────────────

function TimelineRow({ entry }: { entry: IncidentTimelineEntry }) {
  const kind = TIMELINE_KIND[entry.kind] ?? { label: labelize(entry.kind.replace(/^incident_/, "")), tone: "neutral" };
  const hasDetail = Object.keys(entry.detail ?? {}).length > 0;
  return (
    <li className="grid gap-x-5 gap-y-1.5 px-5 py-3 sm:grid-cols-[176px_minmax(0,1fr)]">
      <time
        dateTime={entry.at}
        title={formatRelativeTime(entry.at)}
        className={`${MONO} pt-0.5 text-[12px] text-[var(--text3)]`}
      >
        {formatAbsoluteTime(entry.at)}
      </time>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={kind.tone}>{kind.label}</Pill>
          <span className="text-[12px] text-[var(--text3)]">
            by {entry.actorType}
            {entry.actorUserId && (
              <>
                {" "}
                <span className={`${MONO} text-[11.5px] text-[var(--text2)]`}>{entry.actorUserId.slice(0, 8)}</span>
              </>
            )}
          </span>
        </div>
        {hasDetail && (
          <CodeBlock maxHeight={160} className="mt-2 p-2.5 text-[11.5px]">
            {JSON.stringify(entry.detail)}
          </CodeBlock>
        )}
      </div>
    </li>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function IncidentDetailPage() {
  const { incidentId = "" } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<DetailTab>("overview");

  const { data: incident, isLoading, isError, error, refetch } = useIncident(incidentId);
  const timelineQuery = useIncidentTimeline(incidentId, TIMELINE_QUERY);
  const notificationsQuery = useIncidentNotifications(incidentId, NOTIFICATIONS_QUERY);
  const mutations = useIncidentMutations(incidentId);

  const timeline = timelineQuery.data;
  const notifications = notificationsQuery.data;

  if (isLoading && !incident) {
    return (
      <WorkspacePage>
        <ProjectPageHeader crumbs={[INCIDENT_CRUMB, { label: "Loading" }]} title="Incident" />
        <Readouts
          loading
          label="Incident summary"
          cells={[
            { label: "Occurrences", value: null },
            { label: "Observed", value: null },
            { label: "Last seen", value: null },
            { label: "Time to acknowledge", value: null },
          ]}
        />
        <Sheet label="Incident">
          <SheetLoading rows={6} label="Loading incident" />
        </Sheet>
      </WorkspacePage>
    );
  }

  if (isError || !incident) {
    return (
      <WorkspacePage>
        <ProjectPageHeader
          crumbs={[INCIDENT_CRUMB, { label: incidentId ? incidentId.slice(0, 8) : "Incident" }]}
          title="Incident"
          actions={
            <UiButton variant="outline" size="lg" onClick={() => navigate(INCIDENTS_PATH)}>
              Back to incidents
            </UiButton>
          }
        />
        <Sheet label="Incident">
          <SheetError
            title="Could not load this incident"
            message={apiErrorMessage(error, "The incident is unavailable or no longer exists.")}
            onRetry={() => void refetch()}
          />
        </Sheet>
      </WorkspacePage>
    );
  }

  const acknowledge = async () => {
    try {
      await mutations.acknowledge.mutateAsync(incident.id);
      toast.success("Incident acknowledged");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const resolve = async () => {
    try {
      await mutations.resolve.mutateAsync({ id: incident.id, reason: "manually_resolved" });
      toast.success("Incident resolved");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const title = incident.title || "Untitled incident";
  const resolved = incident.status === "resolved";
  const timelineTotal = timeline?.total;
  const notificationsTotal = notifications?.total;

  const triggerFacts: KeyValueItem[] = [
    { label: "Observed value", value: incident.observedValue === null ? null : String(incident.observedValue), mono: true },
    { label: "Threshold", value: incident.thresholdValue === null ? null : String(incident.thresholdValue), mono: true },
    {
      label: "Rule",
      value: incident.ruleId ? `${incident.ruleId.slice(0, 8)} · rev ${incident.ruleRevision ?? "—"}` : null,
      text: incident.ruleId ?? undefined,
      mono: true,
    },
    { label: "Grouping", value: incident.dimensionKey, mono: true },
    { label: "Fingerprint", value: incident.fingerprint, mono: true, copyable: true },
    { label: "Incident ID", value: incident.id, mono: true, copyable: true },
    {
      label: "Project",
      value: incident.projectId ?? "Organization-level",
      mono: Boolean(incident.projectId),
    },
    { label: "Environment", value: incident.environment },
    { label: "Service", value: incident.service },
    { label: "Route", value: incident.route, mono: true },
  ];

  const lifecycleFacts: KeyValueItem[] = [
    { label: "Started", value: formatAbsoluteTime(incident.startedAt), mono: true },
    {
      label: "Acknowledged",
      value: incident.acknowledgedAt ? formatAbsoluteTime(incident.acknowledgedAt) : null,
      mono: true,
    },
    { label: "Acknowledged by", value: incident.acknowledgedBy, mono: true },
    { label: "Assigned to", value: incident.assignedTo, mono: true },
    ...(resolved
      ? [
          {
            label: "Resolved",
            value: incident.resolvedAt ? formatAbsoluteTime(incident.resolvedAt) : null,
            mono: true,
          },
          { label: "Reason", value: incident.resolutionReason ? labelize(incident.resolutionReason) : null },
          {
            label: "Resolved by",
            value: incident.resolvedBy ?? "System (auto)",
            mono: Boolean(incident.resolvedBy),
          },
        ]
      : []),
  ];

  let tabBody: ReactNode;
  if (tab === "overview") {
    tabBody = (
      <div className="flex flex-col gap-6">
        <Panel
          title="Trigger"
          description="What the rule observed when it opened this incident."
          actions={
            incident.ruleId ? (
              <TextLink to={`/alerts/rules/${incident.ruleId}`} size="sm" arrow>
                View alert rule
              </TextLink>
            ) : undefined
          }
          bodyClassName="px-5 pb-3 pt-1"
        >
          <KeyValueList items={triggerFacts} />
        </Panel>
        <Panel
          title="Lifecycle"
          description={
            resolved ? "Who handled this incident and how it closed." : "Who has this incident. It is still running."
          }
          bodyClassName="px-5 pb-3 pt-1"
        >
          <KeyValueList items={lifecycleFacts} />
          {incident.resolutionReason === "auto_resolved" && (
            <p className="mt-3 max-w-[72ch] text-[12px] leading-[1.55] text-[var(--text3)]">
              Closed by the auto-resolve deadline. This is a timeout, not a verified recovery: the condition was not
              observed returning to normal.
            </p>
          )}
        </Panel>
      </div>
    );
  } else if (tab === "timeline") {
    const entries = timeline?.data ?? [];
    tabBody = (
      <Sheet
        label="Incident timeline"
        footer={
          timeline && timeline.total > entries.length ? (
            <span>
              Showing the first <span className={MONO}>{formatNumber(entries.length)}</span> of{" "}
              <span className={MONO}>{formatNumber(timeline.total)}</span> entries
            </span>
          ) : undefined
        }
      >
        {timelineQuery.isLoading && !timeline ? (
          <SheetLoading rows={4} label="Loading timeline" />
        ) : timelineQuery.isError && !timeline ? (
          <SheetError
            title="Could not load the timeline"
            message={apiErrorMessage(timelineQuery.error)}
            onRetry={() => void timelineQuery.refetch()}
          />
        ) : entries.length === 0 ? (
          <SheetEmpty
            title="No timeline entries recorded"
            description="Entries appear as the incident opens, keeps breaching, is acknowledged, and resolves."
          />
        ) : (
          <ol aria-label="Timeline entries" className="divide-y divide-[var(--border)]">
            {entries.map((entry, index) => (
              <TimelineRow key={`${entry.at}-${entry.kind}-${index}`} entry={entry} />
            ))}
          </ol>
        )}
      </Sheet>
    );
  } else {
    const attempts: IncidentNotification[] = notifications?.data ?? [];
    tabBody = (
      <Sheet
        label="Notification attempts"
        footer={
          notifications && notifications.total > attempts.length ? (
            <span>
              Showing <span className={MONO}>{formatNumber(attempts.length)}</span> of{" "}
              <span className={MONO}>{formatNumber(notifications.total)}</span> attempts
            </span>
          ) : undefined
        }
      >
        {notificationsQuery.isLoading && !notifications ? (
          <SheetLoading rows={4} label="Loading notifications" />
        ) : notificationsQuery.isError && !notifications ? (
          <SheetError
            title="Could not load notification attempts"
            message={apiErrorMessage(notificationsQuery.error)}
            onRetry={() => void notificationsQuery.refetch()}
          />
        ) : attempts.length === 0 ? (
          <SheetEmpty
            title="No delivery attempts recorded"
            description="Attempts appear here when routing sends this incident to a channel."
          />
        ) : (
          <SheetTable columns={NOTIFICATION_COLUMNS} caption="Notification attempts for this incident" minWidth={420}>
            {attempts.map((attempt) => (
              <SheetRow key={attempt.id}>
                <SheetCell>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] text-[var(--text)]">{labelize(attempt.channelKind)}</div>
                    {attempt.provider && (
                      <div className="mt-0.5 truncate text-[12px] text-[var(--text3)]">{attempt.provider}</div>
                    )}
                  </div>
                </SheetCell>
                <SheetCell>
                  <Pill tone={deliveryTone(attempt.status)} dot>
                    {labelize(attempt.status)}
                  </Pill>
                </SheetCell>
                <SheetCell className={HIDE_BELOW_SM} align="right">
                  <span className={`${MONO} text-[12px] text-[var(--text2)]`}>{attempt.attemptNumber ?? "—"}</span>
                </SheetCell>
                <SheetCell className={HIDE_BELOW_MD} align="right">
                  <span className={`${MONO} text-[12px] text-[var(--text2)]`}>
                    {attempt.latencyMs === null ? "—" : `${formatNumber(attempt.latencyMs)}ms`}
                  </span>
                </SheetCell>
                {/* Category only, never a provider response body or credential. */}
                <SheetCell className={HIDE_BELOW_MD}>
                  <span className="text-[12px] text-[var(--text2)]">
                    {attempt.errorCategory ? labelize(attempt.errorCategory) : "—"}
                  </span>
                </SheetCell>
                <SheetCell>
                  <Timestamp value={attempt.at} />
                </SheetCell>
              </SheetRow>
            ))}
          </SheetTable>
        )}
      </Sheet>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        crumbs={[INCIDENT_CRUMB, { label: incident.id.slice(0, 8) }]}
        title={title}
        badges={
          <>
            <SeverityBadge severity={incident.severity} />
            <IncidentStateBadge state={incident.status} />
          </>
        }
        meta={[
          incident.service ? { label: "Service", value: incident.service } : null,
          incident.environment ? { label: "Environment", value: incident.environment } : null,
          incident.route ? { label: "Route", value: incident.route, mono: true } : null,
          { label: "Started", value: <Timestamp value={incident.startedAt} /> },
          {
            label: resolved ? "Lasted" : "Running for",
            value: formatDuration(incident.durationSeconds),
            mono: true,
          },
        ]}
        actions={
          <>
            {incident.status === "open" && (
              <UiButton size="lg" onClick={() => void acknowledge()} disabled={mutations.acknowledge.isPending}>
                {mutations.acknowledge.isPending ? "Acknowledging…" : "Acknowledge"}
              </UiButton>
            )}
            {!resolved && (
              <UiButton
                variant={incident.status === "open" ? "outline" : "default"}
                size="lg"
                onClick={() => void resolve()}
                disabled={mutations.resolve.isPending}
              >
                {mutations.resolve.isPending ? "Resolving…" : "Resolve"}
              </UiButton>
            )}
          </>
        }
      />

      <Readouts cells={buildReadouts(incident)} label="Incident summary" />

      <div className="flex flex-col gap-4">
        <PageTabs<DetailTab>
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "timeline", label: "Timeline", count: timelineTotal },
            { value: "notifications", label: "Notifications", count: notificationsTotal },
          ]}
          value={tab}
          onChange={setTab}
          label="Incident views"
          idBase={TAB_ID}
        />
        <div {...pageTabPanelProps(TAB_ID, tab)} className="min-w-0">
          {tabBody}
        </div>
      </div>
    </WorkspacePage>
  );
}
