/**
 * Run history — `GET /runs` with cancel and retry actions inline.
 *
 * The list polls because execution happens in a pg-boss worker; there is no
 * websocket/SSE channel on the automation module.
 */
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Ban,
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
} from "lucide-react";
import { EmptyPanel, Notice, PageHero, Panel, Row, RowStack, Toolbar } from "@/shared/ui/pulse";
import { FilterSelect, Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import { useAutomationScope, useRunMutations, useRuns } from "@/modules/automation/hooks/useAutomation";
import {
  RUN_STATUSES,
  TRIGGER_TYPES,
  type RunListQuery,
  type RunStatus,
  type TriggerType,
} from "@/modules/automation/api/types";
import {
  ACTIVE_RUN_STATUSES,
  RETRYABLE_RUN_STATUSES,
  RunStatusPill,
  elapsed,
  withAllOption,
} from "@/modules/automation/components/automation-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const PAGE_SIZE = 25;
const STATUS_OPTIONS = withAllOption(RUN_STATUSES, "All statuses");
const TRIGGER_OPTIONS = [
  { value: "", label: "All triggers" },
  ...TRIGGER_TYPES.map((type) => ({ value: type, label: type })),
];

export default function AutomationRunsPage() {
  const { activeOrgId } = useAutomationScope();
  const [searchParams, setSearchParams] = useSearchParams();
  const workflowId = searchParams.get("workflowId") ?? "";

  const [status, setStatus] = useState("");
  const [triggerType, setTriggerType] = useState("");
  const [page, setPage] = useState(0);

  const query: RunListQuery = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    ...(status ? { status: status as RunStatus } : {}),
    ...(triggerType ? { triggerType: triggerType as TriggerType } : {}),
    ...(workflowId ? { workflowId } : {}),
  };

  const runsQuery = useRuns(query);
  const { cancelRun, retryRun } = useRunMutations();

  if (!activeOrgId) {
    return (
      <Notice tone="amber" icon={AlertTriangle} title="No organization selected">
        Pick an organization to see automation runs.
      </Notice>
    );
  }

  const runs = runsQuery.data?.data ?? [];
  const total = runsQuery.data?.total ?? 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;

  const handleCancel = (runId: string) => {
    cancelRun.mutate(
      { id: runId, reason: "Cancelled from the runs list" },
      {
        onSuccess: () => toast.success("Run cancelled"),
        onError: (error) => toast.error(apiErrorMessage(error, "Could not cancel the run.")),
      },
    );
  };

  const handleRetry = (runId: string) => {
    retryRun.mutate(
      { id: runId },
      {
        onSuccess: () => toast.success("Retry queued"),
        onError: (error) => toast.error(apiErrorMessage(error, "This run cannot be retried.")),
      },
    );
  };

  const clearWorkflowFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("workflowId");
    setSearchParams(next);
    setPage(0);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Workflows"
        title="Runs"
        description="Every workflow execution with its step counts, approval holds, and failure reasons. Refreshes automatically."
        icon={Play}
      />

      <Toolbar
        trailing={
          <span className="flex items-center gap-2 text-[12px] text-[var(--text3)]">
            {runsQuery.isFetching && <Activity className="size-3 animate-pulse" aria-hidden="true" />}
            {total} run{total === 1 ? "" : "s"}
          </span>
        }
      >
        <FilterSelect
          label="Status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(value) => {
            setStatus(value);
            setPage(0);
          }}
        />
        <FilterSelect
          label="Trigger"
          value={triggerType}
          options={TRIGGER_OPTIONS}
          onChange={(value) => {
            setTriggerType(value);
            setPage(0);
          }}
        />
        {workflowId && (
          <UiButton variant="outline" size="sm" onClick={clearWorkflowFilter}>
            Clear workflow filter
          </UiButton>
        )}
      </Toolbar>

      {runsQuery.isError && (
        <Notice tone="red" icon={AlertTriangle} title="Could not load runs">
          {apiErrorMessage(runsQuery.error)}
        </Notice>
      )}

      <Panel bodyClassName="p-0">
        {runsQuery.isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="h-12 animate-pulse rounded-[9px] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="p-5">
            <EmptyPanel
              icon={Play}
              title="No runs found"
              description="Runs appear once a trigger fires or someone starts a workflow manually."
            />
          </div>
        ) : (
          <RowStack>
            {runs.map((run) => {
              const active = ACTIVE_RUN_STATUSES.includes(run.status);
              const retryable = RETRYABLE_RUN_STATUSES.includes(run.status);
              return (
                <Row key={run.runId} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/automation/runs/${run.runId}`}
                        className="truncate text-[13.5px] font-medium text-[var(--text)] hover:text-[var(--brand)]"
                      >
                        {run.workflowName}
                      </Link>
                      <RunStatusPill status={run.status} />
                    </div>
                    <p className="truncate text-[12px] text-[var(--text3)]">
                      {run.triggerType} · {run.sourceModule} · {run.stepCount} steps
                      {run.failedStepCount > 0 ? ` · ${run.failedStepCount} failed` : ""}
                      {run.pendingApprovalCount > 0 ? ` · ${run.pendingApprovalCount} awaiting approval` : ""}
                    </p>
                    <p className="text-[12px] text-[var(--text3)]">
                      queued <Timestamp value={run.queuedAt} /> · duration{" "}
                      {elapsed(run.startedAt, run.completedAt)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <UiButton
                      variant="outline"
                      size="sm"
                      disabled={!active || cancelRun.isPending}
                      onClick={() => handleCancel(run.runId)}
                    >
                      <Ban className="size-3.5" /> Cancel
                    </UiButton>
                    <UiButton
                      variant="outline"
                      size="sm"
                      disabled={!retryable || retryRun.isPending}
                      onClick={() => handleRetry(run.runId)}
                    >
                      <RotateCcw className="size-3.5" /> Retry
                    </UiButton>
                  </div>
                </Row>
              );
            })}
          </RowStack>
        )}
      </Panel>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[var(--text3)]">
            Showing {page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <UiButton variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="size-3.5" /> Previous
            </UiButton>
            <UiButton variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="size-3.5" />
            </UiButton>
          </div>
        </div>
      )}
    </div>
  );
}
