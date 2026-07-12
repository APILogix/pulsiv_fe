import { useActionState } from "react";
import { useNavigate } from "react-router";
import { Activity, AlertCircle, Plus, Webhook } from "lucide-react";

import { useWebhooks } from "@/hooks/useDummyData";
import {
  demoSuccess,
  Field,
  FillPage,
  InfiniteTable,
  inputClass,
  KpiCard,
  PageHeader,
  SectionCard,
  StatusBadge,
  StatusCodeBadge,
  SubmitButton,
  Timestamp,
} from "@/shared/observe";
import type { Column } from "@/shared/observe";
import type { Webhook as WebhookType } from "@/lib/dummy-data";

export default function WebhooksPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useWebhooks();
  const webhooks = data ?? [];

  const activeCount = webhooks.filter((w) => w.status === "active").length;
  const failingCount = webhooks.filter((w) => w.lastDelivery.statusCode >= 400).length;

  const [, createAction] = useActionState(async (_p: unknown, form: FormData) => {
    await new Promise((r) => setTimeout(r, 600));
    demoSuccess(`Webhook created: ${form.get("url")}`);
    return { ok: true };
  }, { ok: false });

  const columns: Column<WebhookType>[] = [
    {
      key: "name",
      header: "Name",
      width: "1fr",
      cell: (w) => <span className="truncate font-medium">{w.name}</span>,
    },
    {
      key: "url",
      header: "URL",
      width: "1fr",
      cell: (w) => (
        <span className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{w.url}</span>
      ),
    },
    {
      key: "events",
      header: "Events",
      width: "90px",
      cell: (w) => (
        <span className="inline-flex items-center rounded-[5px] bg-[var(--blue-bg)] px-2 py-0.5 font-[family-name:var(--mono)] text-[11px] font-medium text-[var(--blue)]">
          {w.events.length}
        </span>
      ),
    },
    {
      key: "last",
      header: "Last delivery",
      width: "180px",
      cell: (w) => (
        <span className="flex items-center gap-2">
          <StatusCodeBadge code={w.lastDelivery.statusCode} />
          <Timestamp value={w.lastDelivery.timestamp} />
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "110px",
      cell: (w) => <StatusBadge status={w.status} />,
    },
  ];

  return (
    <FillPage>
      <PageHeader title="Webhooks" description="Outbound event delivery to your endpoints." />

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KpiCard label="Endpoints" value={webhooks.length} icon={Webhook} />
        <KpiCard label="Active" value={activeCount} delta={`of ${webhooks.length} configured`} icon={Activity} />
        <KpiCard
          label="Failing"
          value={failingCount}
          delta={failingCount > 0 ? "last delivery returned 4xx/5xx" : "all deliveries healthy"}
          trend={failingCount > 0 ? "down" : "up"}
          icon={AlertCircle}
        />
      </div>

      {/* ── Create webhook ── */}
      <SectionCard title="Create webhook">
        <form action={createAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 sm:min-w-[280px]">
            <Field label="Endpoint URL" hint="Pulse will POST signed event payloads to this URL.">
              <input name="url" required placeholder="https://example.com/hooks" className={inputClass} />
            </Field>
          </div>
          <SubmitButton>
            <Plus className="size-4" /> Create
          </SubmitButton>
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
