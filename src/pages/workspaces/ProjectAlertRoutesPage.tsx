import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";

import { projectPath } from "@/modules/projects/navigation/project-routes";
import { useAlertRouteMutations, useAlertRoutes } from "@/modules/projects/hooks/useAlertRoutes";
import { useProjectAlertingStatus } from "@/modules/alerting/hooks/useAlerting";
import type { ProjectAlertingStatus } from "@/modules/alerting/api/types";
import { ConfirmDialog, apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_SM,
  HIDE_BELOW_XL,
  ProjectPageHeader,
  Readouts,
  RowActions,
  RowTitle,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  TextLink,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Notice, Panel, Pill, Toggle } from "@/shared/ui/pulse";
import { KeyValueList, Timestamp, formatNumber, type KeyValueItem } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { orgRoutes } from "@/app/router/org-routes";
import { cn } from "@/lib/utils";
import { useCurrentProject } from "./ProjectShellPage";

// ── module-level constants (rules.md §1.2) ───────────────────

/** The shared helpers stop at xl; the created date only fits from 2xl. */
const HIDE_BELOW_2XL = "hidden 2xl:table-cell";

/**
 * Priority leads each row from sm up. Below sm it is hidden, so the route
 * column takes over the sheet's 20px leading edge. The table uses a fixed
 * layout so long names and condition lists truncate instead of widening it.
 */
const ROUTE_CELL = "max-sm:pl-5";

const COLUMNS: SheetColumn[] = [
  { key: "priority", header: "Priority", className: `w-[88px] ${HIDE_BELOW_SM}` },
  { key: "route", header: "Route", className: ROUTE_CELL },
  { key: "conditions", header: "Conditions", className: `w-[240px] ${HIDE_BELOW_LG}` },
  { key: "targets", header: "Targets", className: `w-[128px] ${HIDE_BELOW_XL}` },
  { key: "active", header: "Active", className: "w-[76px]" },
  { key: "created", header: "Created", className: `w-[120px] ${HIDE_BELOW_2XL}` },
  { key: "actions", header: "Actions", srOnly: true, className: "w-[60px]" },
];

/** Fields of the list response this page reads. */
interface AlertRouteRow {
  id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  is_active?: boolean;
  priority?: number;
  eventTypes?: string[];
  severityLevels?: string[];
  sourceServices?: string[];
  targetConnectorIds?: string[];
  targetCount?: number;
  createdAt: string;
}

function isActiveOf(route: AlertRouteRow) {
  return route.isActive ?? route.is_active ?? false;
}

// The list endpoint returns `targetConnectorIds`; `targetCount` wins when a
// response already carries the count.
function targetCountOf(route: AlertRouteRow) {
  return route.targetCount ?? route.targetConnectorIds?.length ?? 0;
}

const humanize = (value: string) => value.replace(/_/g, " ");

