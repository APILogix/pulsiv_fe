import { Plus, MoreHorizontal } from "lucide-react";
import { useApiKeys } from "@/hooks/useDummyData";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  PageHeader, KpiCard, FillPage, InfiniteTable, StatusBadge, Button, CopyButton, Timestamp, demoAction, demoSuccess, formatCompact,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { ApiKey } from "@/lib/dummy-data";

export default function KeysTokensPage() {
  const { data, isLoading } = useApiKeys();
  const keys = data ?? [];

  const columns: Column<ApiKey>[] = [
    { key: "name", header: "Name", width: "1fr", cell: (k) => <span className="truncate font-medium">{k.name}</span> },
    { key: "key", header: "Key", width: "160px", cell: (k) => <div onClick={(e) => e.stopPropagation()}><CopyButton value={`${k.prefix}_${k.id}`} label={`${k.prefix}••••`} /></div> },
    { key: "type", header: "Type", width: "100px", cell: (k) => <span className="capitalize text-[var(--text2)]">{k.type}</span> },
    { key: "ip", header: "Last used IP", width: "130px", cell: (k) => <span className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{k.lastUsedIp}</span> },
    { key: "used", header: "Last used", width: "130px", cell: (k) => <Timestamp value={k.lastUsedAt} /> },
    { key: "status", header: "Status", width: "110px", cell: (k) => <StatusBadge status={k.status} /> },
    {
      key: "actions",
      header: "",
      width: "60px",
      align: "right" as const,
      cell: (k) => k.status === "active" ? (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => demoSuccess(`Revoked ${k.name}`)} className="text-[var(--red)] focus:text-[var(--red)] focus:bg-[var(--red-bg)]">
                Revoke
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null,
    },
  ];

  return (
    <FillPage>
      <PageHeader
        title="Keys & Tokens"
        description="Key management routed through current org and project APIs."
        actions={<Button variant="primary" onClick={() => demoAction("Generate token")}><Plus className="size-4" /> Generate token</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Keys" value={keys.length} />
        <KpiCard label="Active" value={keys.filter((k) => k.status === "active").length} />
        <KpiCard label="Revoked" value={keys.filter((k) => k.status === "revoked").length} />
        <KpiCard label="Usage / 24h" value={formatCompact(keys.reduce((s, k) => s + k.usage24h, 0))} />
      </div>

      <InfiniteTable className="flex-1" loading={isLoading} items={keys} queryKey={["keysTokens"]} columns={columns} getKey={(k) => k.id} />
    </FillPage>
  );
}
