import { useParams, useNavigate } from "react-router";
import { ArrowLeft, RotateCw } from "lucide-react";
import { useWebhook } from "@/hooks/useDummyData";
import {
  PageHeader, SectionCard, StatusBadge, StatusCodeBadge, Tabs, Table, Tr, Td, CopyButton, Button, Timestamp, demoSuccess,
} from "@/shared/observe";

export default function WebhookDetailPage() {
  const { webhookId = "" } = useParams();
  const navigate = useNavigate();
  const { data: w, isLoading } = useWebhook(webhookId);

  if (isLoading) return <div className="p-8 text-[var(--text3)]">Loading webhook…</div>;
  if (!w) return <div className="p-8 text-[var(--text2)]">Webhook not found.</div>;

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back to webhooks</Button>
      <PageHeader
        title={w.name}
        breadcrumbs={[{ label: "Settings" }, { label: "Webhooks" }, { label: w.name }]}
        actions={<StatusBadge status={w.status} />}
      />

      <SectionCard title="Configuration">
        <div className="flex flex-col gap-3 text-[13px]">
          <div className="flex items-center gap-3"><span className="w-24 text-[var(--text3)]">URL</span><code className="font-[family-name:var(--mono)] text-[var(--text)]">{w.url}</code></div>
          <div className="flex items-center gap-3"><span className="w-24 text-[var(--text3)]">Secret</span><CopyButton value={w.secret} label={`${w.secret.slice(0, 12)}••••`} /></div>
          <div className="flex items-center gap-3"><span className="w-24 text-[var(--text3)]">Events</span><span className="flex flex-wrap gap-1.5">{w.events.map((e) => <span key={e} className="rounded bg-[var(--bg3)] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[11px] text-[var(--text2)]">{e}</span>)}</span></div>
        </div>
      </SectionCard>

      <Tabs
        tabs={[
          {
            id: "deliveries",
            label: "Delivery log",
            content: (
              <SectionCard className="p-0">
                <Table headers={["Event", "Status", "Duration", "Retries", "Time", ""]}>
                  {w.deliveryHistory.map((d) => (
                    <Tr key={d.id}>
                      <Td className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{d.eventType}</Td>
                      <Td><StatusCodeBadge code={d.statusCode} /></Td>
                      <Td className="tabular-nums">{d.duration}ms</Td>
                      <Td className="tabular-nums text-[var(--text2)]">{d.retryCount}</Td>
                      <Td><Timestamp value={d.timestamp} /></Td>
                      <Td><Button variant="ghost" onClick={() => demoSuccess("Redelivered")}><RotateCw className="size-3.5" /> Redeliver</Button></Td>
                    </Tr>
                  ))}
                </Table>
              </SectionCard>
            ),
          },
          {
            id: "last",
            label: "Last response",
            content: (
              <SectionCard>
                <div className="flex items-center gap-2"><StatusCodeBadge code={w.lastDelivery.statusCode} /><Timestamp value={w.lastDelivery.timestamp} /></div>
                <pre className="mt-3 rounded-[8px] border border-[var(--border)] bg-[var(--bg)] p-3 font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{w.lastDelivery.responsePreview}</pre>
              </SectionCard>
            ),
          },
        ]}
      />
    </div>
  );
}