/** One scannable line for the row, plus the full condition set for its title. */
function conditionSummary(route: AlertRouteRow): { text: string; detail: string } | null {
  const severities = route.severityLevels ?? [];
  const events = (route.eventTypes ?? []).map(humanize);
  const services = route.sourceServices ?? [];

  const parts = [
    severities.length > 0 ? severities.join(", ") : null,
    events.length === 1 ? events[0] : events.length > 1 ? `${events.length} event types` : null,
    services.length === 1 ? services[0] : services.length > 1 ? `${services.length} services` : null,
  ].filter((part): part is string => Boolean(part));
  if (parts.length === 0) return null;

  const detail = [
    severities.length > 0 ? `Severity: ${severities.join(", ")}` : null,
    events.length > 0 ? `Event types: ${events.join(", ")}` : null,
    services.length > 0 ? `Source services: ${services.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(". ");

  return { text: parts.join(" · "), detail };
}

// ── default destination ──────────────────────────────────────

function DestinationValue({ destination }: { destination: ProjectAlertingStatus["defaultDestination"] }) {
  const viaConnector = destination.source === "PRIMARY_CONNECTOR";
  const target = destination.target || "Project owner";

  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className={cn("min-w-0 truncate", target.includes("@") && "font-[family-name:var(--mono)] text-[12px]")}
        title={target}
      >
        {target}
      </span>
      <Pill tone={viaConnector ? "green" : "amber"}>{viaConnector ? "Primary connector" : "Email fallback"}</Pill>
    </span>
  );
}

const resolving = <span className="text-[var(--text3)]">Resolving…</span>;

// ── page ─────────────────────────────────────────────────────

export default function ProjectAlertRoutesPage() {
  const navigate = useNavigate();
  const { projectId, orgSlug, publicId } = useCurrentProject();
  const { data, isLoading, error, refetch } = useAlertRoutes(projectId);
  const {
    data: alertingStatus,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useProjectAlertingStatus(projectId);
  const { deleteRoute, toggleRoute } = useAlertRouteMutations(projectId);

  const [deleting, setDeleting] = useState<AlertRouteRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const routes = (data ?? []) as AlertRouteRow[];
  const activeCount = routes.filter(isActiveOf).length;
  const inactiveCount = routes.length - activeCount;
  const totalTargets = routes.reduce((sum, route) => sum + targetCountOf(route), 0);

  const connectorAccess = alertingStatus?.connectorAccess;
  const connectorStatus = alertingStatus?.connectorStatus;

  const newRoutePath = projectPath(orgSlug, publicId, "routes/new");
  const routePath = (route: AlertRouteRow) => projectPath(orgSlug, publicId, `routes/${route.id}`);

  // ── readings ──
  const routeReading = (value: number) => (error ? "—" : formatNumber(value));
  const readouts: Readout[] = [
    {
      label: "Routes",
      value: routeReading(routes.length),
      sub: error ? "Could not load routes" : "Custom routes in this project",
    },
    {
      label: "Active",
      value: routeReading(activeCount),
      sub: error
        ? "Could not load routes"
        : routes.length === 0
          ? "None yet"
          : inactiveCount > 0
            ? `${formatNumber(inactiveCount)} inactive`
            : "Every route is active",
    },
    {
      label: "Connector targets",
      value: routeReading(totalTargets),
      sub: error ? "Could not load routes" : "Across all routes",
    },
    {
      label: "Active connectors",
      value: connectorStatus ? formatNumber(connectorStatus.totalActive) : "—",
      sub: statusError
        ? "Could not load connector status"
        : !alertingStatus
          ? "Status unavailable"
          : !alertingStatus.connectorAccess.allowed
            ? "Connectors need an upgraded plan"
            : alertingStatus.connectorStatus.configured
              ? `Primary: ${alertingStatus.connectorStatus.primary?.name || "active"}`
              : "None configured for this organization",
    },
  ];

  const newRouteButton = (
    <UiButton size="lg" asChild>
      <Link to={newRoutePath}>
        <Plus className="size-4" aria-hidden="true" /> New route
      </Link>
    </UiButton>
  );

  // ── routes sheet ──
  let body: ReactNode;
  if (isLoading) {
    body = <SheetLoading rows={4} label="Loading routes" />;
  } else if (error) {
    body = <SheetError title="Could not load routes" message={apiErrorMessage(error)} onRetry={() => void refetch()} />;
  } else if (routes.length === 0) {
    body = (
      <SheetEmpty
        title="No routes yet"
        description="Until you add one, every alert goes to the default destination below. Add a route to send specific severities, event types, or source services to a dedicated connector."
        action={newRouteButton}
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Alert routes" className="[&_table]:table-fixed">
        {routes.map((route) => {
          const summary = conditionSummary(route);
          const targets = targetCountOf(route);
          const togglePending = toggleRoute.isPending && toggleRoute.variables?.routeId === route.id;

          return (
            <SheetRow key={route.id} onActivate={() => navigate(routePath(route))}>
              <SheetCell className={HIDE_BELOW_SM}>
                <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text)]">
                  {route.priority ?? "—"}
                </span>
              </SheetCell>
              <SheetCell className={ROUTE_CELL}>
                <RowTitle title={route.name} to={routePath(route)} subtitle={route.description || "No description"} />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                {summary ? (
                  <span className="block truncate text-[12px] text-[var(--text2)]" title={summary.detail}>
                    {summary.text}
                  </span>
                ) : (
                  <span className="text-[12px] text-[var(--text3)]">No conditions set</span>
                )}
              </SheetCell>
              <SheetCell className={HIDE_BELOW_XL}>
                {targets > 0 ? (
                  <span className="whitespace-nowrap text-[12px] text-[var(--text2)]">
                    <span className="font-[family-name:var(--mono)] tabular-nums text-[var(--text)]">
                      {formatNumber(targets)}
                    </span>{" "}
                    {targets === 1 ? "connector" : "connectors"}
                  </span>
                ) : (
                  <span className="text-[12px] text-[var(--text3)]">None</span>
                )}
              </SheetCell>
              <SheetCell>
                <Toggle
                  checked={isActiveOf(route)}
                  label={`${route.name} active`}
                  disabled={togglePending}
                  onChange={(checked) => toggleRoute.mutate({ routeId: route.id, isActive: checked })}
                />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_2XL}>
                <Timestamp value={route.createdAt} />
              </SheetCell>
              <SheetCell align="right">
                <RowActions label={`Actions for ${route.name}`}>
                  <DropdownMenuItem onSelect={() => navigate(routePath(route))}>
                    <Pencil aria-hidden="true" /> Edit route
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                      setDeleteError(null);
                      setDeleting(route);
                    }}
                  >
                    <Trash2 aria-hidden="true" /> Delete route
                  </DropdownMenuItem>
                </RowActions>
              </SheetCell>
            </SheetRow>
          );
        })}
      </SheetTable>
    );
  }

  // ── default destination ──
  const destinationItems: KeyValueItem[] = [
    {
      label: "Delivers to",
      value: alertingStatus ? <DestinationValue destination={alertingStatus.defaultDestination} /> : resolving,
      text: alertingStatus?.defaultDestination.target || undefined,
    },
    {
      label: "Connector access",
      value: alertingStatus ? (
        connectorAccess?.allowed ? (
          <Pill tone="green">Included in your plan</Pill>
        ) : (
          <Pill>Not in your plan</Pill>
        )
      ) : (
        resolving
      ),
    },
  ];

  const destinationLink = !alertingStatus ? undefined : connectorAccess?.allowed ? (
    <TextLink to={orgRoutes.connectors(orgSlug, "integrations")} size="sm" arrow>
      Manage connectors
    </TextLink>
  ) : (
    <TextLink to={orgRoutes.billing(orgSlug)} size="sm" arrow>
      Upgrade for connectors
    </TextLink>
  );

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Routing"
        description="Match alerts on severity, event type, or source service, and send them to the connectors you choose."
        actions={newRouteButton}
      />

      <Readouts cells={readouts} loading={isLoading || statusLoading} label="Routing summary" />

      <Sheet
        label="Alert routes"
        footer={
          !isLoading && !error && routes.length > 0 ? (
            <span>Alerts that match no route go to the default destination below.</span>
          ) : undefined
        }
      >
        {body}
      </Sheet>

      <Panel
        title="Default destination"
        description="Alerts that match no route go to the organization's primary connector. When no connector is available, they go to the project owner's verified email."
        actions={destinationLink}
        bodyClassName={statusError ? "p-0" : "px-5 py-1 [&_dl>div:last-child]:border-b-0"}
      >
        {statusError ? (
          <SheetError
            title="Could not load the default destination"
            message={apiErrorMessage(statusError)}
            onRetry={() => void refetchStatus()}
          />
        ) : (
          <KeyValueList items={destinationItems} columns={1} labelWidth={140} />
        )}
      </Panel>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
        title={`Delete ${deleting?.name ?? "route"}?`}
        description="The route stops matching alerts. This can't be undone."
        confirmLabel="Delete route"
        pending={deleteRoute.isPending}
        onConfirm={() => {
          if (!deleting) return;
          setDeleteError(null);
          deleteRoute.mutate(deleting.id, {
            onSuccess: () => setDeleting(null),
            onError: (mutationError) => setDeleteError(apiErrorMessage(mutationError, "The route could not be deleted.")),
          });
        }}
      >
        {deleteError && (
          <div role="alert">
            <Notice tone="red" icon={AlertTriangle} title="Could not delete the route">
              {deleteError}
            </Notice>
          </div>
        )}
      </ConfirmDialog>
    </WorkspacePage>
  );
}
