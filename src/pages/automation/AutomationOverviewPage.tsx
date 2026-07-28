/**
 * Automation overview — org-wide health of the workflow engine.
 *
 * Reads `GET /workflows`, `GET /runs`, and `GET /approvals` in parallel and
 * derives the KPI strip from those pages, so no extra endpoint is needed.
 */
import { Link } from "react-router";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileStack,
  ListChecks,
  Play,
  Power,
  ShieldQuestion,
  Workflow as WorkflowIcon,
  XCircle,
} from "lucide-react";
import {
  EmptyPanel,
  HeroFacts,
  Notice,
  PageHero,
  Panel,
  RowStack,
  Row,
  StatCard,
} from "@/shared/ui/pulse";
import { Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { useApprovals, useAutomationScope, useRuns, useWorkflows } from "@/modules/automation/hooks/useAutomation";
import {
  ApprovalStatusPill,
  RiskPill,
  RunStatusPill,
  WorkflowStatusPill,
  elapsed,
  labelize,
} from "@/modules/automation/components/automation-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const RECENT_RUNS_QUERY = { limit: 8, offset: 0 } as const;
const PENDING_APPROVALS_QUERY = { limit: 5, offset: 0, status: "pending" } as const;
const WORKFLOWS_QUERY = { limit: 200, offset: 0 } as const;
const RUN_SAMPLE_QUERY = { limit: 200, offset: 0 } as const;

export default function AutomationOverviewPage() {
  const { activeOrgId } = useAutomationScope();
  const workflowsQuery = useWorkflows(WORKFLOWS_QUERY);
  const runSampleQuery = useRuns(RUN_SAMPLE_QUERY);
  const recentRunsQuery = useRuns(RECENT_RUNS_QUERY);
  const approvalsQuery = useApprovals(PENDING_APPROVALS_QUERY);

  if (!activeOrgId) {
    return (
      <Notice tone="amber" icon={AlertTriangle} title="No organization selected">
        Pick an organization to see its automation workflows.
      </Notice>
    );
  }

  const workflows = workflowsQuery.data?.data ?? [];
  const enabledCount = workflows.filter((workflow) => workflow.isEnabled).length;
  const draftCount = workflows.filter((workflow) => workflow.status === "draft").length;
  const entitlementBlocked = workflows.some((workflow) => workflow.entitlementUnavailable);

  const runs = runSampleQuery.data?.data ?? [];
  const succeeded = runs.filter((run) => run.status === "succeeded").length;
  const failed = runs.filter((run) => ["failed", "timed_out"].includes(run.status)).length;
  const inFlight = runs.filter((run) => ["queued", "running", "waiting_approval"].includes(run.status)).length;
  const successRate = succeeded + failed > 0 ? Math.round((succeeded / (succeeded + failed)) * 100) : null;

  const pendingApprovals = approvalsQuery.data?.data ?? [];
  const recentRuns = recentRunsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Workflows"
        title="Automation"
        description="Event, schedule, and manual workflows that route alerts, open incidents, and run guarded remediation with an approval trail."
        icon={WorkflowIcon}
        actions={
          <>
            <UiButton asChild variant="outline" size="lg">
              <Link to="/automation/templates">
                <FileStack className="size-4" /> Browse templates
              </Link>
            </UiButton>
            <UiButton asChild size="lg">
              <Link to="/automation/workflows">
                <WorkflowIcon className="size-4" /> Manage workflows
              </Link>
            </UiButton>
          </>
        }
      >
        <HeroFacts
          facts={[
            { label: "Workflows", value: workflowsQuery.data?.total ?? 0, icon: WorkflowIcon },
            { label: "Switched on", value: enabledCount, tone: enabledCount > 0 ? "green" : "neutral", icon: Power },
            { label: "In flight", value: inFlight, tone: inFlight > 0 ? "brand" : "neutral", icon: Activity },
            {
              label: "Awaiting approval",
              value: approvalsQuery.data?.total ?? 0,
              tone: (approvalsQuery.data?.total ?? 0) > 0 ? "amber" : "neutral",
              icon: ShieldQuestion,
            },
          ]}
        />
      </PageHero>

      {entitlementBlocked && (
        <Notice tone="amber" icon={AlertTriangle} title="Some workflows need a plan upgrade">
          At least one workflow uses a trigger or action your current plan does not include. Those workflows stay
          visible but cannot be enabled or run.
        </Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Success rate"
          value={successRate === null ? "—" : `${successRate}%`}
          icon={CheckCircle2}
          tone={successRate === null ? "neutral" : successRate >= 95 ? "green" : successRate >= 80 ? "amber" : "red"}
          footnote={`Last ${runs.length} runs`}
        />
        <StatCard label="Succeeded" value={succeeded} icon={CheckCircle2} tone="green" footnote="Recent sample" />
        <StatCard
          label="Failed"
          value={failed}
          icon={XCircle}
          tone={failed > 0 ? "red" : "neutral"}
          footnote="Includes timed out"
        />
        <StatCard
          label="Drafts"
          value={draftCount}
          icon={ListChecks}
          tone={draftCount > 0 ? "amber" : "neutral"}
          footnote="Publish before enabling"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Pending approvals"
          description="High-risk actions paused until someone signs off."
          icon={ClipboardCheck}
          tone="amber"
          bodyClassName="p-0"
          actions={
            <UiButton asChild variant="outline" size="sm">
              <Link to="/automation/approvals">Open queue</Link>
            </UiButton>
          }
        >
          {pendingApprovals.length === 0 ? (
            <div className="p-5">
              <EmptyPanel
                icon={ClipboardCheck}
                title="Nothing waiting"
                description="Approvals appear here when a run reaches a high-risk action."
              />
            </div>
          ) : (
            <RowStack>
              {pendingApprovals.map((approval) => (
                <Row key={approval.id} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      to={`/automation/approvals/${approval.id}`}
                      className="block truncate text-[13.5px] font-medium text-[var(--text)] hover:text-[var(--brand)]"
                    >
                      {approval.workflowName || "Workflow"}
                    </Link>
                    <p className="mt-0.5 truncate text-[12px] text-[var(--text3)]">
                      {labelize(approval.actionType)} · expires <Timestamp value={approval.expiresAt} />
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <RiskPill risk={approval.riskLevel} />
                    <ApprovalStatusPill status={approval.status} />
                  </div>
                </Row>
              ))}
            </RowStack>
          )}
        </Panel>

        <Panel
          title="Recent runs"
          description="Newest executions across every workflow."
          icon={Play}
          bodyClassName="p-0"
          actions={
            <UiButton asChild variant="outline" size="sm">
              <Link to="/automation/runs">All runs</Link>
            </UiButton>
          }
        >
          {recentRuns.length === 0 ? (
            <div className="p-5">
              <EmptyPanel
                icon={Play}
                title="No runs yet"
                description="Trigger a workflow manually or wait for a matching event."
              />
            </div>
          ) : (
            <RowStack>
              {recentRuns.map((run) => (
                <Row key={run.runId} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      to={`/automation/runs/${run.runId}`}
                      className="block truncate text-[13.5px] font-medium text-[var(--text)] hover:text-[var(--brand)]"
                    >
                      {run.workflowName}
                    </Link>
                    <p className="mt-0.5 truncate text-[12px] text-[var(--text3)]">
                      {run.triggerType} · {run.stepCount} steps · {elapsed(run.startedAt, run.completedAt)}
                    </p>
                  </div>
                  <RunStatusPill status={run.status} />
                </Row>
              ))}
            </RowStack>
          )}
        </Panel>
      </div>

      <Panel
        title="Workflows by state"
        description="Newest first. Switch a workflow on from the workflows page."
        icon={WorkflowIcon}
        bodyClassName="p-0"
      >
        {workflows.length === 0 ? (
          <div className="p-5">
            <EmptyPanel
              icon={WorkflowIcon}
              title="No workflows yet"
              description="Start from a template or build one from scratch."
              action={
                <UiButton asChild size="lg">
                  <Link to="/automation/templates">Browse templates</Link>
                </UiButton>
              }
            />
          </div>
        ) : (
          <RowStack>
            {workflows.slice(0, 6).map((workflow) => (
              <Row key={workflow.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    to={`/automation/workflows/${workflow.id}`}
                    className="block truncate text-[13.5px] font-medium text-[var(--text)] hover:text-[var(--brand)]"
                  >
                    {workflow.name}
                  </Link>
                  <p className="mt-0.5 truncate text-[12px] text-[var(--text3)]">
                    {labelize(workflow.workflowType)} · {workflow.actionCount} actions ·{" "}
                    {workflow.triggerType ?? "no trigger"}
                  </p>
                </div>
                <WorkflowStatusPill status={workflow.status} />
              </Row>
            ))}
          </RowStack>
        )}
      </Panel>
    </div>
  );
}
