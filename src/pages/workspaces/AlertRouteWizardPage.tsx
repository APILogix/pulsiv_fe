import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { FillPage } from "@/shared/observe";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RouteConditionBuilder, RouteCondition } from "@/components/ui/route-condition-builder";
import { ConnectorSelector, Connector } from "@/components/ui/connector-selector";
import { toast } from "sonner";
import { ChevronRight, Save } from "lucide-react";

import { useAlertRouteMutations, useAlertRoute } from "@/modules/projects/hooks/useAlertRoutes";


// Mock connectors until we have useConnectors hook
const mockConnectors: Connector[] = [
  { id: "conn_1", name: "Engineering Slack", type: "slack", status: "healthy" },
  { id: "conn_2", name: "Primary PagerDuty", type: "pagerduty", status: "healthy" },
  { id: "conn_3", name: "StatusPage", type: "webhook", status: "degraded" },
];

export default function AlertRouteWizardPage() {
  const navigate = useNavigate();
  const { projectId, routeId } = useParams<{ projectId: string; routeId?: string }>();
  const isEditing = routeId && routeId !== "new";
  
  const { data: routeData } = useAlertRoute(projectId!, isEditing ? routeId : undefined);
  const mutations = useAlertRouteMutations(projectId!);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  const [condition, setCondition] = useState<RouteCondition>({
    event_types: [],
    severities: [],
    source_services: []
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

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        name,
        description,
        isActive,
        conditions: condition,
        targets: selectedConnectors,
        priority
      };

      if (isEditing) {
        await mutations.updateRoute.mutateAsync({ routeId: routeId!, payload });
        toast.success("Route updated successfully");
      } else {
        await mutations.createRoute.mutateAsync(payload);
        toast.success("Route created successfully");
      }
      navigate(`/projects/${projectId}/routes`);
    } catch (err) {
      toast.error("Failed to save route");
      setLoading(false);
    }
  };

  return (
    <FillPage className="sidebar-scroll flex flex-col items-center py-12">
      <div className="flex w-full max-w-[600px] flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            {isEditing ? "Edit Alert Route" : "Create Alert Route"}
          </h1>
          <p className="mt-1 text-sm text-[var(--text2)]">
            {step === 1 && "Step 1 of 3: Basic Information"}
            {step === 2 && "Step 2 of 3: Match Conditions"}
            {step === 3 && "Step 3 of 3: Targets & Throttling"}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg1)]">
          <div className="p-6">
            {step === 1 && (
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="name">Route Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Production Criticals"
                    autoFocus
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this route handle?"
                    rows={2}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base text-[var(--text)]">Active Status</Label>
                    <div className="text-sm text-[var(--text2)]">
                      Enable or disable this route from processing alerts.
                    </div>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </div>
            )}

            {step === 2 && (
              <RouteConditionBuilder value={condition} onChange={setCondition} />
            )}

            {step === 3 && (
              <div className="grid gap-6">
                <div className="space-y-3">
                  <Label>Delivery Targets (Connectors)</Label>
                  <ConnectorSelector 
                    connectors={mockConnectors} 
                    selectedIds={selectedConnectors}
                    onChange={setSelectedConnectors}
                  />
                </div>
                <div className="space-y-3 border-t border-[var(--border)] pt-4">
                  <Label>Routing Priority</Label>
                  <div className="mb-2 text-sm text-[var(--text2)]">
                    Lower numbers run first. Default is 100.
                  </div>
                  <Input 
                    type="number" 
                    value={priority} 
                    onChange={(e) => setPriority(Number(e.target.value))} 
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-b-xl border-t border-[var(--border)] bg-[var(--bg2)]/50 p-4">
            <Button
              variant="outline"
              onClick={() => step > 1 ? setStep(step - 1) : navigate(`/projects/${projectId}/routes`)}
            >
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            <Button 
              onClick={() => step < 3 ? setStep(step + 1) : handleSubmit()}
              disabled={(step === 1 && !name) || loading || (step === 3 && selectedConnectors.length === 0)}
              variant={step < 3 ? "secondary" : "default"}
            >
              {loading ? "Saving..." : step < 3 ? "Continue" : "Save Route"}
              {!loading && step < 3 && <ChevronRight className="ml-2 size-4" />}
              {!loading && step === 3 && <Save className="ml-2 size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </FillPage>
  );
}
