/**
 * Run detail: `GET /runs/:runId` plus `GET /runs/:runId/steps`, with cancel and
 * retry. Steps render on the sequence spine; retry can start from a step.
 */
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { AlertTriangle, Ban, RotateCcw, ShieldQuestion } from "lucide-react";
import { Notice, Panel, Pill } from "@/shared/ui/pulse";
import { JsonViewer, Timestamp, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  ProjectPageHeader,
  Readouts,
  Sheet,
  SheetEmpty,
  SheetError,
  SheetLoading,
  WorkspacePage,
  type Readout,
  type ReadoutTone,
} from "@/modules/projects/components/project-page";
import {
  useAutomationScope,
  useRun,
  useRunMutations,
  useRunSteps,
} from "@/modules/automation/hooks/useAutomation";
import {
  ACTIVE_RUN_STATUSES,
  CodeChip,
  DetailLoading,
  FactGrid,
  MONO,
  NoOrgNotice,
  RETRYABLE_RUN_STATUSES,
  RunStatusPill,
  Sequence,
  SequenceStage,
  elapsed,
  labelize,
  plural,
  stageToneForStatus,
  type StageTone,
} from "@/modules/automation/components/automation-ui";
import { cn } from "@/lib/utils";

const READOUT_TONE: Record<StageTone, ReadoutTone> = {
  good: "good",
  bad: "bad",
  warn: "warn",
  current: "neutral",
  neutral: "neutral",
};

const CRUMBS_BASE = [
  { label: "Workflows", to: "/automation" },
  { label: "Runs", to: "/automation/runs" },
];

