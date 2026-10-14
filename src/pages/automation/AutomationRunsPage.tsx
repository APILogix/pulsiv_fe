/**
 * Runs: `GET /runs` with status, trigger, and `?workflowId=` filters, plus
 * per-row cancel and retry. The list polls because execution happens in a
 * pg-boss worker; the automation module has no websocket or SSE channel.
 */
import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { Ban, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import { FilterSelect, Timestamp, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
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
  ToolbarCount,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { useAutomationScope, useRunMutations, useRuns } from "@/modules/automation/hooks/useAutomation";
import {
  RUN_STATUSES,
  TRIGGER_TYPES,
  type RunListQuery,
  type RunStatus,
  type RunSummary,
  type TriggerType,
} from "@/modules/automation/api/types";
import {
  ACTIVE_RUN_STATUSES,
  CodeChip,
  MONO,
  NoOrgNotice,
  RETRYABLE_RUN_STATUSES,
  RunStatusPill,
  elapsed,
  plural,
  withAllOption,
} from "@/modules/automation/components/automation-ui";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md §1.2) ───────────────────

const PAGE_SIZE = 25;
const STATUS_OPTIONS = withAllOption(RUN_STATUSES, "All statuses");
const TRIGGER_OPTIONS = [
  { value: "", label: "All triggers" },
  ...TRIGGER_TYPES.map((type) => ({ value: type, label: type })),
];

const COLUMNS: SheetColumn[] = [
  { key: "run", header: "Run" },
  { key: "trigger", header: "Trigger", className: `w-[220px] ${HIDE_BELOW_MD}` },
  { key: "steps", header: "Steps", className: `w-[170px] ${HIDE_BELOW_LG}` },
  { key: "duration", header: "Duration", className: `w-[96px] ${HIDE_BELOW_SM}` },
  { key: "status", header: "Status", className: "w-[140px]" },
  { key: "started", header: "Started", className: "w-[130px]", align: "right" },
  { key: "actions", header: "Actions", className: "w-[52px]", srOnly: true },
];

/** `3 · 1 failed · 1 pending`; colour only where a count names a state. */
function StepCounts({ run }: { run: RunSummary }) {
  return (
    <span className={cn("whitespace-nowrap text-[12px] text-[var(--text2)]", MONO)}>
      {formatNumber(run.stepCount)}
      {run.failedStepCount > 0 && (
        <span className="text-[var(--red)]"> · {formatNumber(run.failedStepCount)} failed</span>
      )}
      {run.pendingApprovalCount > 0 && (
        <span className="text-[var(--amber)]"> · {formatNumber(run.pendingApprovalCount)} pending</span>
      )}
    </span>
  );
}

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
    return <NoOrgNotice>Pick an organization to see workflow runs.</NoOrgNotice>;
  }

  const runs = runsQuery.data?.data ?? [];
  const total = runsQuery.data?.total ?? 0;
  const ready = Boolean(runsQuery.data);
  const hasNext = (page + 1) * PAGE_SIZE < total;
  const filtered = Boolean(status || triggerType || workflowId);

  const inFlight = runs.filter((run) => ACTIVE_RUN_STATUSES.includes(run.status)).length;
  const failed = runs.filter((run) => run.status === "failed" || run.status === "timed_out").length;
  const waiting = runs.filter((run) => run.status === "waiting_approval").length;
  const pageScope = `On this page of ${formatNumber(runs.length)}`;

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

  const clearFilters = () => {
    setStatus("");
    setTriggerType("");
    if (workflowId) clearWorkflowFilter();
    else setPage(0);
  };

  const readouts: Readout[] = [
    {
      label: "Total runs",
      value: ready ? formatNumber(total) : "—",
      sub: filtered ? "Matching these filters" : "All recorded runs",
    },
    {
      label: "In flight",
      value: ready ? formatNumber(inFlight) : "—",
      sub: pageScope,
    },
    {
      label: "Failed",
      value: ready ? formatNumber(failed) : "—",
      sub: `${pageScope}, incl. timed out`,
      tone: !ready ? "neutral" : failed > 0 ? "bad" : "good",
    },
    {
      label: "Waiting approval",
      value: ready ? formatNumber(waiting) : "—",
      sub: pageScope,
      tone: ready && waiting > 0 ? "warn" : "neutral",
    },
  ];

  const toolbar = (
    <>
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
        <span className="inline-flex h-9 items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] pl-2.5 pr-1 text-[12px]">
          <span className="text-[var(--text3)]">Workflow</span>
          <span className={cn("text-[var(--text)]", MONO)} title={workflowId}>
            {workflowId.slice(0, 8)}
          </span>
          <button
            type="button"
            onClick={clearWorkflowFilter}
            aria-label="Clear workflow filter"
            className="inline-flex size-6 items-center justify-center rounded-[var(--radius)] text-[var(--text3)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </span>
      )}
      {ready && <ToolbarCount>{plural(total, "run")}</ToolbarCount>}
    </>
  );

  let body: ReactNode;
  if (runsQuery.isLoading || (!runsQuery.data && !runsQuery.isError)) {
    body = <SheetLoading rows={6} label="Loading runs" />;
  } else if (runsQuery.isError) {
    body = (
      <SheetError
        title="Could not load runs"
        message={apiErrorMessage(runsQuery.error, "The runs request failed.")}
        onRetry={() => void runsQuery.refetch()}
      />
    );
  } else if (runs.length === 0 && filtered) {
    body = (
      <SheetEmpty
        title="No runs match these filters"
        description="Try a different status or trigger, or clear the workflow filter."
        action={
          <UiButton variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </UiButton>
        }
      />
    );
  } else if (runs.length === 0) {
    body = (
      <SheetEmpty
        title="No runs yet"
        description="A run is recorded each time a trigger fires or someone starts a workflow manually. Activate a workflow to start seeing runs here."
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Workflow runs, newest first." minWidth={480}>
        {runs.map((run) => {
          const active = ACTIVE_RUN_STATUSES.includes(run.status);
          const retryable = RETRYABLE_RUN_STATUSES.includes(run.status);
          const shortId = run.runId.slice(0, 8);
          return (
            <SheetRow key={run.runId}>
              <SheetCell>
                <RowTitle
                  title={run.workflowName}
                  to={`/automation/runs/${run.runId}`}
                  subtitle={`${shortId} · ${run.sourceModule}`}
                  subtitleMono
                />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD}>
                <CodeChip>{run.triggerType}</CodeChip>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                <StepCounts run={run} />
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
                  {run.startedAt ? (
                    <Timestamp value={run.startedAt} />
                  ) : (
                    <span title="Not started yet; showing when it was queued">
                      <span className="text-[var(--text3)]">Queued </span>
                      <Timestamp value={run.queuedAt} />
                    </span>
                  )}
                </span>
              </SheetCell>
              <SheetCell align="right">
                <RowActions label={`Actions for run ${shortId} of ${run.workflowName}`}>
                  <DropdownMenuItem disabled={!retryable || retryRun.isPending} onSelect={() => handleRetry(run.runId)}>
                    <RotateCcw aria-hidden="true" />
                    {retryable ? "Retry run" : "Retry run (only failed, cancelled, or timed out)"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={!active || cancelRun.isPending}
                    onSelect={() => handleCancel(run.runId)}
                  >
                    <Ban aria-hidden="true" />
                    {active ? "Cancel run" : "Cancel run (already finished)"}
                  </DropdownMenuItem>
                </RowActions>
              </SheetCell>
            </SheetRow>
          );
        })}
      </SheetTable>
    );
  }

  const showFooter = ready && total > 0;

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Runs"
        description="Every workflow execution with its step counts, approval holds, and failure reasons. Refreshes automatically."
      />

      <Readouts cells={readouts} loading={runsQuery.isLoading} label="Runs summary" />

      <Sheet
        label="Workflow runs"
        toolbar={toolbar}
        footer={
          showFooter ? (
            <>
              <span className={MONO}>
                Showing {formatNumber(page * PAGE_SIZE + 1)}–{formatNumber(Math.min(total, (page + 1) * PAGE_SIZE))} of{" "}
                {formatNumber(total)}
              </span>
              {total > PAGE_SIZE && (
                <div className="flex items-center gap-2">
                  <UiButton variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    <ChevronLeft aria-hidden="true" />
                    Previous
                  </UiButton>
                  <UiButton variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage(page + 1)}>
                    Next
                    <ChevronRight aria-hidden="true" />
                  </UiButton>
                </div>
              )}
            </>
          ) : undefined
        }
      >
        {body}
      </Sheet>
    </WorkspacePage>
  );
}
