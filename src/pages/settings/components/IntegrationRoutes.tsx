import { useActionState } from "react";
import { Plus, Route, Trash2, TriangleAlert } from "lucide-react";
import { useConnectorRoutes, useSlackChannels, useConnectorMutations } from "@/modules/organizations/hooks/useConnectors";
import {
  EmptyPanel,
  Notice,
  Panel,
  Pill,
  Row,
  RowStack,
  SettingRow,
  Toggle,
  fieldInputClass,
} from "@/shared/ui/pulse";
import { Button, Field, SubmitButton, Timestamp, demoSuccess } from "@/shared/observe";
import { TableLoadingRows } from "@/shared/ui/loading";

// ── module-level constants (rules.md §1.2) ──

const SEVERITY_OPTIONS = [
  { value: "", label: "Any severity" },
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
  { value: "critical", label: "Critical" },
];

const ENVIRONMENT_OPTIONS = [
  { value: "", label: "Any environment" },
  { value: "development", label: "Development" },
  { value: "staging", label: "Staging" },
  { value: "production", label: "Production" },
];

interface RouteFormState {
  error: string | null;
}

const INITIAL_ROUTE_STATE: RouteFormState = { error: null };

// ── local components ─────────────────────────────────────────

function ConditionSummary({ route }: { route: any }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5 font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">
      <span className="text-[var(--text3)]">event</span>
      <span className="text-[var(--text)]">{route.eventType}</span>
      <span className="text-[var(--text3)]">· severity</span>
      <span className="text-[var(--text)]">{route.severity ?? "any"}</span>
      <span className="text-[var(--text3)]">· env</span>
      <span className="text-[var(--text)]">{route.environment ?? "any"}</span>
    </span>
  );
}

interface IntegrationRoutesProps {
  integrationId: string;
  type: string;
}

export function IntegrationRoutes({ integrationId, type }: IntegrationRoutesProps) {
  const { data: routesData, isLoading: loadingRoutes } = useConnectorRoutes(integrationId);
  const { data: slackChannels, isLoading: loadingChannels } = useSlackChannels(integrationId);
  const { createRoute, updateRoute, deleteRoute } = useConnectorMutations();

  const routes = routesData?.data ?? [];

  const [formState, createAction] = useActionState(async (_prev: RouteFormState, form: FormData) => {
    try {
      const payload: any = {
        eventType: String(form.get("eventType") || "").trim() || "*",
        enabled: true,
      };
      const severity = String(form.get("severity") || "");
      const environment = String(form.get("environment") || "");
      if (severity) payload.severity = severity;
      if (environment) payload.environment = environment;

      await createRoute.mutateAsync({ id: integrationId, payload });
      demoSuccess("Route created successfully");
      return INITIAL_ROUTE_STATE;
    } catch (err: any) {
      return { error: err?.response?.data?.message || err?.message || "Failed to create route." };
    }
  }, INITIAL_ROUTE_STATE);

  const handleToggleRoute = async (routeId: string, enabled: boolean) => {
    try {
      await updateRoute.mutateAsync({ id: integrationId, routeId, payload: { enabled } });
      demoSuccess(enabled ? "Route enabled" : "Route disabled");
    } catch (err: any) {
      demoSuccess(`Failed to update route: ${err.message}`);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm("Are you sure you want to delete this route?")) return;
    try {
      await deleteRoute.mutateAsync({ id: integrationId, routeId });
      demoSuccess("Route deleted");
    } catch (err: any) {
      demoSuccess(`Failed to delete route: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Add a routing rule"
        description="Rules narrow which events reach this connector. Leave a filter on any to match everything."
        icon={Plus}
      >
        <form action={createAction} className="flex flex-col gap-4">
          {formState.error && (
            <Notice tone="red" icon={TriangleAlert} title="Could not create the rule">
              {formState.error}
            </Notice>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Event type" hint="Use * to match every event.">
              <input
                name="eventType"
                required
                defaultValue="*"
                placeholder="alert.created"
                className={`${fieldInputClass} font-[family-name:var(--mono)] text-[12.5px]`}
              />
            </Field>
            <Field label="Severity">
              <select name="severity" className={fieldInputClass} defaultValue="">
                {SEVERITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Environment">
              <select name="environment" className={fieldInputClass} defaultValue="">
                {ENVIRONMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            {type === "slack" && (
              <Field label="Slack channel" hint={loadingChannels ? "Loading channels…" : undefined}>
                <select name="slackChannelId" className={fieldInputClass} defaultValue="">
                  <option value="">Default connector channel</option>
                  {slackChannels?.channels?.map((channel: any) => (
                    <option key={channel.id} value={channel.id}>
                      #{channel.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          <div className="flex items-center border-t border-[var(--border)] pt-4">
            <SubmitButton>
              <Plus className="size-4" aria-hidden="true" />
              Add rule
            </SubmitButton>
          </div>
        </form>
      </Panel>

      {loadingRoutes ? (
        <TableLoadingRows rows={3} label="Loading connector routing rules" />
      ) : routes.length === 0 ? (
        <EmptyPanel
          icon={Route}
          title="No routing rules"
          description="This connector receives every matching event until you add a rule to narrow the scope."
        />
      ) : (
        <Panel
          title="Routing rules"
          description="Evaluated on every event. A disabled rule is skipped."
          icon={Route}
          bodyClassName="p-0"
          actions={<Pill tone="brand">{routes.length} rules</Pill>}
        >
          <RowStack>
            {routes.map((route: any) => (
              <Row key={route.id}>
                <SettingRow
                  label={route.eventType === "*" ? "All events" : route.eventType}
                  description={<ConditionSummary route={route} />}
                  htmlFor={`route-${route.id}`}
                >
                  <span className="text-[11.5px] text-[var(--text3)]">
                    <Timestamp value={route.createdAt} />
                  </span>
                  <Toggle
                    id={`route-${route.id}`}
                    checked={Boolean(route.enabled)}
                    disabled={updateRoute.isPending}
                    label={`Rule ${route.eventType} enabled`}
                    onChange={(next) => handleToggleRoute(route.id, next)}
                  />
                  <Button
                    variant="danger"
                    disabled={deleteRoute.isPending}
                    onClick={() => handleDeleteRoute(route.id)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    <span className="sr-only">Delete rule {route.eventType}</span>
                  </Button>
                </SettingRow>
              </Row>
            ))}
          </RowStack>
        </Panel>
      )}
    </div>
  );
}
