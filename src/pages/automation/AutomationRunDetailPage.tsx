/**
 * Run detail — `GET /runs/:runId` plus `GET /runs/:runId/steps`, with the
 * cancel and retry controls. Retry can target a specific step via `fromStep`.
 */
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Ban,
  Play,
  RotateCcw,
  ShieldQuestion,
  Workflow as WorkflowIcon,
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
} from "@/shared/ui/pulse";
import { JsonViewer, Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  useAutomationScope,
  useRun,
  useRunMutations,
  useRunSteps,
} from "@/modules/automation/hooks/useAutomation";
import {
  ACTIVE_RUN_STATUSES,
  CodeChip,
  MetaCell,
  RETRYABLE_RUN_STATUSES,
  RunStatusPill,
  elapsed,
  labelize,
} from "@/modules/automation/components/automation-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const BREADCRUMBS = [
  { label: "Automation", to: "/automation" },
  { label: "Runs", to: "/automation/runs" },
];

export default function AutomationRunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const { activeOrgId } = useAutomationScope();
  const runQuery = useRun(runId);
  const stepsQuery = useRunSteps(runId);
  const { cancelRun, retryRun } = useRunMutations();

  if (!activeOrgId) {
    return (
      <Notice tone="amber" icon={AlertTriangle} title="No organization selected">
        Pick an organization to view this run.
      </Notice>
    );
  }

  if (runQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1].map((block) => (
          <div key={block} className="h-40 animate-pulse rounded-[14px] bg-[var(--bg2)]" />
        ))}
      </div>
    );
  }

  if (runQuery.isError || !runQuery.data) {
    return (
      <Notice tone="red" icon={AlertTriangle} title="Could not load this run">
        {apiErrorMessage(runQuery.error)}
      </Notice>
    );
  }

  const run = runQuery.data;
  const steps = stepsQuery.data ?? [];
  const active = ACTIVE_RUN_STATUSES.includes(run.status);
  const retryable = RETRYABLE_RUN_STATUSES.includes(run.status) && run.attempt < run.maxAttempts;

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

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Run"
        title={run.triggerType}
        description={`Attempt ${run.attempt} of ${run.maxAttempts} · idempotency key ${run.idempotencyKey}`}
        icon={Play}
        breadcrumbs={[...BREADCRUMBS, { label: run.id.slice(0, 8) }]}
        actions={
          <>
            <UiButton asChild variant="outline" size="lg">
              <Link to={`/automation/workflows/${run.workflowId}`}>
                <WorkflowIcon className="size-4" /> Workflow
              </Link>
            </UiButton>
            <UiButton variant="outline" size="lg" disabled={!active || cancelRun.isPending} onClick={handleCancel}>
              <Ban className="size-4" /> Cancel
            </UiButton>
            <UiButton size="lg" disabled={!retryable || retryRun.isPending} onClick={() => handleRetry()}>
              <RotateCcw className="size-4" /> Retry
            </UiButton>
          </>
        }
      >
        <HeroFacts
          facts={[
            { label: "Status", value: labelize(run.status) },
            { label: "Steps", value: steps.length },
            { label: "Duration", value: elapsed(run.startedAt, run.completedAt) },
            { label: "Priority", value: run.priority },
          ]}
        />
      </PageHero>

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

      <Panel title="Timeline" description="Queue, start, and completion timestamps." icon={Activity}>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <MetaCell label="Status">
            <RunStatusPill status={run.status} />
          </MetaCell>
          <MetaCell label="Queued">
            <Timestamp value={run.queuedAt} />
          </MetaCell>
          <MetaCell label="Started">{run.startedAt ? <Timestamp value={run.startedAt} /> : "—"}</MetaCell>
          <MetaCell label="Completed">{run.completedAt ? <Timestamp value={run.completedAt} /> : "—"}</MetaCell>
          <MetaCell label="Cancelled">{run.cancelledAt ? <Timestamp value={run.cancelledAt} /> : "—"}</MetaCell>
          <MetaCell label="Source module">{run.sourceModule}</MetaCell>
        </div>
        <div className="mt-4 grid gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-3">
          <MetaCell label="Dedupe key">{run.dedupeKey ? <CodeChip>{run.dedupeKey}</CodeChip> : "—"}</MetaCell>
          <MetaCell label="Source event id">
            {run.sourceEventId ? <CodeChip>{run.sourceEventId}</CodeChip> : "—"}
          </MetaCell>
          <MetaCell label="Version">
            <CodeChip>{run.workflowVersionId.slice(0, 8)}</CodeChip>
          </MetaCell>
        </div>
      </Panel>

      <Panel
        title={`Steps (${steps.length})`}
        description="One row per action, in execution order."
        icon={Play}
        bodyClassName="p-0"
      >
        {stepsQuery.isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-12 animate-pulse rounded-[9px] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : steps.length === 0 ? (
          <div className="p-5">
            <EmptyPanel icon={Play} title="No steps recorded" description="The run has not started executing yet." />
          </div>
        ) : (
          <RowStack>
            {steps.map((step) => (
              <Row key={step.id} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-[var(--text)]">
                      {step.sortOrder + 1}. {step.stepKey}
                    </span>
                    <CodeChip>{step.actionType}</CodeChip>
                    {step.requiresApproval && <Pill tone="amber">Approval</Pill>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <RunStatusPill status={step.status} />
                    {retryable && (
                      <UiButton
                        variant="ghost"
                        size="sm"
                        disabled={retryRun.isPending}
                        onClick={() => handleRetry(step.id)}
                      >
                        <RotateCcw className="size-3.5" /> From here
                      </UiButton>
                    )}
                  </div>
                </div>
                <p className="text-[12px] text-[var(--text3)]">
                  attempt {step.attempt}/{step.maxAttempts} · {elapsed(step.startedAt, step.completedAt)}
                  {step.nextRetryAt ? " · retry scheduled" : ""}
                </p>
                {step.errorMessage && (
                  <p className="text-[12px] text-[var(--red)]">
                    {step.errorCode ? `${step.errorCode}: ` : ""}
                    {step.errorMessage}
                  </p>
                )}
              </Row>
            ))}
          </RowStack>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Input payload" description="What the trigger handed to this run.">
          <JsonViewer data={run.inputPayload} maxHeight={320} />
        </Panel>
        <Panel title="Output payload" description="Aggregated action results.">
          <JsonViewer data={run.outputPayload} maxHeight={320} />
        </Panel>
      </div>
    </div>
  );
}
