/**
 * Workflow detail: the definition as one sequence (trigger, conditions,
 * actions) plus every lifecycle control.
 *
 * Covers `GET /workflows/:id`, `PATCH`, `DELETE`, `enable`, `disable`,
 * `publish`, `test` (dry run and live), `run`, and `GET /workflows/:id/runs`.
 */
import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { AlertTriangle, Ban, FlaskConical, Pencil, Rocket, Trash2, Zap } from "lucide-react";

import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Notice, Panel, Pill, SettingRow, fieldTextareaClass } from "@/shared/ui/pulse";
import { JsonViewer, Timestamp } from "@/shared/observe";
import {
  HIDE_BELOW_MD,
  HIDE_BELOW_SM,
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
  type HeaderCrumb,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import {
  ConfirmDialog,
  FormDialog,
  DialogField,
  apiErrorMessage,
} from "@/modules/projects/components/project-ui";
import {
  useAutomationScope,
  useWorkflow,
  useWorkflowMutations,
  useWorkflowRuns,
} from "@/modules/automation/hooks/useAutomation";
import {
  isDryRunResult,
  type ConditionResult,
  type UpdateWorkflowBody,
} from "@/modules/automation/api/types";
import {
  CodeChip,
  ConditionText,
  DetailLoading,
  EnabledPill,
  FactGrid,
  MONO,
  NoOrgNotice,
  PowerToggle,
  RiskPill,
  RunStatusPill,
  Sequence,
  SequenceGroup,
  SequenceStage,
  WorkflowStatusPill,
  elapsed,
  formatValue,
  labelize,
  plural,
} from "@/modules/automation/components/automation-ui";
import { WorkflowFormDialog } from "@/modules/automation/components/WorkflowFormDialog";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md §1.2) ───────────────────

const RUNS_QUERY = { limit: 10, offset: 0 } as const;

const LIST_CRUMBS: HeaderCrumb[] = [
  { label: "Workflows", to: "/automation" },
  { label: "All workflows", to: "/automation/workflows" },
];

const RUN_COLUMNS: SheetColumn[] = [
  { key: "trigger", header: "Trigger" },
  { key: "steps", header: "Steps", className: `w-[130px] ${HIDE_BELOW_SM}` },
  { key: "duration", header: "Duration", className: `w-[110px] ${HIDE_BELOW_MD}` },
  { key: "status", header: "Status", className: "w-[140px]" },
  { key: "time", header: "Started", className: "w-[130px]", align: "right" },
];

