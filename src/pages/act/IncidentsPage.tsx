/**
 * Global Incidents page (Phase 19).
 *
 * Enterprise incident management table backed by the real
 * /organizations/:orgId/alerting/incidents endpoint.
 *
 * Everything expensive happens on the SERVER:
 *   - filtering, sorting and pagination are query params, never client-side
 *     narrowing of an already-downloaded list;
 *   - the page never assumes it received the full dataset (`meta.total` drives
 *     paging, `data.length` never does).
 *
 * Filters are persisted in the URL so an incident view is shareable and survives
 * a reload - which matters during an active incident review.
 */
import { useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  AlertOctagon,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
} from "lucide-react";
import { useIncidents, useIncidentMutations } from "@/modules/alerting/hooks/useAlerting";
import { SeverityBadge } from "@/shared/observe";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import type { Incident, IncidentListQuery, IncidentStatus } from "@/modules/alerting/api/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

type SortKey = NonNullable<IncidentListQuery["sortBy"]>;

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "active", label: "Active (open + acknowledged)" },
  { value: "open", label: "Open" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "resolved", label: "Resolved" },
  { value: "", label: "All statuses" },
];

const SEVERITY_OPTIONS = ["", "critical", "error", "warning", "info"];

/** Status pill. Colour encodes urgency so the table is scannable at a glance. */
function StatusPill({ status }: { status: IncidentStatus }) {
  const styles: Record<IncidentStatus, string> = {
    open: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    acknowledged: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    resolved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

/** Compact human duration. Incidents commonly run for days, so days are included. */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export default function IncidentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL is the single source of truth for filter state.
  const page = Math.max(0, Number(searchParams.get("page") ?? 0));
  const statusParam = searchParams.get("status") ?? "active";
  const severity = searchParams.get("severity") ?? "";
  const projectId = searchParams.get("projectId") ?? "";
  const service = searchParams.get("service") ?? "";
  const search = searchParams.get("q") ?? "";
  const sortBy = (searchParams.get("sortBy") ?? "startedAt") as SortKey;
  const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

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
    if (statusParam === "active") base.active = true;
    else if (statusParam) base.status = statusParam as IncidentStatus;
    if (severity) base.severity = severity as IncidentListQuery["severity"];
    if (projectId) base.projectId = projectId;
    if (service) base.service = service;
    if (search) base.search = search;
    return base;
  }, [page, sortBy, sortOrder, statusParam, severity, projectId, service, search]);

  const { data, isLoading, isFetching, isError, error, refetch } = useIncidents(query);
  const mutations = useIncidentMutations();

  const incidents = data?.data ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setParam({ sortOrder: sortOrder === "desc" ? "asc" : "desc" });
    else setParam({ sortBy: key, sortOrder: "desc" });
  };

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => (
    <button
      type="button"
      onClick={() => toggleSort(sortKey)}
      className="inline-flex items-center gap-1 hover:text-[var(--text)]"
      aria-label={`Sort by ${label}`}
    >
      {label}
      {sortBy === sortKey
        ? (sortOrder === "desc" ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)
        : null}
    </button>
  );

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

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <AlertOctagon className="size-5 text-rose-500" />
            <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">Incidents</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Durable operational occurrences. Repeated matches of the same alert fold into one
            incident rather than creating a new one.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Filter toolbar. Every control maps to a backend query param. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
          <input
            defaultValue={search}
            onKeyDown={(e) => {
              if (e.key === "Enter") setParam({ q: e.currentTarget.value });
            }}
            onBlur={(e) => setParam({ q: e.currentTarget.value })}
            placeholder="Search title, service, or route… (Enter to apply)"
            aria-label="Search incidents"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-xs text-[var(--text)] placeholder:text-muted-foreground focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusParam}
            onChange={(e) => setParam({ status: e.target.value })}
            aria-label="Filter by status"
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-[var(--text)]"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            value={severity}
            onChange={(e) => setParam({ severity: e.target.value })}
            aria-label="Filter by severity"
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs capitalize text-[var(--text)]"
          >
            {SEVERITY_OPTIONS.map((value) => (
              <option key={value} value={value}>{value === "" ? "All severities" : value}</option>
            ))}
          </select>

          <input
            defaultValue={service}
            onBlur={(e) => setParam({ service: e.currentTarget.value })}
            placeholder="Service"
            aria-label="Filter by service"
            className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-xs text-[var(--text)]"
          />
        </div>
      </div>

      {isError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
          <p className="text-sm font-semibold text-rose-400">Could not load incidents</p>
          <p className="mt-1 text-xs text-muted-foreground">{apiErrorMessage(error)}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="rounded-xl border border-border/60 bg-card/60 p-12 text-center text-xs text-muted-foreground">
          Loading incidents…
        </div>
      ) : incidents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-card/40 p-12 text-center">
          <CheckCircle2 className="mx-auto size-9 text-emerald-400 opacity-80" />
          <p className="mt-2 text-sm font-semibold text-[var(--text)]">No incidents found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {total === 0
              ? "No alert has produced an incident for this organization yet."
              : "No incidents match the active filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card/60 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Incident list, sortable and paginated</caption>
              <thead className="border-b border-border/60 bg-muted/40 font-mono text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th scope="col" className="p-3"><SortHeader label="Severity" sortKey="severity" /></th>
                  <th scope="col" className="p-3">Incident</th>
                  <th scope="col" className="p-3">Project</th>
                  <th scope="col" className="p-3">Env</th>
                  <th scope="col" className="p-3">Service / Route</th>
                  <th scope="col" className="p-3"><SortHeader label="Status" sortKey="status" /></th>
                  <th scope="col" className="p-3"><SortHeader label="Started" sortKey="startedAt" /></th>
                  <th scope="col" className="p-3">Duration</th>
                  <th scope="col" className="p-3 text-right"><SortHeader label="Count" sortKey="occurrenceCount" /></th>
                  <th scope="col" className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    onClick={() => navigate(`/alerts/incidents/${incident.id}`)}
                    className="group cursor-pointer transition-colors hover:bg-muted/30"
                  >
                    <td className="p-3">
                      <SeverityBadge severity={incident.severity} size="sm" />
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-[var(--text)] transition-colors group-hover:text-[var(--brand)]">
                        {incident.title}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {incident.id.slice(0, 8)} · {incident.dimensionKey}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-muted-foreground">
                      {incident.projectId ? incident.projectId.slice(0, 8) : "org-level"}
                    </td>
                    <td className="p-3 text-muted-foreground">{incident.environment ?? "—"}</td>
                    <td className="p-3">
                      <div className="text-[var(--text)]">{incident.service ?? "—"}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{incident.route ?? ""}</div>
                    </td>
                    <td className="p-3"><StatusPill status={incident.status} /></td>
                    <td className="p-3 font-mono text-[11px] text-muted-foreground">
                      {new Date(incident.startedAt).toLocaleString()}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-muted-foreground">
                      {formatDuration(incident.durationSeconds)}
                    </td>
                    <td className="p-3 text-right">
                      <span className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                        {incident.occurrenceCount}x
                      </span>
                    </td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        {incident.status === "open" && (
                          <button
                            onClick={() => acknowledge(incident)}
                            disabled={mutations.acknowledge.isPending}
                            className="rounded border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-[var(--text)] disabled:opacity-50"
                          >
                            Ack
                          </button>
                        )}
                        {incident.status !== "resolved" && (
                          <button
                            onClick={() => resolve(incident)}
                            disabled={mutations.resolve.isPending}
                            className="rounded border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-[var(--text)] disabled:opacity-50"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Server-backed pagination. `total` comes from the backend, so this is
              never a local slice of a fully-downloaded array. */}
          <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-3">
            <p className="text-[11px] text-muted-foreground">
              Showing <span className="font-mono">{page * PAGE_SIZE + 1}</span>–
              <span className="font-mono">{page * PAGE_SIZE + incidents.length}</span> of{" "}
              <span className="font-mono">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                Page {page + 1} / {pageCount}
              </span>
              <button
                onClick={() => setParam({ page: page - 1 })}
                disabled={!hasPrev}
                aria-label="Previous page"
                className="inline-flex items-center rounded border border-border px-2 py-1 text-[11px] disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                onClick={() => setParam({ page: page + 1 })}
                disabled={!hasNext}
                aria-label="Next page"
                className="inline-flex items-center rounded border border-border px-2 py-1 text-[11px] disabled:opacity-40"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
