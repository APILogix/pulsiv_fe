import { Link } from "react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileStack,
  Play,
  Plus,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { Timestamp } from "@/shared/observe";
import { useApprovals, useAutomationScope, useRuns, useWorkflows } from "@/modules/automation/hooks/useAutomation";
import {
  ApprovalStatusPill,
  RiskPill,
  RunStatusPill,
  WorkflowStatusPill,
  elapsed,
  labelize,
} from "@/modules/automation/components/automation-ui";
import { cn } from "@/lib/utils";

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
      <div className="mx-auto w-full max-w-[1400px] p-6">
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--warning)]/30 bg-[var(--warning-muted)] p-4 text-[13px] text-[var(--warning)] font-[family-name:var(--mono)]">
          <AlertTriangle className="size-4 shrink-0" />
          <span>Select an active organization workspace to inspect automation run pipelines.</span>
        </div>
      </div>
    );
  }

  const workflows = workflowsQuery.data?.data ?? [];
  const enabledCount = workflows.filter((workflow) => workflow.isEnabled).length;
  const entitlementBlocked = workflows.some((workflow) => workflow.entitlementUnavailable);

  const runs = runSampleQuery.data?.data ?? [];
  const succeeded = runs.filter((run) => run.status === "succeeded").length;
  const failed = runs.filter((run) => ["failed", "timed_out"].includes(run.status)).length;
  const inFlight = runs.filter((run) => ["queued", "running", "waiting_approval"].includes(run.status)).length;
  const successRate = succeeded + failed > 0 ? Math.round((succeeded / (succeeded + failed)) * 100) : 100;

  const pendingApprovals = approvalsQuery.data?.data ?? [];
  const recentRuns = recentRunsQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 font-sans">
      
      {/* ── 1. Page Command Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            <span className="inline-block size-1.5 rounded-full bg-[var(--brand)]" />
            <span>Remediation & Workflows</span>
            <span>/</span>
            <span className="text-[var(--text-secondary)]">Execution Engine</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] font-[family-name:var(--display)]">
            Automation Pipelines
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Automated incident triage, guarded rollbacks, webhook triggers, and human-in-the-loop approvals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/automation/templates"
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--surface-1)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors"
          >
            <FileStack className="size-3.5" />
            <span>Templates</span>
          </Link>
          <Link
            to="/automation/workflows/new"
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--brand-border)] bg-[var(--brand)] px-3 py-1.5 text-[12px] font-medium text-white shadow-sm hover:bg-[var(--brand)]/90 transition-all"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>Create Workflow</span>
          </Link>
        </div>
      </div>

      {entitlementBlocked && (
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--warning)]/30 bg-[var(--warning-muted)] p-3 text-[12px] text-[var(--warning)] font-[family-name:var(--mono)]">
          <AlertTriangle className="size-4 shrink-0" />
          <span>Some workflows require plan upgrade for high-throughput concurrency triggers.</span>
        </div>
      )}

      {/* ── 2. Unified Hero Telemetry Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] divide-x divide-y md:divide-y-0 divide-[var(--border-subtle)]">
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Active Workflows</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] font-[family-name:var(--mono)] tabular-nums">
            {enabledCount} <span className="text-[13px] font-normal text-[var(--text-tertiary)]">/ {workflows.length}</span>
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Automated policies enabled</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Success Rate</span>
            <span className="size-2 rounded-full bg-[var(--success)]" />
          </div>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--success)] font-[family-name:var(--mono)] tabular-nums">
            {successRate}%
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">{succeeded} succeeded · {failed} failed</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">In Flight Runs</span>
          <div className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--brand)] font-[family-name:var(--mono)] tabular-nums">
            {inFlight}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">Currently executing</div>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[family-name:var(--mono)] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Awaiting Approval</span>
            <span className={cn("size-2 rounded-full", pendingApprovals.length > 0 ? "bg-[var(--warning)] animate-pulse" : "bg-[var(--surface-4)]")} />
          </div>
          <div className={cn(
            "mt-2 text-[24px] font-semibold tracking-[-0.03em] font-[family-name:var(--mono)] tabular-nums",
            pendingApprovals.length > 0 ? "text-[var(--warning)]" : "text-[var(--text-primary)]"
          )}>
            {pendingApprovals.length}
          </div>
          <div className="mt-1 text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">High-risk gated actions</div>
        </div>
      </div>

      {/* ── 3. Split Pipeline & Approvals Section ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        
        {/* Pending Approvals Panel */}
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3 bg-[var(--surface-2)]/30">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="size-4 text-[var(--warning)]" />
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)] font-[family-name:var(--display)]">
                Guarded Action Queue
              </h3>
            </div>
            <Link to="/automation/approvals" className="text-[11.5px] font-medium text-[var(--brand)] hover:underline font-[family-name:var(--mono)]">
              View all ({pendingApprovals.length}) →
            </Link>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="mx-auto size-7 text-[var(--success)] opacity-70" />
              <p className="mt-2 text-[13px] font-medium text-[var(--text-primary)]">No actions pending sign-off</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                Approvals pause high-risk actions until an authorized engineer approves.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {pendingApprovals.map((approval) => (
                <div key={approval.id} className="flex items-center justify-between gap-3 p-3.5 hover:bg-[var(--surface-2)]/50 transition-colors">
                  <div className="min-w-0">
                    <Link
                      to={`/automation/approvals/${approval.id}`}
                      className="block truncate text-[13px] font-medium text-[var(--text-primary)] hover:text-[var(--brand)]"
                    >
                      {approval.workflowName || "Automated Remediation"}
                    </Link>
                    <p className="mt-0.5 truncate text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
                      {labelize(approval.actionType)} · expires <Timestamp value={approval.expiresAt} />
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <RiskPill risk={approval.riskLevel} />
                    <ApprovalStatusPill status={approval.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Runs Panel */}
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3 bg-[var(--surface-2)]/30">
            <div className="flex items-center gap-2">
              <Play className="size-4 text-[var(--brand)]" />
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)] font-[family-name:var(--display)]">
                Recent Pipeline Executions
              </h3>
            </div>
            <Link to="/automation/runs" className="text-[11.5px] font-medium text-[var(--brand)] hover:underline font-[family-name:var(--mono)]">
              All runs →
            </Link>
          </div>

          {recentRuns.length === 0 ? (
            <div className="p-8 text-center">
              <Play className="mx-auto size-7 text-[var(--text-tertiary)] opacity-50" />
              <p className="mt-2 text-[13px] font-medium text-[var(--text-primary)]">No executions recorded</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                Trigger a workflow manually or wait for incoming anomaly events.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {recentRuns.map((run) => (
                <div key={run.runId} className="flex items-center justify-between gap-3 p-3.5 hover:bg-[var(--surface-2)]/50 transition-colors">
                  <div className="min-w-0">
                    <Link
                      to={`/automation/runs/${run.runId}`}
                      className="block truncate text-[13px] font-medium text-[var(--text-primary)] hover:text-[var(--brand)]"
                    >
                      {run.workflowName}
                    </Link>
                    <p className="mt-0.5 truncate text-[11px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
                      {run.triggerType} · {run.stepCount} steps · {elapsed(run.startedAt, run.completedAt)}
                    </p>
                  </div>
                  <RunStatusPill status={run.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Workflows Table ── */}
      <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-1)] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3 bg-[var(--surface-2)]/30">
          <div className="flex items-center gap-2">
            <WorkflowIcon className="size-4 text-[var(--text-secondary)]" />
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] font-[family-name:var(--display)]">
              Registered Automation Policies ({workflows.length})
            </h3>
          </div>
          <Link to="/automation/workflows" className="text-[11.5px] font-medium text-[var(--brand)] hover:underline font-[family-name:var(--mono)]">
            Manage workflows →
          </Link>
        </div>

        {workflows.length === 0 ? (
          <div className="p-8 text-center">
            <WorkflowIcon className="mx-auto size-8 text-[var(--text-tertiary)] opacity-50" />
            <p className="mt-2 text-[14px] font-semibold text-[var(--text-primary)]">No workflows yet</p>
            <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
              Create your first automation pipeline from scratch or install from the template catalog.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {workflows.slice(0, 6).map((workflow) => (
              <div key={workflow.id} className="flex items-center justify-between gap-4 p-4 hover:bg-[var(--surface-2)]/40 transition-colors">
                <div className="min-w-0">
                  <Link
                    to={`/automation/workflows/${workflow.id}`}
                    className="block truncate text-[13.5px] font-medium text-[var(--text-primary)] hover:text-[var(--brand)]"
                  >
                    {workflow.name}
                  </Link>
                  <p className="mt-0.5 truncate text-[11.5px] font-[family-name:var(--mono)] text-[var(--text-tertiary)]">
                    {labelize(workflow.workflowType)} · {workflow.actionCount} steps · trigger: {workflow.triggerType ?? "manual"}
                  </p>
                </div>
                <WorkflowStatusPill status={workflow.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
