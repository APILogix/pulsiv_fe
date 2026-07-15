import { useParams } from "react-router";
import { PageHeader, FillPage, InfiniteTable } from "@/shared/observe";
import { Badge } from "@/components/ui/badge";

import { useAlertDeliveries } from "@/modules/projects/hooks/useAlertDeliveries";

export default function AlertDeliveryLogsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, isLoading } = useAlertDeliveries(projectId!);

  const columns = [
    {
      key: "time",
      header: "Time",
      width: "200px",
      cell: (d: any) => new Date(d.timestamp).toLocaleString(),
    },
    {
      key: "route",
      header: "Route",
      width: "2fr",
      cell: (d: any) => <span className="font-medium text-[var(--text)]">{d.routeName}</span>,
    },
    {
      key: "target",
      header: "Target",
      width: "150px",
      cell: (d: any) => <Badge variant="secondary" className="capitalize">{d.connectorType}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      width: "150px",
      cell: (d: any) => {
        let color = "var(--text)";
        if (d.status === "delivered") color = "var(--green)";
        if (d.status === "failed") color = "var(--red)";
        if (d.status === "pending") color = "var(--amber)";
        
        return (
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="capitalize">{d.status}</span>
          </div>
        );
      },
    },
    {
      key: "attempts",
      header: "Attempts",
      width: "100px",
      align: "right" as const,
      cell: (d: any) => d.attempts,
    },
    {
      key: "latency",
      header: "Latency",
      width: "100px",
      align: "right" as const,
      cell: (d: any) => d.latency ? `${d.latency}ms` : "-",
    },
  ];

  return (
    <FillPage className="flex flex-col gap-6">
      <PageHeader
        title="Alert Deliveries"
        description="Delivery history for all alerts triggered in this project."
      />
      
      <InfiniteTable
        items={data || []}
        queryKey={["alertDeliveries", projectId]}
        columns={columns}
        getKey={(d) => d.id}
        loading={isLoading}
        emptyMessage="No alert deliveries found."
        className="flex-1"
      />
    </FillPage>
  );
}
