/**
 * Create / edit dialog for automation workflows.
 *
 * Mirrors the backend contract in `pulse/src/modules/automation/schemas.ts`:
 * one trigger, 0-50 conditions, 1-25 actions, plus optional safety rails.
 * The dialog enforces the server-side invariants locally so the user gets
 * feedback before a 400 comes back:
 *   - event triggers need `sourceEvent`, schedule triggers need a 5-field cron
 *   - high/critical risk and every dangerous action type must require approval
 */
import { useState } from "react";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button as UiButton } from "@/components/ui/button";
import { Notice, fieldInputClass, fieldTextareaClass } from "@/shared/ui/pulse";
import { DialogField } from "@/modules/projects/components/project-ui";
import {
  ACTION_RISK_LEVELS,
  ACTION_TYPES,
  AUTOMATION_LIMITS,
  CONDITION_OPERATORS,
  DANGEROUS_ACTIONS,
  TRIGGER_KINDS,
  TRIGGER_TYPES,
  UNARY_OPERATORS,
  WORKFLOW_SCOPES,
  WORKFLOW_TYPES,
  type ActionInput,
  type ActionRiskLevel,
  type ActionType,
  type ConditionInput,
  type ConditionOperator,
  type CreateWorkflowBody,
  type Json,
  type TriggerKind,
  type TriggerType,
  type UpdateWorkflowBody,
  type WorkflowDetail,
  type WorkflowScope,
  type WorkflowType,
} from "../api/types";
import { CodeChip, labelize, requiresApprovalRisk } from "./automation-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const selectClass = `${fieldInputClass} appearance-none pr-8`;
const smallInputClass = "h-9 w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-2.5 text-[12.5px] text-[var(--text)] outline-none focus:border-[var(--brand)]";
const monoTextareaClass = `${fieldTextareaClass} min-h-[72px] font-[family-name:var(--mono)] text-[12px]`;

interface ConditionDraft {
  leftPath: string;
  operator: ConditionOperator;
  rightValue: string;
  isRequired: boolean;
}

interface ActionDraft {
  actionKey: string;
  actionType: ActionType;
  riskLevel: ActionRiskLevel;
  requiresApproval: boolean;
  timeoutSeconds: number;
  maxAttempts: number;
  retryBackoffSeconds: number;
  config: string;
}

interface FormDraft {
  name: string;
  description: string;
  workflowType: WorkflowType;
  scope: WorkflowScope;
  projectId: string;
  timezone: string;
  tags: string;
  triggerKind: TriggerKind;
  triggerType: TriggerType;
  sourceModule: string;
  sourceEvent: string;
  scheduleCron: string;
  cooldownSeconds: number;
  dedupeKeyTemplate: string;
  triggerConfig: string;
  maxRunsPerHour: number;
  dedupeWindowSeconds: number;
  requiresApprovalAboveRisk: ActionRiskLevel;
  conditions: ConditionDraft[];
  actions: ActionDraft[];
}

const EMPTY_CONDITION: ConditionDraft = {
  leftPath: "",
  operator: "eq",
  rightValue: "",
  isRequired: true,
};

const EMPTY_ACTION: ActionDraft = {
  actionKey: "",
  actionType: "notification.send",
  riskLevel: "low",
  requiresApproval: false,
  timeoutSeconds: 60,
  maxAttempts: 3,
  retryBackoffSeconds: 30,
  config: "{}",
};

const BLANK_DRAFT: FormDraft = {
  name: "",
  description: "",
  workflowType: "custom",
  scope: "organization",
  projectId: "",
  timezone: "UTC",
  tags: "",
  triggerKind: "event",
  triggerType: "alert.event.created",
  sourceModule: "alerting",
  sourceEvent: "alert.event.created",
  scheduleCron: "0 * * * *",
  cooldownSeconds: 0,
  dedupeKeyTemplate: "",
  triggerConfig: "{}",
  maxRunsPerHour: 100,
  dedupeWindowSeconds: 300,
  requiresApprovalAboveRisk: "high",
  conditions: [],
  actions: [{ ...EMPTY_ACTION, actionKey: "notify" }],
};

// ── helpers ──────────────────────────────────────────────────

