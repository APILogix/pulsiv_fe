import { useState } from "react";
import { MoreHorizontal, RotateCw } from "lucide-react";
import { toast } from "sonner";

import { useDeadLetterMutations, useDeadLetterQueue } from "@/modules/projects/hooks/useDeadLetters";
import { useOrgStore } from "@/modules/organizations/store/org.store";
import { apiErrorMessage, ConfirmDialog } from "@/modules/projects/components/project-ui";
import { PageHeader, SectionCard, Table, Tr, Td, Button, Timestamp, formatNumber } from "@/shared/observe";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function PipelinePage() {
  const projectId = useOrgStore((state) => state.activeProjectId);
  const { data, isLoading, error, refetch } = useDeadLetterQueue(projectId ?? "");
  const mutations = useDeadLetterMutations(projectId ?? "");
  const [purgeOpen, setPurgeOpen] = useState(false);
  const deadLetters = data ?? [];
  const busy = mutations.reprocessAll.isPending || mutations.purgeQueue.isPending;

  const replayAll = () => mutations.reprocessAll.mutate(undefined, {
    onSuccess: (response) => toast.success(`Replayed ${formatNumber(response.data?.data?.reprocessed ?? 0)} notifications`),
    onError: (mutationError) => toast.error(apiErrorMessage(mutationError, "Could not replay notifications.")),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dead-letter queue"
        description="Review failed alert deliveries and send them again after fixing the destination."
        actions={projectId ? <>
          <Button variant="secondary" disabled={!deadLetters.length || busy} onClick={() => setPurgeOpen(true)}>Discard all</Button>
          <Button variant="primary" disabled={!deadLetters.length || busy} onClick={replayAll}>
            <RotateCw className={`size-4 ${mutations.reprocessAll.isPending ? "animate-spin" : ""}`} />
            {mutations.reprocessAll.isPending ? "Replaying…" : "Replay all"}
          </Button>
        </> : undefined}
      />

      {!projectId ? (
        <SectionCard title="Select a project">
          <p className="text-[13px] text-[var(--text2)]">Choose a project to view its failed alert deliveries.</p>
        </SectionCard>
      ) : (
        <>
          <SectionCard title="Dead letters" description={`${formatNumber(deadLetters.length)} waiting for replay or discard`} className="p-0">
            {isLoading ? (
              <p className="p-5 text-[13px] text-[var(--text3)]">Loading failed deliveries…</p>
            ) : error ? (
              <div className="flex items-center justify-between gap-4 p-5">
                <p role="alert" className="text-[13px] text-[var(--red)]">{apiErrorMessage(error, "Could not load failed deliveries.")}</p>
                <Button variant="secondary" onClick={() => void refetch()}>Retry</Button>
              </div>
            ) : deadLetters.length === 0 ? (
              <p className="p-5 text-[13px] text-[var(--text3)]">No failed alert deliveries are waiting.</p>
            ) : (
              <Table headers={["Destination", "Provider", "Failure reason", "Payload", "Failed at", ""]}>
                {deadLetters.map((letter) => {
                  const replaying = mutations.reprocessDeadLetter.isPending && mutations.reprocessDeadLetter.variables === letter.id;
                  return (
                    <Tr key={letter.id}>
                      <Td className="font-medium">{letter.routeName}</Td>
                      <Td className="capitalize text-[var(--text2)]">{letter.target}</Td>
                      <Td className="max-w-[420px] truncate text-[var(--text2)]"><span title={letter.reason}>{letter.reason}</span></Td>
                      <Td className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{letter.payloadSize}</Td>
                      <Td><Timestamp value={letter.timestamp} /></Td>
                      <Td>
                        <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" aria-label={`Actions for ${letter.routeName}`}>
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={busy || replaying}
                                onClick={() => mutations.reprocessDeadLetter.mutate(letter.id, {
                                  onSuccess: () => toast.success(`Replaying delivery to ${letter.routeName}`),
                                  onError: (mutationError) => toast.error(apiErrorMessage(mutationError, "Could not replay this delivery.")),
                                })}
                              >
                                <RotateCw className="mr-2 size-4" /> Replay delivery
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </Table>
            )}
          </SectionCard>
          <div className="flex justify-end">
            <Button variant="ghost" className="text-[var(--red)]" disabled={!deadLetters.length || busy} onClick={() => setPurgeOpen(true)}>
              Discard queue
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={purgeOpen}
        onOpenChange={setPurgeOpen}
        title="Discard every dead letter?"
        description={`${formatNumber(deadLetters.length)} failed ${deadLetters.length === 1 ? "delivery will" : "deliveries will"} be removed and won't be sent again.`}
        confirmLabel="Discard all"
        pending={mutations.purgeQueue.isPending}
        onConfirm={() => mutations.purgeQueue.mutate(undefined, {
          onSuccess: (response) => {
            setPurgeOpen(false);
            toast.success(`Discarded ${formatNumber(response.data?.data?.discarded ?? 0)} deliveries`);
          },
          onError: (mutationError) => toast.error(apiErrorMessage(mutationError, "Could not discard deliveries.")),
        })}
      />
    </div>
  );
}