function parsePayload(raw: FormDataEntryValue | null): Record<string, unknown> {
  if (typeof raw !== "string" || raw.trim() === "") return {};
  const parsed = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Payload must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

/** Inline label/value pairs under a sequence stage. */
function StageFacts({ facts }: { facts: Array<{ label: string; value: ReactNode; mono?: boolean }> }) {
  return (
    <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      {facts.map((fact) => (
        <div key={fact.label} className="flex min-w-0 items-baseline gap-1.5">
          <dt className="shrink-0">{fact.label}</dt>
          <dd className={cn("min-w-0 text-[var(--text2)] [overflow-wrap:anywhere]", fact.mono && MONO)}>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function AutomationWorkflowDetailPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const { activeOrgId } = useAutomationScope();

  const detailQuery = useWorkflow(workflowId);
  const runsQuery = useWorkflowRuns(workflowId, RUNS_QUERY);
  const {
    updateWorkflow,
    deleteWorkflow,
    toggleWorkflow,
    publishWorkflow,
    testWorkflow,
    runWorkflow,
  } = useWorkflowMutations();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [conditionResults, setConditionResults] = useState<ConditionResult[] | null>(null);
  const [matched, setMatched] = useState<boolean | null>(null);

  if (!activeOrgId) {
    return <NoOrgNotice>Pick an organization to view this workflow.</NoOrgNotice>;
  }

  if (detailQuery.isLoading) {
    return <DetailLoading label="Loading workflow" />;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <WorkspacePage>
        <ProjectPageHeader title="Workflow" crumbs={[...LIST_CRUMBS, { label: "Workflow" }]} />
        <Sheet label="Workflow">
          <SheetError
            title="Could not load this workflow"
            message={apiErrorMessage(detailQuery.error, "The workflow may have been archived.")}
            onRetry={() => void detailQuery.refetch()}
          />
        </Sheet>
      </WorkspacePage>
    );
  }

  const detail = detailQuery.data;
  const { workflow, triggers, conditions, actions, activeVersion } = detail;
  const trigger = triggers[0];
  const runs = runsQuery.data?.data ?? [];
  const approvalActions = actions.filter((action) => action.requiresApproval);
  const listening = workflow.status === "active" && workflow.isEnabled;

  const blockedReason = detail.entitlementUnavailable
    ? (detail.unavailableReason ?? "Plan upgrade required")
    : !activeVersion
      ? "Publish a version before switching this on"
      : null;

  const runBlockedReason = workflow.isEnabled ? undefined : "Switch the workflow on to run it";

  const handleToggle = (next: boolean) => {
    toggleWorkflow.mutate(
      { id: workflow.id, enabled: next },
      {
        onSuccess: () => toast.success(next ? "Workflow switched on" : "Workflow switched off"),
        onError: (error) => toast.error(apiErrorMessage(error, "Could not change the workflow state.")),
      },
    );
  };

  const handlePublish = (activateOnPublish: boolean) => {
    publishWorkflow.mutate(
      { id: workflow.id, activateOnPublish },
      {
        onSuccess: (version) => toast.success(`Published version ${version.version}`),
        onError: (error) => toast.error(apiErrorMessage(error, "Publish failed.")),
      },
    );
  };

  const handleUpdate = (body: UpdateWorkflowBody) => {
    updateWorkflow.mutate(
      { id: workflow.id, body },
      {
        onSuccess: () => {
          toast.success("Draft updated. Publish to roll it out.");
          setEditOpen(false);
        },
        onError: (error) => toast.error(apiErrorMessage(error, "Could not save the workflow.")),
      },
    );
  };

  const handleDelete = () => {
    deleteWorkflow.mutate(workflow.id, {
      onSuccess: () => {
        toast.success(`${workflow.name} archived`);
        navigate("/automation/workflows");
      },
      onError: (error) => toast.error(apiErrorMessage(error, "Could not archive the workflow.")),
    });
  };

  const handleTest = (form: FormData) => {
    setDialogError(null);
    let payload: Record<string, unknown>;
    try {
      payload = parsePayload(form.get("simulatedPayload"));
    } catch (error) {
      setDialogError((error as Error).message || "Payload must be valid JSON.");
      return;
    }
    testWorkflow.mutate(
      { id: workflow.id, simulatedPayload: payload, dryRun: true },
      {
        onSuccess: (result) => {
          if (isDryRunResult(result)) {
            setConditionResults(result.conditionResults);
            setMatched(result.matched);
            toast.success(result.matched ? "Conditions matched" : "Conditions did not match");
          } else {
            toast.success("Test run executed");
          }
          setTestOpen(false);
        },
        onError: (error) => setDialogError(apiErrorMessage(error, "Test failed.")),
      },
    );
  };

  const handleRun = (form: FormData) => {
    setDialogError(null);
    let payload: Record<string, unknown>;
    try {
      payload = parsePayload(form.get("inputPayload"));
    } catch (error) {
      setDialogError((error as Error).message || "Payload must be valid JSON.");
      return;
    }
    runWorkflow.mutate(
      { id: workflow.id, inputPayload: payload },
      {
        onSuccess: (result) => {
          toast.success(`Run queued with ${result.steps.length} steps`);
          setRunOpen(false);
          navigate(`/automation/runs/${result.run.id}`);
        },
        onError: (error) => setDialogError(apiErrorMessage(error, "Could not start a run.")),
      },
    );
  };

  // ── Readouts ───────────────────────────────────────────────

  const statusTone: Readout["tone"] =
    workflow.status === "active" ? "good" : workflow.status === "draft" || workflow.status === "paused" ? "warn" : "neutral";

  const readouts: Readout[] = [
    {
      label: "Status",
      value: <span className="font-[family-name:var(--sans)]">{labelize(workflow.status)}</span>,
      sub: workflow.isEnabled ? "Switched on" : "Switched off",
      tone: statusTone,
    },
    {
      label: "Published version",
      value: activeVersion ? `v${activeVersion.version}` : "None",
      sub: activeVersion ? `Draft is v${workflow.currentVersion}` : "Publish to make it runnable",
      tone: activeVersion ? "neutral" : "warn",
    },
    {
      label: "Actions",
      value: actions.length,
      sub: `${approvalActions.length} need approval`,
      tone: approvalActions.length > 0 ? "warn" : "neutral",
    },
    {
      label: "Last run",
      value: workflow.lastRunAt ? <Timestamp value={workflow.lastRunAt} /> : "Never",
      sub: workflow.nextRunAt ? (
        <>
          Next <Timestamp value={workflow.nextRunAt} />
        </>
      ) : (
        "No run scheduled"
      ),
    },
  ];

  // ── Recent runs body ───────────────────────────────────────

  let runsBody: ReactNode;
  if (runsQuery.isLoading) {
    runsBody = <SheetLoading rows={4} label="Loading recent runs" />;
  } else if (runsQuery.isError) {
    runsBody = (
      <SheetError
        title="Could not load recent runs"
        message={apiErrorMessage(runsQuery.error, "The runs request failed.")}
        onRetry={() => void runsQuery.refetch()}
      />
    );
  } else if (runs.length === 0) {
    runsBody = (
      <SheetEmpty
        title="No runs yet"
        description="A run appears here each time a trigger matches or you run the workflow by hand."
        action={
          workflow.isEnabled ? (
            <UiButton variant="outline" size="sm" onClick={() => setRunOpen(true)}>
              Run now
            </UiButton>
          ) : undefined
        }
      />
    );
  } else {
    runsBody = (
      <SheetTable columns={RUN_COLUMNS} caption={`Recent runs of ${workflow.name}, newest first`} minWidth={360}>
        {runs.map((run) => (
          <SheetRow key={run.runId} onActivate={() => navigate(`/automation/runs/${run.runId}`)}>
            <SheetCell>
              <RowTitle
                title={run.triggerType}
                to={`/automation/runs/${run.runId}`}
                subtitle={run.runId}
                subtitleMono
              />
            </SheetCell>
            <SheetCell className={HIDE_BELOW_SM}>
              <span className={cn("text-[12px] text-[var(--text2)]", MONO)}>{run.stepCount}</span>
              {run.failedStepCount > 0 && (
                <span className={cn("ml-1.5 text-[12px] text-[var(--red)]", MONO)}>{run.failedStepCount} failed</span>
              )}
            </SheetCell>
            <SheetCell className={HIDE_BELOW_MD}>
              <span className={cn("text-[12px] text-[var(--text2)]", MONO)}>{elapsed(run.startedAt, run.completedAt)}</span>
            </SheetCell>
            <SheetCell>
              <RunStatusPill status={run.status} />
            </SheetCell>
            <SheetCell align="right">
              <span className={cn("whitespace-nowrap text-[12px] text-[var(--text2)]", MONO)}>
                <Timestamp value={run.createdAt} />
              </span>
            </SheetCell>
          </SheetRow>
        ))}
      </SheetTable>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        crumbs={[...LIST_CRUMBS, { label: workflow.name }]}
        title={workflow.name}
        description={workflow.description || "No description yet."}
        badges={
          <>
            <WorkflowStatusPill status={workflow.status} />
            <EnabledPill enabled={workflow.isEnabled} />
          </>
        }
        meta={[
          { label: "Type", value: labelize(workflow.workflowType) },
          { label: "Version", value: `v${workflow.currentVersion}`, mono: true },
          { label: "Timezone", value: workflow.timezone, mono: true },
          { label: "Updated", value: <Timestamp value={workflow.updatedAt} />, mono: true },
        ]}
        actions={
          <>
            <UiButton variant="outline" size="lg" onClick={() => setTestOpen(true)}>
              <FlaskConical className="size-4" aria-hidden="true" />
              Test
            </UiButton>
            {/* Disabled buttons swallow pointer events; the wrapper carries the reason. */}
            <span title={runBlockedReason} className="inline-flex">
              <UiButton
                variant="outline"
                size="lg"
                onClick={() => setRunOpen(true)}
                disabled={!workflow.isEnabled}
                aria-label={runBlockedReason ? `Run now. ${runBlockedReason}.` : undefined}
              >
                <Zap className="size-4" aria-hidden="true" />
                Run now
              </UiButton>
            </span>
            <UiButton size="lg" onClick={() => handlePublish(true)} disabled={publishWorkflow.isPending}>
              <Rocket className="size-4" aria-hidden="true" />
              {publishWorkflow.isPending ? "Publishing…" : "Publish"}
            </UiButton>
            <RowActions label="More actions">
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil aria-hidden="true" /> Edit workflow
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                <Trash2 aria-hidden="true" /> Archive workflow
              </DropdownMenuItem>
            </RowActions>
          </>
        }
      />

      <Readouts cells={readouts} label="Workflow summary" />

      {detail.entitlementUnavailable && (
        <Notice tone="amber" icon={AlertTriangle} title="Plan upgrade required">
          {detail.unavailableReason ?? "This workflow uses features outside your current plan."}{" "}
          Required entitlements: {detail.requiredFeatureKeys.join(", ") || "unknown"}.
        </Notice>
      )}

      <Panel
        title="State"
        description={
          listening
            ? `Live and listening for ${trigger?.triggerType ?? "its trigger"}.`
            : "Turn the workflow on to let its published version react to events."
        }
      >
        <div className="flex flex-col gap-5">
          <SettingRow
            label={workflow.isEnabled ? "Automation is on" : "Automation is off"}
            description={
              blockedReason ??
              (workflow.isEnabled
                ? "Matching triggers queue runs immediately."
                : "Triggers are ignored while the workflow is off.")
            }
          >
            <PowerToggle
              checked={workflow.isEnabled}
              onChange={handleToggle}
              label={`Switch ${workflow.name} ${workflow.isEnabled ? "off" : "on"}`}
              pending={toggleWorkflow.isPending}
              blockedReason={blockedReason}
            />
          </SettingRow>

          <FactGrid
            className="border-t border-[var(--border)] pt-5"
            facts={[
              { label: "Scope", value: labelize(workflow.scope) },
              { label: "Timezone", value: workflow.timezone, mono: true },
              { label: "Created", value: <Timestamp value={workflow.createdAt} />, mono: true },
              { label: "Updated", value: <Timestamp value={workflow.updatedAt} />, mono: true },
              workflow.tags.length > 0 && {
                label: "Tags",
                wide: true,
                value: (
                  <span className="flex flex-wrap items-center gap-1.5">
                    {workflow.tags.map((tag) => (
                      <Pill key={tag} tone="neutral">
                        {tag}
                      </Pill>
                    ))}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </Panel>

      <Sheet
        title="Definition"
        description="Runs top to bottom. Every required condition must pass before actions run."
        actions={
          <UiButton variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit definition
          </UiButton>
        }
      >
        <Sequence label={`Definition of ${workflow.name}`}>
          <SequenceGroup title="Trigger" />
          {trigger ? (
            <SequenceStage marker="T" title={labelize(trigger.triggerKind)} meta={<CodeChip>{trigger.triggerType}</CodeChip>}>
              <StageFacts
                facts={[
                  { label: "Module", value: labelize(trigger.sourceModule) },
                  { label: "Event", value: trigger.sourceEvent ?? "Any", mono: Boolean(trigger.sourceEvent) },
                  ...(trigger.scheduleCron ? [{ label: "Cron", value: trigger.scheduleCron, mono: true }] : []),
                  { label: "Cooldown", value: `${trigger.cooldownSeconds}s`, mono: true },
                  {
                    label: "Dedupe key",
                    value: trigger.dedupeKeyTemplate ?? "Not set",
                    mono: Boolean(trigger.dedupeKeyTemplate),
                  },
                ]}
              />
            </SequenceStage>
          ) : (
            <SequenceStage marker="T" title="No trigger">
              Edit the workflow to add a trigger.
            </SequenceStage>
          )}

          <SequenceGroup
            title="Conditions"
            description={conditions.length > 0 ? plural(conditions.length, "condition") : "None, every trigger matches"}
          />
          {conditions.map((condition, index) => (
            <SequenceStage
              key={condition.id}
              marker={`C${index + 1}`}
              title={<ConditionText path={condition.leftPath} operator={condition.operator} value={condition.rightValue} />}
              meta={<Pill tone="neutral">{condition.isRequired ? "Required" : "Optional"}</Pill>}
            />
          ))}

          <SequenceGroup
            title="Actions"
            description={
              actions.length > 0
                ? `${plural(actions.length, "action")}${approvalActions.length > 0 ? `, ${approvalActions.length} gated` : ""}`
                : undefined
            }
          />
          {actions.length === 0 ? (
            <SequenceStage marker="A" title="No actions">
              Edit the workflow to add actions.
            </SequenceStage>
          ) : (
            actions.map((action, index) => (
              <SequenceStage
                key={action.id}
                marker={index + 1}
                tone={action.requiresApproval ? "warn" : "neutral"}
                title={<span className={cn(MONO, "text-[12.5px]", !action.isEnabled && "text-[var(--text3)]")}>{action.actionKey}</span>}
                meta={
                  <>
                    <CodeChip>{action.actionType}</CodeChip>
                    <RiskPill risk={action.riskLevel} />
                    {action.requiresApproval && <Pill tone="amber">Needs approval</Pill>}
                    {!action.isEnabled && <Pill tone="neutral">Disabled</Pill>}
                  </>
                }
              >
                <StageFacts
                  facts={[
                    { label: "Timeout", value: `${action.timeoutSeconds}s`, mono: true },
                    { label: "Attempts", value: action.maxAttempts, mono: true },
                    { label: "Backoff", value: `${action.retryBackoffSeconds}s`, mono: true },
                    ...(action.integrationKey ? [{ label: "Integration", value: action.integrationKey, mono: true }] : []),
                  ]}
                />
              </SequenceStage>
            ))
          )}
        </Sequence>
      </Sheet>

      {conditionResults && (
        <Sheet
          title="Last dry run"
          description="Conditions evaluated against the payload you supplied. Nothing was executed."
          actions={
            <Pill tone={matched ? "green" : "amber"} dot>
              {matched ? "Matched" : "Not matched"}
            </Pill>
          }
        >
          {conditionResults.length === 0 ? (
            <p className="px-5 py-4 text-[13px] text-[var(--text2)]">
              This workflow has no conditions, so every trigger matches.
            </p>
          ) : (
            <Sequence label="Dry run condition results">
              {conditionResults.map((result, index) => (
                <SequenceStage
                  key={`${result.leftPath}-${index}`}
                  marker={`C${index + 1}`}
                  tone={result.passed ? "good" : "bad"}
                  title={<ConditionText path={result.leftPath} operator={result.operator} value={result.expected} />}
                  meta={<Pill tone={result.passed ? "green" : "red"}>{result.passed ? "Passed" : "Failed"}</Pill>}
                >
                  Actual: <span className={cn("text-[var(--text2)]", MONO)}>{formatValue(result.actual)}</span>
                </SequenceStage>
              ))}
            </Sequence>
          )}
        </Sheet>
      )}

      <Sheet
        title="Recent runs"
        description="Executions of this workflow, newest first."
        actions={
          <TextLink to={`/automation/runs?workflowId=${workflow.id}`} size="sm" arrow>
            All runs for this workflow
          </TextLink>
        }
        footer={
          !runsQuery.isLoading && !runsQuery.isError && runs.length > 0 ? (
            <span>Showing the {plural(runs.length, "most recent run")}.</span>
          ) : undefined
        }
      >
        {runsBody}
      </Sheet>

      <Panel
        title="Published version"
        description={
          activeVersion
            ? "The immutable snapshot that runs when a trigger matches."
            : "Nothing published yet. Publish the draft to make it runnable."
        }
      >
        {activeVersion ? (
          <div className="flex flex-col gap-5">
            <FactGrid
              facts={[
                { label: "Status", value: labelize(activeVersion.status) },
                {
                  label: "Published",
                  value: activeVersion.publishedAt ? <Timestamp value={activeVersion.publishedAt} /> : "—",
                  mono: true,
                },
                { label: "Version", value: `v${activeVersion.version}`, mono: true },
                { label: "Checksum", value: activeVersion.checksum.slice(0, 12), mono: true },
              ]}
            />
            <JsonViewer data={activeVersion.definition} maxHeight={320} />
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="max-w-[60ch] text-[13px] leading-[1.6] text-[var(--text2)]">
              Publishing snapshots the trigger, conditions, and actions into an immutable version.
            </p>
            <UiButton onClick={() => handlePublish(true)} disabled={publishWorkflow.isPending}>
              <Rocket className="size-4" aria-hidden="true" />
              Publish and activate
            </UiButton>
          </div>
        )}
      </Panel>

      <Panel title="Danger zone" description="Archiving hides the workflow and stops all triggers." icon={Trash2} danger>
        <SettingRow label="Archive workflow" description="Soft delete. Run history is preserved.">
          <UiButton variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" aria-hidden="true" />
            Archive
          </UiButton>
        </SettingRow>
      </Panel>

      {editOpen && (
        <WorkflowFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          mode="edit"
          detail={detail}
          pending={updateWorkflow.isPending}
          onUpdate={handleUpdate}
        />
      )}

      <FormDialog
        open={testOpen}
        onOpenChange={(open) => {
          setTestOpen(open);
          if (!open) setDialogError(null);
        }}
        title="Dry-run this workflow"
        description="Evaluates the conditions against a simulated payload. No actions are executed."
        submitLabel="Evaluate"
        pending={testWorkflow.isPending}
        error={dialogError}
        onSubmit={handleTest}
      >
        <DialogField label="Simulated payload (JSON)" name="simulatedPayload" hint="Max 256 KB.">
          <textarea
            id="simulatedPayload"
            name="simulatedPayload"
            className={cn(fieldTextareaClass, "font-[family-name:var(--mono)] text-[12px]")}
            defaultValue={'{\n  "severity": "critical"\n}'}
            spellCheck={false}
          />
        </DialogField>
      </FormDialog>

      <FormDialog
        open={runOpen}
        onOpenChange={(open) => {
          setRunOpen(open);
          if (!open) setDialogError(null);
        }}
        title="Run this workflow now"
        description="Queues a real run against the published version. Approval-gated actions will pause."
        submitLabel="Queue run"
        pending={runWorkflow.isPending}
        error={dialogError}
        onSubmit={handleRun}
      >
        <DialogField label="Input payload (JSON)" name="inputPayload" hint="Available to conditions and actions.">
          <textarea
            id="inputPayload"
            name="inputPayload"
            className={cn(fieldTextareaClass, "font-[family-name:var(--mono)] text-[12px]")}
            defaultValue="{}"
            spellCheck={false}
          />
        </DialogField>
      </FormDialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Archive this workflow?"
        description={`${workflow.name} stops reacting to events immediately.`}
        confirmLabel="Archive"
        pending={deleteWorkflow.isPending}
        onConfirm={handleDelete}
      >
        <Notice tone="amber" icon={Ban}>
          Pending runs keep executing until they finish or you cancel them.
        </Notice>
      </ConfirmDialog>
    </WorkspacePage>
  );
}
