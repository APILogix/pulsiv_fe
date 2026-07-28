import { Inbox, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentProject } from "./ProjectShellPage";
import { useDeadLetterQueue, useDeadLetterMutations } from "@/modules/projects/hooks/useDeadLetters";
import { IconChip, Notice, Panel, Pill, SectionHeading, StatCard } from "@/shared/ui/pulse";
import { Table, Td, Tr } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── module-level constants (rules.md) ────────────────────────

const DLQ_HEADERS = ["Failed at", "Route", "Target", "Reason", "Payload", ""];

// ── page ─────────────────────────────────────────────────────

export default function DeadLetterQueuePage() {
  const { projectId } = useCurrentProject();
  const { data, isLoading } = useDeadLetterQueue(projectId);
  const mutations = useDeadLetterMutations(projectId);
  const items = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Dead letter queue"
        description="Notifications that exhausted every retry attempt. Replay to re-attempt delivery or discard to clear."
        actions={
          <div className="flex items-center gap-2">
            <UiButton
              variant="outline"
              size="lg"
              onClick={async () => {
                await mutations.purgeQueue.mutateAsync();
                toast.success("Queue purged");
              }}
              disabled={items.length === 0 || mutations.purgeQueue.isPending}
            >
              <Trash2 className="mr-1.5 size-4" /> Purge all
            </UiButton>
            <UiButton
              size="lg"
              onClick={async () => {
                await mutations.reprocessAll.mutateAsync();
                toast.success("Replay started");
              }}
              disabled={items.length === 0 || mutations.reprocessAll.isPending}
            >
              <RotateCcw className="mr-1.5 size-4" /> Replay all
            </UiButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard label="Queued" value={items.length} icon={Inbox} tone={items.length > 0 ? "red" : "green"} />
        <StatCard
          label="Status"
          value={items.length === 0 ? "Clear" : "Attention needed"}
          icon={Inbox}
          tone={items.length === 0 ? "green" : "amber"}
        />
      </div>

      {items.length === 0 && !isLoading && (
        <Notice tone="green" title="Queue is empty">
          All notifications were delivered successfully. Nothing requires attention.
        </Notice>
      )}

      <Panel bodyClassName="p-0">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-10 animate-pulse rounded-[8px] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <IconChip icon={Inbox} size="lg" tone="green" />
            <p className="text-[14px] font-semibold text-[var(--text)]">Dead letter queue is empty</p>
            <p className="text-[13px] text-[var(--text2)]">All alert notifications were delivered successfully.</p>
          </div>
        ) : (
          <Table headers={DLQ_HEADERS} maxHeight="36rem">
            {items.map((d: any) => (
              <Tr key={d.id}>
                <Td>
                  <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">
                    {new Date(d.timestamp).toLocaleString()}
                  </span>
                </Td>
                <Td>
                  <span className="text-[13px] font-medium text-[var(--text)]">{d.routeName}</span>
                </Td>
                <Td>
                  <Pill tone="neutral">{d.target}</Pill>
                </Td>
                <Td>
                  <span className="text-[12.5px] text-[var(--red)]">{d.reason}</span>
                </Td>
                <Td>
                  <code className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
                    {d.payloadSize}
                  </code>
                </Td>
                <Td className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <UiButton variant="ghost" size="icon-sm" aria-label="Actions">
                        <MoreHorizontal className="size-4" />
                      </UiButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={async () => {
                          await mutations.reprocessDeadLetter.mutateAsync(d.id);
                          toast.success("Replayed successfully");
                        }}
                      >
                        <RotateCcw className="mr-2 size-4" /> Replay message
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={async () => {
                          await mutations.discardDeadLetter.mutateAsync(d.id);
                          toast.success("Message discarded");
                        }}
                        className="text-[var(--red)]"
                      >
                        <Trash2 className="mr-2 size-4" /> Discard
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}