export default function AutomationRunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const { activeOrgId } = useAutomationScope();
  const runQuery = useRun(runId);
  const stepsQuery = useRunSteps(runId);
  const { cancelRun, retryRun } = useRunMutations();

  if (!activeOrgId) {
    return <NoOrgNotice>Pick an organization to view this run.</NoOrgNotice>;
  }

  if (runQuery.isLoading) {
    return <DetailLoading label="Loading run" />;
  }

  if (runQuery.isError || !runQuery.data) {
    return (
      <WorkspacePage>
        <ProjectPageHeader title="Run" crumbs={[...CRUMBS_BASE, { label: "Run" }]} />
        <Sheet label="Run">
          <SheetError
            title="Could not load this run"
            message={apiErrorMessage(runQuery.error, "The run may belong to another organization or no longer exist.")}
            onRetry={() => void runQuery.refetch()}
          />
        </Sheet>
      </WorkspacePage>
    );
  }

  const run = runQuery.data;
  const steps = [...(stepsQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const active = ACTIVE_RUN_STATUSES.includes(run.status);
  const retryStatus = RETRYABLE_RUN_STATUSES.includes(run.status);
  const attemptsLeft = run.attempt < run.maxAttempts;
  const retryable = retryStatus && attemptsLeft;
  const retryBlockedReason = !retryStatus
    ? "Only failed, cancelled, or timed-out runs can be retried"
    : !attemptsLeft
      ? `All ${run.maxAttempts} attempts are used`
      : undefined;
  const failedSteps = steps.filter((step) => step.status === "failed" || step.status === "timed_out").length;
  const shortId = run.id.slice(0, 8);

  const handleCancel = () => {
    cancelRun.mutate(
      { id: run.id, reason: "Cancelled from the run detail page" },
      {
        onSuccess: () => toast.success("Run cancelled"),
        onError: (error) => toast.error(apiErrorMessage(error, "Could not cancel the run.")),
      },
    );
  };

  const handleRetry = (fromStep?: string) => {
    retryRun.mutate(
      { id: run.id, ...(fromStep ? { fromStep } : {}) },
      {
        onSuccess: () => toast.success(fromStep ? "Retry queued from step" : "Retry queued"),
        onError: (error) => toast.error(apiErrorMessage(error, "This run cannot be retried.")),
      },
    );
  };

  const readouts: Readout[] = [
    {
      label: "Status",
      value: <span className="font-[family-name:var(--sans)]">{labelize(run.status)}</span>,
      sub: run.completedAt ? "Finished" : active ? "Still in flight" : "Not running",
      tone: READOUT_TONE[stageToneForStatus(run.status)],
    },
    {
      label: "Steps",
      value: stepsQuery.data ? formatNumber(steps.length) : "—",
      sub: failedSteps > 0 ? `${plural(failedSteps, "step")} failed` : "None failed",
      tone: failedSteps > 0 ? "bad" : "neutral",
    },
    {
      label: "Duration",
      value: elapsed(run.startedAt, run.completedAt),
      sub: run.startedAt ? (run.completedAt ? "Start to finish" : "Running so far") : "Not started",
    },
    {
      label: "Attempt",
      value: `${run.attempt}/${run.maxAttempts}`,
      sub: attemptsLeft ? "Retries remain" : "No retries left",
      tone: attemptsLeft ? "neutral" : "warn",
    },
  ];

  let stepsBody;
  if (stepsQuery.isLoading) {
    stepsBody = <SheetLoading rows={3} label="Loading steps" />;
  } else if (stepsQuery.isError) {
    stepsBody = (
      <SheetError
        title="Could not load the steps"
        message={apiErrorMessage(stepsQuery.error, "The steps request failed.")}
        onRetry={() => void stepsQuery.refetch()}
      />
    );
  } else if (steps.length === 0) {
    stepsBody = (
      <SheetEmpty
        title="No steps recorded yet"
        description="Steps appear here as the worker starts each action. Queued runs have none until they begin."
      />
    );
  } else {
    stepsBody = (
      <Sequence label="Run steps in execution order">
        {steps.map((step) => (
          <SequenceStage
            key={step.id}
            marker={step.sortOrder + 1}
            tone={stageToneForStatus(step.status)}
            title={
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="min-w-0 [overflow-wrap:anywhere]">{step.stepKey}</span>
                <CodeChip>{step.actionType}</CodeChip>
              </span>
            }
            meta={
              <>
                {step.requiresApproval && <Pill tone="amber">Needs approval</Pill>}
                <RunStatusPill status={step.status} />
                {retryable && (
                  <UiButton
                    variant="ghost"
                    size="sm"
                    disabled={retryRun.isPending}
                    onClick={() => handleRetry(step.id)}
                    aria-label={`Retry from step ${step.stepKey}`}
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" /> Retry from here
                  </UiButton>
                )}
              </>
            }
          >
            <p>
              Attempt <span className={MONO}>{step.attempt}/{step.maxAttempts}</span>
              {" · "}
              <span className={MONO}>{elapsed(step.startedAt, step.completedAt)}</span>
              {step.nextRetryAt && (
                <>
                  {" · retry scheduled "}
                  <Timestamp value={step.nextRetryAt} />
                </>
              )}
            </p>
            {step.errorMessage && (
              <p className="mt-1 text-[var(--red)] [overflow-wrap:anywhere]">
                {step.errorCode && <span className={cn(MONO, "mr-1.5")}>{step.errorCode}</span>}
                {step.errorMessage}
              </p>
            )}
          </SequenceStage>
        ))}
      </Sequence>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        crumbs={[...CRUMBS_BASE, { label: shortId }]}
        title={labelize(run.triggerType)}
        badges={<RunStatusPill status={run.status} />}
        description={`Run of the published workflow, started by a ${run.triggerType} trigger from ${run.sourceModule}.`}
        meta={[
          { label: "Run", value: shortId, mono: true },
          { label: "Idempotency key", value: run.idempotencyKey, mono: true },
          { label: "Priority", value: run.priority, mono: true },
          { label: "Queued", value: <Timestamp value={run.queuedAt} /> },
        ]}
        actions={
          <>
            <UiButton asChild variant="outline" size="lg">
              <Link to={`/automation/workflows/${run.workflowId}`}>Open workflow</Link>
            </UiButton>
            {active && (
              <UiButton variant="outline" size="lg" disabled={cancelRun.isPending} onClick={handleCancel}>
                <Ban className="size-4" aria-hidden="true" /> Cancel run
              </UiButton>
            )}
            <UiButton
              size="lg"
              disabled={!retryable || retryRun.isPending}
              title={retryBlockedReason}
              onClick={() => handleRetry()}
            >
              <RotateCcw className="size-4" aria-hidden="true" /> Retry run
            </UiButton>
          </>
        }
      />

      <Readouts cells={readouts} label="Run summary" />

      {run.errorMessage && (
        <Notice tone="red" icon={AlertTriangle} title={run.errorCode ?? "Run failed"}>
          {run.errorMessage}
        </Notice>
      )}

      {run.status === "waiting_approval" && (
        <Notice
          tone="amber"
          icon={ShieldQuestion}
          title="Waiting on an approval"
          action={
            <UiButton asChild variant="outline" size="sm">
              <Link to="/automation/approvals">Open queue</Link>
            </UiButton>
          }
        >
          A high-risk action paused this run until someone approves or rejects it.
        </Notice>
      )}

      <Sheet
        title="Steps"
        description={
          retryable
            ? "In execution order. Retry the whole run, or start again from any step."
            : "In execution order. Each step is one action from the workflow definition."
        }
      >
        {stepsBody}
      </Sheet>

      <Panel title="Timeline" description="When the run moved between states, and where it came from.">
        <FactGrid
          facts={[
            { label: "Queued", value: <Timestamp value={run.queuedAt} /> },
            { label: "Started", value: run.startedAt ? <Timestamp value={run.startedAt} /> : "Not started" },
            { label: "Completed", value: run.completedAt ? <Timestamp value={run.completedAt} /> : "Not completed" },
            run.cancelledAt && { label: "Cancelled", value: <Timestamp value={run.cancelledAt} /> },
            run.expiresAt && { label: "Expires", value: <Timestamp value={run.expiresAt} /> },
            { label: "Source module", value: run.sourceModule },
            { label: "Source event", value: run.sourceEventId ?? "None", mono: Boolean(run.sourceEventId) },
            { label: "Dedupe key", value: run.dedupeKey ?? "None", mono: Boolean(run.dedupeKey) },
            { label: "Version", value: run.workflowVersionId.slice(0, 8), mono: true },
          ]}
        />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Input payload" description="What the trigger handed to this run.">
          <JsonViewer data={run.inputPayload} maxHeight={320} />
        </Panel>
        <Panel title="Output payload" description="Aggregated action results.">
          <JsonViewer data={run.outputPayload} maxHeight={320} />
        </Panel>
      </div>
    </WorkspacePage>
  );
}
