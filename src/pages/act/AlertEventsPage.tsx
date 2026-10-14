import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  useAlertEvents,
  useAlertEventStats,
  useAlertEventMutations,
  useNotificationEntitlement,
} from "@/modules/alerting/hooks/useAlerting";
import { IncidentStateBadge } from "@/modules/alerting/components/IncidentStateBadge";
import { toIncidentView } from "@/modules/alerting/components/incident-view";
import { EntitlementRestrictedBanner } from "@/modules/alerting/components/EntitlementRestrictedBanner";
import type { AlertIncident, IncidentState } from "@/modules/alerting/api/types";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  HIDE_BELOW_XL,
  ProjectPageHeader,
  Readouts,
  RowActions,
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
import { SegmentedControl, type SegmentOption } from "@/shared/ui/pulse";
import { FilterSelect, SeverityBadge, Timestamp, formatAbsoluteTime, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// ── module-level constants ───────────────────────────────────

type StateFilter = "all" | "triggered" | "acknowledged" | "escalated" | "muted" | "resolved";

// The newest 150 events; the page filters these in the browser.
const EVENTS_QUERY = { limit: 150 };

const STATE_FILTERS: Array<{ value: StateFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "triggered", label: "Triggered" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "escalated", label: "Escalated" },
  { value: "muted", label: "Muted" },
  { value: "resolved", label: "Resolved" },
];

const SEVERITY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "error", label: "Error" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
];

const COLUMNS: SheetColumn[] = [
  { key: "severity", header: "Severity", className: "w-[104px]" },
  { key: "event", header: "Event" },
  { key: "state", header: "State", className: "w-[132px]" },
  { key: "service", header: "Service", className: `w-[168px] ${HIDE_BELOW_LG}` },
  { key: "duration", header: "Duration", className: `w-[104px] ${HIDE_BELOW_MD}` },
  { key: "occurrences", header: "Occurrences", className: `w-[108px] ${HIDE_BELOW_XL}`, align: "right" },
  { key: "last", header: "Last triggered", className: `w-[124px] ${HIDE_BELOW_XL}` },
  { key: "actions", header: "Actions", className: "w-[148px]", align: "right", srOnly: true },
];

// Detail route is `events/:eventId`; `/alerts/:id` matches no route.
const eventPath = (id: string) => `/alerts/events/${id}`;

// ── helpers ──────────────────────────────────────────────────

// States in which the event is still running, so its duration is measured
// to the last refresh.
const LIVE_STATES = new Set<IncidentState>(["pending", "triggered", "acknowledged", "escalated"]);

/**
 * Start to resolution, or start to the last refresh while it is still live.
 * `null` when neither is known, so the cell shows a dash.
 */
