/**
 * Organization incidents: the triage surface and the /alerts index route
 * (design/alerting/DESIGN.md, first viewport).
 *
 * Everything expensive happens on the SERVER:
 *   - filtering, sorting and pagination are query params, never client-side
 *     narrowing of an already-downloaded list;
 *   - the page never assumes it received the full dataset (`total` drives
 *     paging, `data.length` never does).
 *
 * Filters are persisted in the URL so an incident view is shareable and survives
 * a reload, which matters during an active incident review.
 */
import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useIncidents, useIncidentMutations, useIncidentSummary } from "@/modules/alerting/hooks/useAlerting";
import { IncidentStateBadge } from "@/modules/alerting/components/IncidentStateBadge";
import type { Incident, IncidentListQuery, IncidentStatus } from "@/modules/alerting/api/types";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  HIDE_BELOW_SM,
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
import { FilterSelect, SeverityBadge, Timestamp, formatNumber } from "@/shared/observe";
import { fieldInputClass } from "@/shared/ui/pulse";
import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

type SortKey = NonNullable<IncidentListQuery["sortBy"]>;

/** Default view when the URL has no `status`: everything that still needs a human. */
const DEFAULT_STATUS = "active";
/** Explicit "no status filter" value, so it survives the empty-param cleanup in `setParam`. */
const ALL_STATUSES = "all";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: DEFAULT_STATUS, label: "Active (open and acknowledged)" },
  { value: "open", label: "Open" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "resolved", label: "Resolved" },
  { value: ALL_STATUSES, label: "All statuses" },
];

const SEVERITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "error", label: "Error" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
];

const incidentPath = (id: string) => `/alerts/incidents/${id}`;

const MONO_CELL = "font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]";
const QUIET_DASH = <span className="text-[12px] text-[var(--text3)]">—</span>;

/** Compact human duration. Incidents commonly run for days, so days are included. */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

/** Column header that toggles the server-side sort. */
function SortButton({
  label,
  sortKey,
  sortBy,
  sortOrder,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sortBy: SortKey;
  sortOrder: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const active = sortBy === sortKey;
  const Icon = !active ? ArrowUpDown : sortOrder === "desc" ? ArrowDown : ArrowUp;
  const state = active ? (sortOrder === "desc" ? ", sorted descending" : ", sorted ascending") : "";
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      aria-label={`Sort by ${label.toLowerCase()}${state}`}
      className={cn(
        "-mx-1 inline-flex items-center gap-1 rounded-[var(--radius)] px-1 py-0.5 transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]",
        active && "text-[var(--text2)]",
      )}
    >
      {label}
      <Icon className={cn("size-3", !active && "opacity-50")} aria-hidden="true" />
    </button>
  );
}

