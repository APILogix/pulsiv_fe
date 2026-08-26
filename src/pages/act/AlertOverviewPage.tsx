import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import {
  AlertOctagon,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  Radio,
  Send,
  Shield,
  Split,
  Workflow,
  Zap,
} from "lucide-react";
import { AlertOverviewWidget } from "@/modules/alerting/components/AlertOverviewWidget";
import { EntitlementRestrictedBanner } from "@/modules/alerting/components/EntitlementRestrictedBanner";
import {
  useAlertEvents,
  useAlertRules,
  useNotificationEntitlement,
} from "@/modules/alerting/hooks/useAlerting";
import { IncidentStateBadge } from "@/modules/alerting/components/IncidentStateBadge";
import { SeverityBadge } from "@/shared/observe";
import { toIncidentView } from "@/modules/alerting/components/incident-view";

export default function AlertOverviewPage() {
  const navigate = useNavigate();
  const { data: eventsData, isLoading: eventsLoading } = useAlertEvents({ limit: 10 });
  const { data: rulesData, isLoading: rulesLoading } = useAlertRules({ limit: 5 });
  const { isRestricted } = useNotificationEntitlement();

  const incidents = useMemo(
    () => (eventsData?.data ?? []).map(toIncidentView),
    [eventsData],
  );

  const activeIncidents = incidents.filter(
    (i) => i.state === "triggered" || i.state === "acknowledged" || i.state === "escalated",
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="size-6 text-[var(--brand)]" aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
              Alerting Overview
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Centralized telemetry alerting health, active incidents, delivery status, and rule catalog.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/alerts/rules"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            <BellRing className="size-3.5" />
            Rules Catalog
          </Link>
          <Link
            to="/alerts"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-1.5 text-xs font-medium text-[var(--brand-fg)] shadow-sm transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            <AlertOctagon className="size-3.5" />
            Incident Center
          </Link>
        </div>
      </div>

      {/* Plan Entitlement Notification */}
      {isRestricted && <EntitlementRestrictedBanner showOwnerDetails={false} />}

      {/* High-density summary cards */}
      <AlertOverviewWidget />

      {/* Two Column Command Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Active & Recent Incidents */}
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              <AlertOctagon className="size-4 text-rose-500" />
              Active & Recent Incidents
            </h2>
            <Link to="/alerts" className="text-xs text-[var(--brand)] hover:underline flex items-center gap-0.5">
              View all ({eventsData?.total ?? incidents.length}) <ChevronRight className="size-3" />
            </Link>
          </div>

          {eventsLoading ? (
            <div className="rounded-xl border border-border/60 bg-card/60 p-8 text-center text-xs text-muted-foreground">
              Loading incident feed…
            </div>
          ) : incidents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-card/40 p-8 text-center">
              <CheckCircle2 className="mx-auto size-8 text-emerald-400 opacity-80" />
              <p className="mt-2 text-sm font-medium text-[var(--text)]">Everything is healthy</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No active or recent alert breaches recorded across monitored projects.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card/60">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/60 bg-muted/30 text-[10px] uppercase text-muted-foreground font-mono">
                  <tr>
                    <th className="p-3">State</th>
                    <th className="p-3">Incident / Title</th>
                    <th className="p-3">Service</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Triggered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {incidents.slice(0, 6).map((incident) => (
                    <tr
                      key={incident.id}
                      onClick={() => navigate(`/alerts/${incident.id}`)}
                      className="cursor-pointer hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-3">
                        <IncidentStateBadge state={incident.state} size="sm" />
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-[var(--text)] truncate max-w-[280px]">
                          {incident.title}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground truncate max-w-[280px]">
                          {incident.fingerprint}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-[11px] text-[var(--text)]">{incident.service}</span>
                        <span className="block text-[10px] uppercase text-muted-foreground">{incident.environment}</span>
                      </td>
                      <td className="p-3">
                        <SeverityBadge severity={incident.severity} size="sm" />
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-[11px]">
                        {new Date(incident.lastTriggeredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 1 Col: Quick Links & Core Rules */}
        <div className="space-y-4">
          {/* Quick Hub Navigation */}
          <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Alerting Control Plane
            </h3>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <Link
                to="/alerts/rules"
                className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-2.5 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-2">
                  <BellRing className="size-4 text-[var(--brand)]" />
                  <span className="font-medium">Rule Catalog</span>
                </div>
                <span className="font-mono text-muted-foreground">{rulesData?.total ?? 0}</span>
              </Link>

              <Link
                to="/alerts/escalations"
                className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-2.5 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-2">
                  <Workflow className="size-4 text-purple-400" />
                  <span className="font-medium">Escalation Policies</span>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/alerts/routing"
                className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-2.5 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-2">
                  <Split className="size-4 text-blue-400" />
                  <span className="font-medium">Routing Rules</span>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/alerts/silences"
                className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-2.5 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-amber-400" />
                  <span className="font-medium">Maintenance & Silences</span>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>

          {/* Org Default Rules Snapshot */}
          <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Organization Defaults
              </h3>
              <Link to="/alerts/rules" className="text-[11px] text-[var(--brand)] hover:underline">
                View all
              </Link>
            </div>

            {rulesLoading ? (
              <p className="text-xs text-muted-foreground">Loading rules…</p>
            ) : (rulesData?.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No rules configured in catalog.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {(rulesData?.data ?? []).slice(0, 4).map((rule) => (
                  <div
                    key={rule.id}
                    onClick={() => navigate(`/alerts/rules/${rule.id}`)}
                    className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/10 p-2 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-medium text-[var(--text)] truncate">{rule.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">
                        Interval: {rule.evaluationIntervalSeconds}s • Cooldown: {rule.cooldownSeconds}s
                      </div>
                    </div>
                    <SeverityBadge severity={rule.severity} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
