/**
 * Dead-letter queue — `GET /organizations/:orgId/alerting/dead-letters` plus
 * `/retry` and `DELETE .../:id` (discard). Failed batch jobs land here after
 * pg-boss retries are exhausted.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Inbox, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader, KpiCard, FillPage, Table, Tr, Td, Timestamp, FilterSelect } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  useDeadLetterMutations,
  useDeadLetters,
} from "@/modules/alerting/hooks/useAlerting";
import { apiErrorMessage, ConfirmDialog } from "@/modules/projects/components/project-ui";
import { DeadLetterStatusPill, withAllOption } from "@/modules/alerting/components/alerting-ui";
import { DEAD_LETTER_STATUSES, type AlertDeadLetter, type DeadLetterStatus } from "@/modules/alerting/api/types";

const STATUS_OPTS = withAllOption(DEAD_LETTER_STATUSES, "All statuses");

export default function DeadLettersPage() {
  const [status, setStatus] = useState("");
  const { data, isLoading } = useDeadLetters({
    limit: 100,
    ...(status ? { status: status as DeadLetterStatus } : {}),
  });
  const { retry, discard } = useDeadLetterMutations();
  const [discardTarget, setDiscardTarget] = useState<AlertDeadLetter | null>(null);
  const jobs = data?.data ?? [];

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

  return (
    <FillPage>
      <PageHeader
        title="Dead-letter queue"
        description="Batch jobs that exhausted retries. Inspect, requeue, or discard once recovered another way."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total" value={jobs.length} icon={Inbox} />
        <KpiCard label="Pending retry" value={jobs.filter((j) => j.status === "pending_retry").length} trend={jobs.some((j) => j.status === "pending_retry") ? "down" : "neutral"} />
        <KpiCard label="Exhausted" value={jobs.filter((j) => j.status === "exhausted").length} trend="down" />
        <KpiCard label="Discarded" value={jobs.filter((j) => j.status === "discarded").length} />
      </div>

      <div className="flex">
        <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTS} label="Status" />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => <div key={i} className="loading-skeleton h-11 rounded-[var(--radius)] bg-[var(--bg2)]" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--text3)]">No dead-lettered jobs — the pipeline is healthy.</div>
      ) : (
        <Table headers={["Source queue", "Events", "Error", "Retries", "Failed at", "Status", ""]} maxHeight="calc(100vh - 22rem)">
          {jobs.map((j) => (
            <Tr key={j.id}>
              <Td><span className="font-[family-name:var(--mono)] text-[12px]">{j.sourceQueue}</span></Td>
              <Td><span className="tabular-nums text-[var(--text2)]">{j.eventIds.length}</span></Td>
              <Td><span className="truncate text-[var(--text2)]" title={j.errorMessage ?? undefined}>{j.errorMessage ?? "—"}</span></Td>
              <Td><span className="tabular-nums">{j.retryCount} / {j.maxRetries}</span></Td>
              <Td><Timestamp value={j.createdAt} /></Td>
              <Td><DeadLetterStatusPill status={j.status} /></Td>
              <Td className="text-right">
                <div className="flex justify-end gap-1">
                  {(j.status === "pending_retry" || j.status === "exhausted") && (
                    <UiButton variant="ghost" className="h-8 w-8 p-0" onClick={() => handleRetry(j)} disabled={retry.isPending}>
                      <RotateCcw className="size-4" />
                    </UiButton>
                  )}
                  {j.status !== "discarded" && (
                    <UiButton variant="ghost" className="h-8 w-8 p-0" onClick={() => setDiscardTarget(j)}>
                      <Trash2 className="size-4 text-[var(--red)]" />
                    </UiButton>
                  )}
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      )}

      <ConfirmDialog
        open={!!discardTarget}
        onOpenChange={(open) => !open && setDiscardTarget(null)}
        title="Discard this job?"
        description="The events in this batch will not be retried. Only discard if you've recovered them another way."
        confirmLabel="Discard job"
        pending={discard.isPending}
        onConfirm={handleDiscard}
      />
    </FillPage>
  );
}
