import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  AlertOctagon,
  CheckCircle2,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCurrentProject } from "./ProjectShellPage";
import {
  useProjectAlerts,
} from "@/modules/alerting/hooks/useAlerting";
import { IncidentStateBadge } from "@/modules/alerting/components/IncidentStateBadge";
import { toIncidentView } from "@/modules/alerting/components/incident-view";
import { SeverityBadge } from "@/shared/observe";
import { EntitlementRestrictedBanner } from "@/modules/alerting/components/EntitlementRestrictedBanner";
import { cn } from "@/lib/utils";

import { useProjectAlertingStatus } from "@/modules/alerting/hooks/useAlerting";

export default function ProjectAlertsPage() {
  const { projectId } = useCurrentProject();
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [search, setSearch] = useState("");

  const { data: alertsData, isLoading, refetch, isRefetching } = useProjectAlerts(projectId, {
    limit: 100,
  });
  const { data: alertingStatus } = useProjectAlertingStatus(projectId);

  const incidents = useMemo(
    () => (alertsData?.data ?? []).map(toIncidentView),
    [alertsData],
  );


  const filtered = useMemo(() => {
    return ((incidents ?? []) as any[]).filter((incident: any) => {
      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "active"
          ? incident.state === "triggered" || incident.state === "acknowledged"
          : incident.state === selectedStatus);

      const matchesSeverity =
        selectedSeverity === "all" || incident.severity === selectedSeverity;

      const matchesSearch =
        search.trim() === "" ||
        `${incident.title} ${incident.service} ${incident.fingerprint}`
          .toLowerCase()
          .includes(search.toLowerCase());

      return matchesStatus && matchesSeverity && matchesSearch;
    });
  }, [incidents, selectedStatus, selectedSeverity, search]);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <AlertOctagon className="size-5 text-rose-500" />
            <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">
              Project Alerts & Incidents
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Triggered incidents and threshold breaches evaluated for this project.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {alertingStatus?.connectorStatus.primary && (
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              <span>Primary destination: {alertingStatus.connectorStatus.primary.name} ({alertingStatus.connectorStatus.primary.type})</span>
            </div>
          )}

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:bg-muted"
          >
            <RefreshCw className={cn("size-3.5", isRefetching && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Plan Entitlement & Connector Notification Banner */}
      <EntitlementRestrictedBanner projectId={projectId} />


      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by title, service, or fingerprint…"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-xs text-[var(--text)] placeholder:text-muted-foreground focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-[var(--text)]"
          >
            <option value="all">All statuses</option>
            <option value="active">Active (Firing / Acked)</option>
            <option value="triggered">Firing</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-[var(--text)]"
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      {/* Alert Feed Table */}
      {isLoading ? (
        <div className="rounded-xl border border-border/60 bg-card/60 p-12 text-center text-xs text-muted-foreground">
          Loading project alerts…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-card/40 p-12 text-center">
          <CheckCircle2 className="mx-auto size-9 text-emerald-400 opacity-80" />
          <p className="mt-2 text-sm font-semibold text-[var(--text)]">No project alerts found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {incidents.length === 0
              ? "All telemetry signals for this project are operating within configured thresholds."
              : "No incidents match the active search and filter criteria."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card/60 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-muted/40 text-[10px] uppercase text-muted-foreground font-mono">
                <tr>
                  <th className="p-3">State</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Incident / Source</th>
                  <th className="p-3">Occurrences</th>
                  <th className="p-3">Last Triggered</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-normal">
                {((filtered ?? []) as any[]).map((incident: any) => (
                  <tr
                    key={incident.id}
                    onClick={() => navigate(`/alerts/${incident.id}`)}
                    className="group cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-3">
                      <IncidentStateBadge state={incident.state} size="sm" />
                    </td>
                    <td className="p-3">
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-[var(--text)] group-hover:text-[var(--brand)] transition-colors">
                        {incident.title}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {incident.fingerprint}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      <span className="rounded bg-muted/60 px-1.5 py-0.5 font-semibold text-muted-foreground">
                        {incident.occurrenceCount}x
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground font-mono text-[11px]">
                      {new Date(incident.lastTriggeredAt).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/alerts/${incident.id}`);
                        }}
                        className="rounded border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-[var(--text)]"
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
