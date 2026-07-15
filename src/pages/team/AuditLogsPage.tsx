import { useState } from "react";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { orgApi } from "@/modules/organizations/api/org.api";
import { orgQueryKeys, useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import type { AuditLog } from "@/modules/organizations/types/org.types";
import {
  PageHeader, FillPage, FilterBar, FilterSelect, InfiniteTable, Timestamp, Button, StatusBadge,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import { toast } from "sonner";

const ACTION_OPTS = [
  { value: "", label: "All actions" },
  ...["member.invited", "member.removed", "organization.updated", "environment.created", "api_key.created"].map((action) => ({ value: action, label: action })),
];

export default function AuditLogsPage() {
  const { activeOrgId } = useOrganizations();
  const [action, setAction] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: [...orgQueryKeys.auditLogs(activeOrgId!), action],
    queryFn: () => orgApi.listAuditLogs(activeOrgId!, { limit: 100, action: action || undefined }),
    enabled: !!activeOrgId,
  });

  const logs = data?.data ?? [];

  const columns: Column<AuditLog>[] = [
    { key: "actor", header: "Actor", width: "1fr", cell: (log) => <span className="truncate text-[var(--text)]">{log.actorEmail || log.actorUserId || "System"}</span> },
    { key: "action", header: "Action", width: "150px", cell: (log) => <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{log.action}</span> },
    { key: "resource", header: "Entity", width: "1fr", cell: (log) => <span className="truncate text-[var(--text2)]">{log.entityType}: {log.entityName || log.entityId || "Unknown"}</span> },
    { key: "status", header: "Status", width: "100px", cell: (log) => <StatusBadge status={log.status as any} /> },
    { key: "time", header: "Time", width: "140px", cell: (log) => <Timestamp value={new Date(log.createdAt).getTime()} /> },
  ];

  return (
    <FillPage>
      <PageHeader
        title="Audit Logs"
        description="Searchable audit trail and export controls."
        actions={<Button variant="secondary" onClick={async () => {
          if (!activeOrgId) return;
          try {
            const exported = await orgApi.exportAuditLogs(activeOrgId, { action: action || undefined });
            const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `org-audit-logs-${activeOrgId}.json`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success("Audit logs exported");
          } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to export audit logs");
          }
        }}><Download className="mr-2 size-4" /> Export</Button>}
      />

      <FilterBar onClear={() => setAction("")}>
        <FilterSelect value={action} onChange={setAction} options={ACTION_OPTS} />
      </FilterBar>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={logs}
        queryKey={["auditLogs-table", activeOrgId, action]}
        columns={columns}
        getKey={(log) => log.id}
      />
    </FillPage>
  );
}
