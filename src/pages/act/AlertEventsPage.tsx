import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Flame,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  VolumeX,
  XCircle,
} from "lucide-react";
import {
  useAlertEvents,
  useAlertEventStats,
  useAlertEventMutations,
  useNotificationEntitlement,
} from "@/modules/alerting/hooks/useAlerting";
import { IncidentStateBadge } from "@/modules/alerting/components/IncidentStateBadge";
import { toIncidentView } from "@/modules/alerting/components/incident-view";
import { SeverityBadge } from "@/shared/observe";
import { EntitlementRestrictedBanner } from "@/modules/alerting/components/EntitlementRestrictedBanner";
import type { AlertSeverity, IncidentState } from "@/modules/alerting/api/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATE_TABS: Array<{ id: string; label: string; state?: IncidentState }> = [
  { id: "all", label: "All Incidents" },
  { id: "triggered", label: "Triggered / Firing", state: "triggered" },
  { id: "acknowledged", label: "Acknowledged", state: "acknowledged" },
  { id: "escalated", label: "Escalated", state: "escalated" },
  { id: "muted", label: "Muted / Silenced", state: "muted" },
  { id: "resolved", label: "Resolved", state: "resolved" },
];

const SEVERITIES: Array<{ id: string; label: string }> = [
  { id: "all", label: "All severities" },
  { id: "critical", label: "Critical" },
  { id: "error", label: "Error" },
  { id: "warning", label: "Warning" },
  { id: "info", label: "Info" },
];

export default function AlertEventsPage() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [search, setSearch] = useState("");

  const { data: statsData } = useAlertEventStats();
  const { data: eventsData, isLoading, refetch, isRefetching } = useAlertEvents({ limit: 150 });
  const { isRestricted } = useNotificationEntitlement();
  const mutations = useAlertEventMutations();

  const incidents = useMemo(
    () => (eventsData?.data ?? []).map(toIncidentView),
    [eventsData],
  );

  const countsByState = useMemo(() => {
    const map: Record<string, number> = { all: incidents.length };
    for (const inc of incidents) {
      map[inc.state] = (map[inc.state] ?? 0) + 1;
    }
    return map;
  }, [incidents]);

  const filtered = useMemo(() => {
    return incidents.filter((incident) => {
      const matchesTab = selectedTab === "all" || incident.state === selectedTab;
      const matchesSeverity =
        selectedSeverity === "all" || incident.severity === selectedSeverity;
      const matchesSearch =
        search.trim() === "" ||
        `${incident.title} ${incident.service} ${incident.environment} ${incident.fingerprint}`
          .toLowerCase()
          .includes(search.toLowerCase());

      return matchesTab && matchesSeverity && matchesSearch;
    });
  }, [incidents, selectedTab, selectedSeverity, search]);

  const handleQuickAck = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await mutations.acknowledge.mutateAsync({ id, body: { comment: "Quick acknowledge from command center" } });
      toast.success("Incident acknowledged");
    } catch {
      toast.error("Failed to acknowledge incident");
    }
  };

  const handleQuickResolve = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await mutations.resolve.mutateAsync({ id, body: { reason: "Resolved manually from command center" } });
      toast.success("Incident marked resolved");
    } catch {
      toast.error("Failed to resolve incident");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <AlertOctagon className="size-6 text-rose-500" aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
              Incident Command Center
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Live incidents, breach evaluations, and state transitions across all projects.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            <RefreshCw className={cn("size-3.5", isRefetching && "animate-spin")} />
            Refresh
          </button>
          <Link
            to="/alerts/overview"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:bg-muted"
          >
            <Radio className="size-3.5 text-[var(--brand)]" />
            Overview
          </Link>
        </div>
      </div>

      {/* Plan Entitlement Warning */}
      {isRestricted && <EntitlementRestrictedBanner showOwnerDetails={false} />}

      {/* State Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        {STATE_TABS.map((tab) => {
          const count = countsByState[tab.id] ?? 0;
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-[var(--brand)] text-[var(--brand-fg)] shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-[var(--text)]",
              )}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 font-mono text-[10px]",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, service, environment, or fingerprint…"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-xs text-[var(--text)] placeholder:text-muted-foreground focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-[var(--text)] focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
          >
            {SEVERITIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Incidents Table / Stream */}
      {isLoading ? (
        <div className="rounded-xl border border-border/60 bg-card/60 p-12 text-center text-xs text-muted-foreground">
          <RefreshCw className="mx-auto mb-2 size-5 animate-spin text-[var(--brand)]" />
          Loading active incidents…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-card/40 p-12 text-center">
          <CheckCircle2 className="mx-auto size-9 text-emerald-400 opacity-80" />
          <p className="mt-2 text-sm font-semibold text-[var(--text)]">No incidents match filters</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {incidents.length === 0
              ? "All monitored services and threshold policies are healthy."
              : "Try adjusting your search criteria or state filter."}
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
                  <th className="p-3">Service & Env</th>
                  <th className="p-3">Occurrences</th>
                  <th className="p-3">Last Triggered</th>
                  <th className="p-3 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-normal">
                {filtered.map((incident) => {
                  const isFiring = incident.state === "triggered";
                  const isAcked = incident.state === "acknowledged";
                  const isResolved = incident.state === "resolved";

                  return (
                    <tr
                      key={incident.id}
                      onClick={() => navigate(`/alerts/${incident.id}`)}
                      className={cn(
                        "group cursor-pointer transition-colors hover:bg-muted/30",
                        isFiring && "bg-rose-500/[0.03]",
                      )}
                    >
                      <td className="p-3">
                        <IncidentStateBadge state={incident.state} size="sm" />
                      </td>
                      <td className="p-3">
                        <SeverityBadge severity={incident.severity} size="sm" />
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-[var(--text)] group-hover:text-[var(--brand)] transition-colors">
                          {incident.title}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {incident.fingerprint}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-[11px] text-[var(--text)]">
                          {incident.service}
                        </span>
                        <span className="block text-[10px] uppercase text-muted-foreground">
                          {incident.environment}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        <span className="rounded bg-muted/60 px-1.5 py-0.5 font-semibold text-muted-foreground">
                          {incident.occurrenceCount}x
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-[11px]">
                        {new Date(incident.lastTriggeredAt).toLocaleString()}
                      </td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {isFiring && (
                            <button
                              onClick={(e) => handleQuickAck(e, incident.id)}
                              className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-400 hover:bg-blue-500/20"
                            >
                              Ack
                            </button>
                          )}
                          {!isResolved && (
                            <button
                              onClick={(e) => handleQuickResolve(e, incident.id)}
                              className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/20"
                            >
                              Resolve
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/alerts/${incident.id}`)}
                            className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-[var(--text)]"
                          >
                            Details →
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
