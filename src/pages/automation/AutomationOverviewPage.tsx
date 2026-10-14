/**
 * Workflows overview: org-wide health of the workflow engine.
 *
 * Reads `GET /workflows`, `GET /runs`, and `GET /approvals` in parallel and
 * derives the readout band from those pages, so no extra endpoint is needed.
 */
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { AlertTriangle, FileStack, Workflow as WorkflowIcon } from "lucide-react";
import { Notice } from "@/shared/ui/pulse";
import { Timestamp, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  HIDE_BELOW_SM,
  ProjectPageHeader,
  Readouts,
  RowTitle,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetList,
  SheetListItem,
  SheetLoading,
  SheetRow,
  SheetTable,
  TextLink,
  WorkspacePage,
  type Readout,
  type ReadoutTone,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { useApprovals, useAutomationScope, useRuns, useWorkflows } from "@/modules/automation/hooks/useAutomation";
import {
  ACTIVE_RUN_STATUSES,
  ApprovalStatusPill,
  CodeChip,
  MONO,
  NoOrgNotice,
  RiskPill,
  RunStatusPill,
  WorkflowStatusPill,
  elapsed,
  labelize,
  plural,
} from "@/modules/automation/components/automation-ui";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md §1.2) ───────────────────

const RECENT_RUNS_QUERY = { limit: 8, offset: 0 } as const;
const PENDING_APPROVALS_QUERY = { limit: 5, offset: 0, status: "pending" } as const;
const WORKFLOWS_QUERY = { limit: 200, offset: 0 } as const;
const RUN_SAMPLE_QUERY = { limit: 200, offset: 0 } as const;
const WORKFLOW_PREVIEW_COUNT = 6;

const FAILED_RUN_STATUSES: readonly string[] = ["failed", "timed_out"];

const RUN_COLUMNS: SheetColumn[] = [
  { key: "workflow", header: "Workflow" },
  { key: "trigger", header: "Trigger", className: `w-[180px] ${HIDE_BELOW_MD}` },
  { key: "steps", header: "Steps", className: `w-[120px] ${HIDE_BELOW_LG}` },
  { key: "duration", header: "Duration", className: `w-[100px] ${HIDE_BELOW_SM}` },
  { key: "status", header: "Status", className: "w-[140px]" },
  { key: "time", header: "Created", className: "w-[130px]", align: "right" },
];

const WORKFLOW_COLUMNS: SheetColumn[] = [
  { key: "workflow", header: "Workflow" },
  { key: "trigger", header: "Trigger", className: `w-[200px] ${HIDE_BELOW_MD}` },
  { key: "status", header: "Status", className: "w-[120px]", align: "right" },
];

function successTone(rate: number | null): ReadoutTone {
  if (rate === null) return "neutral";
  if (rate >= 95) return "good";
  if (rate >= 80) return "warn";
  return "bad";
}

