import { Plus } from "lucide-react";
import { useApiKeys } from "@/hooks/useDummyData";
import {
  PageHeader, FillPage, InfiniteTable, StatusBadge, Button, CopyButton, Timestamp, demoAction, demoSuccess, formatCompact,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { ApiKey } from "@/lib/dummy-data";

export default function ProjectApiKeysPage() {
  const { data, isLoading } = useApiKeys();
  const keys = data ?? [];

  const columns: Column<ApiKey>[] = [
    { key: "name", header: "Name", width: "1fr", cell: (k) => <span className="truncate font-medium">{k.name}</span> },
    { key: "key", header: "Key", width: "160px", cell: (k) => <div onClick={(e) => e.stopPropagation()}><CopyButton value={`${k.prefix}_${k.id}`} label={`${k.prefix}••••`} /></div> },
    { key: "type", header: "Type", width: "110px", cell: (k) => <span className="capitalize text-[var(--text2)]">{k.type}</span> },
    { key: "used", header: "Last used", width: "130px", cell: (k) => <Timestamp value={k.lastUsedAt} /> },
    { key: "usage", header: "Usage 24h", width: "100px", align: "right", cell: (k) => <span className="tabular-nums">{formatCompact(k.usage24h)}</span> },
    { key: "status", header: "Status", width: "110px", cell: (k) => <StatusBadge status={k.status} /> },
    { key: "actions", header: "", width: "100px", cell: (k) => (k.status === "active" ? <div onClick={(e) => e.stopPropagation()}><Button variant="danger" onClick={() => demoSuccess(`Revoked ${k.name}`)}>Revoke</Button></div> : null) },
  ];

  return (
    <FillPage>
      <PageHeader
        title="API Keys"
        description="Manage project ingestion and SDK keys."
        actions={<Button variant="primary" onClick={() => demoAction("Create API key")}><Plus className="size-4" /> Create key</Button>}
      />
      <InfiniteTable className="flex-1" loading={isLoading} items={keys} queryKey={["projectApiKeys"]} columns={columns} getKey={(k) => k.id} />
    </FillPage>
  );
}