function parseJsonObject(raw: string, field: string): Json {
  const trimmed = raw.trim();
  if (trimmed === "") return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`${field} must be valid JSON.`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${field} must be a JSON object.`);
  }
  return parsed as Json;
}

/** Condition right-hand values accept JSON literals, falling back to raw text. */
function parseRightValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function draftFromDetail(detail: WorkflowDetail): FormDraft {
  const { workflow } = detail;
  const trigger = detail.triggers[0];
  const safety = (workflow.metadata?.safety ?? {}) as Record<string, unknown>;

  return {
    name: workflow.name,
    description: workflow.description ?? "",
    workflowType: workflow.workflowType as WorkflowType,
    scope: (workflow.scope === "project" ? "project" : "organization") as WorkflowScope,
    projectId: workflow.projectId ?? "",
    timezone: workflow.timezone || "UTC",
    tags: workflow.tags.join(", "),
    triggerKind: (trigger?.triggerKind ?? "event") as TriggerKind,
    triggerType: (trigger?.triggerType ?? "alert.event.created") as TriggerType,
    sourceModule: trigger?.sourceModule ?? "alerting",
    sourceEvent: trigger?.sourceEvent ?? "",
    scheduleCron: trigger?.scheduleCron ?? "0 * * * *",
    cooldownSeconds: trigger?.cooldownSeconds ?? 0,
    dedupeKeyTemplate: trigger?.dedupeKeyTemplate ?? "",
    triggerConfig: JSON.stringify(trigger?.config ?? {}, null, 2),
    maxRunsPerHour: typeof safety.maxRunsPerHour === "number" ? safety.maxRunsPerHour : 100,
    dedupeWindowSeconds: typeof safety.dedupeWindowSeconds === "number" ? safety.dedupeWindowSeconds : 300,
    requiresApprovalAboveRisk: (typeof safety.requiresApprovalAboveRisk === "string"
      ? safety.requiresApprovalAboveRisk
      : "high") as ActionRiskLevel,
    conditions: detail.conditions.map((condition) => ({
      leftPath: condition.leftPath,
      operator: condition.operator as ConditionOperator,
      rightValue:
        condition.rightValue === null || condition.rightValue === undefined
          ? ""
          : typeof condition.rightValue === "string"
            ? condition.rightValue
            : JSON.stringify(condition.rightValue),
      isRequired: condition.isRequired,
    })),
    actions: detail.actions.map((action) => ({
      actionKey: action.actionKey,
      actionType: action.actionType as ActionType,
      riskLevel: action.riskLevel as ActionRiskLevel,
      requiresApproval: action.requiresApproval,
      timeoutSeconds: action.timeoutSeconds,
      maxAttempts: action.maxAttempts,
      retryBackoffSeconds: action.retryBackoffSeconds,
      config: JSON.stringify(action.config ?? {}, null, 2),
    })),
  };
}

/** Server-side rule: dangerous actions and high/critical risk always need approval. */
function mustRequireApproval(action: ActionDraft): boolean {
  return requiresApprovalRisk(action.riskLevel) || DANGEROUS_ACTIONS.includes(action.actionType);
}

function buildBody(draft: FormDraft): CreateWorkflowBody {
  if (draft.name.trim() === "") throw new Error("Name is required.");
  if (draft.triggerKind === "event" && draft.sourceEvent.trim() === "") {
    throw new Error("Event triggers require a source event.");
  }
  if (draft.triggerKind === "schedule" && draft.scheduleCron.trim().split(/\s+/).length !== 5) {
    throw new Error("Schedule triggers require a 5-field cron expression.");
  }
  if (draft.scope === "project" && draft.projectId.trim() === "") {
    throw new Error("Project-scoped workflows require a project id.");
  }
  if (draft.actions.length === 0) throw new Error("Add at least one action.");

  const actionKeys = new Set<string>();
  const actions: ActionInput[] = draft.actions.map((action, index) => {
    const key = action.actionKey.trim();
    if (key === "") throw new Error(`Action ${index + 1} needs a key.`);
    if (actionKeys.has(key)) throw new Error(`Duplicate action key "${key}".`);
    actionKeys.add(key);
    return {
      actionKey: key,
      actionType: action.actionType,
      sortOrder: index,
      isEnabled: true,
      requiresApproval: action.requiresApproval || mustRequireApproval(action),
      riskLevel: action.riskLevel,
      timeoutSeconds: action.timeoutSeconds,
      maxAttempts: action.maxAttempts,
      retryBackoffSeconds: action.retryBackoffSeconds,
      config: parseJsonObject(action.config, `Action "${key}" config`),
    };
  });

  const conditions: ConditionInput[] = draft.conditions.map((condition, index) => {
    const leftPath = condition.leftPath.trim();
    if (leftPath === "") throw new Error(`Condition ${index + 1} needs a payload path.`);
    const unary = UNARY_OPERATORS.includes(condition.operator);
    const rightValue = unary ? undefined : parseRightValue(condition.rightValue);
    if (!unary && rightValue === undefined) {
      throw new Error(`Condition ${index + 1} needs a value for "${condition.operator}".`);
    }
    return {
      conditionGroup: "default",
      sortOrder: index,
      leftPath,
      operator: condition.operator,
      ...(rightValue === undefined ? {} : { rightValue }),
      isRequired: condition.isRequired,
    };
  });

  const tags = draft.tags
    .split(/[\n,]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, AUTOMATION_LIMITS.TAGS);

  return {
    name: draft.name.trim(),
    ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
    workflowType: draft.workflowType,
    scope: draft.scope,
    ...(draft.scope === "project" ? { projectId: draft.projectId.trim() } : {}),
    timezone: draft.timezone.trim() || "UTC",
    tags,
    trigger: {
      triggerKind: draft.triggerKind,
      triggerType: draft.triggerType,
      sourceModule: draft.sourceModule.trim() || "automation",
      ...(draft.triggerKind === "event" ? { sourceEvent: draft.sourceEvent.trim() } : {}),
      ...(draft.triggerKind === "schedule" ? { scheduleCron: draft.scheduleCron.trim() } : {}),
      timezone: draft.timezone.trim() || "UTC",
      isEnabled: true,
      ...(draft.dedupeKeyTemplate.trim() ? { dedupeKeyTemplate: draft.dedupeKeyTemplate.trim() } : {}),
      cooldownSeconds: draft.cooldownSeconds,
      config: parseJsonObject(draft.triggerConfig, "Trigger config"),
    },
    conditions,
    actions,
    safety: {
      maxRunsPerHour: draft.maxRunsPerHour,
      dedupeWindowSeconds: draft.dedupeWindowSeconds,
      requiresApprovalAboveRisk: draft.requiresApprovalAboveRisk,
    },
  };
}

// ── component ────────────────────────────────────────────────

export function WorkflowFormDialog({
  open,
  onOpenChange,
  mode,
  detail,
  pending,
  error,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  detail?: WorkflowDetail | null;
  pending?: boolean;
  error?: string | null;
  onCreate?: (body: CreateWorkflowBody) => void;
  onUpdate?: (body: UpdateWorkflowBody) => void;
}) {
  const [draft, setDraft] = useState<FormDraft>(() =>
    mode === "edit" && detail ? draftFromDetail(detail) : BLANK_DRAFT,
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const patch = (changes: Partial<FormDraft>) => setDraft((current) => ({ ...current, ...changes }));

  const patchCondition = (index: number, changes: Partial<ConditionDraft>) =>
    setDraft((current) => ({
      ...current,
      conditions: current.conditions.map((item, i) => (i === index ? { ...item, ...changes } : item)),
    }));

  const patchAction = (index: number, changes: Partial<ActionDraft>) =>
    setDraft((current) => ({
      ...current,
      actions: current.actions.map((item, i) => (i === index ? { ...item, ...changes } : item)),
    }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    let body: CreateWorkflowBody;
    try {
      body = buildBody(draft);
    } catch (buildError) {
      setLocalError((buildError as Error).message);
      return;
    }

    if (mode === "create") {
      onCreate?.(body);
      return;
    }
    // Update accepts the mutable subset only — type/scope/project are immutable.
    onUpdate?.({
      name: body.name,
      ...(body.description !== undefined ? { description: body.description } : {}),
      trigger: body.trigger,
      conditions: body.conditions,
      actions: body.actions,
      ...(body.safety ? { safety: body.safety } : {}),
      tags: body.tags,
      timezone: body.timezone,
    });
  };

  const message = localError ?? error ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[860px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New workflow" : "Edit workflow"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Workflows start as a draft. Publish a version before switching them on."
              : "Edits apply to the draft. Publish again to roll the changes out."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex max-h-[64vh] flex-col gap-5 overflow-y-auto pr-1 sidebar-scroll">
            {/* ── Basics ── */}
            <div className="grid gap-4 sm:grid-cols-2">
              <DialogField label="Name" required className="sm:col-span-2">
                <input
                  className={fieldInputClass}
                  value={draft.name}
                  maxLength={AUTOMATION_LIMITS.NAME}
                  onChange={(event) => patch({ name: event.target.value })}
                  placeholder="Route critical alerts to on-call"
                />
              </DialogField>

              <DialogField label="Description" className="sm:col-span-2">
                <textarea
                  className={fieldTextareaClass}
                  value={draft.description}
                  maxLength={AUTOMATION_LIMITS.DESCRIPTION}
                  onChange={(event) => patch({ description: event.target.value })}
                  placeholder="What this workflow automates and who owns it."
                />
              </DialogField>

              <DialogField label="Workflow type">
                <select
                  className={selectClass}
                  value={draft.workflowType}
                  disabled={mode === "edit"}
                  onChange={(event) => patch({ workflowType: event.target.value as WorkflowType })}
                >
                  {WORKFLOW_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {labelize(type)}
                    </option>
                  ))}
                </select>
              </DialogField>

              <DialogField label="Scope">
                <select
                  className={selectClass}
                  value={draft.scope}
                  disabled={mode === "edit"}
                  onChange={(event) => patch({ scope: event.target.value as WorkflowScope })}
                >
                  {WORKFLOW_SCOPES.map((scope) => (
                    <option key={scope} value={scope}>
                      {labelize(scope)}
                    </option>
                  ))}
                </select>
              </DialogField>

              {draft.scope === "project" && (
                <DialogField label="Project id" required hint="UUID of a project in this organization.">
                  <input
                    className={fieldInputClass}
                    value={draft.projectId}
                    disabled={mode === "edit"}
                    onChange={(event) => patch({ projectId: event.target.value })}
                    placeholder="00000000-0000-0000-0000-000000000000"
                  />
                </DialogField>
              )}

              <DialogField label="Timezone" hint="IANA name, e.g. UTC or Europe/Berlin.">
                <input
                  className={fieldInputClass}
                  value={draft.timezone}
                  maxLength={AUTOMATION_LIMITS.TIMEZONE}
                  onChange={(event) => patch({ timezone: event.target.value })}
                />
              </DialogField>

              <DialogField label="Tags" hint="Comma separated, up to 20." className="sm:col-span-2">
                <input
                  className={fieldInputClass}
                  value={draft.tags}
                  onChange={(event) => patch({ tags: event.target.value })}
                  placeholder="on-call, sev1"
                />
              </DialogField>
            </div>

            {/* ── Trigger ── */}
            <section className="rounded-[12px] border border-[var(--border)] bg-[var(--bg2)]/40 p-4">
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text3)]">
                Trigger
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <DialogField label="Kind">
                  <select
                    className={selectClass}
                    value={draft.triggerKind}
                    onChange={(event) => patch({ triggerKind: event.target.value as TriggerKind })}
                  >
                    {TRIGGER_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {labelize(kind)}
                      </option>
                    ))}
                  </select>
                </DialogField>

                <DialogField label="Trigger type">
                  <select
                    className={selectClass}
                    value={draft.triggerType}
                    onChange={(event) => patch({ triggerType: event.target.value as TriggerType })}
                  >
                    {TRIGGER_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </DialogField>

                <DialogField label="Source module" required>
                  <input
                    className={fieldInputClass}
                    value={draft.sourceModule}
                    onChange={(event) => patch({ sourceModule: event.target.value })}
                    placeholder="alerting"
                  />
                </DialogField>

                {draft.triggerKind === "event" && (
                  <DialogField label="Source event" required hint="Event name emitted by the source module.">
                    <input
                      className={fieldInputClass}
                      value={draft.sourceEvent}
                      onChange={(event) => patch({ sourceEvent: event.target.value })}
                      placeholder="alert.event.created"
                    />
                  </DialogField>
                )}

                {draft.triggerKind === "schedule" && (
                  <DialogField label="Cron" required hint="5 fields: minute hour dom month dow.">
                    <input
                      className={fieldInputClass}
                      value={draft.scheduleCron}
                      maxLength={AUTOMATION_LIMITS.CRON}
                      onChange={(event) => patch({ scheduleCron: event.target.value })}
                      placeholder="0 * * * *"
                    />
                  </DialogField>
                )}

                <DialogField label="Cooldown (seconds)" hint="0 disables the cooldown window.">
                  <input
                    type="number"
                    className={fieldInputClass}
                    value={draft.cooldownSeconds}
                    min={AUTOMATION_LIMITS.COOLDOWN_MIN}
                    max={AUTOMATION_LIMITS.COOLDOWN_MAX}
                    onChange={(event) => patch({ cooldownSeconds: Number(event.target.value) || 0 })}
                  />
                </DialogField>

                <DialogField label="Dedupe key template" hint="Optional, e.g. {{payload.alertId}}.">
                  <input
                    className={fieldInputClass}
                    value={draft.dedupeKeyTemplate}
                    onChange={(event) => patch({ dedupeKeyTemplate: event.target.value })}
                  />
                </DialogField>

                <DialogField label="Trigger config (JSON)" className="sm:col-span-2">
                  <textarea
                    className={monoTextareaClass}
                    value={draft.triggerConfig}
                    onChange={(event) => patch({ triggerConfig: event.target.value })}
                    spellCheck={false}
                  />
                </DialogField>
              </div>
            </section>

            {/* ── Conditions ── */}
            <section className="rounded-[12px] border border-[var(--border)] bg-[var(--bg2)]/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text3)]">
                  Conditions ({draft.conditions.length}/{AUTOMATION_LIMITS.CONDITIONS})
                </h3>
                <UiButton
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={draft.conditions.length >= AUTOMATION_LIMITS.CONDITIONS}
                  onClick={() => patch({ conditions: [...draft.conditions, { ...EMPTY_CONDITION }] })}
                >
                  <Plus className="size-3.5" /> Condition
                </UiButton>
              </div>

              {draft.conditions.length === 0 ? (
                <p className="text-[12.5px] text-[var(--text3)]">
                  No conditions — every matching trigger runs the actions.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {draft.conditions.map((condition, index) => {
                    const unary = UNARY_OPERATORS.includes(condition.operator);
                    return (
                      <div
                        key={index}
                        className="grid items-center gap-2 rounded-[9px] border border-[var(--border)] bg-[var(--bg1)] p-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,1.2fr)_auto]"
                      >
                        <input
                          className={smallInputClass}
                          value={condition.leftPath}
                          maxLength={AUTOMATION_LIMITS.LEFT_PATH}
                          onChange={(event) => patchCondition(index, { leftPath: event.target.value })}
                          placeholder="payload.severity"
                          aria-label="Payload path"
                        />
                        <select
                          className={smallInputClass}
                          value={condition.operator}
                          onChange={(event) =>
                            patchCondition(index, { operator: event.target.value as ConditionOperator })
                          }
                          aria-label="Operator"
                        >
                          {CONDITION_OPERATORS.map((operator) => (
                            <option key={operator} value={operator}>
                              {operator}
                            </option>
                          ))}
                        </select>
                        <input
                          className={smallInputClass}
                          value={condition.rightValue}
                          disabled={unary}
                          onChange={(event) => patchCondition(index, { rightValue: event.target.value })}
                          placeholder={unary ? "not required" : '"critical" or ["p1","p2"]'}
                          aria-label="Value"
                        />
                        <UiButton
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove condition ${index + 1}`}
                          onClick={() =>
                            patch({ conditions: draft.conditions.filter((_, i) => i !== index) })
                          }
                        >
                          <Trash2 className="size-3.5 text-[var(--red)]" />
                        </UiButton>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Actions ── */}
            <section className="rounded-[12px] border border-[var(--border)] bg-[var(--bg2)]/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text3)]">
                  Actions ({draft.actions.length}/{AUTOMATION_LIMITS.ACTIONS})
                </h3>
                <UiButton
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={draft.actions.length >= AUTOMATION_LIMITS.ACTIONS}
                  onClick={() => patch({ actions: [...draft.actions, { ...EMPTY_ACTION }] })}
                >
                  <Plus className="size-3.5" /> Action
                </UiButton>
              </div>

              <div className="flex flex-col gap-3">
                {draft.actions.map((action, index) => {
                  const forced = mustRequireApproval(action);
                  return (
                    <div key={index} className="rounded-[9px] border border-[var(--border)] bg-[var(--bg1)] p-3">
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.8fr)_auto]">
                        <input
                          className={smallInputClass}
                          value={action.actionKey}
                          maxLength={AUTOMATION_LIMITS.ACTION_KEY}
                          onChange={(event) => patchAction(index, { actionKey: event.target.value })}
                          placeholder="notify-oncall"
                          aria-label="Action key"
                        />
                        <select
                          className={smallInputClass}
                          value={action.actionType}
                          onChange={(event) =>
                            patchAction(index, { actionType: event.target.value as ActionType })
                          }
                          aria-label="Action type"
                        >
                          {ACTION_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        <select
                          className={smallInputClass}
                          value={action.riskLevel}
                          onChange={(event) =>
                            patchAction(index, { riskLevel: event.target.value as ActionRiskLevel })
                          }
                          aria-label="Risk level"
                        >
                          {ACTION_RISK_LEVELS.map((risk) => (
                            <option key={risk} value={risk}>
                              {risk}
                            </option>
                          ))}
                        </select>
                        <UiButton
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove action ${index + 1}`}
                          disabled={draft.actions.length === 1}
                          onClick={() => patch({ actions: draft.actions.filter((_, i) => i !== index) })}
                        >
                          <Trash2 className="size-3.5 text-[var(--red)]" />
                        </UiButton>
                      </div>

                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        <label className="flex flex-col gap-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)]">
                          Timeout (s)
                          <input
                            type="number"
                            className={smallInputClass}
                            value={action.timeoutSeconds}
                            min={AUTOMATION_LIMITS.TIMEOUT_MIN}
                            max={AUTOMATION_LIMITS.TIMEOUT_MAX}
                            onChange={(event) =>
                              patchAction(index, { timeoutSeconds: Number(event.target.value) || 1 })
                            }
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)]">
                          Max attempts
                          <input
                            type="number"
                            className={smallInputClass}
                            value={action.maxAttempts}
                            min={AUTOMATION_LIMITS.ATTEMPTS_MIN}
                            max={AUTOMATION_LIMITS.ATTEMPTS_MAX}
                            onChange={(event) =>
                              patchAction(index, { maxAttempts: Number(event.target.value) || 1 })
                            }
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)]">
                          Retry backoff (s)
                          <input
                            type="number"
                            className={smallInputClass}
                            value={action.retryBackoffSeconds}
                            min={0}
                            max={AUTOMATION_LIMITS.RETRY_BACKOFF_MAX}
                            onChange={(event) =>
                              patchAction(index, { retryBackoffSeconds: Number(event.target.value) || 0 })
                            }
                          />
                        </label>
                      </div>

                      <label className="mt-2 flex items-center gap-2 text-[12.5px] text-[var(--text2)]">
                        <input
                          type="checkbox"
                          checked={action.requiresApproval || forced}
                          disabled={forced}
                          onChange={(event) => patchAction(index, { requiresApproval: event.target.checked })}
                        />
                        Requires approval
                        {forced && (
                          <span className="text-[11.5px] text-[var(--amber)]">
                            forced for {action.actionType.includes(".") ? <CodeChip>{action.actionType}</CodeChip> : action.actionType}
                          </span>
                        )}
                      </label>

                      <div className="mt-2">
                        <textarea
                          className={monoTextareaClass}
                          value={action.config}
                          onChange={(event) => patchAction(index, { config: event.target.value })}
                          spellCheck={false}
                          aria-label={`Action ${index + 1} config JSON`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Safety ── */}
            <section className="rounded-[12px] border border-[var(--border)] bg-[var(--bg2)]/40 p-4">
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text3)]">
                Safety rails
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <DialogField label="Max runs / hour">
                  <input
                    type="number"
                    className={fieldInputClass}
                    value={draft.maxRunsPerHour}
                    min={1}
                    max={10000}
                    onChange={(event) => patch({ maxRunsPerHour: Number(event.target.value) || 1 })}
                  />
                </DialogField>
                <DialogField label="Dedupe window (s)">
                  <input
                    type="number"
                    className={fieldInputClass}
                    value={draft.dedupeWindowSeconds}
                    min={0}
                    max={86400}
                    onChange={(event) => patch({ dedupeWindowSeconds: Number(event.target.value) || 0 })}
                  />
                </DialogField>
                <DialogField label="Approve above risk">
                  <select
                    className={selectClass}
                    value={draft.requiresApprovalAboveRisk}
                    onChange={(event) =>
                      patch({ requiresApprovalAboveRisk: event.target.value as ActionRiskLevel })
                    }
                  >
                    {ACTION_RISK_LEVELS.map((risk) => (
                      <option key={risk} value={risk}>
                        {labelize(risk)}
                      </option>
                    ))}
                  </select>
                </DialogField>
              </div>
            </section>
          </div>

          {message && (
            <Notice tone="red" icon={AlertTriangle}>
              {message}
            </Notice>
          )}

          <DialogFooter>
            <UiButton type="button" variant="ghost" size="lg" onClick={() => onOpenChange(false)}>
              Cancel
            </UiButton>
            <UiButton type="submit" size="lg" disabled={pending}>
              {pending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              {mode === "create" ? "Create draft" : "Save changes"}
            </UiButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