export default function AutomationOverviewPage() {
  const navigate = useNavigate();
  const { activeOrgId } = useAutomationScope();
  const workflowsQuery = useWorkflows(WORKFLOWS_QUERY);
  const runSampleQuery = useRuns(RUN_SAMPLE_QUERY);
  const recentRunsQuery = useRuns(RECENT_RUNS_QUERY);
  const approvalsQuery = useApprovals(PENDING_APPROVALS_QUERY);

  if (!activeOrgId) {
    return <NoOrgNotice>Pick an organization to see its workflows.</NoOrgNotice>;
  }

  const workflows = workflowsQuery.data?.data ?? [];
  const workflowTotal = workflowsQuery.data?.total ?? 0;
  const enabledCount = workflows.filter((workflow) => workflow.isEnabled).length;
  const entitlementBlocked = workflows.some((workflow) => workflow.entitlementUnavailable);

  const runs = runSampleQuery.data?.data ?? [];
  const succeeded = runs.filter((run) => run.status === "succeeded").length;
  const failed = runs.filter((run) => FAILED_RUN_STATUSES.includes(run.status)).length;
  const inFlight = runs.filter((run) => ACTIVE_RUN_STATUSES.includes(run.status)).length;
  const successRate = succeeded + failed > 0 ? Math.round((succeeded / (succeeded + failed)) * 100) : null;

  const pendingApprovals = approvalsQuery.data?.data ?? [];
  const pendingTotal = approvalsQuery.data?.total ?? 0;
  const recentRuns = recentRunsQuery.data?.data ?? [];

  const workflowsReady = Boolean(workflowsQuery.data);
  const runsReady = Boolean(runSampleQuery.data);
  const approvalsReady = Boolean(approvalsQuery.data);
  const runSample = `Latest ${formatNumber(runs.length)} runs`;

  const readouts: Readout[] = [
    {
      label: "Workflows",
      value: workflowsReady ? formatNumber(workflowTotal) : "—",
      sub: "In this organization",
    },
    {
      label: "Switched on",
      value: workflowsReady ? formatNumber(enabledCount) : "—",
      sub:
        workflowTotal > workflows.length
          ? `In the latest ${formatNumber(workflows.length)} workflows`
          : "Reacting to live events",
    },
    {
      label: "In flight",
      value: runsReady ? formatNumber(inFlight) : "—",
      sub: runsReady ? `${runSample}, queued or running` : "Queued or running",
    },
    {
      label: "Awaiting approval",
      value: approvalsReady ? formatNumber(pendingTotal) : "—",
      sub: "Paused for sign-off",
      tone: approvalsReady && pendingTotal > 0 ? "warn" : "neutral",
    },
    {
      label: "Success rate",
      value: runsReady && successRate !== null ? `${successRate}%` : "—",
      sub: runsReady ? `Last ${formatNumber(runs.length)} runs` : "Finished runs only",
      tone: runsReady ? successTone(successRate) : "neutral",
    },
    {
      label: "Failed",
      value: runsReady ? formatNumber(failed) : "—",
      sub: runsReady ? `${runSample}, includes timed out` : "Includes timed out",
      tone: runsReady && failed > 0 ? "bad" : "neutral",
    },
  ];

  // ── Pending approvals ──────────────────────────────────────
  let approvalsBody: ReactNode;
  if (approvalsQuery.isLoading || (!approvalsQuery.data && !approvalsQuery.isError)) {
    approvalsBody = <SheetLoading rows={3} label="Loading pending approvals" />;
  } else if (approvalsQuery.isError) {
    approvalsBody = (
      <SheetError
        title="Could not load pending approvals"
        message={apiErrorMessage(approvalsQuery.error, "The approvals request failed.")}
        onRetry={() => void approvalsQuery.refetch()}
      />
    );
  } else if (pendingApprovals.length === 0) {
    approvalsBody = (
      <SheetEmpty
        title="Nothing waiting"
        description="Approvals appear here when a run reaches a high-risk action that needs a person to sign off."
      />
    );
  } else {
    approvalsBody = (
      <SheetList label="Pending approvals">
        {pendingApprovals.map((approval) => (
          <SheetListItem key={approval.id} to={`/automation/approvals/${approval.id}`}>
            <RowTitle
              title={approval.workflowName || "Workflow"}
              subtitle={
                <>
                  {labelize(approval.actionType)} · expires <Timestamp value={approval.expiresAt} />
                </>
              }
            />
            <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
              <RiskPill risk={approval.riskLevel} />
              <ApprovalStatusPill status={approval.status} />
            </div>
          </SheetListItem>
        ))}
      </SheetList>
    );
  }

  // ── Recent runs ────────────────────────────────────────────
  let runsBody: ReactNode;
  if (recentRunsQuery.isLoading || (!recentRunsQuery.data && !recentRunsQuery.isError)) {
    runsBody = <SheetLoading rows={5} label="Loading recent runs" />;
  } else if (recentRunsQuery.isError) {
    runsBody = (
      <SheetError
        title="Could not load recent runs"
        message={apiErrorMessage(recentRunsQuery.error, "The runs request failed.")}
        onRetry={() => void recentRunsQuery.refetch()}
      />
    );
  } else if (recentRuns.length === 0) {
    runsBody = (
      <SheetEmpty
        title="No runs yet"
        description="Runs appear here when a workflow is triggered manually, on its schedule, or by a matching event."
      />
    );
  } else {
    runsBody = (
      <SheetTable columns={RUN_COLUMNS} caption="Newest runs across every workflow" minWidth={420}>
        {recentRuns.map((run) => (
          <SheetRow key={run.runId} onActivate={() => navigate(`/automation/runs/${run.runId}`)}>
            <SheetCell>
              <RowTitle
                title={run.workflowName}
                to={`/automation/runs/${run.runId}`}
                subtitle={labelize(run.sourceModule)}
              />
            </SheetCell>
            <SheetCell className={HIDE_BELOW_MD}>
              <CodeChip>{run.triggerType}</CodeChip>
            </SheetCell>
            <SheetCell className={HIDE_BELOW_LG}>
              <span className={cn("text-[12px] text-[var(--text2)]", MONO)}>{run.stepCount}</span>
              {run.failedStepCount > 0 && (
                <span className={cn("text-[12px] text-[var(--red)]", MONO)}> · {run.failedStepCount} failed</span>
              )}
            </SheetCell>
            <SheetCell className={HIDE_BELOW_SM}>
              <span className={cn("whitespace-nowrap text-[12px] text-[var(--text2)]", MONO)}>
                {elapsed(run.startedAt, run.completedAt)}
              </span>
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

  // ── Workflows ──────────────────────────────────────────────
  const previewWorkflows = workflows.slice(0, WORKFLOW_PREVIEW_COUNT);
  let workflowsBody: ReactNode;
  if (workflowsQuery.isLoading || (!workflowsQuery.data && !workflowsQuery.isError)) {
    workflowsBody = <SheetLoading rows={WORKFLOW_PREVIEW_COUNT} label="Loading workflows" />;
  } else if (workflowsQuery.isError) {
    workflowsBody = (
      <SheetError
        title="Could not load workflows"
        message={apiErrorMessage(workflowsQuery.error, "The workflows request failed.")}
        onRetry={() => void workflowsQuery.refetch()}
      />
    );
  } else if (previewWorkflows.length === 0) {
    workflowsBody = (
      <SheetEmpty
        title="No workflows yet"
        description="A workflow pairs a trigger with conditions and actions. Start from a template or build one from scratch."
        action={
          <UiButton asChild size="sm">
            <Link to="/automation/templates">Browse templates</Link>
          </UiButton>
        }
      />
    );
  } else {
    workflowsBody = (
      <SheetTable columns={WORKFLOW_COLUMNS} caption="Newest workflows in this organization" minWidth={360}>
        {previewWorkflows.map((workflow) => (
          <SheetRow key={workflow.id} onActivate={() => navigate(`/automation/workflows/${workflow.id}`)}>
            <SheetCell>
              <RowTitle
                title={workflow.name}
                to={`/automation/workflows/${workflow.id}`}
                subtitle={`${labelize(workflow.workflowType)} · ${plural(workflow.actionCount, "action")}`}
              />
            </SheetCell>
            <SheetCell className={HIDE_BELOW_MD}>
              {workflow.triggerType ? (
                <CodeChip>{workflow.triggerType}</CodeChip>
              ) : (
                <span className="text-[12px] text-[var(--text3)]">No trigger</span>
              )}
            </SheetCell>
            <SheetCell align="right">
              <WorkflowStatusPill status={workflow.status} />
            </SheetCell>
          </SheetRow>
        ))}
      </SheetTable>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Workflows"
        description="Event, schedule, and manual workflows that route alerts, open incidents, and run guarded remediation with an approval trail."
        actions={
          <>
            <UiButton asChild variant="outline" size="lg">
              <Link to="/automation/templates">
                <FileStack className="size-4" aria-hidden="true" />
                Browse templates
              </Link>
            </UiButton>
            <UiButton asChild size="lg">
              <Link to="/automation/workflows">
                <WorkflowIcon className="size-4" aria-hidden="true" />
                Manage workflows
              </Link>
            </UiButton>
          </>
        }
      />

      <Readouts
        cells={readouts}
        loading={workflowsQuery.isLoading || runSampleQuery.isLoading || approvalsQuery.isLoading}
        label="Workflow engine summary"
      />

      {entitlementBlocked && (
        <Notice tone="amber" icon={AlertTriangle} title="Some workflows need a plan upgrade">
          At least one workflow uses a trigger or action your current plan does not include. Those workflows stay
          visible but cannot be enabled or run.
        </Notice>
      )}

      <Sheet
        title="Pending approvals"
        description="High-risk actions paused until someone signs off."
        actions={
          <TextLink to="/automation/approvals" size="sm" arrow>
            Open queue
          </TextLink>
        }
        footer={
          approvalsReady && pendingTotal > pendingApprovals.length ? (
            <span>
              Showing {formatNumber(pendingApprovals.length)} of {formatNumber(pendingTotal)} pending approvals.
            </span>
          ) : undefined
        }
      >
        {approvalsBody}
      </Sheet>

      <Sheet
        title="Recent runs"
        description="Newest executions across every workflow."
        actions={
          <TextLink to="/automation/runs" size="sm" arrow>
            All runs
          </TextLink>
        }
      >
        {runsBody}
      </Sheet>

      <Sheet
        title="Workflows"
        description="Newest first. Switch a workflow on from the workflows page."
        actions={
          <TextLink to="/automation/workflows" size="sm" arrow>
            All workflows
          </TextLink>
        }
        footer={
          workflowsReady && workflowTotal > previewWorkflows.length ? (
            <span>
              Showing the newest {formatNumber(previewWorkflows.length)} of {formatNumber(workflowTotal)} workflows.
            </span>
          ) : undefined
        }
      >
        {workflowsBody}
      </Sheet>
    </WorkspacePage>
  );
}
