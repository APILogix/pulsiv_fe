import { useNavigate } from "react-router";
import { Plus, Send, MoreHorizontal } from "lucide-react";
import { useChannels } from "@/hooks/useDummyData";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  PageHeader, KpiCard, FillPage, InfiniteTable, StatusBadge, Button, Timestamp, demoAction, demoSuccess,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { Channel } from "@/lib/dummy-data";

export default function ChannelsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useChannels();
  const channels = data ?? [];

  const columns: Column<Channel>[] = [
    { key: "name", header: "Name", width: "1fr", cell: (c) => <span className="truncate font-medium">{c.name}</span> },
    { key: "type", header: "Type", width: "100px", cell: (c) => <span className="capitalize text-[var(--text2)]">{c.type}</span> },
    { key: "dest", header: "Destination", width: "1fr", cell: (c) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{c.destination}</span> },
    { key: "status", header: "Status", width: "110px", cell: (c) => <StatusBadge status={c.status} /> },
    { key: "tested", header: "Last tested", width: "130px", cell: (c) => <Timestamp value={c.lastTestedAt} /> },
    {
      key: "actions",
      header: "",
      width: "60px",
      align: "right" as const,
      cell: (c) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => demoSuccess(`Test sent to ${c.name}`)}>
                <Send className="mr-2 h-4 w-4" /> Send Test
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <FillPage>
      <PageHeader
        title="Channels"
        description="Email, webhook, and chat notification destinations."
        actions={<Button variant="primary" onClick={() => demoAction("Add channel")}><Plus className="size-4" /> Add channel</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Channels" value={channels.length} />
        <KpiCard label="Active" value={channels.filter((c) => c.status === "active").length} />
        <KpiCard label="Failed" value={channels.filter((c) => c.status === "failed").length} trend="down" />
        <KpiCard label="Verified" value={channels.filter((c) => c.verified).length} />
      </div>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={channels}
        queryKey={["channels"]}
        columns={columns}
        getKey={(c) => c.id}
        onRowClick={(c) => navigate(`/alerts/channels/${c.id}`)}
      />
    </FillPage>
  );
}
