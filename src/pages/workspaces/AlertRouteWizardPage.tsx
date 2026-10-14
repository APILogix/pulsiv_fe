import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

import { projectPath } from "@/modules/projects/navigation/project-routes";
import { useAlertRouteMutations, useAlertRoute } from "@/modules/projects/hooks/useAlertRoutes";
import { DialogField, apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  FOCUS_COLUMN,
  ProjectPageHeader,
  Sheet,
  SheetError,
  SheetLoading,
  WorkspacePage,
} from "@/modules/projects/components/project-page";
import { Notice, Panel, Pill, SettingRow, Toggle, fieldInputClass, fieldTextareaClass } from "@/shared/ui/pulse";
import { Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { RouteConditionBuilder, type RouteCondition } from "@/components/ui/route-condition-builder";
import { ConnectorSelector, type Connector } from "@/components/ui/connector-selector";
import { useCurrentProject } from "./ProjectShellPage";

// Mock connectors until we have useConnectors hook
const mockConnectors: Connector[] = [
  { id: "conn_1", name: "Engineering Slack", type: "slack", status: "healthy" },
  { id: "conn_2", name: "Primary PagerDuty", type: "pagerduty", status: "healthy" },
  { id: "conn_3", name: "StatusPage", type: "webhook", status: "degraded" },
];

/** The fields of `GET …/alert-routes/:routeId` this editor reads. */
interface AlertRouteDetail {
  name: string;
  description?: string | null;
  isActive: boolean;
  conditions?: RouteCondition;
  targets?: string[];
  priority?: number;
  createdAt?: string;
  updatedAt?: string;
}

const CONNECTORS_LABEL_ID = "route-connectors-label";

export default function AlertRouteWizardPage() {
  const navigate = useNavigate();
  const { routeId } = useParams<{ routeId?: string }>();
  const { projectId, publicId, orgSlug } = useCurrentProject();
  const isEditing = routeId && routeId !== "new";

  const {
    data,
    isLoading: routeLoading,
    error: routeError,
    refetch: refetchRoute,
  } = useAlertRoute(projectId, isEditing ? routeId : undefined);
  const routeData = data as AlertRouteDetail | undefined;
  const mutations = useAlertRouteMutations(projectId);

  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [condition, setCondition] = useState<RouteCondition>({
    event_types: [],
    severities: [],
    source_services: [],
  });

  const [selectedConnectors, setSelectedConnectors] = useState<string[]>([]);
  const [priority, setPriority] = useState(100);

  const [loadedRouteId, setLoadedRouteId] = useState<string | null>(null);

  if (isEditing && routeData && loadedRouteId !== routeId) {
    setLoadedRouteId(routeId!);
    setName(routeData.name);
    setDescription(routeData.description || "");
    setIsActive(routeData.isActive);
    if (routeData.conditions) setCondition(routeData.conditions);
    if (routeData.targets) setSelectedConnectors(routeData.targets);
    if (routeData.priority) setPriority(routeData.priority);
  }

  const routesPath = projectPath(orgSlug, publicId, "routes");

  const handleSubmit = async () => {
    setLoading(true);
    setSaveError(null);
    try {
      const payload = {
        name,
        description,
        isActive,
        conditions: condition,
        targets: selectedConnectors,
        priority,
      };

      if (isEditing) {
        await mutations.updateRoute.mutateAsync({ routeId: routeId!, payload });
        toast.success("Route updated");
      } else {
        await mutations.createRoute.mutateAsync(payload);
        toast.success("Route created");
      }
      navigate(routesPath);
    } catch (err) {
      setSaveError(apiErrorMessage(err, "The route could not be saved."));
      toast.error("Could not save the route");
      setLoading(false);
    }
  };

  // Save stays disabled until the route has a name and a connector; the
  // footer says which one is missing.
  const missing = !name
    ? "Add a name to save this route."
    : selectedConnectors.length === 0
      ? "Pick at least one connector to save this route."
      : null;

  const title = isEditing ? routeData?.name || "Route" : "New route";

  const header = (
    <ProjectPageHeader
      crumbs={[{ label: "Routing", to: routesPath }, { label: isEditing ? routeData?.name || "Route" : "New route" }]}
      title={title}
      badges={
        isEditing && routeData ? (
          <Pill tone={routeData.isActive ? "green" : "neutral"} dot>
            {routeData.isActive ? "Active" : "Inactive"}
          </Pill>
        ) : undefined
      }
      description={
        isEditing
          ? "Change which alerts this route matches and which connectors receive them."
          : "Match alerts on severity, event type, or source service, then pick the connectors that receive them."
      }
      meta={
        isEditing && routeData
          ? [
              routeData.createdAt ? { label: "Created", value: <Timestamp value={routeData.createdAt} /> } : null,
              routeData.updatedAt ? { label: "Updated", value: <Timestamp value={routeData.updatedAt} /> } : null,
            ]
          : undefined
      }
    />
  );

  if (isEditing && routeLoading) {
    return (
      <WorkspacePage>
        {header}
        <Sheet label="Route" className={FOCUS_COLUMN}>
          <SheetLoading rows={5} label="Loading route" />
        </Sheet>
      </WorkspacePage>
    );
  }

  if (isEditing && routeError) {
    return (
      <WorkspacePage>
        {header}
        <Sheet label="Route" className={FOCUS_COLUMN}>
          <SheetError
            title="Could not load this route"
            message={apiErrorMessage(routeError)}
            onRetry={() => void refetchRoute()}
          />
        </Sheet>
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage>
      {header}

      <div className={`${FOCUS_COLUMN} flex flex-col gap-6`}>
        <Panel title="Details">
          <div className="flex flex-col gap-5">
            <DialogField label="Name" name="name" required>
              <input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Production criticals"
                autoFocus
                autoComplete="off"
                required
                className={fieldInputClass}
              />
            </DialogField>
            <DialogField label="Description" name="description" hint="Optional. Shown under the name on the Routing page.">
              <textarea
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this route handle?"
                rows={2}
                className={fieldTextareaClass}
              />
            </DialogField>
            <SettingRow
              label="Active"
              htmlFor="route-active"
              description="Inactive routes are kept but don't process alerts."
              className="border-t border-[var(--border)] pt-5"
            >
              <Toggle id="route-active" checked={isActive} onChange={setIsActive} label="Active" />
            </SettingRow>
          </div>
        </Panel>

        <Panel
          title="Conditions"
          description="Choose the event types, severities, and source services this route matches."
        >
          <RouteConditionBuilder value={condition} onChange={setCondition} />
        </Panel>

        <Panel
          title="Delivery"
          description="Pick the connectors that receive matching alerts."
          footer={
            <>
              {/* Always mounted so screen readers hear the hint change. */}
              <p className="mr-auto min-w-0 text-[12px] text-[var(--text3)]" aria-live="polite">
                {missing}
              </p>
              <UiButton type="button" variant="ghost" size="lg" onClick={() => navigate(routesPath)}>
                Cancel
              </UiButton>
              <UiButton
                type="button"
                size="lg"
                onClick={() => void handleSubmit()}
                disabled={!name || loading || selectedConnectors.length === 0}
              >
                {loading && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                {loading ? "Saving…" : isEditing ? "Save changes" : "Create route"}
              </UiButton>
            </>
          }
        >
          <div className="flex flex-col gap-6">
            <div role="group" aria-labelledby={CONNECTORS_LABEL_ID} className="flex flex-col gap-2">
              <p id={CONNECTORS_LABEL_ID} className="text-[13px] font-medium text-[var(--text2)]">
                Connectors
                <span aria-hidden="true" className="ml-0.5 text-[var(--text3)]">
                  *
                </span>
              </p>
              <ConnectorSelector
                connectors={mockConnectors}
                selectedIds={selectedConnectors}
                onChange={setSelectedConnectors}
              />
            </div>

            <DialogField
              label="Priority"
              name="priority"
              hint="Lower numbers run first. Default is 100."
              className="border-t border-[var(--border)] pt-5"
            >
              <input
                id="priority"
                name="priority"
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className={`${fieldInputClass} max-w-[160px] font-[family-name:var(--mono)] text-[12px] tabular-nums`}
              />
            </DialogField>

            {saveError && (
              <div role="alert">
                <Notice tone="red" icon={AlertTriangle} title="Could not save the route">
                  {saveError}
                </Notice>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </WorkspacePage>
  );
}
