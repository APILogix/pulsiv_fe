/**
 * Dead-letter queue: `GET /organizations/:orgId/alerting/dead-letters` plus
 * `/retry` and `DELETE .../:id` (discard). Failed batch jobs land here after
 * pg-boss retries are exhausted.
 */
import { useMemo, useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useDeadLetterMutations, useDeadLetters } from "@/modules/alerting/hooks/useAlerting";
import { DeadLetterStatusPill, withAllOption } from "@/modules/alerting/components/alerting-ui";
import { DEAD_LETTER_STATUSES, type AlertDeadLetter, type DeadLetterStatus } from "@/modules/alerting/api/types";
import { apiErrorMessage, ConfirmDialog } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  ProjectPageHeader,
  Readouts,
  RowActions,
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
import { FilterSelect, Timestamp, formatNumber } from "@/shared/observe";

// ── Module-level constants ───────────────────────────────────

const STATUS_OPTS = withAllOption(DEAD_LETTER_STATUSES, "All statuses");

// The unfiltered list feeds the readouts. With no status filter it shares the
// table's query key, so it adds no request.
const PAGE_LIMIT = 100;
const ALL_QUERY = { limit: PAGE_LIMIT };

const COLUMNS: SheetColumn[] = [
  { key: "job", header: "Source queue" },
  { key: "status", header: "Status", className: "w-[136px]" },
  { key: "events", header: "Events", className: `w-[88px] ${HIDE_BELOW_MD}`, align: "right" },
  { key: "retries", header: "Retries", className: `w-[96px] ${HIDE_BELOW_MD}`, align: "right" },
  { key: "failed", header: "Failed at", className: `w-[120px] ${HIDE_BELOW_LG}` },
  { key: "actions", header: "Actions", srOnly: true, className: "w-[128px]", align: "right" },
];

const MONO_VALUE = "font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]";

const isRetryable = (job: AlertDeadLetter) => job.status === "pending_retry" || job.status === "exhausted";

function countByStatus(jobs: AlertDeadLetter[]): Record<DeadLetterStatus, number> {
  const counts: Record<DeadLetterStatus, number> = { pending_retry: 0, retried: 0, exhausted: 0, discarded: 0 };
  for (const job of jobs) {
    if (job.status in counts) counts[job.status] += 1;
  }
  return counts;
}

// ── Page ─────────────────────────────────────────────────────

