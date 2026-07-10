import { useParams } from "react-router";
import { PageHeader, FillPage, InfiniteTable, Button } from "@/shared/observe";
import { RotateCcw, Trash } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

import { useDeadLetterQueue, useDeadLetterMutations } from "@/modules/projects/hooks/useDeadLetters";

export default function DeadLetterQueuePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, isLoading } = useDeadLetterQueue(projectId!);
  const mutations = useDeadLetterMutations(projectId!);

  const columns = [
    {
      key: "failed_at",
      header: "Failed At",
      width: "200px",
      cell: (d: any) => new Date(d.timestamp).toLocaleString(),
    },
    {
      key: "route",
      header: "Route",
      width: "1.5fr",
      cell: (d: any) => <span className="font-medium text-[var(--text)]">{d.routeName}</span>,
    },
    {
      key: "target",
      header: "Target",
      width: "150px",
      cell: (d: any) => <Badge variant="secondary" className="capitalize">{d.target}</Badge>,
    },
    {
      key: "reason",
      header: "Reason",
      width: "2fr",
      cell: (d: any) => <span className="text-[var(--red)]">{d.reason}</span>,
    },
    {
      key: "payload",
      header: "Payload",
      width: "100px",
      cell: (d: any) => <code className="font-[family-name:var(--mono)] text-xs text-[var(--text3)]">{d.payloadSize}</code>,
    },
    {
      key: "actions",
      header: "",
      width: "100px",
      align: "right" as const,
      cell: (d: any) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" onClick={async () => {
            await mutations.reprocessDeadLetter.mutateAsync(d.id);
            toast.success("Replayed successfully");
          }}>
            <RotateCcw className="size-4 text-[var(--text)]" />
          </Button>
          <Button variant="ghost" onClick={async () => {
            await mutations.discardDeadLetter.mutateAsync(d.id);
            toast.success("Message discarded");
          }}>
            <Trash className="size-4 text-[var(--red)]" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <FillPage className="flex flex-col gap-6">
      <PageHeader
        title="Dead Letter Queue"
        description="Permanently failed alerts that could not be delivered after maximum retries."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={async () => {
              await mutations.purgeQueue.mutateAsync();
              toast.success("All messages discarded");
            }}>
              Purge Queue
            </Button>
            <Button variant="primary" onClick={async () => {
              await mutations.reprocessAll.mutateAsync();
              toast.success("Replay started");
            }}>
              Replay All
            </Button>
          </div>
        }
      />
      
      <InfiniteTable
        items={data || []}
        queryKey={["dlq", projectId]}
        columns={columns}
        getKey={(d) => d.id}
        loading={isLoading}
        emptyMessage="Dead letter queue is empty. Excellent!"
        className="flex-1"
      />
    </FillPage>
  );
}
