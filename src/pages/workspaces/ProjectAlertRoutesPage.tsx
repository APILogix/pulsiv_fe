import { useNavigate } from "react-router";
import { Activity, CheckCircle2, CircleOff, GitBranch, Pencil, Plus, Route, Trash2 } from "lucide-react";
import { useAlertRouteMutations, useAlertRoutes } from "@/modules/projects/hooks/useAlertRoutes";
import { useCurrentProject } from "./ProjectShellPage";
import { IconChip, Notice, Panel, Pill, SectionHeading, StatCard, Toggle } from "@/shared/ui/pulse";
import { Table, Td, Timestamp, Tr } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const ROUTE_HEADERS = ["Route", "Status", "Targets", "Active", "Created", ""];

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
  const { projectId } = useCurrentProject();
  const { data, isLoading, error } = useAlertRoutes(projectId);
  const { deleteRoute, toggleRoute } = useAlertRouteMutations(projectId);

  const routes = (data ?? []) as AlertRouteRow[];
  const activeCount = routes.filter(isActiveOf).length;
  const inactiveCount = routes.length - activeCount;
  const totalTargets = routes.reduce((sum, route) => sum + (route.targetCount ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Alert routes"
        description="Condition-based routing: match an alert on severity, category, or environment, then fan it out to selected connectors."
        actions={
          <UiButton size="lg" onClick={() => navigate(`/projects/${projectId}/routes/new`)}>
            <Plus className="mr-1.5 size-4" /> Create route
          </UiButton>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Routes" value={routes.length} icon={Route} tone="brand" />
        <StatCard label="Active" value={activeCount} icon={CheckCircle2} tone="green" />
        <StatCard label="Inactive" value={inactiveCount} icon={CircleOff} tone={inactiveCount > 0 ? "amber" : "neutral"} />
        <StatCard label="Connector targets" value={totalTargets} icon={GitBranch} tone="blue" />
      </div>

      {error && <Notice tone="red">{apiErrorMessage(error)}</Notice>}

      <Panel bodyClassName="p-0">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-10 animate-pulse rounded-[8px] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : routes.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <IconChip icon={Route} size="lg" tone="brand" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">No alert routes configured</p>
            <p className="max-w-[52ch] text-[12.5px] text-[var(--text2)]">
              Without a route, alerts fall back to the project's default channel. Routes let you direct specific alert
              categories or severities to specific connectors and channels.
            </p>
            <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-3 text-left text-[12px] text-[var(--text2)]">
              <p className="mb-1.5 font-medium text-[var(--text)]">How routing works:</p>
              <ol className="list-inside list-decimal space-y-1">
                <li>An alert is generated from a threshold breach or API call</li>
                <li>Active routes evaluate their match conditions against the alert</li>
                <li>Every matching route delivers to its configured targets</li>
                <li>If no route matches, the default channel receives the alert</li>
              </ol>
            </div>
            <UiButton size="lg" onClick={() => navigate(`/projects/${projectId}/routes/new`)}>
              <Plus className="mr-1.5 size-4" /> Create route
            </UiButton>
          </div>
        ) : (
          <Table headers={ROUTE_HEADERS} maxHeight="32rem">
            {routes.map((route) => {
              const active = isActiveOf(route);
              return (
                <Tr key={route.id}>
                  <Td>
                    <button
                      type="button"
                      onClick={() => navigate(`/projects/${projectId}/routes/${route.id}`)}
                      className="truncate text-left text-[13px] font-medium text-[var(--text)] hover:text-[var(--brand)] hover:underline"
                    >
                      {route.name}
                    </button>
                  </Td>
                  <Td>
                    <Pill tone={active ? "green" : "neutral"} dot>
                      {active ? "active" : "inactive"}
                    </Pill>
                  </Td>
                  <Td>
                    <Pill tone="blue">
                      {route.targetCount ?? 0} connector{(route.targetCount ?? 0) === 1 ? "" : "s"}
                    </Pill>
                  </Td>
                  <Td>
                    <Toggle
                      checked={active}
                      label={`Toggle ${route.name}`}
                      disabled={toggleRoute.isPending}
                      onChange={(next) => toggleRoute.mutate({ routeId: route.id, isActive: next })}
                    />
                  </Td>
                  <Td>
                    <Timestamp value={route.createdAt} />
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <UiButton
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${route.name}`}
                        onClick={() => navigate(`/projects/${projectId}/routes/${route.id}`)}
                      >
                        <Pencil className="size-3.5" />
                      </UiButton>
                      <UiButton
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${route.name}`}
                        onClick={() => deleteRoute.mutate(route.id)}
                        disabled={deleteRoute.isPending}
                      >
                        <Trash2 className="size-3.5 text-[var(--red)]" />
                      </UiButton>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Table>
        )}
      </Panel>

      <Panel title="Routing order" icon={Activity}>
        <p className="text-[12.5px] leading-relaxed text-[var(--text2)]">
          Routes are evaluated per alert. Every matching active route delivers, so overlapping conditions produce
          multiple notifications. Per-member severity floors and quiet hours are applied after routing - see{" "}
          <button
            type="button"
            onClick={() => navigate(`/projects/${projectId}/preferences`)}
            className="font-medium text-[var(--brand)] hover:underline"
          >
            My notifications
          </button>
          .
        </p>
      </Panel>
    </div>
  );
}
