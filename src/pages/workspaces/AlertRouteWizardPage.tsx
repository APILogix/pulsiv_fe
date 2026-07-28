import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, ArrowRight, Check, Save, Split } from "lucide-react";
import { toast } from "sonner";

import { Button as UiButton } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RouteConditionBuilder, type RouteCondition } from "@/components/ui/route-condition-builder";
import { ConnectorSelector, type Connector } from "@/components/ui/connector-selector";
import { useAlertRouteMutations, useAlertRoute } from "@/modules/projects/hooks/useAlertRoutes";
import { Panel, fieldInputClass, fieldTextareaClass } from "@/shared/ui/pulse";
import { DialogField } from "@/modules/projects/components/project-ui";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md) ────────────────────────

const WIZARD_STEPS = [
  { label: "Details", description: "Name and status" },
  { label: "Conditions", description: "Match rules" },
  { label: "Targets", description: "Delivery destinations" },
] as const;

const mockConnectors: Connector[] = [
  { id: "conn_1", name: "Engineering Slack", type: "slack", status: "healthy" },
  { id: "conn_2", name: "Primary PagerDuty", type: "pagerduty", status: "healthy" },
  { id: "conn_3", name: "StatusPage", type: "webhook", status: "degraded" },
];

// ── page ─────────────────────────────────────────────────────

export default function AlertRouteWizardPage() {
  const navigate = useNavigate();
  const { projectId, routeId } = useParams<{ projectId: string; routeId?: string }>();
  const isEditing = routeId && routeId !== "new";

  const { data: routeData } = useAlertRoute(projectId!, isEditing ? routeId : undefined);
  const mutations = useAlertRouteMutations(projectId!);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
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
        toast.success("Route updated");
      } else {
        await mutations.createRoute.mutateAsync(payload);
        toast.success("Route created");
      }
      navigate(`/projects/${projectId}/routes`);
    } catch {
      toast.error("Failed to save route");
      setLoading(false);
    }
  };

  const canProceed = step === 0 ? name.trim().length > 0 : step === 2 ? selectedConnectors.length > 0 : true;

  return (
    <div className="flex flex-col items-center py-8">
      <div className="w-full max-w-[640px]">
        {/* header */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="relative mb-1">
            <div className="absolute inset-0 rounded-full bg-[var(--brand)]/10 blur-xl" aria-hidden="true" />
            <div className="relative inline-flex size-12 items-center justify-center rounded-2xl bg-[var(--brand)]/10">
              <Split className="size-5 text-[var(--brand)]" />
            </div>
          </div>
          <h1 className="font-[family-name:var(--display)] text-[24px] font-bold tracking-[-0.02em] text-[var(--text)]">
            {isEditing ? "Edit alert route" : "Create alert route"}
          </h1>
          <p className="text-[13.5px] text-[var(--text2)]">
            Route alerts to specific channels based on severity, type, and source.
          </p>
        </div>

        {/* step indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {WIZARD_STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { if (i < step) setStep(i); }}
                disabled={i > step}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all",
                  i === step
                    ? "bg-[var(--brand)] text-white shadow-md shadow-[var(--brand)]/20"
                    : i < step
                      ? "bg-[var(--green)]/10 text-[var(--green)]"
                      : "bg-[var(--bg2)] text-[var(--text3)]",
                )}
              >
                {i < step ? <Check className="size-3.5" /> : <span className="font-[family-name:var(--mono)] text-[11px]">{i + 1}</span>}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < WIZARD_STEPS.length - 1 && (
                <div className={cn("h-px w-8", i < step ? "bg-[var(--green)]" : "bg-[var(--border)]")} />
              )}
            </div>
          ))}
        </div>

        {/* step content */}
        <Panel>
          <div className="flex flex-col gap-6">
            {step === 0 && (
              <>
                <DialogField label="Route name" name="name" required>
                  <input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Production criticals"
                    autoFocus
                    className={fieldInputClass}
                  />
                </DialogField>
                <DialogField label="Description" name="description">
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this route handle?"
                    rows={2}
                    className={fieldTextareaClass}
                  />
                </DialogField>
                <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg2)]/50 p-4">
                  <div>
                    <p className="text-[13px] font-medium text-[var(--text)]">Active status</p>
                    <p className="mt-0.5 text-[12px] text-[var(--text3)]">Enable or disable this route.</p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </>
            )}

            {step === 1 && <RouteConditionBuilder value={condition} onChange={setCondition} />}

            {step === 2 && (
              <>
                <div>
                  <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                    Delivery targets
                  </p>
                  <ConnectorSelector
                    connectors={mockConnectors}
                    selectedIds={selectedConnectors}
                    onChange={setSelectedConnectors}
                  />
                </div>
                <DialogField label="Routing priority" name="priority" hint="Lower numbers run first. Default is 100.">
                  <input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className={fieldInputClass}
                  />
                </DialogField>
              </>
            )}
          </div>

          {/* navigation */}
          <div className="mt-8 flex items-center justify-between border-t border-[var(--border)] pt-5">
            <UiButton
              variant="ghost"
              size="lg"
              onClick={() => (step > 0 ? setStep(step - 1) : navigate(`/projects/${projectId}/routes`))}
            >
              {step === 0 ? "Cancel" : <><ArrowLeft className="mr-1.5 size-4" /> Back</>}
            </UiButton>
            <UiButton
              size="lg"
              onClick={() => (step < 2 ? setStep(step + 1) : handleSubmit())}
              disabled={!canProceed || loading}
            >
              {loading ? (
                "Saving..."
              ) : step < 2 ? (
                <>Continue <ArrowRight className="ml-1.5 size-4" /></>
              ) : (
                <><Save className="mr-1.5 size-4" /> Save route</>
              )}
            </UiButton>
          </div>
        </Panel>
      </div>
    </div>
  );
}
