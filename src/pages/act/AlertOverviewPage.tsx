import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import {
  AlertOctagon,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock,
  Split,
  Workflow,
  ArrowUpRight,
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

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 font-sans">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            <span className="inline-block size-1.5 rounded-full bg-[var(--brand)]" />
            <span>Alerts & Incident Response</span>
            <span>/</span>
            <span className="text-[var(--text-secondary)]">Overview</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] font-[family-name:var(--display)]">
            Alerting Command Center
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Centralized telemetry alerting health, active incidents, delivery status, and policy catalog.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/alerts/rules"
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-1)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <BellRing className="size-3.5" />
            <span>Rules Catalog</span>
          </Link>
          <Link
            to="/alerts"
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--brand-border)] bg-[var(--brand-muted)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--brand)] hover:text-white transition-all"
          >
            <AlertOctagon className="size-3.5 text-[var(--brand)]" />
            <span>Incident Triage</span>
          </Link>
        </div>
      </div>

      {/* Plan Entitlement Notification */}
      {isRestricted && <EntitlementRestrictedBanner showOwnerDetails={false} />}

      {/* High-density summary cards */}
      <AlertOverviewWidget />

      {/* Two Column Command Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 8 Cols: Active & Recent Incidents */}
        <div className="lg:col-span-8 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
                Active & Recent Incidents
              </h2>
              <p className="text-[11px] text-[var(--text-tertiary)] font-[family-name:var(--mono)]">
                Real-time trigger log from evaluated thresholds
              </p>
            </div>
            <Link to="/alerts" className="text-[11px] text-[var(--brand)] hover:underline flex items-center gap-1 font-medium">
              View all ({eventsData?.total ?? incidents.length}) <ArrowUpRight className="size-3" />
            </Link>
          </div>

          {eventsLoading ? (
            <div className="p-8 text-center text-[12px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
              Loading incident feed…
            </div>
          ) : incidents.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="mx-auto size-7 text-[var(--success)] opacity-80" />
              <p className="mt-2 text-[13px] font-medium text-[var(--text-primary)]">Everything is operational</p>
              <p className="mt-0.5 text-[12px] text-[var(--text-tertiary)]">
                No active alert breaches recorded across connected services.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-[12px]">
                <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/40 text-[10px] uppercase font-[family-name:var(--mono)] tracking-wider text-[var(--text-tertiary)]">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">State</th>
                    <th className="px-3 py-2.5 font-medium">Incident / Title</th>
                    <th className="px-3 py-2.5 font-medium">Service</th>
                    <th className="px-3 py-2.5 font-medium">Severity</th>
                    <th className="px-4 py-2.5 text-right font-medium">Triggered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-[family-name:var(--mono)]">
                  {(incidents as any[]).slice(0, 6).map((incident: any) => (
                    <tr
                      key={incident.id}
                      onClick={() => navigate(`/alerts/${incident.id}`)}
                      className="cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                    >
                      <td className="px-4 py-3 align-middle">
                        <IncidentStateBadge state={incident.state} size="sm" />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="font-medium text-[var(--text-primary)] truncate max-w-[240px]">
                          {incident.title}
                        </div>
                        <div className="text-[10px] text-[var(--text-tertiary)] truncate max-w-[240px]">
                          {incident.fingerprint}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span className="text-[11px] text-[var(--text-primary)]">{incident.service}</span>
                        <span className="block text-[9.5px] uppercase text-[var(--text-tertiary)]">{incident.environment}</span>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <SeverityBadge severity={incident.severity} />
                      </td>
                      <td className="px-4 py-3 align-middle text-right text-[var(--text-tertiary)] text-[11px] tabular-nums">
                        {new Date(incident.lastTriggeredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 4 Cols: Quick Links & Core Rules */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Quick Hub Navigation */}
          <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4 flex flex-col">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)] font-[family-name:var(--mono)] pb-3 border-b border-[var(--border-subtle)]">
              Alerting Control Plane
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-2 text-[12px]">
              <Link
                to="/alerts/rules"
                className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-2)]/50 p-2.5 transition-colors hover:bg-[var(--surface-2)]"
              >
                <div className="flex items-center gap-2">
                  <BellRing className="size-4 text-[var(--brand)]" />
                  <span className="font-medium text-[var(--text-primary)]">Rule Catalog</span>
                </div>
                <span className="font-[family-name:var(--mono)] text-[var(--text-tertiary)]">{rulesData?.total ?? 0}</span>
              </Link>

              <Link
                to="/alerts/escalations"
                className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-2)]/50 p-2.5 transition-colors hover:bg-[var(--surface-2)]"
              >
                <div className="flex items-center gap-2">
                  <Workflow className="size-4 text-[var(--brand)]" />
                  <span className="font-medium text-[var(--text-primary)]">Escalation Policies</span>
                </div>
                <ChevronRight className="size-3.5 text-[var(--text-tertiary)]" />
              </Link>

              <Link
                to="/alerts/routing"
                className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-2)]/50 p-2.5 transition-colors hover:bg-[var(--surface-2)]"
              >
                <div className="flex items-center gap-2">
                  <Split className="size-4 text-[var(--info)]" />
                  <span className="font-medium text-[var(--text-primary)]">Routing Rules</span>
                </div>
                <ChevronRight className="size-3.5 text-[var(--text-tertiary)]" />
              </Link>

              <Link
                to="/alerts/silences"
                className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-2)]/50 p-2.5 transition-colors hover:bg-[var(--surface-2)]"
              >
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-[var(--warning)]" />
                  <span className="font-medium text-[var(--text-primary)]">Maintenance Silences</span>
                </div>
                <ChevronRight className="size-3.5 text-[var(--text-tertiary)]" />
              </Link>
            </div>
          </div>

          {/* Org Default Rules Snapshot */}
          <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)] font-[family-name:var(--mono)]">
                Active Thresholds
              </h3>
              <Link to="/alerts/rules" className="text-[11px] text-[var(--brand)] hover:underline">
                Manage →
              </Link>
            </div>

            {rulesLoading ? (
              <p className="mt-3 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Loading policies…</p>
            ) : (rulesData?.data ?? []).length === 0 ? (
              <p className="mt-3 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">No rules configured in catalog.</p>
            ) : (
              <div className="mt-3 space-y-2 text-[12px]">
                {((rulesData?.data ?? []) as any[]).slice(0, 4).map((rule: any) => (
                  <div
                    key={rule.id}
                    onClick={() => navigate(`/alerts/rules/${rule.id}`)}
                    className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-2)]/30 p-2.5 cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-medium text-[var(--text-primary)] truncate">{rule.name}</div>
                      <div className="text-[10px] text-[var(--text-tertiary)] font-[family-name:var(--mono)] truncate">
                        Eval: {rule.evaluationIntervalSeconds}s · Cool: {rule.cooldownSeconds}s
                      </div>
                    </div>
                    <SeverityBadge severity={rule.severity} />
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
