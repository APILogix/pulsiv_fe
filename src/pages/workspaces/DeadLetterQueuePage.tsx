import { useState } from "react";
import { AlertTriangle, Inbox, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDeadLetterQueue, useDeadLetterMutations } from "@/modules/projects/hooks/useDeadLetters";
import { useCurrentProject } from "./ProjectShellPage";
import {
  IconChip,
  Notice,
  Panel,
  Pill,
  SectionHeading,
  StatCard,
} from "@/shared/ui/pulse";
import { Table, Td, Timestamp, Tr } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog, apiErrorMessage } from "@/modules/projects/components/project-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const DLQ_HEADERS = ["Failed at", "Route", "Target", "Reason", "Payload", ""];

// ── page ─────────────────────────────────────────────────────

export default function DeadLetterQueuePage() {
  const { projectId } = useCurrentProject();
  const { data, isLoading, error } = useDeadLetterQueue(projectId);
  const mutations = useDeadLetterMutations(projectId);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [confirmReplayAll, setConfirmReplayAll] = useState(false);

  const items = (data as unknown as Array<Record<string, unknown>>) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Dead letter queue"
        description="Permanently failed alerts that could not be delivered after maximum retries. Replay or discard messages individually, or act on the entire queue."
        actions={
          <div className="flex items-center gap-2">
            <UiButton
              variant="outline"
              size="lg"
              onClick={() => setConfirmPurge(true)}
              disabled={items.length === 0}
            >
              <Trash2 className="mr-1.5 size-4" /> Purge queue
            </UiButton>
            <UiButton
              size="lg"
              onClick={() => setConfirmReplayAll(true)}
              disabled={items.length === 0}
            >
              <RotateCcw className="mr-1.5 size-4" /> Replay all
            </UiButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard label="Dead letters" value={items.length} icon={Inbox} tone={items.length > 0 ? "red" : "neutral"} />
        <StatCard label="Oldest message" value={items.length > 0 ? "pending review" : "none"} icon={AlertTriangle} tone={items.length > 0 ? "amber" : "neutral"} />
        <StatCard label="Status" value={items.length === 0 ? "Healthy" : "Needs attention"} icon={AlertTriangle} tone={items.length > 0 ? "red" : "green"} />
      </div>

      {error && <Notice tone="red">{apiErrorMessage(error)}</Notice>}

      <Panel bodyClassName="p-0">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-10 animate-pulse rounded-[8px] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <IconChip icon={Inbox} size="lg" tone="green" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">Dead letter queue is empty</p>
            <p className="max-w-[46ch] text-[12.5px] text-[var(--text2)]">
              All alert deliveries are succeeding. Failed messages will appear here for manual review.
            </p>
          </div>
        ) : (
          <Table headers={DLQ_HEADERS} maxHeight="34rem">
            {items.map((item, index) => (
              <Tr key={String(item.id ?? index)} className={index % 2 === 1 ? "bg-[var(--bg2)]/30" : undefined}>
                <Td>
                  {item.timestamp ? (
                    <Timestamp value={String(item.timestamp)} />
                  ) : (
                    <span className="text-[12px] text-[var(--text3)]">-</span>
                  )}
                </Td>
                <Td>
                  <span className="text-[13px] font-medium text-[var(--text)]">
                    {String(item.routeName ?? "-")}
                  </span>
                </Td>
                <Td>
                  <Pill tone="blue">{String(item.target ?? "-")}</Pill>
                </Td>
                <Td>
                  <span className="text-[12.5px] text-[var(--red)]">
                    {String(item.reason ?? "-")}
                  </span>
                </Td>
                <Td>
                  <code className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
                    {String(item.payloadSize ?? "-")}
                  </code>
                </Td>
                <Td className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <UiButton variant="ghost" size="icon-sm" aria-label="Message actions">
                        <MoreHorizontal className="size-4" />
                      </UiButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            await mutations.reprocessDeadLetter.mutateAsync(String(item.id));
                            toast.success("Replayed successfully");
                          } catch (err) {
                            toast.error(apiErrorMessage(err));
                          }
                        }}
                      >
                        <RotateCcw className="mr-2 size-4" /> Replay message
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            await mutations.discardDeadLetter.mutateAsync(String(item.id));
                            toast.success("Message discarded");
                          } catch (err) {
                            toast.error(apiErrorMessage(err));
                          }
                        }}
                        className="text-[var(--red)] focus:text-[var(--red)]"
                      >
                        <Trash2 className="mr-2 size-4" /> Discard message
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Panel>

      {/* Confirm purge */}
      <ConfirmDialog
        open={confirmPurge}
        onOpenChange={(open) => !open && setConfirmPurge(false)}
        title="Purge dead letter queue?"
        description="All failed messages will be permanently discarded. This action cannot be undone."
        confirmLabel="Purge all messages"
        pending={mutations.purgeQueue.isPending}
        onConfirm={async () => {
          await mutations.purgeQueue.mutateAsync();
          toast.success("All messages discarded");
          setConfirmPurge(false);
        }}
      />

      {/* Confirm replay all */}
      <ConfirmDialog
        open={confirmReplayAll}
        onOpenChange={(open) => !open && setConfirmReplayAll(false)}
        title="Replay all dead letters?"
        description="Every failed message will be re-submitted for delivery. Messages that fail again will return to the queue."
        confirmLabel="Replay all"
        pending={mutations.reprocessAll.isPending}
        onConfirm={async () => {
          await mutations.reprocessAll.mutateAsync();
          toast.success("Replay started");
          setConfirmReplayAll(false);
        }}
      />
    </div>
  );
}
