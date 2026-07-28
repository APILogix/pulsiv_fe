import { Activity, CheckCircle2, Clock, Send, XCircle } from "lucide-react";
import { useCurrentProject } from "./ProjectShellPage";
import { useAlertDeliveries } from "@/modules/projects/hooks/useAlertDeliveries";
import { IconChip, Panel, Pill, SectionHeading, StatCard, type SurfaceTone } from "@/shared/ui/pulse";
import { Table, Td, Tr } from "@/shared/observe";

// ── module-level constants (rules.md) ────────────────────────

const STATUS_TONE: Record<string, SurfaceTone> = {
  delivered: "green",
  failed: "red",
  pending: "amber",
  retrying: "amber",
};

const TABLE_HEADERS = ["Time", "Route", "Target", "Status", "Attempts", "Latency"];

// ── page ─────────────────────────────────────────────────────

export default function AlertDeliveryLogsPage() {
  const { projectId } = useCurrentProject();
  const { data, isLoading } = useAlertDeliveries(projectId);
  const items = data ?? [];

  const delivered = items.filter((d: any) => d.status === "delivered").length;
  const failed = items.filter((d: any) => d.status === "failed").length;
  const pending = items.filter((d: any) => d.status === "pending" || d.status === "retrying").length;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Alert deliveries"
        description="Delivery history for all alerts triggered in this project. Track delivery success rates and latency."
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total" value={items.length} icon={Send} tone="brand" />
        <StatCard label="Delivered" value={delivered} icon={CheckCircle2} tone="green" />
        <StatCard label="Failed" value={failed} icon={XCircle} tone={failed > 0 ? "red" : "neutral"} />
        <StatCard label="Pending" value={pending} icon={Clock} tone={pending > 0 ? "amber" : "neutral"} />
      </div>

      <Panel bodyClassName="p-0">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="h-10 animate-pulse rounded-[8px] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <IconChip icon={Activity} size="lg" tone="brand" />
            <p className="text-[14px] font-semibold text-[var(--text)]">No deliveries yet</p>
            <p className="max-w-[44ch] text-[13px] text-[var(--text2)]">
              Alert deliveries will appear here once thresholds fire and routes dispatch notifications.
            </p>
          </div>
        ) : (
          <Table headers={TABLE_HEADERS} maxHeight="36rem">
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
                  <span className="rounded-md bg-[var(--bg2)] px-2 py-0.5 text-[11.5px] font-medium capitalize text-[var(--text2)] ring-1 ring-inset ring-[var(--border)]">
                    {d.connectorType}
                  </span>
                </Td>
                <Td>
                  <Pill tone={STATUS_TONE[d.status] ?? "neutral"} dot>
                    {d.status}
                  </Pill>
                </Td>
                <Td>
                  <span className="tabular-nums text-[12.5px] text-[var(--text)]">{d.attempts}</span>
                </Td>
                <Td>
                  <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
                    {d.latency ? `${d.latency}ms` : "-"}
                  </span>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}