export default function DeadLettersPage() {
  const [status, setStatus] = useState("");
  const { data, isLoading, error, refetch } = useDeadLetters({
    limit: PAGE_LIMIT,
    ...(status ? { status: status as DeadLetterStatus } : {}),
  });
  const { data: allData, isLoading: allLoading } = useDeadLetters(ALL_QUERY);
  const { retry, discard } = useDeadLetterMutations();
  const [discardTarget, setDiscardTarget] = useState<AlertDeadLetter | null>(null);
  const jobs = data?.data ?? [];

  const allJobs = useMemo(() => allData?.data ?? [], [allData]);
  const counts = useMemo(() => countByStatus(allJobs), [allJobs]);
  const allTotal = allData?.total ?? allJobs.length;
  const countsPartial = allTotal > allJobs.length;
  const scope = countsPartial ? `In the ${formatNumber(allJobs.length)} loaded` : undefined;

  const handleRetry = (job: AlertDeadLetter) => {
    retry.mutate(job.id, {
      onSuccess: () => toast.success("Job requeued for retry"),
      onError: (err) => toast.error(apiErrorMessage(err, "Could not retry job.")),
    });
  };

  const handleDiscard = () => {
    if (!discardTarget) return;
    discard.mutate(discardTarget.id, {
      onSuccess: () => {
        toast.success("Job discarded");
        setDiscardTarget(null);
      },
      onError: (err) => toast.error(apiErrorMessage(err, "Could not discard job.")),
    });
  };

  // Readings describe the whole queue, never the status filter.
  const readouts: Readout[] = [
    {
      label: "Dead letters",
      value: formatNumber(allTotal),
      sub: countsPartial ? `Status counts use the ${formatNumber(allJobs.length)} loaded` : "Every status",
    },
    {
      label: "Exhausted",
      value: formatNumber(counts.exhausted),
      tone: counts.exhausted > 0 ? "bad" : "neutral",
      sub: scope ?? (counts.exhausted > 0 ? "Retry or discard these" : "None out of retries"),
    },
    {
      label: "Pending retry",
      value: formatNumber(counts.pending_retry),
      tone: counts.pending_retry > 0 ? "warn" : "neutral",
      sub: scope ?? (counts.pending_retry > 0 ? "Waiting for a retry" : "None waiting"),
    },
    {
      label: "Retried",
      value: formatNumber(counts.retried),
      sub: scope ?? "Requeued to the pipeline",
    },
    {
      label: "Discarded",
      value: formatNumber(counts.discarded),
      sub: scope ?? "Will not be retried",
    },
  ];

  const loading = isLoading && !data;
  const loadFailed = Boolean(error) && !data;
  const total = data?.total ?? jobs.length;
  const statusLabel = STATUS_OPTS.find((option) => option.value === status)?.label ?? status;

  let body: ReactNode;
  if (loading) {
    body = <SheetLoading rows={5} label="Loading dead letters" />;
  } else if (loadFailed) {
    body = (
      <SheetError
        title="Could not load dead letters"
        message={apiErrorMessage(error, "The dead-letter queue is unavailable right now.")}
        onRetry={() => void refetch()}
      />
    );
  } else if (jobs.length === 0 && status) {
    body = (
      <SheetEmpty
        title="No jobs match"
        description={`No dead-lettered job has the status “${statusLabel}”.`}
        action={
          <UiButton variant="outline" size="lg" onClick={() => setStatus("")}>
            Clear filters
          </UiButton>
        }
      />
    );
  } else if (jobs.length === 0) {
    body = (
      <SheetEmpty
        title="No dead-lettered jobs"
        description="The pipeline is healthy. A batch job lands here when it fails after its retries are exhausted, so you can requeue or discard it."
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Dead-lettered batch jobs" minWidth={480}>
        {jobs.map((job) => {
          const retrying = retry.isPending && retry.variables === job.id;
          const discarded = job.status === "discarded";
          return (
            <SheetRow key={job.id} muted={discarded}>
              <SheetCell className="max-w-0">
                <div className="min-w-0">
                  <p className="truncate font-[family-name:var(--mono)] text-[12.5px] text-[var(--text)]">{job.sourceQueue}</p>
                  <p className="mt-0.5 truncate text-[12px] text-[var(--text3)]" title={job.errorMessage ?? undefined}>
                    {job.errorMessage ?? "No error message recorded"}
                  </p>
                </div>
              </SheetCell>
              <SheetCell>
                <DeadLetterStatusPill status={job.status} />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD} align="right">
                <span className={MONO_VALUE}>{formatNumber(job.eventIds.length)}</span>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD} align="right">
                <span className={MONO_VALUE}>
                  {job.retryCount}/{job.maxRetries}
                </span>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                <Timestamp value={job.createdAt} />
              </SheetCell>
              <SheetCell align="right">
                <div className="flex items-center justify-end gap-1.5">
                  {isRetryable(job) && (
                    <UiButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetry(job)}
                      disabled={retry.isPending}
                      aria-label={`Retry job from ${job.sourceQueue}`}
                    >
                      <RotateCcw className={retrying ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden="true" />
                      {retrying ? "Retrying" : "Retry"}
                    </UiButton>
                  )}
                  <RowActions label={`Actions for job from ${job.sourceQueue}`}>
                    <DropdownMenuItem variant="destructive" disabled={discarded} onSelect={() => setDiscardTarget(job)}>
                      {discarded ? "Already discarded" : "Discard job"}
                    </DropdownMenuItem>
                  </RowActions>
                </div>
              </SheetCell>
            </SheetRow>
          );
        })}
      </SheetTable>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Dead letters"
        description="Batch jobs that exhausted retries. Inspect, requeue, or discard once recovered another way."
      />

      <Readouts cells={readouts} loading={allLoading && !allData} label="Dead-letter summary" />

      <Sheet
        label="Dead-lettered jobs"
        toolbar={
          <>
            <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTS} label="Status" />
            {!loading && !loadFailed && (
              <ToolbarCount>
                {formatNumber(jobs.length)} {jobs.length === 1 ? "job" : "jobs"}
              </ToolbarCount>
            )}
          </>
        }
        footer={
          total > jobs.length && !loadFailed ? (
            <span>
              Showing <span className="font-[family-name:var(--mono)] tabular-nums">{formatNumber(jobs.length)}</span> of{" "}
              <span className="font-[family-name:var(--mono)] tabular-nums">{formatNumber(total)}</span> jobs
            </span>
          ) : undefined
        }
      >
        {body}
      </Sheet>

      <ConfirmDialog
        open={!!discardTarget}
        onOpenChange={(open) => !open && setDiscardTarget(null)}
        title="Discard this job?"
        description="The events in this batch will not be retried. Only discard if you've recovered them another way."
        confirmLabel="Discard job"
        pending={discard.isPending}
        onConfirm={handleDiscard}
      />
    </WorkspacePage>
  );
}
