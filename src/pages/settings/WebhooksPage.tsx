import { useActionState } from "react";
import { useNavigate } from "react-router";
import { Webhook, Plus } from "lucide-react";
import { useWebhooks } from "@/hooks/useDummyData";
import {
  PageHeader, FillPage, SectionCard, InfiniteTable, StatusBadge, StatusCodeBadge, Field, SubmitButton, inputClass, Timestamp, demoSuccess,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { Webhook as WebhookType } from "@/lib/dummy-data";

export default function WebhooksPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useWebhooks();
  const webhooks = data ?? [];

  const [, createAction] = useActionState(async (_p: unknown, form: FormData) => {
    await new Promise((r) => setTimeout(r, 600));
    demoSuccess(`Webhook created: ${form.get("url")}`);
    return { ok: true };
  }, { ok: false });

  const columns: Column<WebhookType>[] = [
    { key: "name", header: "Name", width: "1fr", cell: (w) => <span className="truncate font-medium">{w.name}</span> },
    { key: "url", header: "URL", width: "1fr", cell: (w) => <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{w.url}</span> },
    { key: "events", header: "Events", width: "80px", cell: (w) => <span className="text-[var(--text2)]">{w.events.length}</span> },
    { key: "last", header: "Last delivery", width: "180px", cell: (w) => <span className="flex items-center gap-2"><StatusCodeBadge code={w.lastDelivery.statusCode} /><Timestamp value={w.lastDelivery.timestamp} /></span> },
    { key: "status", header: "Status", width: "110px", cell: (w) => <StatusBadge status={w.status} /> },
  ];

  return (
    <FillPage>
      <PageHeader title="Webhooks" description="Outbound event delivery to your endpoints." actions={<span className="text-[12px] text-[var(--text3)]"><Webhook className="mr-1 inline size-4" />{webhooks.length} configured</span>} />

      <SectionCard title="Create webhook">
        <form action={createAction} className="flex items-end gap-3">
          <div className="min-w-[280px] flex-1"><Field label="Endpoint URL"><input name="url" required placeholder="https://example.com/hooks" className={inputClass} /></Field></div>
          <SubmitButton><Plus className="size-4" /> Create</SubmitButton>
        </form>
      </SectionCard>

      <InfiniteTable
        className="flex-1"
        loading={isLoading}
        items={webhooks}
        queryKey={["webhooks"]}
        columns={columns}
        getKey={(w) => w.id}
        onRowClick={(w) => navigate(`/settings/webhooks/${w.id}`)}
      />
    </FillPage>
  );
}
