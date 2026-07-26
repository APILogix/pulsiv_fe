import { useState } from "react";
import { Loader2, RefreshCcw, Send } from "lucide-react";
import { useConnectorDeliveries, useConnectorMutations } from "@/modules/organizations/hooks/useConnectors";
import { EmptyPanel, Pill, Toolbar, type SurfaceTone } from "@/shared/ui/pulse";
import {
  Button,
  SeverityBadge,
  StatusCodeBadge,
  Table,
  Td,
  Timestamp,
  Tr,
  demoSuccess,
  formatLatency,
  formatNumber,
} from "@/shared/observe";
import { Skeleton } from "@/components/ui/skeleton";

// ── module-level constants (rules.md §1.2) ──

const PAGE_SIZE = 20;

const TABLE_HEADERS = ["Status", "Event", "Severity", "Response", "Latency", "Attempts", "Time", ""];

const SKELETON_ROWS = ["r1", "r2", "r3", "r4", "r5"];

const DELIVERY_TONE: Record<string, SurfaceTone> = {
  sent: "green",
  delivered: "green",
  failed: "red",
  dead_letter: "red",
  pending: "amber",
  retrying: "amber",
  queued: "blue",
};

function deliveryTone(status: string): SurfaceTone {
  return DELIVERY_TONE[status] ?? "neutral";
}

// ── one-off local components ─────────────────────────────────

function DeliverySkeleton() {
  return (
    <div className="divide-y divide-[var(--border)] rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]">
      {SKELETON_ROWS.map((row) => (
        <div key={row} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="ml-auto h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

interface IntegrationDeliveriesProps {
  integrationId: string;
}

export function IntegrationDeliveries({ integrationId }: IntegrationDeliveriesProps) {
  const [page, setPage] = useState(0);
  const limit = PAGE_SIZE;

  const { data: deliveriesData, isLoading } = useConnectorDeliveries(integrationId, { limit, offset: page * limit });
  const { retryDelivery } = useConnectorMutations();

  const [retryingId, setRetryingId] = useState<string | null>(null);

  const deliveries = deliveriesData?.data ?? [];
  const total = deliveriesData?.meta?.total ?? 0;
  const hasMore = (page + 1) * limit < total;

  const handleRetry = async (deliveryId: string) => {
    setRetryingId(deliveryId);
    try {
      await retryDelivery.mutateAsync(deliveryId);
      demoSuccess("Delivery queued for retry");
    } catch (err: any) {
      demoSuccess(`Retry failed: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  const failed = deliveries.filter((delivery: any) => delivery.status === "failed").length;
  const rangeStart = total === 0 ? 0 : page * limit + 1;
  const rangeEnd = Math.min((page + 1) * limit, total);

  return (
    <div className="flex flex-col gap-4">
      <Toolbar
        trailing={
          <span className="font-[family-name:var(--mono)] text-[11.5px] tabular-nums text-[var(--text3)]">
            {rangeStart}-{rangeEnd} of {formatNumber(total)}
          </span>
        }
      >
        <Pill tone="brand">{formatNumber(total)} deliveries</Pill>
        <Pill tone={failed > 0 ? "red" : "neutral"} dot>
          {failed} failed on this page
        </Pill>
      </Toolbar>

      {isLoading && page === 0 ? (
        <DeliverySkeleton />
      ) : deliveries.length === 0 ? (
        <EmptyPanel
          icon={Send}
          title="No deliveries yet"
          description="Every notification Pulsiv sends to this connector is recorded here with its response and latency."
        />
      ) : (
        <>
          <Table headers={TABLE_HEADERS} maxHeight="32rem">
            {deliveries.map((delivery: any) => {
              const isFailed = delivery.status === "failed" || delivery.status === "dead_letter";
              return (
                <Tr key={delivery.id} className={isFailed ? "bg-[var(--red-bg)]" : undefined}>
                  <Td>
                    <Pill tone={deliveryTone(delivery.status)} dot>
                      {String(delivery.status).replace(/_/g, " ")}
                    </Pill>
                  </Td>
                  <Td className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">
                    {delivery.notificationType || "unknown"}
                  </Td>
                  <Td>{delivery.severity ? <SeverityBadge severity={delivery.severity} /> : <span className="text-[var(--text3)]">-</span>}</Td>
                  <Td>
                    {typeof delivery.responseStatusCode === "number" ? (
                      <StatusCodeBadge code={delivery.responseStatusCode} />
                    ) : (
                      <span className="text-[var(--text3)]">-</span>
                    )}
                  </Td>
                  <Td className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
                    {typeof delivery.latencyMs === "number" ? formatLatency(delivery.latencyMs) : "-"}
                  </Td>
                  <Td className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
                    {delivery.attempts ?? 0}
                    {delivery.maxAttempts ? <span className="text-[var(--text3)]">/{delivery.maxAttempts}</span> : null}
                  </Td>
                  <Td>
                    <Timestamp value={delivery.createdAt} />
                  </Td>
                  <Td>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        disabled={retryingId === delivery.id || delivery.status === "pending"}
                        onClick={() => handleRetry(delivery.id)}
                      >
                        {retryingId === delivery.id ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <RefreshCcw className="size-4" aria-hidden="true" />
                        )}
                        Retry
                      </Button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Table>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] px-4 py-3">
            <p className="text-[12px] tabular-nums text-[var(--text3)]">
              Showing {rangeStart} to {rangeEnd} of {formatNumber(total)} deliveries
            </p>
            <div className="flex items-center gap-2">
              <Button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </Button>
              <Button disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
