import { useMemo, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";

import { EntitlementRestrictedBanner } from "@/modules/alerting/components/EntitlementRestrictedBanner";
import { IncidentStateBadge } from "@/modules/alerting/components/IncidentStateBadge";
import {
  useAlertRules,
  useDeadLetters,
  useIncidentSummary,
  useIncidents,
  useNotificationEntitlement,
} from "@/modules/alerting/hooks/useAlerting";
import type { AlertSeverity, IncidentListQuery } from "@/modules/alerting/api/types";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_MD,
  HIDE_BELOW_SM,
  ProjectPageHeader,
  Readouts,
  RowTitle,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetList,
  SheetListItem,
  SheetLoading,
  SheetRow,
  SheetTable,
  TextLink,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Pill, type SurfaceTone } from "@/shared/ui/pulse";
import { SeverityBadge, Timestamp, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";

// ── Module-level constants ───────────────────────────────────

// Incidents are the triage entity, so every incident reading on this page comes
// from the incident endpoints, the same ones /alerts reads.
const RECENT_INCIDENTS_QUERY: IncidentListQuery = { limit: 10, sortBy: "startedAt", sortOrder: "desc" };
const ACKNOWLEDGED_QUERY: IncidentListQuery = { status: "acknowledged", limit: 1 };
const RULE_PREVIEW_QUERY = { limit: 5 };
// Totals only (limit 1): the delivery state reads each status's server total,
// never a sample of the newest rows.
const DEAD_LETTER_QUERY = { limit: 1 };
const EXHAUSTED_QUERY = { status: "exhausted" as const, limit: 1 };
const RETRYING_QUERY = { status: "pending_retry" as const, limit: 1 };

const BREAKDOWN_SEVERITIES: AlertSeverity[] = ["critical", "error", "warning"];

const PATH_COLUMNS: SheetColumn[] = [
  { key: "stage", header: "Stage" },
  { key: "count", header: "Count", className: "w-[132px]", align: "right" },
  { key: "state", header: "State", className: "w-[132px]" },
];

const INCIDENT_COLUMNS: SheetColumn[] = [
  { key: "severity", header: "Severity", className: "w-[104px]" },
  { key: "incident", header: "Incident" },
  { key: "state", header: "State", className: "w-[132px]" },
  { key: "service", header: "Service", className: `w-[168px] ${HIDE_BELOW_MD}` },
  { key: "triggered", header: "Triggered", className: `w-[112px] ${HIDE_BELOW_SM}`, align: "right" },
];

const incidentPath = (id: string) => `/alerts/incidents/${id}`;

// ── Alert path model ─────────────────────────────────────────

interface PathStage {
  key: string;
  label: string;
  to: string;
  detail: string;
  /** Only stages whose count this page already loads. */
  count?: { value: string; unit: string };
  state?: { label: string; tone: SurfaceTone; live?: boolean };
}

function StageCount({ count }: { count?: PathStage["count"] }) {
  if (!count) return <span className="sr-only">Not counted here</span>;
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="font-[family-name:var(--mono)] text-[13px] tabular-nums text-[var(--text)]">{count.value}</span>
      <span className="text-[12px] text-[var(--text3)]">{count.unit}</span>
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function AlertOverviewPage() {
  const navigate = useNavigate();

  const { data: summary, isLoading: summaryLoading } = useIncidentSummary();
  const { data: acknowledgedData } = useIncidents(ACKNOWLEDGED_QUERY);
  const {
    data: recentData,
    isLoading: recentLoading,
    error: recentError,
    refetch: refetchRecent,
  } = useIncidents(RECENT_INCIDENTS_QUERY);
  const { data: allRulesData } = useAlertRules();
  const {
    data: rulesData,
    isLoading: rulesLoading,
    error: rulesError,
    refetch: refetchRules,
  } = useAlertRules(RULE_PREVIEW_QUERY);
  const { data: deadLettersData } = useDeadLetters(DEAD_LETTER_QUERY);
  const { data: exhaustedData } = useDeadLetters(EXHAUSTED_QUERY);
  const { data: retryingData } = useDeadLetters(RETRYING_QUERY);
  const { isRestricted } = useNotificationEntitlement();

  const incidents = useMemo(() => recentData?.data ?? [], [recentData]);

  // ── Derived readings ───────────────────────────────────────

  const activeCount = summary?.activeTotal ?? 0;
  const acknowledged = acknowledgedData?.total ?? 0;
  const opened = summary?.triggeredSince ?? 0;
  const resolved = summary?.resolvedSince ?? 0;
  const windowHours = summary?.windowHours;

  const breakdown = BREAKDOWN_SEVERITIES.filter((severity) => (summary?.activeBySeverity?.[severity] ?? 0) > 0)
    .map((severity) => `${formatNumber(summary?.activeBySeverity?.[severity] ?? 0)} ${severity}`)
    .join(", ");

  const allRules = allRulesData?.data ?? [];
  const totalRules = allRulesData?.total ?? allRules.length;
  const enabledRules = allRules.filter((rule) => rule.enabled).length;
  const rulesPartial = totalRules > allRules.length;

  const deadLetterCount = deadLettersData?.total ?? deadLettersData?.data.length ?? 0;
  const exhausted = (exhaustedData?.total ?? exhaustedData?.data.length ?? 0) > 0;
  const retrying = (retryingData?.total ?? retryingData?.data.length ?? 0) > 0;

  const readouts: Readout[] = [
    {
      label: "Active incidents",
      value: formatNumber(activeCount),
      tone: activeCount > 0 ? "bad" : "neutral",
      sub: activeCount === 0 ? "Nothing needs a human" : breakdown || "No critical, error, or warning",
    },
    {
      label: "Acknowledged",
      value: formatNumber(acknowledged),
      tone: acknowledged > 0 ? "warn" : "neutral",
      sub: acknowledged > 0 ? "Awaiting resolution" : "None awaiting resolution",
    },
    {
      label: windowHours ? `Opened, ${windowHours}h` : "Opened",
      value: formatNumber(opened),
      sub: `${formatNumber(resolved)} resolved in the same window`,
    },
    {
      label: "Failed deliveries",
      value: formatNumber(deadLetterCount),
      tone: exhausted ? "bad" : retrying ? "warn" : "neutral",
      sub: deadLetterCount > 0 ? "In the dead-letter queue" : "No failed deliveries",
    },
    {
      label: "Enabled rules",
      value: formatNumber(enabledRules),
      sub: rulesPartial
        ? `Of the first ${formatNumber(allRules.length)} of ${formatNumber(totalRules)} rules`
        : `Of ${formatNumber(totalRules)} ${totalRules === 1 ? "rule" : "rules"}`,
    },
  ];

  // ── The alert path, in the order an alert travels ─────────

  const stages: PathStage[] = [
    {
      key: "rules",
      label: "Rules",
      to: "/alerts/rules",
      detail: "Evaluate signals on an interval and raise an alert when a condition breaches.",
      count: allRulesData
        ? { value: `${formatNumber(enabledRules)}/${formatNumber(totalRules)}`, unit: "enabled" }
        : undefined,
      state:
        allRulesData && totalRules > 0 && enabledRules === 0 && !rulesPartial
          ? { label: "All off", tone: "neutral" }
          : undefined,
    },
    {
      key: "incidents",
      label: "Incidents",
      to: "/alerts",
      detail: "Track each alert from triggered to acknowledged to resolved.",
      count: summary ? { value: formatNumber(activeCount), unit: "active" } : undefined,
      state:
        summary
          ? activeCount > acknowledged
            ? { label: "Firing", tone: "red", live: true }
            : acknowledged > 0
              ? { label: "Acknowledged", tone: "amber", live: true }
              : { label: "Clear", tone: "green" }
          : undefined,
    },
    {
      key: "silences",
      label: "Silences",
      to: "/alerts/silences",
      detail: "Hold notifications for matching alerts during maintenance windows.",
    },
    {
      key: "routing",
      label: "Routing",
      to: "/alerts/routing",
      detail: "Match each alert to the channels that should receive it.",
    },
    {
      key: "escalations",
      label: "Escalations",
      to: "/alerts/escalations",
      detail: "Notify the next responder when an incident stays unacknowledged.",
    },
    {
      key: "templates",
      label: "Templates",
      to: "/alerts/templates",
      detail: "Format the message each channel receives.",
    },
    {
      key: "delivery",
      label: "Delivery",
      to: "/alerts/dead-letters",
      detail: isRestricted
        ? "Send notifications by email only on the current plan. Failures land in dead letters."
        : "Send notifications through connectors. Failures land in dead letters.",
      count: deadLettersData ? { value: formatNumber(deadLetterCount), unit: "dead letters" } : undefined,
      state: exhausted
        ? { label: "Exhausted", tone: "red", live: true }
        : retrying
          ? { label: "Retrying", tone: "amber", live: true }
          : isRestricted
            ? { label: "Email only", tone: "amber" }
            : deadLettersData && deadLetterCount === 0
              ? { label: "No failures", tone: "green" }
              : undefined,
    },
  ];

  // ── Recent incidents body ──────────────────────────────────

  let incidentsBody: ReactNode;
  if (recentLoading && !recentData) {
    incidentsBody = <SheetLoading rows={5} label="Loading recent incidents" />;
  } else if (recentError && !recentData) {
    incidentsBody = (
      <SheetError
        title="Could not load recent incidents"
        message={apiErrorMessage(recentError, "The incident list is unavailable right now.")}
        onRetry={() => void refetchRecent()}
      />
    );
  } else if (incidents.length === 0) {
    incidentsBody = (
      <SheetEmpty
        title="No incidents"
        description="Nothing has breached a rule across your monitored projects. An incident appears here when an enabled rule fires."
        action={
          <TextLink to="/alerts/rules" arrow>
            Review alert rules
          </TextLink>
        }
      />
    );
  } else {
    incidentsBody = (
      <SheetTable columns={INCIDENT_COLUMNS} caption="Most recent incidents across the organization" minWidth={440}>
        {incidents.map((incident) => {
          const to = incidentPath(incident.id);
          return (
            <SheetRow key={incident.id} onActivate={() => navigate(to)}>
              <SheetCell>
                <SeverityBadge severity={incident.severity} />
              </SheetCell>
              <SheetCell className="max-w-0">
                <RowTitle
                  title={incident.title || "Untitled incident"}
                  to={to}
                  subtitle={`${incident.id.slice(0, 8)} · ${incident.dimensionKey}`}
                  subtitleMono
                />
              </SheetCell>
              <SheetCell>
                <IncidentStateBadge state={incident.status} />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD}>
                <span className="block truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">
                  {incident.service ?? "—"}
                </span>
                {incident.environment && (
                  <span className="mt-0.5 block truncate text-[12px] text-[var(--text3)]">{incident.environment}</span>
                )}
              </SheetCell>
              <SheetCell className={HIDE_BELOW_SM} align="right">
                <Timestamp value={incident.startedAt} />
              </SheetCell>
            </SheetRow>
          );
        })}
      </SheetTable>
    );
  }

  // ── Rule preview body ──────────────────────────────────────

  const previewRules = rulesData?.data ?? [];
  let rulesBody: ReactNode;
  if (rulesLoading && !rulesData) {
    rulesBody = <SheetLoading rows={4} label="Loading rules" />;
  } else if (rulesError && !rulesData) {
    rulesBody = (
      <SheetError
        title="Could not load rules"
        message={apiErrorMessage(rulesError, "The rule catalog is unavailable right now.")}
        onRetry={() => void refetchRules()}
      />
    );
  } else if (previewRules.length === 0) {
    rulesBody = (
      <SheetEmpty
        title="No rules in the catalog yet"
        description="Rules decide when an alert fires. Add one from the rule catalog."
        action={
          <TextLink to="/alerts/rules" arrow>
            Open alert rules
          </TextLink>
        }
      />
    );
  } else {
    rulesBody = (
      <SheetList label="Rules in the catalog">
        {previewRules.map((rule) => (
          <SheetListItem key={rule.id} to={`/alerts/rules/${rule.id}`} muted={!rule.enabled}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[var(--text)]">{rule.name}</p>
              <p className="mt-0.5 truncate font-[family-name:var(--mono)] text-[11.5px] tabular-nums text-[var(--text3)]">
                every {rule.evaluationIntervalSeconds}s · cooldown {rule.cooldownSeconds}s
              </p>
            </div>
            <SeverityBadge severity={rule.severity} />
          </SheetListItem>
        ))}
      </SheetList>
    );
  }

  const recentTotal = recentData?.total ?? incidents.length;

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Alerting"
        description="Where each alert is in its path, from the rule that fired to the notification that went out."
        actions={
          <>
            <UiButton asChild variant="outline" size="lg">
              <Link to="/alerts/rules">Alert rules</Link>
            </UiButton>
            <UiButton asChild size="lg">
              <Link to="/alerts">Open incidents</Link>
            </UiButton>
          </>
        }
      />

      <Readouts cells={readouts} loading={summaryLoading && !summary} label="Alerting summary" />

      {isRestricted && <EntitlementRestrictedBanner showOwnerDetails={false} />}

      <Sheet
        title="Alert path"
        description="Every stage an alert passes through, in order. Each row opens the page that configures it."
      >
        <SheetTable columns={PATH_COLUMNS} caption="Alert path stages in the order an alert travels" minWidth={480}>
          {stages.map((stage, index) => (
            <SheetRow key={stage.key} onActivate={() => navigate(stage.to)}>
              <SheetCell className="max-w-0">
                <RowTitle
                  leading={
                    <span
                      aria-hidden="true"
                      className="w-4 shrink-0 text-right font-[family-name:var(--mono)] text-[11.5px] tabular-nums text-[var(--text3)]"
                    >
                      {index + 1}
                    </span>
                  }
                  title={stage.label}
                  to={stage.to}
                  subtitle={stage.detail}
                />
              </SheetCell>
              <SheetCell align="right">
                <StageCount count={stage.count} />
              </SheetCell>
              <SheetCell>
                {stage.state ? (
                  <Pill tone={stage.state.tone} dot={stage.state.live}>
                    {stage.state.label}
                  </Pill>
                ) : (
                  <span className="sr-only">No state</span>
                )}
              </SheetCell>
            </SheetRow>
          ))}
        </SheetTable>
      </Sheet>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Sheet
          title="Recent incidents"
          description="The newest incidents across your monitored projects."
          footer={
            <>
              <span>
                {incidents.length > 0 && (
                  <>
                    Showing <span className="font-[family-name:var(--mono)] tabular-nums">{formatNumber(incidents.length)}</span>{" "}
                    of <span className="font-[family-name:var(--mono)] tabular-nums">{formatNumber(recentTotal)}</span>
                  </>
                )}
              </span>
              <TextLink to="/alerts" size="sm" arrow>
                View all incidents
              </TextLink>
            </>
          }
        >
          {incidentsBody}
        </Sheet>

        <Sheet
          title="Rules"
          description="The first rules in the organization catalog."
          footer={
            <>
              <span />
              <TextLink to="/alerts/rules" size="sm" arrow>
                View all rules
              </TextLink>
            </>
          }
        >
          {rulesBody}
        </Sheet>
      </div>
    </WorkspacePage>
  );
}
