import { useNavigate } from "react-router";
import { Link } from "react-router";
import { projectPath } from "@/modules/projects/navigation/project-routes";
import {
  Activity,
  CheckCircle2,
  GitBranch,
  Pencil,
  Plus,
  Route,
  Trash2,
  Mail,
  Plug,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Radio,
} from "lucide-react";
import { useAlertRouteMutations, useAlertRoutes } from "@/modules/projects/hooks/useAlertRoutes";
import { useProjectAlertingStatus } from "@/modules/alerting/hooks/useAlerting";
import { useCurrentProject } from "./ProjectShellPage";
import { IconChip, Notice, Panel, Pill, SectionHeading, StatCard, Toggle } from "@/shared/ui/pulse";
import { Table, Td, Timestamp, Tr } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { orgRoutes } from "@/app/router/org-routes";
import { cn } from "@/lib/utils";

// ── module-level constants ───────────────────────────────────

const ROUTE_HEADERS = ["Route", "Targets", "Active", "Created", ""];

interface AlertRouteRow {
  id: string;
  name: string;
  isActive?: boolean;
  is_active?: boolean;
  targetCount?: number;
  createdAt: string;
}

function isActiveOf(route: AlertRouteRow) {
  return route.isActive ?? route.is_active ?? false;
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectAlertRoutesPage() {
  const navigate = useNavigate();
  const { projectId, orgSlug, publicId } = useCurrentProject();
  const { data, isLoading, error } = useAlertRoutes(projectId);
  const { data: alertingStatus, isLoading: statusLoading } = useProjectAlertingStatus(projectId);
  const { deleteRoute, toggleRoute } = useAlertRouteMutations(projectId);

  const routes = (data ?? []) as AlertRouteRow[];
  const activeCount = routes.filter(isActiveOf).length;
  const totalTargets = routes.reduce((sum, route) => sum + (route.targetCount ?? 0), 0);

  const defaultDestination = alertingStatus?.defaultDestination;
  const connectorAccess = alertingStatus?.connectorAccess;
  const connectorStatus = alertingStatus?.connectorStatus;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Alert routes"
        description="Condition-based routing: match an alert on severity, category, or environment, then fan it out to selected connectors."
        actions={
          <UiButton size="lg" onClick={() => navigate(projectPath(orgSlug, publicId, "routes/new"))}>
            <Plus className="mr-1.5 size-4" /> New route
          </UiButton>
        }
      />

      {/* ── Summary & Default Destination Architecture ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Card 1: Default Alert Destination */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Default Alert Destination
              </span>
              {defaultDestination?.source === "PRIMARY_CONNECTOR" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                  <CheckCircle2 className="size-3" /> Primary Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                  <Mail className="size-3" /> Email Fallback
                </span>
              )}
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 text-[var(--text)]">
                {defaultDestination?.source === "PRIMARY_CONNECTOR" ? (
                  <Plug className="size-5 text-[var(--brand)]" />
                ) : (
                  <Mail className="size-5 text-amber-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-[var(--text)]">
                  {statusLoading ? "Resolving destination…" : defaultDestination?.target || "Project Owner"}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {defaultDestination?.source === "PRIMARY_CONNECTOR"
                    ? "Alerts without a specific matching custom route deliver to your primary connector."
                    : "Unmatched alerts fall back to the verified project owner / admin email destination."}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
            <span>Routing model: <strong>Explicit route &rarr; Primary connector &rarr; Owner email</strong></span>
          </div>
        </div>

        {/* Card 2: Organization Connector Status */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm backdrop-blur-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Connector Capability
              </span>
              {connectorAccess?.allowed ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                  <CheckCircle2 className="size-3" /> Entitled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-500/30 bg-zinc-500/10 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400">
                  Free Tier
                </span>
              )}
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 text-[var(--text)]">
                <Radio className="size-5 text-[var(--brand)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-[var(--text)]">
                  {connectorStatus?.totalActive ?? 0} Active Connector{(connectorStatus?.totalActive ?? 0) === 1 ? "" : "s"}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {!connectorAccess?.allowed
                    ? "Third-party connector integrations (Slack, PagerDuty, Webhooks) require an upgraded plan."
                    : connectorStatus?.configured
                    ? `Primary notification connector: ${connectorStatus.primary?.name || "Active"}`
                    : "No notification connector configured yet for this organization."}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs">
            {!connectorAccess?.allowed ? (
              <Link
                to={orgRoutes.billing(orgSlug)}
                className="inline-flex items-center gap-1.5 font-medium text-amber-400 hover:text-amber-300"
              >
                <Sparkles className="size-3.5" />
                <span>Upgrade for connectors</span>
                <ArrowRight className="size-3" />
              </Link>
            ) : (
              <Link
                to={orgRoutes.connectors(orgSlug, "integrations")}
                className="inline-flex items-center gap-1.5 font-medium text-[var(--brand)] hover:underline"
              >
                <Plug className="size-3.5" />
                <span>Manage connectors</span>
                <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard label="Custom Routes" value={routes.length} icon={Route} tone="brand" />
        <StatCard label="Active Routes" value={activeCount} icon={CheckCircle2} tone="green" />
        <StatCard label="Connector Targets" value={totalTargets} icon={GitBranch} tone="blue" />
      </div>

      {error && <Notice tone="red">{apiErrorMessage(error)}</Notice>}

      {/* ── Custom Routes Table ── */}
      <Panel bodyClassName="p-0">
        <div className="border-b border-border/60 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-[var(--text)]">Custom Routing Rules</h2>
          <p className="text-xs text-muted-foreground">Explicit condition matches evaluated before falling back to default destination.</p>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-10 animate-pulse rounded-[8px] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : routes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <IconChip icon={Route} size="lg" tone="brand" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">No custom alert routes configured</p>
            <p className="max-w-[48ch] text-[12.5px] text-[var(--text2)]">
              Without a custom route, all incidents route to your default destination above. Add a route to fan out specific
              categories or severities to dedicated channels.
            </p>
            <UiButton size="lg" onClick={() => navigate(projectPath(orgSlug, publicId, "routes/new"))}>
              <Plus className="mr-1.5 size-4" /> New route
            </UiButton>
          </div>
        ) : (
          <Table headers={ROUTE_HEADERS} maxHeight="32rem">
            {routes.map((route) => (
              <Tr key={route.id}>
                <Td>
                  <button
                    type="button"
                    onClick={() => navigate(projectPath(orgSlug, publicId, `routes/${route.id}`))}
                    className="truncate text-left text-[13px] font-medium text-[var(--text)] hover:text-[var(--brand)] hover:underline"
                  >
                    {route.name}
                  </button>
                </Td>
                <Td>
                  <Pill tone="blue">
                    {route.targetCount ?? 0} connector{(route.targetCount ?? 0) === 1 ? "" : "s"}
                  </Pill>
                </Td>
                <Td>
                  <Toggle
                    checked={isActiveOf(route)}
                    label={`Toggle ${route.name}`}
                    onChange={(checked) => toggleRoute({ routeId: route.id, isActive: checked })}
                  />
                </Td>
                <Td>
                  <Timestamp iso={route.createdAt} />
                </Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      aria-label={`Edit ${route.name}`}
                      onClick={() => navigate(projectPath(orgSlug, publicId, `routes/${route.id}`))}
                      className="rounded-[6px] p-1 text-[var(--text2)] transition-colors hover:bg-[var(--bg2)] hover:text-[var(--text)]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${route.name}`}
                      onClick={() => deleteRoute(route.id)}
                      className="rounded-[6px] p-1 text-[var(--text2)] transition-colors hover:bg-[var(--bg2)] hover:text-rose-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}