export default function IncidentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL is the single source of truth for filter state.
  const page = Math.max(0, Number(searchParams.get("page") ?? 0));
  const statusParam = searchParams.get("status") ?? DEFAULT_STATUS;
  const severity = searchParams.get("severity") ?? "";
  const projectId = searchParams.get("projectId") ?? "";
  const service = searchParams.get("service") ?? "";
  const search = searchParams.get("q") ?? "";
  const sortBy = (searchParams.get("sortBy") ?? "startedAt") as SortKey;
  const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

  // Text inputs hold a draft and commit to the URL on Enter or blur. When the
  // URL changes underneath them (back/forward, clear filters) the draft follows.
  const [searchDraft, setSearchDraft] = useState(search);
  const [serviceDraft, setServiceDraft] = useState(service);
  const [syncedSearch, setSyncedSearch] = useState(search);
  const [syncedService, setSyncedService] = useState(service);
  if (search !== syncedSearch) {
    setSyncedSearch(search);
    setSearchDraft(search);
  }
  if (service !== syncedService) {
    setSyncedService(service);
    setServiceDraft(service);
  }

  const setParam = useCallback(
    (updates: Record<string, string | number | undefined>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      // Any filter change resets paging: page 3 of the old filter is meaningless.
      if (!("page" in updates)) next.delete("page");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  /**
   * Translate the UI's single status control into the backend contract, which
   * separates an explicit `status` from the `active` shorthand facet.
   */
  const query: IncidentListQuery = useMemo(() => {
    const base: IncidentListQuery = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      sortBy,
      sortOrder,
    };
    if (statusParam === DEFAULT_STATUS) base.active = true;
    else if (statusParam && statusParam !== ALL_STATUSES) base.status = statusParam as IncidentStatus;
    if (severity) base.severity = severity as IncidentListQuery["severity"];
    if (projectId) base.projectId = projectId;
    if (service) base.service = service;
    if (search) base.search = search;
    return base;
  }, [page, sortBy, sortOrder, statusParam, severity, projectId, service, search]);

  const { data, isLoading, isFetching, isError, error, refetch } = useIncidents(query);
  const mutations = useIncidentMutations();
  // Organization-wide counters (one grouped query), independent of the filters below.
  const { data: summary, isLoading: summaryLoading, isError: summaryFailed } = useIncidentSummary();

  const windowLabel = summary ? `Last ${summary.windowHours}h` : "In the summary window";
  const criticalActive = summary?.activeBySeverity?.critical ?? 0;
  const errorActive = summary?.activeBySeverity?.error ?? 0;
  const readouts: Readout[] = [
    {
      label: "Active",
      value: formatNumber(summary?.activeTotal ?? 0),
      tone: (summary?.activeTotal ?? 0) > 0 ? "bad" : "neutral",
      sub: (summary?.activeTotal ?? 0) > 0 ? "Open or acknowledged" : "Nothing needs a human",
    },
    {
      label: "Critical active",
      value: formatNumber(criticalActive),
      tone: criticalActive > 0 ? "bad" : "neutral",
      sub: errorActive > 0 ? `${formatNumber(errorActive)} error active` : "No error-severity incidents active",
    },
    { label: "Opened", value: formatNumber(summary?.triggeredSince ?? 0), sub: windowLabel },
    {
      label: "Resolved",
      value: formatNumber(summary?.resolvedSince ?? 0),
      sub: windowLabel,
    },
  ];

  const incidents = data?.data ?? [];
  const total = data?.total ?? 0;
  const hasPrev = page > 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;
  const firstRow = page * PAGE_SIZE + 1;
  const lastRow = page * PAGE_SIZE + incidents.length;

  const narrowed = Boolean(
    search || severity || service || projectId || (statusParam !== DEFAULT_STATUS && statusParam !== ALL_STATUSES),
  );

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setParam({ sortOrder: sortOrder === "desc" ? "asc" : "desc" });
    else setParam({ sortBy: key, sortOrder: "desc" });
  };

  const commitSearch = (value: string) => {
    if (value !== search) setParam({ q: value });
  };
  const commitService = (value: string) => {
    if (value !== service) setParam({ service: value });
  };

  const clearFilters = () => {
    setSearchDraft("");
    setServiceDraft("");
    setParam({ q: undefined, severity: undefined, service: undefined, projectId: undefined, status: undefined });
  };

  const acknowledge = async (incident: Incident) => {
    try {
      await mutations.acknowledge.mutateAsync(incident.id);
      toast.success("Incident acknowledged");
    } catch (err) {
      // 409 = illegal transition (already acknowledged/resolved elsewhere).
      toast.error(apiErrorMessage(err));
    }
  };

  const resolve = async (incident: Incident) => {
    try {
      await mutations.resolve.mutateAsync({ id: incident.id, reason: "manually_resolved" });
      toast.success("Incident resolved");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const acknowledging = (id: string) => mutations.acknowledge.isPending && mutations.acknowledge.variables === id;
  const resolving = (id: string) => mutations.resolve.isPending && mutations.resolve.variables?.id === id;

  const sortHeader = (label: string, key: SortKey) => (
    <SortButton label={label} sortKey={key} sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
  );

  const columns: SheetColumn[] = [
    { key: "severity", header: sortHeader("Severity", "severity"), className: "w-[112px]" },
    { key: "incident", header: "Incident" },
    { key: "project", header: "Project", className: `w-[112px] ${HIDE_BELOW_XL}` },
    { key: "environment", header: "Env", className: `w-[104px] ${HIDE_BELOW_XL}` },
    { key: "service", header: "Service / route", className: `w-[180px] ${HIDE_BELOW_LG}` },
    { key: "status", header: sortHeader("Status", "status"), className: "w-[136px]" },
    { key: "started", header: sortHeader("Started", "startedAt"), className: `w-[120px] ${HIDE_BELOW_MD}` },
    { key: "duration", header: "Duration", className: `w-[96px] ${HIDE_BELOW_MD}` },
    { key: "count", header: sortHeader("Count", "occurrenceCount"), className: `w-[88px] ${HIDE_BELOW_SM}`, align: "right" },
    { key: "actions", header: "Actions", className: "w-[168px]", align: "right", srOnly: true },
  ];

  let body: ReactNode;
  if (isError) {
    body = (
      <SheetError
        title="Could not load incidents"
        message={apiErrorMessage(error, "The incident list is unavailable right now.")}
        onRetry={() => void refetch()}
      />
    );
  } else if (isLoading && incidents.length === 0) {
    body = <SheetLoading rows={8} label="Loading incidents" />;
  } else if (incidents.length === 0) {
    if (page > 0 && total > 0) {
      body = (
        <SheetEmpty
          title="This page is empty"
          description="The incidents that were here have moved, most likely because they changed status."
          action={
            <UiButton variant="outline" size="lg" onClick={() => setParam({ page: undefined })}>
              Go to the first page
            </UiButton>
          }
        />
      );
    } else if (narrowed) {
      body = (
        <SheetEmpty
          title="No incidents match"
          description={
            search
              ? `Nothing matches “${search}” with the current filters.`
              : "No incident matches the current status, severity, and service filters."
          }
          action={
            <UiButton variant="outline" size="lg" onClick={clearFilters}>
              Clear filters
            </UiButton>
          }
        />
      );
    } else if (statusParam === DEFAULT_STATUS) {
      body = (
        <SheetEmpty
          title="No active incidents"
          description="Nothing is open or acknowledged right now. Resolved incidents stay available under all statuses."
          action={
            <UiButton variant="outline" size="lg" onClick={() => setParam({ status: ALL_STATUSES })}>
              Show all statuses
            </UiButton>
          }
        />
      );
    } else {
      body = (
        <SheetEmpty
          title="No incidents yet"
          description="No alert has produced an incident for this organization yet. An incident opens when an alert rule breaches its threshold, and repeated matches fold into it."
          action={
            <TextLink to="/alerts/rules" arrow>
              Open alert rules
            </TextLink>
          }
        />
      );
    }
  } else {
    body = (
      <SheetTable columns={columns} caption="Incidents, sortable and paginated" minWidth={640}>
        {incidents.map((incident) => {
          const to = incidentPath(incident.id);
          const name = incident.title || "Untitled incident";
          return (
            <SheetRow key={incident.id} onActivate={() => navigate(to)}>
              <SheetCell>
                <SeverityBadge severity={incident.severity} />
              </SheetCell>
              <SheetCell>
                <RowTitle
                  title={name}
                  to={to}
                  subtitle={`${incident.id.slice(0, 8)} · ${incident.dimensionKey}`}
                  subtitleMono
                />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_XL}>
                {incident.projectId ? (
                  <span className={MONO_CELL} title={incident.projectId}>
                    {incident.projectId.slice(0, 8)}
                  </span>
                ) : (
                  <span className="text-[12px] text-[var(--text3)]">Org-level</span>
                )}
              </SheetCell>
              <SheetCell className={HIDE_BELOW_XL}>
                {incident.environment ? (
                  <span className="text-[13px] text-[var(--text2)]">{incident.environment}</span>
                ) : (
                  QUIET_DASH
                )}
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                {incident.service || incident.route ? (
                  <div className="min-w-0">
                    <div className="truncate text-[13px] text-[var(--text)]">{incident.service ?? "—"}</div>
                    {incident.route && (
                      <div className="mt-0.5 truncate font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">
                        {incident.route}
                      </div>
                    )}
                  </div>
                ) : (
                  QUIET_DASH
                )}
              </SheetCell>
              <SheetCell>
                <IncidentStateBadge state={incident.status} />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD}>
                <Timestamp value={incident.startedAt} />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD}>
                <span
                  className={MONO_CELL}
                  title={incident.status === "resolved" ? "Start to resolution" : "Still running"}
                >
                  {formatDuration(incident.durationSeconds)}
                </span>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_SM} align="right">
                <span className={MONO_CELL}>×{formatNumber(incident.occurrenceCount)}</span>
              </SheetCell>
              <SheetCell align="right">
                <div className="flex items-center justify-end gap-1.5">
                  {incident.status === "open" && (
                    <UiButton
                      variant="outline"
                      size="sm"
                      onClick={() => void acknowledge(incident)}
                      disabled={acknowledging(incident.id)}
                      aria-label={`Acknowledge ${name}`}
                    >
                      {acknowledging(incident.id) ? "Acknowledging…" : "Acknowledge"}
                    </UiButton>
                  )}
                  {incident.status === "acknowledged" && (
                    <UiButton
                      variant="outline"
                      size="sm"
                      onClick={() => void resolve(incident)}
                      disabled={resolving(incident.id)}
                      aria-label={`Resolve ${name}`}
                    >
                      {resolving(incident.id) ? "Resolving…" : "Resolve"}
                    </UiButton>
                  )}
                  <RowActions label={`Actions for ${name}`}>
                    <DropdownMenuItem onSelect={() => navigate(to)}>Open incident</DropdownMenuItem>
                    {incident.status === "open" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => void resolve(incident)}
                          disabled={resolving(incident.id)}
                        >
                          Resolve
                        </DropdownMenuItem>
                      </>
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

  const showCount = !isError && !(isLoading && incidents.length === 0);

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Incidents"
        description="Every incident opened by an alert rule in this organization. Repeated matches of the same alert fold into one incident instead of opening a new one."
        meta={[
          statusParam === DEFAULT_STATUS && !narrowed && data !== undefined && !isError
            ? { label: "Active", value: formatNumber(total), mono: true }
            : null,
        ]}
        actions={
          <UiButton variant="outline" size="lg" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn("size-4", isFetching && "animate-spin")} aria-hidden="true" />
            Refresh
          </UiButton>
        }
      />

      {!summaryFailed && <Readouts cells={readouts} loading={summaryLoading && !summary} label="Incident summary" />}

      <Sheet
        label="Incident list"
        toolbar={
          <>
            <form
              role="search"
              className="flex min-w-[200px] flex-1 sm:max-w-[320px]"
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                commitSearch(searchDraft);
              }}
              onBlur={() => commitSearch(searchDraft)}
            >
              <SearchField
                value={searchDraft}
                onChange={(next) => {
                  setSearchDraft(next);
                  // The clear control commits at once; typing waits for Enter or blur.
                  if (next === "") commitSearch("");
                }}
                placeholder="Search title, service, or route"
                label="Search incidents (press Enter to apply)"
                className="sm:max-w-none"
              />
            </form>
            <FilterSelect
              label="Status"
              value={statusParam}
              onChange={(value) => setParam({ status: value === DEFAULT_STATUS ? undefined : value })}
              options={STATUS_OPTIONS}
            />
            <FilterSelect
              label="Severity"
              value={severity}
              onChange={(value) => setParam({ severity: value })}
              options={SEVERITY_OPTIONS}
            />
            <form
              className="flex items-center gap-2"
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                commitService(serviceDraft);
              }}
            >
              <label className="flex items-center gap-2">
                <span className="text-[12px] text-[var(--text3)]">Service</span>
                <input
                  value={serviceDraft}
                  onChange={(event) => setServiceDraft(event.target.value)}
                  onBlur={() => commitService(serviceDraft)}
                  placeholder="Any"
                  className={cn(fieldInputClass, "w-32")}
                />
              </label>
            </form>
            {showCount && (
              <ToolbarCount>
                {formatNumber(total)} {total === 1 ? "incident" : "incidents"}
              </ToolbarCount>
            )}
          </>
        }
        footer={
          !isError && incidents.length > 0 ? (
            <>
              {/* Server-backed pagination: `total` comes from the backend. */}
              <span>
                Showing{" "}
                <span className="font-[family-name:var(--mono)] tabular-nums">
                  {formatNumber(firstRow)}–{formatNumber(lastRow)}
                </span>{" "}
                of <span className="font-[family-name:var(--mono)] tabular-nums">{formatNumber(total)}</span>
              </span>
              <div className="flex items-center gap-2">
                <UiButton
                  variant="outline"
                  size="sm"
                  onClick={() => setParam({ page: page - 1 })}
                  disabled={!hasPrev}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </UiButton>
                <UiButton
                  variant="outline"
                  size="sm"
                  onClick={() => setParam({ page: page + 1 })}
                  disabled={!hasNext}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </UiButton>
              </div>
            </>
          ) : undefined
        }
      >
        {body}
      </Sheet>
    </WorkspacePage>
  );
}
