/**
 * Alert rule detail: `GET/PATCH/DELETE /rules/:id` plus `/enable`, `/disable`,
 * `/test`, `/clone`. Conditions and actions are edited as JSON arrays matching
 * the backend `RuleConditionSchema` / `RuleActionSchema` shapes exactly, since
 * a full visual condition builder is out of scope for this pass.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { AlertTriangle, Copy } from "lucide-react";

import { Button as UiButton } from "@/components/ui/button";
import { useAlertRule, useAlertRuleMutations } from "@/modules/alerting/hooks/useAlerting";
import type { RuleAction, RuleCondition, TestRuleResult, UpdateRuleBody } from "@/modules/alerting/api/types";
import { EnabledPill, labelize } from "@/modules/alerting/components/alerting-ui";
import { apiErrorMessage, ConfirmDialog, DialogField } from "@/modules/projects/components/project-ui";
import {
  ProjectPageHeader,
  Readouts,
  Sheet,
  SheetError,
  SheetLoading,
  TextLink,
  WorkspacePage,
  type Readout,
} from "@/modules/projects/components/project-page";
import { Notice, Panel, Pill, fieldTextareaClass } from "@/shared/ui/pulse";
import {
  CodeBlock,
  EmptyNote,
  JsonViewer,
  KeyValueList,
  SeverityBadge,
  formatAbsoluteTime,
  formatNumber,
  formatRelativeTime,
  type KeyValueItem,
} from "@/shared/observe";
import { cn } from "@/lib/utils";

// ── module-level helpers ─────────────────────────────────────

const RULES_PATH = "/alerts/rules";
const CRUMB_ROOT = { label: "Alert rules", to: RULES_PATH };

const MONO_TEXTAREA = cn(fieldTextareaClass, "font-[family-name:var(--mono)] text-[12px] leading-[1.6]");

/** 45s, 5m, 1h 30m, 2d 4h. Two units at most. */
function formatSeconds(total: number | null | undefined): string {
  if (total === null || total === undefined || !Number.isFinite(total)) return "—";
  const seconds = Math.max(0, Math.round(total));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const rest = seconds % 60;
    return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest > 0 ? `${days}d ${rest}h` : `${days}d`;
}

/** One condition as a readable expression line, straight from its fields. */
function conditionLine(condition: RuleCondition): string {
  const field = condition.aggregateFunction
    ? `${condition.aggregateFunction}(${condition.fieldPath})`
    : condition.fieldPath;
  const threshold = condition.thresholdValue === undefined ? "" : ` ${JSON.stringify(condition.thresholdValue)}`;
  const lookback = condition.lookbackMinutes ? ` over ${condition.lookbackMinutes}m` : "";
  return `${field} ${condition.operator}${threshold}${lookback}`;
}

const ACTION_TARGETS: Array<{ key: keyof RuleAction; label: string }> = [
  { key: "connectorId", label: "Connector" },
  { key: "routeId", label: "Route" },
  { key: "templateId", label: "Template" },
  { key: "escalationPolicyId", label: "Escalation" },
];

function Sans({ children }: { children: string }) {
  return <span className="font-[family-name:var(--sans)]">{children}</span>;
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="mt-4">
      <Notice tone="red" icon={AlertTriangle}>
        {message}
      </Notice>
    </div>
  );
}

function RuleShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <WorkspacePage>
      <ProjectPageHeader title={title} crumbs={[CRUMB_ROOT, { label: title }]} />
      {children}
    </WorkspacePage>
  );
}

// ── page ─────────────────────────────────────────────────────

