/**
 * Workflow detail — the full definition plus every lifecycle control.
 *
 * Covers `GET /workflows/:id`, `PATCH`, `DELETE`, `enable`, `disable`,
 * `publish`, `test` (dry run and live), `run`, and `GET /workflows/:id/runs`.
 */
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  FlaskConical,
  History,
  ListChecks,
  Pencil,
  Rocket,
  ShieldAlert,
  Trash2,
  Workflow as WorkflowIcon,
  Zap,
} from "lucide-react";
import {
  EmptyPanel,
  HeroFacts,
  Notice,
  PageHero,
  Panel,
  Pill,
  Row,
  RowStack,
  SettingRow,
  fieldTextareaClass,
} from "@/shared/ui/pulse";
import { JsonViewer, Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
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
  MetaCell,
  PowerToggle,
  RiskPill,
  RunStatusPill,
  WorkflowStatusPill,
  elapsed,
  labelize,
} from "@/modules/automation/components/automation-ui";
import { WorkflowFormDialog } from "@/modules/automation/components/WorkflowFormDialog";

// ── module-level constants (rules.md §1.2) ───────────────────

const RUNS_QUERY = { limit: 10, offset: 0 } as const;
const BREADCRUMBS = [
  { label: "Automation", to: "/automation" },
  { label: "Workflows", to: "/automation/workflows" },
];

