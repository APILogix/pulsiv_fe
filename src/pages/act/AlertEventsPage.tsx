import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  CheckCircle2,
  RefreshCw,
  Search,
  ArrowUpRight,
} from "lucide-react";
import {
  useAlertEvents,
  useAlertEventMutations,
  useNotificationEntitlement,
} from "@/modules/alerting/hooks/useAlerting";
import { IncidentStateBadge } from "@/modules/alerting/components/IncidentStateBadge";
import { toIncidentView } from "@/modules/alerting/components/incident-view";
import { SeverityBadge } from "@/shared/observe";
import { EntitlementRestrictedBanner } from "@/modules/alerting/components/EntitlementRestrictedBanner";
import type { IncidentState } from "@/modules/alerting/api/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATE_TABS: Array<{ id: string; label: string; state?: IncidentState }> = [
  { id: "all", label: "ALL INCIDENTS" },
  { id: "triggered", label: "FIRING", state: "triggered" },
  { id: "acknowledged", label: "ACKNOWLEDGED", state: "acknowledged" },
  { id: "escalated", label: "ESCALATED", state: "escalated" },
  { id: "muted", label: "SILENCED", state: "muted" },
  { id: "resolved", label: "RESOLVED", state: "resolved" },
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
    return incidents.filter((incident: ReturnType<typeof toIncidentView>) => {
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

  const firingCount = countsByState["triggered"] ?? 0;
  const ackCount = countsByState["acknowledged"] ?? 0;
  const totalCount = incidents.length;

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 font-sans">
      
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            <span className="inline-block size-1.5 rounded-full bg-[var(--error)]" />
            <span>Alerts & Incident Response</span>
            <span>/</span>
            <span className="text-[var(--text-secondary)]">Incident Feed</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] font-[family-name:var(--display)]">
            Incident Command Center
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Active firing alerts, escalation chains, breach acknowledgments, and resolution lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-1)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <RefreshCw className={cn("size-3.5", isRefetching && "animate-spin")} />
            <span>Sync</span>
          </button>
          
          <Link
            to="/alerts/overview"
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--brand-border)] bg-[var(--brand-muted)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--brand)] hover:text-white transition-all"
          >
            <span>Alerting Overview</span>
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* Plan Entitlement Warning */}
      {isRestricted && <EntitlementRestrictedBanner showOwnerDetails={false} />}

      {/* ── 2. Unified Hero Incident Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] divide-x divide-y md:divide-y-0 divide-[var(--border-subtle)]">
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Total Breaches</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {totalCount}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Recorded in fleet</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Currently Firing</span>
            <span className={cn("size-2 rounded-full", firingCount > 0 ? "bg-[var(--error)] animate-pulse" : "bg-[var(--success)]")} />
          </div>
          <div className={cn(
            "mt-2 text-[24px] font-semibold tracking-[-0.03em] font-[family-name:var(--mono)] tabular-nums",
            firingCount > 0 ? "text-[var(--error)]" : "text-[var(--text-primary)]"
          )}>
            {firingCount}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Requires engineer triage</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Acknowledged</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--info)] font-[family-name:var(--mono)] tabular-nums">
            {ackCount}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Under active triage</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Resolved</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--success)] font-[family-name:var(--mono)] tabular-nums">
            {countsByState["resolved"] ?? 0}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Mitigated incidents</div>
        </div>
      </div>

      {/* ── 3. High-Density Filter Toolbar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-3">
        {/* Left: Search + State Tabs */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[240px] max-w-[340px] flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search by title, service, environment, or fingerprint…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] pl-8 pr-3 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
            />
          </div>

          {/* State Segmented Pills */}
          <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] p-0.5 text-[11px] font-[family-name:var(--mono)]">
            {STATE_TABS.map((tab) => {
              const count = countsByState[tab.id] ?? 0;
              const isActive = selectedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedTab(tab.id)}
                  className={cn(
                    "rounded-[4px] px-2 py-0.5 transition-colors font-medium flex items-center gap-1.5",
                    isActive
                      ? "bg-[var(--surface-4)] text-[var(--text-primary)] shadow-sm font-semibold"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  )}
                >
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className="text-[9.5px] tabular-nums text-[var(--text-tertiary)]">({count})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Severity Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="h-8 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-2)] px-2.5 text-[11px] text-[var(--text-secondary)] focus:border-[var(--brand)] focus:outline-none font-[family-name:var(--mono)]"
          >
            {SEVERITIES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── 4. Incidents Table / Stream ── */}
      {isLoading ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-12 text-center text-[12px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
          <RefreshCw className="mx-auto mb-2 size-5 animate-spin text-[var(--brand)]" />
          Loading active incidents…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-12 text-center">
          <CheckCircle2 className="mx-auto size-8 text-[var(--success)] opacity-80" />
          <p className="mt-2 text-[14px] font-semibold text-[var(--text-primary)]">No incidents match filters</p>
          <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
            {incidents.length === 0
              ? "All monitored services and threshold policies are operational."
              : "Try adjusting your search query or state filter."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/40 text-[10px] uppercase text-[var(--text-tertiary)] font-[family-name:var(--mono)] tracking-wider">
                <tr>
                  <th className="px-4 py-2.5 font-medium">State</th>
                  <th className="px-3 py-2.5 font-medium">Severity</th>
                  <th className="px-3 py-2.5 font-medium">Incident / Title</th>
                  <th className="px-3 py-2.5 font-medium">Service & Env</th>
                  <th className="px-3 py-2.5 font-medium">Count</th>
                  <th className="px-3 py-2.5 font-medium">Last Triggered</th>
                  <th className="px-4 py-2.5 text-right font-medium">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-[family-name:var(--mono)]">
                {filtered.map((incident: ReturnType<typeof toIncidentView>) => {
                  const isFiring = incident.state === "triggered";
                  const isResolved = incident.state === "resolved" || incident.state === "closed";

                  return (
                    <tr
                      key={incident.id}
                      onClick={() => navigate(`/alerts/${incident.id}`)}
                      className={cn(
                        "group cursor-pointer transition-colors hover:bg-[var(--surface-2)]",
                        isFiring && "bg-[var(--error-muted)]/20",
                      )}
                    >
                      <td className="px-4 py-3 align-middle">
                        <IncidentStateBadge state={incident.state} size="sm" />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <SeverityBadge severity={incident.severity} />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="font-medium text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate max-w-[280px]">
                          {incident.title}
                        </div>
                        <div className="text-[10px] text-[var(--text-tertiary)] truncate max-w-[280px]">
                          {incident.fingerprint}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span className="text-[11px] text-[var(--text-primary)]">
                          {incident.service}
                        </span>
                        <span className="block text-[9.5px] uppercase text-[var(--text-tertiary)]">
                          {incident.environment}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle text-[11px] tabular-nums">
                        <span className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 font-semibold text-[var(--text-secondary)]">
                          {incident.occurrenceCount}x
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle text-[var(--text-tertiary)] text-[11px] tabular-nums">
                        {new Date(incident.lastTriggeredAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {isFiring && (
                            <button
                              onClick={(e) => handleQuickAck(e, incident.id)}
                              className="rounded-[4px] border border-[var(--info)]/30 bg-[var(--info-muted)] px-2 py-1 text-[10.5px] font-medium text-[var(--info)] hover:bg-[var(--info)] hover:text-white transition-colors"
                            >
                              Ack
                            </button>
                          )}
                          {!isResolved && (
                            <button
                              onClick={(e) => handleQuickResolve(e, incident.id)}
                              className="rounded-[4px] border border-[var(--success)]/30 bg-[var(--success-muted)] px-2 py-1 text-[10.5px] font-medium text-[var(--success)] hover:bg-[var(--success)] hover:text-white transition-colors"
                            >
                              Resolve
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/alerts/${incident.id}`)}
                            className="rounded-[4px] border border-[var(--border-default)] bg-[var(--surface-2)] px-2 py-1 text-[10.5px] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] transition-colors"
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

