import { useNavigate } from "react-router";
import { Activity, ArrowRight, CheckCircle2, GitBranch, Pencil, Plus, Route, Trash2 } from "lucide-react";
import { useAlertRouteMutations, useAlertRoutes } from "@/modules/projects/hooks/useAlertRoutes";
import { useCurrentProject } from "./ProjectShellPage";
import { IconChip, Notice, Panel, Pill, SectionHeading, StatCard, Toggle } from "@/shared/ui/pulse";
import { Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md §1.2) ───────────────────

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
  const totalTargets = routes.reduce((sum, route) => sum + (route.targetCount ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Alert routes"
        description="Condition-based routing: match an alert on severity, category, or environment, then fan it out to selected connectors."
        actions={
          <UiButton size="lg" onClick={() => navigate(`/projects/${projectId}/routes/new`)}>
            <Plus className="mr-1.5 size-4" /> New route
          </UiButton>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard label="Routes" value={routes.length} icon={Route} tone="brand" />
        <StatCard label="Active" value={activeCount} icon={CheckCircle2} tone="green" />
        <StatCard label="Connector targets" value={totalTargets} icon={GitBranch} tone="blue" />
      </div>

      {error && <Notice tone="red">{apiErrorMessage(error)}</Notice>}

      {/* ── Flow card visualization ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-36 animate-pulse rounded-2xl bg-[var(--bg2)]" />
          ))}
        </div>
      ) : routes.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <IconChip icon={Route} size="lg" tone="brand" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">No alert routes configured</p>
            <p className="max-w-[48ch] text-[12.5px] text-[var(--text2)]">
              Without a route, alerts fall back to the project default channel. Add a route to send specific
              categories to specific destinations.
            </p>
            <UiButton size="lg" onClick={() => navigate(`/projects/${projectId}/routes/new`)}>
              <Plus className="mr-1.5 size-4" /> New route
            </UiButton>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {routes.map((route) => {
            const active = isActiveOf(route);
            return (
              <div
                key={route.id}
                className={cn(
                  "group relative flex flex-col gap-4 overflow-hidden rounded-2xl border bg-[var(--bg1)]/70 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--brand)]/5",
                  active ? "border-[var(--green)]/30" : "border-[var(--border)]",
                )}
              >
                {/* Active indicator glow */}
                {active && (
                  <div className="absolute -right-8 -top-8 size-24 rounded-full bg-[var(--green)]/10 blur-2xl" />
                )}

                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    {/* Flow icon */}
                    <div className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-xl",
                      active ? "bg-[var(--green)]/10" : "bg-[var(--bg2)]",
                    )}>
                      <Route className={cn("size-5", active ? "text-[var(--green)]" : "text-[var(--text3)]")} />
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/projects/${projectId}/routes/${route.id}`)}
                        className="truncate text-left text-[15px] font-bold tracking-[-0.01em] text-[var(--text)] transition-colors hover:text-[var(--brand)]"
                      >
                        {route.name}
                      </button>
                      <p className="mt-1 text-[11.5px] text-[var(--text3)]">
                        Created <Timestamp value={route.createdAt} />
                      </p>
                    </div>
                  </div>

                  {/* Active toggle prominently displayed */}
                  <Toggle
                    checked={active}
                    label={`Toggle ${route.name}`}
                    disabled={toggleRoute.isPending}
                    onChange={(next) => toggleRoute.mutate({ routeId: route.id, isActive: next })}
                  />
                </div>

                {/* Flow visualization */}
                <div className="flex items-center gap-2 rounded-xl bg-[var(--bg2)]/50 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-[var(--brand)]" />
                    <span className="text-[11px] font-medium text-[var(--text2)]">Alert</span>
                  </div>
                  <ArrowRight className="size-3.5 text-[var(--text3)]" />
                  <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-[var(--violet)]" />
                    <span className="text-[11px] font-medium text-[var(--text2)]">Route</span>
                  </div>
                  <ArrowRight className="size-3.5 text-[var(--text3)]" />
                  <div className="flex items-center gap-1.5">
                    <Pill tone="blue">
                      {route.targetCount ?? 0} connector{(route.targetCount ?? 0) === 1 ? "" : "s"}
                    </Pill>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1.5 border-t border-[var(--border)] pt-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <UiButton
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit ${route.name}`}
                    onClick={() => navigate(`/projects/${projectId}/routes/${route.id}`)}
                  >
                    <Pencil className="mr-1 size-3.5" /> Edit
                  </UiButton>
                  <UiButton
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${route.name}`}
                    onClick={() => deleteRoute.mutate(route.id)}
                    disabled={deleteRoute.isPending}
                  >
                    <Trash2 className="mr-1 size-3.5 text-[var(--red)]" /> Delete
                  </UiButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Routing order info */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg1)]/70 backdrop-blur-sm">
        <div className="border-b border-[var(--border)] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Activity className="size-4 text-[var(--text2)]" />
            <h3 className="text-[13px] font-semibold text-[var(--text)]">Routing order</h3>
          </div>
        </div>
        <div className="p-5">
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
        </div>
      </div>
    </div>
  );
}
