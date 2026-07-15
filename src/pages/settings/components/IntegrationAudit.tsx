import { useState } from "react";
import { Loader2, Activity } from "lucide-react";
import { useConnectorAudit } from "@/modules/organizations/hooks/useConnectors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Timestamp } from "@/shared/observe";

interface IntegrationAuditProps {
  integrationId: string;
}

export function IntegrationAudit({ integrationId }: IntegrationAuditProps) {
  const [page, setPage] = useState(0);
  const limit = 20;
  
  const { data: auditData, isLoading } = useConnectorAudit(integrationId, { limit, offset: page * limit });
  const logs = auditData?.data ?? [];
  const total = auditData?.meta?.total ?? 0;
  const hasMore = (page + 1) * limit < total;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
          <CardDescription>
            History of configuration changes and lifecycle events for this integration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && page === 0 ? (
            <div className="py-8 text-center text-[var(--text2)] flex items-center justify-center">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-[var(--text2)] border border-dashed border-[var(--border)] rounded-xl bg-[var(--bg2)]/50">
              <Activity className="size-8 mx-auto mb-3 text-[var(--text3)] opacity-50" />
              <p>No audit events found.</p>
              <p className="text-xs mt-1">Changes to this integration will be recorded here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-md border border-[var(--border)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg2)] border-b border-[var(--border)]">
                    <tr>
                      <th className="h-10 px-4 text-left font-medium text-[var(--text2)]">Action</th>
                      <th className="h-10 px-4 text-left font-medium text-[var(--text2)]">Actor</th>
                      <th className="h-10 px-4 text-left font-medium text-[var(--text2)]">Changes</th>
                      <th className="h-10 px-4 text-right font-medium text-[var(--text2)]">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log: any) => (
                      <tr key={log.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg2)]/50 transition-colors">
                        <td className="p-4">
                          <span className="font-medium text-[var(--text)] capitalize">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-[var(--text2)]">
                          {log.actorId ? (
                            <span className="font-mono text-xs truncate max-w-[120px] inline-block" title={log.actorId}>
                              {log.actorId}
                            </span>
                          ) : (
                            <span className="italic">System</span>
                          )}
                        </td>
                        <td className="p-4 text-[var(--text2)] text-xs">
                          {log.changesSummary ? (
                            <pre className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap bg-[var(--bg2)] px-2 py-1 rounded">
                              {JSON.stringify(log.changesSummary)}
                            </pre>
                          ) : (
                            <span className="text-[var(--text3)]">-</span>
                          )}
                        </td>
                        <td className="p-4 text-right text-[var(--text2)] whitespace-nowrap">
                          <Timestamp value={log.createdAt} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--text3)]">
                  Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} events
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