export default function AlertRuleDetailPage() {
  const { ruleId = "" } = useParams();
  const navigate = useNavigate();
  const { data: rule, isLoading, error: loadError, refetch } = useAlertRule(ruleId);
  const { updateRule, deleteRule, toggleRule, testRule, cloneRule } = useAlertRuleMutations();
  const [conditionsJson, setConditionsJson] = useState<string | null>(null);
  const [actionsJson, setActionsJson] = useState<string | null>(null);
  const [testPayload, setTestPayload] = useState('{\n  "value": 120\n}');
  const [testResult, setTestResult] = useState<TestRuleResult | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <RuleShell title="Alert rule">
        <Sheet label="Loading alert rule">
          <SheetLoading rows={5} label="Loading alert rule" />
        </Sheet>
      </RuleShell>
    );
  }

  if (!rule) {
    return (
      <RuleShell title={loadError ? "Could not load rule" : "Rule not found"}>
        <Sheet label="Alert rule">
          {loadError ? (
            <SheetError
              title="Could not load this rule"
              message={apiErrorMessage(loadError, "The rule is unavailable right now.")}
              onRetry={() => void refetch()}
            />
          ) : (
            <div className="flex flex-col items-start gap-3 px-5 py-8">
              <p className="max-w-[72ch] text-[13px] leading-[1.6] text-[var(--text2)]">
                No rule matches{" "}
                <code className="break-all font-[family-name:var(--mono)] text-[var(--text)]">{ruleId}</code> in this
                organization. It may have been deleted.
              </p>
              <TextLink to={RULES_PATH} arrow>
                Back to alert rules
              </TextLink>
            </div>
          )}
        </Sheet>
      </RuleShell>
    );
  }

  const handleToggle = () => {
    const nextState = !rule.enabled;
    toggleRule.mutate(
      { id: rule.id, enabled: nextState },
      {
        onSuccess: () => toast.success(nextState ? "Rule enabled" : "Rule disabled"),
        onError: (err) => toast.error(apiErrorMessage(err, "Could not update rule.")),
      },
    );
  };

  const handleSaveConditionsActions = (event: FormEvent) => {
    event.preventDefault();
    setSaveError(null);
    try {
      const body: UpdateRuleBody = {};
      if (conditionsJson !== null) body.conditions = JSON.parse(conditionsJson) as RuleCondition[];
      if (actionsJson !== null) body.actions = JSON.parse(actionsJson) as RuleAction[];
      updateRule.mutate(
        { id: rule.id, body },
        {
          onSuccess: () => toast.success("Rule updated"),
          onError: (err) => setSaveError(apiErrorMessage(err, "Could not save changes.")),
        },
      );
    } catch {
      setSaveError("Conditions and actions must be valid JSON arrays. Fix the syntax and save again.");
    }
  };

  const handleTest = (event: FormEvent) => {
    event.preventDefault();
    setTestError(null);
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(testPayload) as Record<string, unknown>;
    } catch {
      setTestError("The test payload must be valid JSON. Fix the syntax and run the test again.");
      return;
    }
    testRule.mutate(
      { id: rule.id, payload },
      {
        onSuccess: (result) => setTestResult(result),
        onError: (err) => setTestError(apiErrorMessage(err, "Could not test rule.")),
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

  const conditions = rule.conditions ?? [];
  const actions = rule.actions ?? [];
  const activeActions = actions.filter((action) => action.isActive !== false).length;
  const interval = formatSeconds(rule.evaluationIntervalSeconds);

  const readouts: Readout[] = [
    {
      label: "Conditions",
      value: formatNumber(conditions.length),
      sub: `Checked every ${interval}`,
    },
    {
      label: "Actions",
      value: formatNumber(actions.length),
      sub: `${formatNumber(activeActions)} active`,
    },
    {
      label: "Deduplication window",
      value: formatSeconds(rule.deduplicationWindowSeconds),
      sub: rule.deduplicationKeyTemplate ? "Custom key template" : "No key template",
    },
    {
      label: "Auto-resolve",
      value: rule.autoResolveAfterMinutes ? `${rule.autoResolveAfterMinutes}m` : <Sans>Off</Sans>,
      sub: rule.autoResolveAfterMinutes ? "Configured on the rule" : "Not configured",
    },
    {
      label: "Last evaluated",
      value: rule.lastEvaluatedAt ? formatRelativeTime(rule.lastEvaluatedAt) : <Sans>Never</Sans>,
      sub: rule.lastEvaluatedAt ? formatAbsoluteTime(rule.lastEvaluatedAt) : "No evaluation recorded",
    },
  ];

  const configuration: KeyValueItem[] = [
    { label: "Rule ID", value: rule.id, mono: true, copyable: true },
    { label: "Preset", value: rule.presetKey, mono: true },
    { label: "Default rule", value: rule.isDefault },
    { label: "Deduplication key", value: rule.deduplicationKeyTemplate, mono: true },
    { label: "Grouping", value: rule.groupingEnabled ? "On" : "Off" },
    { label: "Grouping key", value: rule.groupingKeyTemplate, mono: true },
    { label: "Grouping wait", value: formatSeconds(rule.groupingWaitSeconds), mono: true },
    {
      label: rule.enabled ? "Enabled" : "Disabled",
      value: formatAbsoluteTime(rule.enabled ? rule.enabledAt : rule.disabledAt),
      mono: true,
    },
    { label: "Created", value: formatAbsoluteTime(rule.createdAt), mono: true },
    { label: "Updated", value: formatAbsoluteTime(rule.updatedAt), mono: true },
  ];

  return (
    <WorkspacePage>
      <ProjectPageHeader
        crumbs={[CRUMB_ROOT, { label: rule.name }]}
        title={rule.name}
        description={rule.description || undefined}
        badges={
          <>
            <SeverityBadge severity={rule.severity} />
            <EnabledPill enabled={rule.enabled} />
          </>
        }
        meta={[
          { label: "Evaluates every", value: interval, mono: true },
          { label: "Cooldown", value: formatSeconds(rule.cooldownSeconds), mono: true },
          rule.projectId
            ? { label: "Project", value: rule.projectId, mono: true }
            : { label: "Scope", value: "Organization" },
          { label: "Updated", value: formatRelativeTime(rule.updatedAt), mono: true },
        ]}
        actions={
          <>
            <UiButton variant="outline" size="lg" onClick={handleToggle} disabled={toggleRule.isPending}>
              {rule.enabled ? "Disable rule" : "Enable rule"}
            </UiButton>
            <UiButton variant="outline" size="lg" onClick={handleClone} disabled={cloneRule.isPending}>
              <Copy className="size-4" aria-hidden="true" />
              {cloneRule.isPending ? "Cloning…" : "Clone"}
            </UiButton>
          </>
        }
      />

      <Readouts cells={readouts} label="Rule summary" />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel
            title="Conditions"
            description={`Evaluated every ${interval}. One condition per line, as stored on the rule.`}
          >
            {conditions.length === 0 ? (
              <EmptyNote title="No conditions">
                Without conditions this rule has nothing to evaluate. Add them as JSON in the editor below.
              </EmptyNote>
            ) : (
              <CodeBlock maxHeight={280}>{conditions.map(conditionLine).join("\n")}</CodeBlock>
            )}
          </Panel>

          <Panel title="Actions" description="What runs when the conditions match, in stored order.">
            {actions.length === 0 ? (
              <EmptyNote title="No actions">
                Nothing is notified when this rule matches. Add actions as JSON in the editor below.
              </EmptyNote>
            ) : (
              <ol className="-my-2.5 divide-y divide-[var(--border)]">
                {actions.map((action, index) => {
                  const targets = ACTION_TARGETS.filter((target) => typeof action[target.key] === "string");
                  return (
                    <li key={index} className="flex min-w-0 items-start gap-4 py-2.5">
                      <span className="w-5 shrink-0 pt-0.5 font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text3)]">
                        {index + 1}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill>{labelize(action.actionType)}</Pill>
                          {action.isActive === false && <Pill>Inactive</Pill>}
                          {action.throttleDurationSeconds ? (
                            <span className="text-[12px] text-[var(--text3)]">
                              Throttled{" "}
                              <span className="font-[family-name:var(--mono)] tabular-nums text-[var(--text2)]">
                                {formatSeconds(action.throttleDurationSeconds)}
                              </span>
                            </span>
                          ) : null}
                        </div>
                        {targets.length > 0 ? (
                          <dl className="flex flex-col gap-0.5 text-[12px]">
                            {targets.map((target) => (
                              <div key={target.key} className="flex min-w-0 gap-2">
                                <dt className="shrink-0 text-[var(--text3)]">{target.label}</dt>
                                <dd className="min-w-0 truncate font-[family-name:var(--mono)] text-[var(--text2)]">
                                  {String(action[target.key])}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <p className="text-[12px] text-[var(--text3)]">No target selected</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>
        </div>

        <Panel title="Configuration" bodyClassName="px-5 pb-2 pt-1">
          <KeyValueList items={configuration} columns={1} labelWidth={140} />
        </Panel>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <form onSubmit={handleSaveConditionsActions} className="min-w-0">
          <Panel
            title="Edit conditions and actions"
            description="Both are JSON arrays in the backend rule schema. Only the fields you change are saved."
            footer={
              <UiButton type="submit" size="lg" disabled={updateRule.isPending}>
                {updateRule.isPending ? "Saving…" : "Save conditions and actions"}
              </UiButton>
            }
          >
            <div className="flex flex-col gap-4">
              <DialogField
                label="Conditions"
                name="rule-conditions-json"
                hint="RuleCondition objects: fieldPath, operator (gt, lt, gte, lte, eq, neq, contains, regex, in, exists), thresholdValue, conditionType."
              >
                <textarea
                  id="rule-conditions-json"
                  className={cn(MONO_TEXTAREA, "min-h-[180px]")}
                  defaultValue={JSON.stringify(rule.conditions ?? [], null, 2)}
                  onChange={(e) => setConditionsJson(e.target.value)}
                  spellCheck={false}
                />
              </DialogField>
              <DialogField
                label="Actions"
                name="rule-actions-json"
                hint="RuleAction objects: actionType (notify, webhook, suppress, escalate, group), connectorId, routeId, templateId, escalationPolicyId."
              >
                <textarea
                  id="rule-actions-json"
                  className={cn(MONO_TEXTAREA, "min-h-[180px]")}
                  defaultValue={JSON.stringify(rule.actions ?? [], null, 2)}
                  onChange={(e) => setActionsJson(e.target.value)}
                  spellCheck={false}
                />
              </DialogField>
            </div>
            <FormError message={saveError} />
          </Panel>
        </form>

        <form onSubmit={handleTest} className="min-w-0">
          <Panel
            title="Test rule"
            description="Runs the rule's conditions against a sample payload without creating an event."
            footer={
              <UiButton type="submit" variant="outline" size="lg" disabled={testRule.isPending}>
                {testRule.isPending ? "Testing…" : "Run test"}
              </UiButton>
            }
          >
            <DialogField label="Sample payload" name="rule-test-payload" hint="Must be a JSON object.">
              <textarea
                id="rule-test-payload"
                className={cn(MONO_TEXTAREA, "min-h-[120px]")}
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                spellCheck={false}
              />
            </DialogField>
            <FormError message={testError} />
            {testResult != null && (
              <div className="mt-4 flex flex-col gap-2" aria-live="polite">
                <div className="flex items-center gap-2 text-[12px] text-[var(--text3)]">
                  Result
                  <Pill>{testResult.matched ? "Matched" : "Not matched"}</Pill>
                </div>
                <JsonViewer data={testResult} maxHeight={220} />
              </div>
            )}
          </Panel>
        </form>
      </div>

      <Panel
        danger
        title="Delete rule"
        description="The rule stops evaluating. This cannot be undone."
        footer={
          <UiButton variant="destructive" size="lg" onClick={() => setConfirmDelete(true)}>
            Delete rule
          </UiButton>
        }
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete alert rule?"
        description={`"${rule.name}" will stop evaluating. This cannot be undone.`}
        confirmLabel="Delete rule"
        pending={deleteRule.isPending}
        onConfirm={handleDelete}
      />
    </WorkspacePage>
  );
}
