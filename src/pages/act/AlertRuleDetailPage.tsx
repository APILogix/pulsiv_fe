/**
 * Alert rule detail — `GET/PATCH/DELETE /rules/:id` plus `/enable`, `/disable`,
 * `/test`, `/clone`. Conditions/actions are edited as JSON arrays matching the
 * backend `RuleConditionSchema` / `RuleActionSchema` shapes exactly, since a
 * full visual condition builder is out of scope for this pass.
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Copy, FlaskConical, Trash2 } from "lucide-react";
import { PageHeader, SectionCard, SeverityBadge, DetailSkeleton, JsonViewer } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  useAlertRule,
  useAlertRuleMutations,
} from "@/modules/alerting/hooks/useAlerting";
import { apiErrorMessage, ConfirmDialog } from "@/modules/projects/components/project-ui";
import { EnabledPill, MetaCell } from "@/modules/alerting/components/alerting-ui";
import { fieldTextareaClass } from "@/shared/ui/pulse";

export default function AlertRuleDetailPage() {
  const { ruleId = "" } = useParams();
  const navigate = useNavigate();
  const { data: rule, isLoading } = useAlertRule(ruleId);
  const { updateRule, deleteRule, toggleRule, testRule, cloneRule } = useAlertRuleMutations();
  const [conditionsJson, setConditionsJson] = useState<string | null>(null);
  const [actionsJson, setActionsJson] = useState<string | null>(null);
  const [testPayload, setTestPayload] = useState('{\n  "value": 120\n}');
  const [testResult, setTestResult] = useState<unknown>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <DetailSkeleton />;
  if (!rule) return <div className="p-8 text-[var(--text2)]">Rule not found.</div>;

  const handleToggle = () => {
    const nextState = !rule.enabled;
    toast.success(nextState ? "Rule enabled" : "Rule disabled");
    toggleRule.mutate(
      { id: rule.id, enabled: nextState },
      {
        onError: (err) => toast.error(apiErrorMessage(err, "Could not update rule.")),
      },
    );
  };

  const handleSaveConditionsActions = () => {
    setError(null);
    try {
      const body: any = {};
      if (conditionsJson !== null) body.conditions = JSON.parse(conditionsJson);
      if (actionsJson !== null) body.actions = JSON.parse(actionsJson);
      updateRule.mutate(
        { id: rule.id, body },
        {
          onSuccess: () => toast.success("Rule updated"),
          onError: (err) => setError(apiErrorMessage(err, "Could not save changes.")),
        },
      );
    } catch {
      setError("Conditions/actions must be valid JSON arrays.");
    }
  };

  const handleTest = () => {
    setError(null);
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(testPayload);
    } catch {
      setError("Test payload must be valid JSON.");
      return;
    }
    testRule.mutate(
      { id: rule.id, payload },
      {
        onSuccess: (result) => setTestResult(result),
        onError: (err) => setError(apiErrorMessage(err, "Could not test rule.")),
      },
    );
  };

  const handleClone = () => {
    cloneRule.mutate(rule.id, {
      onSuccess: (cloned) => {
        toast.success("Rule cloned");
        navigate(`/alerts/rules/${cloned.id}`);
      },
      onError: (err) => toast.error(apiErrorMessage(err, "Could not clone rule.")),
    });
  };

  const handleDelete = () => {
    deleteRule.mutate(rule.id, {
      onSuccess: () => {
        toast.success("Rule deleted");
        navigate("/alerts/rules");
      },
      onError: (err) => toast.error(apiErrorMessage(err, "Could not delete rule.")),
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <UiButton variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back to rules</UiButton>

      <PageHeader
        title={rule.name}
        description={rule.description ?? "No description."}
        breadcrumbs={[{ label: "Act", to: "/alerts" }, { label: "Rules", to: "/alerts/rules" }, { label: rule.name }]}
        actions={
          <div className="flex gap-2">
            <UiButton variant="outline" onClick={handleClone} disabled={cloneRule.isPending}>
              <Copy className="size-4" /> Clone
            </UiButton>
            <UiButton variant="outline" onClick={handleToggle} disabled={toggleRule.isPending}>
              {rule.enabled ? "Disable" : "Enable"}
            </UiButton>
            <UiButton variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" /> Delete
            </UiButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetaCell label="Severity"><SeverityBadge severity={rule.severity} /></MetaCell>
        <MetaCell label="Status"><EnabledPill enabled={rule.enabled} /></MetaCell>
        <MetaCell label="Evaluation interval">{rule.evaluationIntervalSeconds}s</MetaCell>
        <MetaCell label="Cooldown">{rule.cooldownSeconds}s</MetaCell>
      </div>

      <SectionCard title="Conditions">
        <p className="mb-3 text-[12px] text-[var(--text2)]">
          Array of <code className="font-[family-name:var(--mono)]">RuleCondition</code> objects — fieldPath,
          operator (gt/lt/gte/lte/eq/neq/contains/regex/in/exists), thresholdValue, conditionType.
        </p>
        <textarea
          className={`${fieldTextareaClass} min-h-[160px] font-[family-name:var(--mono)] text-[12px]`}
          defaultValue={JSON.stringify(rule.conditions ?? [], null, 2)}
          onChange={(e) => setConditionsJson(e.target.value)}
          spellCheck={false}
        />
      </SectionCard>

      <SectionCard title="Actions">
        <p className="mb-3 text-[12px] text-[var(--text2)]">
          Array of <code className="font-[family-name:var(--mono)]">RuleAction</code> objects — actionType
          (notify/webhook/suppress/escalate/group), connectorId, routeId, templateId, escalationPolicyId.
        </p>
        <textarea
          className={`${fieldTextareaClass} min-h-[160px] font-[family-name:var(--mono)] text-[12px]`}
          defaultValue={JSON.stringify(rule.actions ?? [], null, 2)}
          onChange={(e) => setActionsJson(e.target.value)}
          spellCheck={false}
        />
        <div className="mt-3 flex justify-end">
          <UiButton onClick={handleSaveConditionsActions} disabled={updateRule.isPending}>
            Save conditions & actions
          </UiButton>
        </div>
      </SectionCard>

      <SectionCard title="Test rule" action={<FlaskConical className="size-4 text-[var(--text3)]" />}>
        <p className="mb-3 text-[12px] text-[var(--text2)]">
          Runs the rule&apos;s conditions against a sample payload without creating an event.
        </p>
        <textarea
          className={`${fieldTextareaClass} min-h-[100px] font-[family-name:var(--mono)] text-[12px]`}
          value={testPayload}
          onChange={(e) => setTestPayload(e.target.value)}
          spellCheck={false}
        />
        <div className="mt-3 flex justify-end">
          <UiButton variant="outline" onClick={handleTest} disabled={testRule.isPending}>
            {testRule.isPending ? "Testing…" : "Run test"}
          </UiButton>
        </div>
        {testResult != null && (
          <div className="mt-3">
            <JsonViewer data={testResult} maxHeight={200} />
          </div>
        )}
      </SectionCard>

      {error && <p className="text-[13px] text-[var(--red)]">{error}</p>}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete alert rule?"
        description={`"${rule.name}" will stop evaluating. This cannot be undone.`}
        confirmLabel="Delete rule"
        pending={deleteRule.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
