import { useState } from "react";
import { Activity, CheckCircle2, Clock, RefreshCcw, Send, XCircle } from "lucide-react";
import { useAlertDeliveries } from "@/modules/projects/hooks/useAlertDeliveries";
import { useCurrentProject } from "./ProjectShellPage";
import {
  IconChip,
  Notice,
  Panel,
  Pill,
  SectionHeading,
  StatCard,
  Toolbar,
  type SurfaceTone,
} from "@/shared/ui/pulse";
import { FilterSelect, Table, Td, Timestamp, Tr } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { apiErrorMessage } from "@/modules/projects/components/project-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const DELIVERY_HEADERS = ["Time", "Route", "Target", "Status", "Attempts", "Latency"];

const STATUS_TONE: Record<string, SurfaceTone> = {
  delivered: "green",
  success: "green",
  failed: "red",
  error: "red",
  pending: "amber",
  retrying: "amber",
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Pending" },
];

// ── page ─────────────────────────────────────────────────────

export default function AlertDeliveryLogsPage() {
  const { projectId } = useCurrentProject();
  const [statusFilter, setStatusFilter] = useState("");
  const { data, isLoading, error, refetch, isFetching } = useAlertDeliveries(projectId, {
    ...(statusFilter ? { status: statusFilter } : {}),
  });

  const items = (data as unknown as Array<Record<string, unknown>>) ?? [];

  const deliveredCount = items.filter((item) => item.status === "delivered" || item.status === "success").length;
  const failedCount = items.filter((item) => item.status === "failed" || item.status === "error").length;
  const pendingCount = items.filter((item) => item.status === "pending" || item.status === "retrying").length;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Alert deliveries"
        description="Delivery history for all alerts triggered in this project. Track success rates, latency, and retry attempts."
        actions={
          <UiButton variant="outline" size="lg" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className="mr-1.5 size-4" /> Refresh
          </UiButton>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total deliveries" value={items.length} icon={Send} tone="brand" />
        <StatCard label="Delivered" value={deliveredCount} icon={CheckCircle2} tone="green" />
        <StatCard label="Failed" value={failedCount} icon={XCircle} tone={failedCount > 0 ? "red" : "neutral"} />
        <StatCard label="Pending" value={pendingCount} icon={Clock} tone={pendingCount > 0 ? "amber" : "neutral"} />
      </div>

      <Toolbar>
        <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTER_OPTIONS} />
      </Toolbar>

      {error && <Notice tone="red">{apiErrorMessage(error)}</Notice>}

      <Panel bodyClassName="p-0">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-10 animate-pulse rounded-[8px] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <IconChip icon={Send} size="lg" tone="brand" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">No alert deliveries found</p>
            <p className="max-w-[46ch] text-[12.5px] text-[var(--text2)]">
              Delivery logs appear when alerts are triggered and routed to channels and connectors.
            </p>
          </div>
        ) : (
          <Table headers={DELIVERY_HEADERS} maxHeight="34rem">
            {items.map((item, index) => {
              const status = String(item.status ?? "unknown");
              return (
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
                    <Pill tone="blue">{String(item.connectorType ?? item.target ?? "-")}</Pill>
                  </Td>
                  <Td>
                    <Pill tone={STATUS_TONE[status] ?? "neutral"} dot>
                      {status}
                    </Pill>
                  </Td>
                  <Td>
                    <span className="text-[12.5px] tabular-nums text-[var(--text2)]">
                      {String(item.attempts ?? "-")}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
                      {item.latency ? `${item.latency}ms` : "-"}
                    </span>
                  </Td>
                </Tr>
              );
            })}
          </Table>
        )}
      </Panel>

      <Panel title="Delivery lifecycle" icon={Activity}>
        <p className="text-[12.5px] leading-relaxed text-[var(--text2)]">
          Each delivery attempt records the target connector, HTTP status, and latency. Failed deliveries are retried
          with exponential backoff. After maximum retries, the message moves to the dead letter queue for manual review.
        </p>
      </Panel>
    </div>
  );
}