function eventDuration(incident: AlertIncident, refreshedAt: number): number | null {
  const start = Date.parse(incident.firstTriggeredAt);
  if (Number.isNaN(start)) return null;
  if (incident.resolvedAt) {
    const end = Date.parse(incident.resolvedAt);
    return Number.isNaN(end) ? null : Math.max(0, end - start);
  }
  if (!LIVE_STATES.has(incident.state) || refreshedAt <= 0) return null;
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

function formatMinutes(minutes: number): string {
  return formatElapsed(Math.max(0, minutes) * 60_000);
}

const MONO_NUM = "font-[family-name:var(--mono)] text-[12px] tabular-nums";

// ── page ─────────────────────────────────────────────────────

export default function AlertEventsPage() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState<StateFilter>("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [search, setSearch] = useState("");

  const { data: statsData, isLoading: statsLoading } = useAlertEventStats();
  const {
    data: eventsData,
    isLoading,
    error,
    refetch,
    isRefetching,
    dataUpdatedAt,
  } = useAlertEvents(EVENTS_QUERY);
  const { isRestricted } = useNotificationEntitlement();
  const mutations = useAlertEventMutations();

  const incidents = useMemo(() => (eventsData?.data ?? []).map(toIncidentView), [eventsData]);

  const countsByState = useMemo(() => {
    const map: Record<string, number> = { all: incidents.length };
    for (const inc of incidents) {
      map[inc.state] = (map[inc.state] ?? 0) + 1;
    }
    return map;
  }, [incidents]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return incidents.filter((incident) => {
      const matchesTab = selectedTab === "all" || incident.state === selectedTab;
      const matchesSeverity = selectedSeverity === "all" || incident.severity === selectedSeverity;
      const matchesSearch =
        needle === "" ||
        `${incident.title} ${incident.service} ${incident.environment} ${incident.fingerprint}`
          .toLowerCase()
          .includes(needle);

      return matchesTab && matchesSeverity && matchesSearch;
    });
  }, [incidents, selectedTab, selectedSeverity, search]);

  const handleQuickAck = async (id: string) => {
    try {
      await mutations.acknowledge.mutateAsync({ id, body: { comment: "Quick acknowledge from command center" } });
      toast.success("Event acknowledged");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not acknowledge the event. Try again."));
    }
  };

  const handleQuickResolve = async (id: string) => {
    try {
      await mutations.resolve.mutateAsync({ id, body: { reason: "Resolved manually from command center" } });
      toast.success("Event resolved");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not resolve the event. Try again."));
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedTab("all");
    setSelectedSeverity("all");
  };

  const loading = isLoading && !eventsData;
  const loadFailed = Boolean(error) && !eventsData;
  const total = eventsData?.total ?? incidents.length;
  const partial = total > incidents.length;
  const filtersActive = search.trim() !== "" || selectedTab !== "all" || selectedSeverity !== "all";

  // Readings come from the stats endpoint, so they describe every event in the
  // organization rather than the loaded page or the current filter.
  const active = statsData?.active;
  const acknowledged = statsData?.acknowledged;
  const triggered24h = statsData?.total24h;
  const resolved24h = statsData?.resolved24h;
  const mttr = statsData?.mttrMinutes;
  const readouts: Readout[] = [
    {
      label: "Active",
      value: active === undefined ? "—" : formatNumber(active),
      tone: active && active > 0 ? "bad" : "neutral",
      sub: active === undefined ? "Not reported" : active > 0 ? "Not resolved yet" : "Nothing active",
    },
    {
      label: "Acknowledged",
      value: acknowledged === undefined ? "—" : formatNumber(acknowledged),
      tone: acknowledged && acknowledged > 0 ? "warn" : "neutral",
      sub: acknowledged === undefined ? "Not reported" : acknowledged > 0 ? "Awaiting resolution" : "None awaiting resolution",
    },
    {
      label: "Triggered",
      value: triggered24h === undefined ? "—" : formatNumber(triggered24h),
      sub: "Last 24 hours",
    },
    {
      label: "Resolved",
      value: resolved24h === undefined ? "—" : formatNumber(resolved24h),
      sub: "Last 24 hours",
    },
    {
      label: "Mean time to resolve",
      value: mttr === undefined || mttr === null ? "—" : formatMinutes(mttr),
      sub: mttr === undefined || mttr === null ? "No resolutions to measure" : "Start to resolution",
    },
  ];

  const stateOptions: SegmentOption<StateFilter>[] = STATE_FILTERS.map((filter) => ({
    ...filter,
    count: countsByState[filter.value] ?? 0,
  }));

  let body: ReactNode;
  if (loading) {
    body = <SheetLoading rows={8} label="Loading alert events" />;
  } else if (loadFailed) {
    body = (
      <SheetError
        title="Could not load alert events"
        message={apiErrorMessage(error, "The event list is unavailable right now.")}
        onRetry={() => void refetch()}
      />
    );
  } else if (incidents.length === 0) {
    body = (
      <SheetEmpty
        title="No alert events yet"
        description="An event is recorded here each time an alert rule fires. Enable or tune rules in Alert rules."
        action={
          <TextLink to="/alerts/rules" arrow>
            Open alert rules
          </TextLink>
        }
      />
    );
  } else if (filtered.length === 0) {
    body = (
      <SheetEmpty
        title="No events match"
        description={
          search.trim()
            ? `Nothing matches “${search.trim()}” with the current filters.`
            : "No event matches the current state and severity filters."
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
      <SheetTable columns={COLUMNS} caption="Alert events across the organization" minWidth={600}>
        {filtered.map((incident) => {
          const to = eventPath(incident.id);
          const title = incident.title || "Untitled event";
          const isFiring = incident.state === "triggered";
          const isAcked = incident.state === "acknowledged";
          const isResolved = incident.state === "resolved";
          const ackPending = mutations.acknowledge.isPending && mutations.acknowledge.variables?.id === incident.id;
          const resolvePending = mutations.resolve.isPending && mutations.resolve.variables?.id === incident.id;
          const duration = eventDuration(incident, dataUpdatedAt);
          const hasService = incident.service !== "unknown";
          const hasEnvironment = incident.environment !== "unknown";

          return (
            <SheetRow key={incident.id} onActivate={() => navigate(to)}>
              <SheetCell>
                <SeverityBadge severity={incident.severity} />
              </SheetCell>
              <SheetCell>
                <RowTitle title={title} to={to} subtitle={incident.fingerprint} subtitleMono />
              </SheetCell>
              <SheetCell>
                <IncidentStateBadge state={incident.state} />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                <div className="min-w-0">
                  <div
                    className={cn(
                      "truncate font-[family-name:var(--mono)] text-[12px]",
                      hasService ? "text-[var(--text)]" : "text-[var(--text3)]",
                    )}
                  >
                    {hasService ? incident.service : "No service label"}
                  </div>
                  {hasEnvironment && (
                    <div className="mt-0.5 truncate text-[12px] text-[var(--text3)]">{incident.environment}</div>
                  )}
                </div>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD}>
                {duration === null ? (
                  <span className={cn(MONO_NUM, "text-[var(--text3)]")}>—</span>
                ) : (
                  <span
                    className={cn(MONO_NUM, "text-[var(--text2)]")}
                    title={incident.resolvedAt ? undefined : "Still running. Measured to the last refresh."}
                  >
                    {formatElapsed(duration)}
                  </span>
                )}
              </SheetCell>
              <SheetCell className={HIDE_BELOW_XL} align="right">
                <span
                  className={cn(MONO_NUM, "text-[var(--text2)]")}
                  title={`Last triggered ${formatAbsoluteTime(incident.lastTriggeredAt)}`}
                >
                  {formatNumber(incident.occurrenceCount ?? 0)}
                </span>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_XL}>
                <Timestamp value={incident.lastTriggeredAt} />
              </SheetCell>
              <SheetCell align="right">
                <div className="flex items-center justify-end gap-1.5">
                  {isFiring && (
                    <UiButton
                      variant="outline"
                      size="sm"
                      disabled={ackPending}
                      onClick={() => void handleQuickAck(incident.id)}
                      aria-label={`Acknowledge ${title}`}
                    >
                      Acknowledge
                    </UiButton>
                  )}
                  {isAcked && (
                    <UiButton
                      variant="outline"
                      size="sm"
                      disabled={resolvePending}
                      onClick={() => void handleQuickResolve(incident.id)}
                      aria-label={`Resolve ${title}`}
                    >
                      Resolve
                    </UiButton>
                  )}
                  <RowActions label={`Actions for ${title}`}>
                    <DropdownMenuItem asChild>
                      <Link to={to}>Open event</Link>
                    </DropdownMenuItem>
                    {!isResolved && !isAcked && (
                      <DropdownMenuItem disabled={resolvePending} onSelect={() => void handleQuickResolve(incident.id)}>
                        Resolve
                      </DropdownMenuItem>
                    )}
                  </RowActions>
                </div>
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
        title="Alert events"
        description={
          <>
            Raw rule firings across every project, kept for forensics. Incidents are the triage view:{" "}
            <TextLink to="/alerts">open incidents</TextLink>.
          </>
        }
        actions={
          <>
            <UiButton asChild variant="outline" size="lg">
              <Link to="/alerts/overview">Overview</Link>
            </UiButton>
            <UiButton variant="outline" size="lg" onClick={() => void refetch()} disabled={isRefetching}>
              <RefreshCw className={cn("size-4", isRefetching && "animate-spin")} aria-hidden="true" />
              Refresh
            </UiButton>
          </>
        }
      />

      <Readouts cells={readouts} loading={statsLoading && !statsData} label="Alert event summary" />

      {isRestricted && <EntitlementRestrictedBanner showOwnerDetails={false} />}

      <Sheet
        label="Alert event list"
        toolbar={
          <>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search by title, service, environment, or fingerprint"
              label="Search alert events"
            />
            {/* Scrolls sideways on narrow screens instead of widening the page. */}
            <div className="sidebar-scroll max-w-full overflow-x-auto">
              <SegmentedControl
                value={selectedTab}
                onChange={setSelectedTab}
                options={stateOptions}
                ariaLabel="Filter alert events by state"
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
                {filtersActive
                  ? `${formatNumber(filtered.length)} of ${formatNumber(incidents.length)}`
                  : formatNumber(filtered.length)}{" "}
                {incidents.length === 1 ? "event" : "events"}
              </ToolbarCount>
            )}
          </>
        }
        footer={
          partial && !loadFailed ? (
            <span>
              Showing the latest <span className="font-[family-name:var(--mono)] tabular-nums">{formatNumber(incidents.length)}</span>{" "}
              of <span className="font-[family-name:var(--mono)] tabular-nums">{formatNumber(total)}</span> events. Search
              and filters apply to these.
            </span>
          ) : undefined
        }
      >
        {body}
      </Sheet>
    </WorkspacePage>
  );
}
