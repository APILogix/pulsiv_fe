import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { CheckCircle2, ChevronRight, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RouteConditionBuilder, type RouteCondition } from "@/components/ui/route-condition-builder";
import { ConnectorSelector, type Connector } from "@/components/ui/connector-selector";

import { useAlertRouteMutations, useAlertRoute } from "@/modules/projects/hooks/useAlertRoutes";
import { Panel, SectionHeading } from "@/shared/ui/pulse";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md §1.2) ───────────────────

const STEPS = [
  { number: 1, label: "Basic info" },
  { number: 2, label: "Conditions" },
  { number: 3, label: "Targets" },
];

// Mock connectors until we have useConnectors hook
const MOCK_CONNECTORS: Connector[] = [
  { id: "conn_1", name: "Engineering Slack", type: "slack", status: "healthy" },
  { id: "conn_2", name: "Primary PagerDuty", type: "pagerduty", status: "healthy" },
  { id: "conn_3", name: "StatusPage", type: "webhook", status: "degraded" },
];

const DEFAULT_CONDITION: RouteCondition = {
  event_types: [],
  severities: [],
  source_services: [],
};

// ── page ─────────────────────────────────────────────────────

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

  const [condition, setCondition] = useState<RouteCondition>(DEFAULT_CONDITION);

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
        priority,
      };

      if (isEditing) {
        await mutations.updateRoute.mutateAsync({ routeId: routeId!, payload });
        toast.success("Route updated successfully");
      } else {
        await mutations.createRoute.mutateAsync(payload);
        toast.success("Route created successfully");
      }
      navigate(`/projects/${projectId}/routes`);
    } catch {
      toast.error("Failed to save route");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 py-6">
      <SectionHeading
        title={isEditing ? "Edit alert route" : "Create alert route"}
        description="Define conditions and delivery targets for this routing rule."
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, index) => (
          <div key={s.number} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => s.number < step && setStep(s.number)}
              disabled={s.number > step}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                s.number === step
                  ? "bg-[var(--brand-bg)] text-[var(--brand)]"
                  : s.number < step
                    ? "bg-[var(--green-bg)] text-[var(--green)] hover:opacity-80"
                    : "bg-[var(--bg2)] text-[var(--text3)]",
              )}
            >
              {s.number < step ? (
                <CheckCircle2 className="size-3.5" />
              ) : (
                <span className="flex size-4 items-center justify-center rounded-full bg-current/20 text-[10px] font-bold">
                  {s.number}
                </span>
              )}
              {s.label}
            </button>
            {index < STEPS.length - 1 && (
              <ChevronRight className="size-3.5 text-[var(--text3)]" />
            )}
          </div>
        ))}
      </div>

      <Panel>
        <div className="flex flex-col gap-6">
          {step === 1 && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="name" className="text-[12.5px] font-medium text-[var(--text)]">
                  Route name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production criticals"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="description" className="text-[12.5px] font-medium text-[var(--text)]">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this route handle?"
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-medium text-[var(--text)]">Active status</span>
                  <span className="text-[12px] text-[var(--text2)]">
                    Enable or disable this route from processing alerts.
                  </span>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </>
          )}

          {step === 2 && (
            <RouteConditionBuilder value={condition} onChange={setCondition} />
          )}

          {step === 3 && (
            <>
              <div className="flex flex-col gap-3">
                <Label className="text-[12.5px] font-medium text-[var(--text)]">
                  Delivery targets (connectors)
                </Label>
                <ConnectorSelector
                  connectors={MOCK_CONNECTORS}
                  selectedIds={selectedConnectors}
                  onChange={setSelectedConnectors}
                />
              </div>
              <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-4">
                <Label htmlFor="priority" className="text-[12.5px] font-medium text-[var(--text)]">
                  Routing priority
                </Label>
                <p className="text-[12px] text-[var(--text2)]">
                  Lower numbers run first. Default is 100.
                </p>
                <Input
                  id="priority"
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                />
              </div>
            </>
          )}
        </div>
      </Panel>

      {/* Navigation footer */}
      <div className="flex items-center justify-between rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] px-4 py-3">
        <Button
          variant="outline"
          onClick={() => (step > 1 ? setStep(step - 1) : navigate(`/projects/${projectId}/routes`))}
        >
          {step === 1 ? "Cancel" : "Back"}
        </Button>
        <Button
          onClick={() => (step < 3 ? setStep(step + 1) : handleSubmit())}
          disabled={(step === 1 && !name) || loading || (step === 3 && selectedConnectors.length === 0)}
          variant={step < 3 ? "secondary" : "default"}
        >
          {loading ? "Saving..." : step < 3 ? "Continue" : "Save route"}
          {!loading && step < 3 && <ChevronRight className="ml-1.5 size-4" />}
          {!loading && step === 3 && <Save className="ml-1.5 size-4" />}
        </Button>
      </div>
    </div>
  );
}
