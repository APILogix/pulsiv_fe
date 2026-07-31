/**
 * Escalation policy detail — `GET/DELETE /escalation-policies/:id` plus the
 * ordered steps editor via `PUT /escalation-policies/:id/steps`
 * (`UpsertEscalationStepSchema`: stepNumber, waitMinutes, connectorIds,
 * routeIds, notifyOnCall, customMessageTemplate, templateId, isActive).
 *
 * The backend upserts ONE step per call keyed by stepNumber, so "Add step"
 * sends the next stepNumber and "Save" re-sends the edited step.
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Phone, Plus, Trash2 } from "lucide-react";
import { PageHeader, SectionCard, DetailSkeleton } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  useEscalationPolicy,
  useEscalationPolicyMutations,
} from "@/modules/alerting/hooks/useAlerting";
import { apiErrorMessage, ConfirmDialog } from "@/modules/projects/components/project-ui";
import { EnabledPill } from "@/modules/alerting/components/alerting-ui";
import { fieldInputClass } from "@/shared/ui/pulse";
import type { AlertEscalationStep } from "@/modules/alerting/api/types";

function parseIdList(value: string): string[] {
  return value.split(/[\n,]/).map((v) => v.trim()).filter(Boolean);
}

function StepEditor({
  step,
  onSave,
  saving,
}: {
  step: AlertEscalationStep;
  onSave: (body: {
    stepNumber: number;
    waitMinutes: number;
    connectorIds: string[];
    routeIds: string[];
    notifyOnCall: boolean;
    isActive: boolean;
  }) => void;
  saving: boolean;
}) {
  const [waitMinutes, setWaitMinutes] = useState(step.waitMinutes);
  const [connectorIds, setConnectorIds] = useState(step.connectorIds.join("\n"));
  const [routeIds, setRouteIds] = useState(step.routeIds.join("\n"));
  const [notifyOnCall, setNotifyOnCall] = useState(step.notifyOnCall);
  const [isActive, setIsActive] = useState(step.isActive);

  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[var(--text)]">Step {step.stepNumber}</span>
        <EnabledPill enabled={isActive} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">Wait minutes</span>
          <input type="number" min={0} value={waitMinutes} onChange={(e) => setWaitMinutes(Number(e.target.value))} className={fieldInputClass} />
        </label>
        <label className="flex items-center gap-2 self-end pb-2">
          <input type="checkbox" checked={notifyOnCall} onChange={(e) => setNotifyOnCall(e.target.checked)} className="size-4 rounded border-[var(--border)]" />
          <span className="text-[13px] text-[var(--text)]">Notify on-call</span>
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">Connector ids (one per line)</span>
        <textarea value={connectorIds} onChange={(e) => setConnectorIds(e.target.value)} className={`${fieldInputClass} min-h-[64px] py-2 font-[family-name:var(--mono)] text-[12px]`} spellCheck={false} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-[family-name:var(--mono)] text-[10px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]">Route ids (one per line)</span>
        <textarea value={routeIds} onChange={(e) => setRouteIds(e.target.value)} className={`${fieldInputClass} min-h-[64px] py-2 font-[family-name:var(--mono)] text-[12px]`} spellCheck={false} />
      </label>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-4 rounded border-[var(--border)]" />
          <span className="text-[13px] text-[var(--text)]">Active</span>
        </label>
        <UiButton
          size="sm"
          disabled={saving}
          onClick={() => onSave({
            stepNumber: step.stepNumber,
            waitMinutes,
            connectorIds: parseIdList(connectorIds),
            routeIds: parseIdList(routeIds),
            notifyOnCall,
            isActive,
          })}
        >
          Save step
        </UiButton>
      </div>
    </div>
  );
}

export default function EscalationDetailPage() {
  const { policyId = "" } = useParams();
  const navigate = useNavigate();
  const { data: policy, isLoading } = useEscalationPolicy(policyId);
  const { remove, upsertStep } = useEscalationPolicyMutations();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) return <DetailSkeleton />;
  if (!policy) return <div className="p-8 text-[var(--text2)]">Policy not found.</div>;

  const steps = policy.steps ?? [];
  const nextStepNumber = steps.length > 0 ? Math.max(...steps.map((s) => s.stepNumber)) + 1 : 1;

  const handleSaveStep = (body: {
    stepNumber: number;
    waitMinutes: number;
    connectorIds: string[];
    routeIds: string[];
    notifyOnCall: boolean;
    isActive: boolean;
  }) => {
    upsertStep.mutate(
      { policyId, body },
      {
        onSuccess: () => toast.success(`Step ${body.stepNumber} saved`),
        onError: (err) => toast.error(apiErrorMessage(err, "Could not save step.")),
      },
    );
  };

  const handleAddStep = () => {
    upsertStep.mutate(
      { policyId, body: { stepNumber: nextStepNumber, waitMinutes: 5, connectorIds: [], routeIds: [], notifyOnCall: false, isActive: true } },
      {
        onSuccess: () => toast.success(`Step ${nextStepNumber} added`),
        onError: (err) => toast.error(apiErrorMessage(err, "Could not add step.")),
      },
    );
  };

  const handleDelete = () => {
    remove.mutate(policyId, {
      onSuccess: () => {
        toast.success("Policy deleted");
        navigate("/alerts/escalations");
      },
      onError: (err) => toast.error(apiErrorMessage(err, "Could not delete policy.")),
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <UiButton variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back to escalations</UiButton>

      <PageHeader
        title={policy.name}
        description={policy.description ?? "No description."}
        breadcrumbs={[{ label: "Act", to: "/alerts" }, { label: "Escalations", to: "/alerts/escalations" }, { label: policy.name }]}
        actions={
          <UiButton variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" /> Delete
          </UiButton>
        }
      />

      <SectionCard
        title="Steps"
        action={<UiButton variant="outline" onClick={handleAddStep} disabled={upsertStep.isPending}><Plus className="size-4" /> Add step</UiButton>}
      >
        {steps.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Phone className="size-8 text-[var(--text3)]" />
            <p className="text-[13px] text-[var(--text2)]">No steps yet. Add the first escalation step.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {steps
              .slice()
              .sort((a, b) => a.stepNumber - b.stepNumber)
              .map((step) => (
                <StepEditor key={step.id} step={step} onSave={handleSaveStep} saving={upsertStep.isPending} />
              ))}
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete escalation policy?"
        description={`"${policy.name}" and all of its steps will be removed.`}
        confirmLabel="Delete policy"
        pending={remove.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