function parsePayload(raw: FormDataEntryValue | null): Record<string, unknown> {
  if (typeof raw !== "string" || raw.trim() === "") return {};
  const parsed = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Payload must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
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
    return (
      <Notice tone="amber" icon={AlertTriangle} title="No organization selected">
        Pick an organization to view this workflow.
      </Notice>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((block) => (
          <div key={block} className="h-40 animate-pulse rounded-[14px] bg-[var(--bg2)]" />
        ))}
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <Notice tone="red" icon={AlertTriangle} title="Could not load this workflow">
        {apiErrorMessage(detailQuery.error, "The workflow may have been archived.")}
      </Notice>
    );
  }

  const detail = detailQuery.data;
  const { workflow, triggers, conditions, actions, activeVersion } = detail;
  const trigger = triggers[0];
  const runs = runsQuery.data?.data ?? [];
  const approvalActions = actions.filter((action) => action.requiresApproval);

  const blockedReason = detail.entitlementUnavailable
    ? (detail.unavailableReason ?? "Plan upgrade required")
    : !activeVersion
      ? "Publish a version before switching this on"
      : null;

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

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow={labelize(workflow.workflowType)}
        title={workflow.name}
        description={workflow.description ?? "No description set for this workflow."}
        icon={WorkflowIcon}
        breadcrumbs={[...BREADCRUMBS, { label: workflow.name }]}
        actions={
          <>
            <UiButton variant="outline" size="lg" onClick={() => setTestOpen(true)}>
              <FlaskConical className="size-4" /> Test
            </UiButton>
            <UiButton
              variant="outline"
              size="lg"
              onClick={() => setRunOpen(true)}
              disabled={!workflow.isEnabled}
              title={workflow.isEnabled ? undefined : "Switch the workflow on to run it"}
            >
              <Zap className="size-4" /> Run now
            </UiButton>
            <UiButton variant="outline" size="lg" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Edit
            </UiButton>
            <UiButton size="lg" onClick={() => handlePublish(true)} disabled={publishWorkflow.isPending}>
              <Rocket className="size-4" /> Publish
            </UiButton>
          </>
        }
      >
        <HeroFacts
          facts={[
            { label: "Status", value: labelize(workflow.status), tone: workflow.status === "active" ? "green" : "neutral" },
            { label: "Version", value: `v${workflow.currentVersion}` },
            { label: "Actions", value: actions.length },
            {
              label: "Last run",
              value: workflow.lastRunAt ? <Timestamp value={workflow.lastRunAt} /> : "Never",
            },
          ]}
        />
      </PageHero>

      {detail.entitlementUnavailable && (
        <Notice tone="amber" icon={AlertTriangle} title="Plan upgrade required">
          {detail.unavailableReason ?? "This workflow uses features outside your current plan."}{" "}
          Required entitlements: {detail.requiredFeatureKeys.join(", ") || "unknown"}.
        </Notice>
      )}

      <Panel title="State" description="Turn the workflow on to let its published version react to events." icon={ListChecks}>
        <div className="flex flex-col gap-4">
          <SettingRow
            label={workflow.isEnabled ? "Automation is on" : "Automation is off"}
            description={
              blockedReason ??
              (workflow.isEnabled
                ? "Matching triggers queue runs immediately."
                : "Triggers are ignored while the workflow is off.")
            }
          >
            <div className="flex items-center gap-3">
              <WorkflowStatusPill status={workflow.status} />
              <PowerToggle
                checked={workflow.isEnabled}
                onChange={handleToggle}
                label={`Switch ${workflow.name} ${workflow.isEnabled ? "off" : "on"}`}
                pending={toggleWorkflow.isPending}
                blockedReason={blockedReason}
              />
            </div>
          </SettingRow>

          <div className="grid gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-4">
            <MetaCell label="Scope">{labelize(workflow.scope)}</MetaCell>
            <MetaCell label="Timezone">{workflow.timezone}</MetaCell>
            <MetaCell label="Created">
              <Timestamp value={workflow.createdAt} />
            </MetaCell>
            <MetaCell label="Updated">
              <Timestamp value={workflow.updatedAt} />
            </MetaCell>
          </div>

          {workflow.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
              {workflow.tags.map((tag) => (
                <Pill key={tag} tone="neutral">
                  {tag}
                </Pill>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {conditionResults && (
        <Panel
          title="Last dry run"
          description="Condition evaluation against the payload you supplied. Nothing was executed."
          icon={FlaskConical}
          tone={matched ? "green" : "amber"}
          bodyClassName="p-0"
          actions={
            <Pill tone={matched ? "green" : "amber"} dot>
              {matched ? "Matched" : "Not matched"}
            </Pill>
          }
        >
          {conditionResults.length === 0 ? (
            <div className="px-5 py-4 text-[12.5px] text-[var(--text3)]">
              This workflow has no conditions, so every trigger matches.
            </div>
          ) : (
            <RowStack>
              {conditionResults.map((result, index) => (
                <Row key={`${result.leftPath}-${index}`} className="flex items-center justify-between gap-4">
                  <div className="min-w-0 text-[12.5px]">
                    <CodeChip>{result.leftPath}</CodeChip>{" "}
                    <span className="text-[var(--text3)]">{result.operator}</span>{" "}
                    <CodeChip>{JSON.stringify(result.expected ?? null)}</CodeChip>
                    <p className="mt-1 text-[11.5px] text-[var(--text3)]">
                      actual: {JSON.stringify(result.actual ?? null)}
                    </p>
                  </div>
                  <Pill tone={result.passed ? "green" : "red"} dot>
                    {result.passed ? "Pass" : "Fail"}
                  </Pill>
                </Row>
              ))}
            </RowStack>
          )}
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Trigger" description="What starts this workflow." icon={Zap}>
          {trigger ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <MetaCell label="Kind">{labelize(trigger.triggerKind)}</MetaCell>
              <MetaCell label="Type">
                <CodeChip>{trigger.triggerType}</CodeChip>
              </MetaCell>
              <MetaCell label="Source module">{trigger.sourceModule}</MetaCell>
              <MetaCell label="Source event">
                {trigger.sourceEvent ? <CodeChip>{trigger.sourceEvent}</CodeChip> : "—"}
              </MetaCell>
              <MetaCell label="Cron">
                {trigger.scheduleCron ? <CodeChip>{trigger.scheduleCron}</CodeChip> : "—"}
              </MetaCell>
              <MetaCell label="Cooldown">{trigger.cooldownSeconds}s</MetaCell>
              <MetaCell label="Dedupe key" className="sm:col-span-2">
                {trigger.dedupeKeyTemplate ? <CodeChip>{trigger.dedupeKeyTemplate}</CodeChip> : "Not set"}
              </MetaCell>
            </div>
          ) : (
            <EmptyPanel icon={Zap} title="No trigger" description="Edit the workflow to attach a trigger." />
          )}
        </Panel>

        <Panel
          title={`Conditions (${conditions.length})`}
          description="All required conditions must pass before actions run."
          icon={ListChecks}
          bodyClassName={conditions.length === 0 ? undefined : "p-0"}
        >
          {conditions.length === 0 ? (
            <p className="text-[12.5px] text-[var(--text3)]">
              No conditions — every matching trigger runs the actions.
            </p>
          ) : (
            <RowStack>
              {conditions.map((condition) => (
                <Row key={condition.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-[12.5px]">
                    <CodeChip>{condition.leftPath}</CodeChip>{" "}
                    <span className="text-[var(--text3)]">{condition.operator}</span>{" "}
                    <CodeChip>{JSON.stringify(condition.rightValue ?? null)}</CodeChip>
                  </span>
                  <Pill tone={condition.isRequired ? "brand" : "neutral"}>
                    {condition.isRequired ? "Required" : "Optional"}
                  </Pill>
                </Row>
              ))}
            </RowStack>
          )}
        </Panel>
      </div>

      <Panel
        title={`Actions (${actions.length})`}
        description="Executed in order. Approval-gated actions pause the run until a decision lands."
        icon={ShieldAlert}
        bodyClassName="p-0"
        actions={
          approvalActions.length > 0 ? (
            <Pill tone="amber">{approvalActions.length} gated</Pill>
          ) : undefined
        }
      >
        {actions.length === 0 ? (
          <div className="p-5">
            <EmptyPanel icon={ShieldAlert} title="No actions" description="Edit the workflow to add actions." />
          </div>
        ) : (
          <RowStack>
            {actions.map((action) => (
              <Row key={action.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-medium text-[var(--text)]">{action.actionKey}</span>
                    <CodeChip>{action.actionType}</CodeChip>
                    {!action.isEnabled && <Pill tone="neutral">Disabled</Pill>}
                  </div>
                  <p className="mt-1 text-[12px] text-[var(--text3)]">
                    timeout {action.timeoutSeconds}s · {action.maxAttempts} attempts · backoff{" "}
                    {action.retryBackoffSeconds}s
                    {action.integrationKey ? ` · ${action.integrationKey}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <RiskPill risk={action.riskLevel} />
                  {action.requiresApproval && <Pill tone="amber">Approval</Pill>}
                </div>
              </Row>
            ))}
          </RowStack>
        )}
      </Panel>

      <Panel
        title="Recent runs"
        description="Executions of this workflow, newest first."
        icon={History}
        bodyClassName="p-0"
        actions={
          <UiButton asChild variant="outline" size="sm">
            <Link to={`/automation/runs?workflowId=${workflow.id}`}>All runs</Link>
          </UiButton>
        }
      >
        {runs.length === 0 ? (
          <div className="p-5">
            <EmptyPanel icon={History} title="No runs yet" description="Run the workflow manually to try it out." />
          </div>
        ) : (
          <RowStack>
            {runs.map((run) => (
              <Row key={run.runId} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    to={`/automation/runs/${run.runId}`}
                    className="block truncate text-[13px] font-medium text-[var(--text)] hover:text-[var(--brand)]"
                  >
                    {run.triggerType}
                  </Link>
                  <p className="mt-0.5 text-[12px] text-[var(--text3)]">
                    {run.stepCount} steps · {run.failedStepCount} failed · {elapsed(run.startedAt, run.completedAt)} ·{" "}
                    <Timestamp value={run.createdAt} />
                  </p>
                </div>
                <RunStatusPill status={run.status} />
              </Row>
            ))}
          </RowStack>
        )}
      </Panel>

      <Panel
        title="Published version"
        description={
          activeVersion
            ? `Version ${activeVersion.version} · checksum ${activeVersion.checksum.slice(0, 12)}`
            : "Nothing published yet. Publish the draft to make it runnable."
        }
        icon={Rocket}
      >
        {activeVersion ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <MetaCell label="Status">{labelize(activeVersion.status)}</MetaCell>
              <MetaCell label="Published">
                {activeVersion.publishedAt ? <Timestamp value={activeVersion.publishedAt} /> : "—"}
              </MetaCell>
              <MetaCell label="Version">v{activeVersion.version}</MetaCell>
            </div>
            <JsonViewer data={activeVersion.definition} maxHeight={320} />
          </div>
        ) : (
          <EmptyPanel
            icon={Rocket}
            title="Draft only"
            description="Publishing snapshots the trigger, conditions, and actions into an immutable version."
            action={
              <UiButton size="lg" onClick={() => handlePublish(true)} disabled={publishWorkflow.isPending}>
                <Rocket className="size-4" /> Publish and activate
              </UiButton>
            }
          />
        )}
      </Panel>

      <Panel title="Danger zone" description="Archiving hides the workflow and stops all triggers." icon={Trash2} danger>
        <SettingRow label="Archive workflow" description="Soft delete. Run history is preserved.">
          <UiButton variant="destructive" size="lg" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" /> Archive
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
            className={`${fieldTextareaClass} font-[family-name:var(--mono)] text-[12px]`}
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
            className={`${fieldTextareaClass} font-[family-name:var(--mono)] text-[12px]`}
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

      {runsQuery.isFetching && (
        <p className="flex items-center gap-1.5 text-[11.5px] text-[var(--text3)]">
          <Clock className="size-3" aria-hidden="true" /> Refreshing runs…
        </p>
      )}
      {workflow.status === "active" && workflow.isEnabled && (
        <p className="flex items-center gap-1.5 text-[11.5px] text-[var(--green)]">
          <CheckCircle2 className="size-3" aria-hidden="true" /> Live and listening for {trigger?.triggerType}.
        </p>
      )}
    </div>
  );
}
