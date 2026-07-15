import { useState } from "react";
import { Loader2, RefreshCcw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useConnectorDeliveries, useConnectorMutations } from "@/modules/organizations/hooks/useConnectors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Timestamp, demoSuccess } from "@/shared/observe";

interface IntegrationDeliveriesProps {
  integrationId: string;
}

export function IntegrationDeliveries({ integrationId }: IntegrationDeliveriesProps) {
  const [page, setPage] = useState(0);
  const limit = 20;
  
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

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card>
        <CardHeader>
          <CardTitle>Deliveries</CardTitle>
          <CardDescription>
            History of payloads sent to this integration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && page === 0 ? (
            <div className="py-8 text-center text-[var(--text2)] flex items-center justify-center">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : deliveries.length === 0 ? (
            <div className="py-8 text-center text-[var(--text2)] border border-dashed border-[var(--border)] rounded-xl bg-[var(--bg2)]/50">
              <Clock className="size-8 mx-auto mb-3 text-[var(--text3)] opacity-50" />
              <p>No deliveries found.</p>
              <p className="text-xs mt-1">When Pulse sends a notification to this integration, it will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-md border border-[var(--border)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg2)] border-b border-[var(--border)]">
                    <tr>
                      <th className="h-10 px-4 text-left font-medium text-[var(--text2)]">Status</th>
                      <th className="h-10 px-4 text-left font-medium text-[var(--text2)]">Type</th>
                      <th className="h-10 px-4 text-left font-medium text-[var(--text2)]">Time</th>
                      <th className="h-10 px-4 text-right font-medium text-[var(--text2)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((delivery: any) => (
                      <tr key={delivery.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg2)]/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {delivery.status === 'sent' ? (
                              <CheckCircle2 className="size-4 text-green-500" />
                            ) : delivery.status === 'failed' ? (
                              <XCircle className="size-4 text-red-500" />
                            ) : (
                              <Loader2 className="size-4 text-blue-500 animate-spin" />
                            )}
                            <span className="capitalize">{delivery.status}</span>
                          </div>
                        </td>
                        <td className="p-4 text-[var(--text2)]">{delivery.notificationType || 'Unknown'}</td>
                        <td className="p-4 text-[var(--text2)]">
                          <Timestamp value={delivery.createdAt} />
                        </td>
                        <td className="p-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRetry(delivery.id)}
                            disabled={retryingId === delivery.id || delivery.status === 'pending'}
                            className="text-[var(--text2)] hover:text-[var(--text)]"
                          >
                            {retryingId === delivery.id ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4 mr-2" />}
                            Retry
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--text3)]">
                  Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} deliveries
                </p>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(0, p - 1))} 
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => p + 1)} 
                    disabled={!hasMore}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
