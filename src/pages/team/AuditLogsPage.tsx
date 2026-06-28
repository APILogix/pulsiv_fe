import { useState } from "react";
import { Download } from "lucide-react";
import { useAuditLogs } from "@/hooks/useDummyData";
import {
  PageHeader, FillPage, FilterBar, SearchInput, FilterSelect, InfiniteTable, Timestamp, Button, demoSuccess,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { AuditLog } from "@/lib/dummy-data";

const ACTION_OPTS = [
  { value: "", label: "All actions" },
  ...["CREATE", "UPDATE", "DELETE", "LOGIN", "EXPORT", "INVITE", "REVOKE"].map((a) => ({ value: a, label: a })),
];

export default function AuditLogsPage() {
  const { data, isLoading } = useAuditLogs();
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  let logs = data ?? [];
  if (action) logs = logs.filter((l) => l.action === action);
  if (query) logs = logs.filter((l) => l.actor.toLowerCase().includes(query.toLowerCase()) || l.resourceName.toLowerCase().includes(query.toLowerCase()));

  const columns: Column<AuditLog>[] = [
    { key: "actor", header: "Actor", width: "1fr", cell: (l) => <span className="truncate text-[var(--text)]">{l.actor}</span> },
    { key: "action", header: "Action", width: "100px", cell: (l) => <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{l.action}</span> },
    { key: "resource", header: "Resource", width: "1fr", cell: (l) => <span className="truncate text-[var(--text2)]">{l.resourceType}: {l.resourceName}</span> },
    { key: "ip", header: "IP", width: "130px", cell: (l) => <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">{l.ipAddress}</span> },
    { key: "time", header: "Time", width: "140px", cell: (l) => <Timestamp value={l.timestamp} /> },
  ];

  return (
    <FillPage>
      <PageHeader
        title="Audit Logs"
        description="Searchable audit trail and export controls."
        actions={<Button variant="secondary" onClick={() => demoSuccess("Export started — CSV will download")}><Download className="size-4" /> Export</Button>}
      />

      <FilterBar onClear={() => { setQuery(""); setAction(""); }}>
        <SearchInput placeholder="Search actor or resource…" onSearch={setQuery} defaultValue={query} />
        <FilterSelect value={action} onChange={setAction} options={ACTION_OPTS} />
      </FilterBar>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={logs}
        queryKey={["auditLogs", action, query]}
        columns={columns}
        getKey={(l) => l.id}
      />
    </FillPage>
  );
}
