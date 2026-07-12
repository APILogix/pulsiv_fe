import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Globe, RotateCw, Send, Webhook } from "lucide-react";
import { useWebhook } from "@/hooks/useDummyData";
import {
  PageHeader,
  SectionCard,
  StatusBadge,
  StatusCodeBadge,
  Tabs,
  Table,
  Tr,
  Td,
  CopyButton,
  Button,
  Timestamp,
  demoSuccess,
  DetailSkeleton,
} from "@/shared/observe";
import { HeroPanel, IconTile, StatChip, EmptyState } from "@/shared/observe/settings";

export default function WebhookDetailPage() {
  const { webhookId = "" } = useParams();
  const navigate = useNavigate();
  const { data: w, isLoading } = useWebhook(webhookId);

  if (isLoading) return <DetailSkeleton />;
  if (!w) {
    return (
      <div className="p-8">
        <EmptyState
          icon={Webhook}
          message="Webhook not found. This endpoint may have been removed."
          action={
            <Button variant="secondary" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-3.5" /> Back to webhooks
            </Button>
          }
        />
      </div>
    );
  }

  const total = w.deliveryHistory.length;
  const failed = w.deliveryHistory.filter((d) => d.statusCode >= 400).length;
  const successRate = total ? Math.round(((total - failed) / total) * 100) : 100;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" /> Back to webhooks
        </Button>
      </div>

      <PageHeader
        title={w.name}
        breadcrumbs={[{ label: "Settings" }, { label: "Webhooks" }, { label: w.name }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={w.status} />
            <Button variant="secondary" onClick={() => demoSuccess("Test event sent")}>
              <Send className="size-3.5" /> Send test
            </Button>
          </div>
        }
      />

      {/* Hero: endpoint identity + health at a glance */}
      <HeroPanel>
        <div className="flex flex-wrap items-start gap-4">
          <IconTile icon={Webhook} tone={w.status === "active" ? "green" : "neutral"} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-1.5 text-[13px] text-[var(--text2)]">
              <Globe className="size-3.5 shrink-0 text-[var(--text3)]" />
              <code className="truncate font-[family-name:var(--mono)] text-[var(--text)]">{w.url}</code>
              <CopyButton value={w.url} />
            </div>
            <div className="flex items-center gap-3 text-[13px]">
              <span className="text-[var(--text3)]">Secret</span>
              <CopyButton value={w.secret} label={`${w.secret.slice(0, 12)}••••`} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {w.events.map((e) => (
                <span
                  key={e}
                  className="rounded bg-[var(--bg3)] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[11px] text-[var(--text2)]"
                >
                  {e}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatChip label="Deliveries" value={String(total)} />
          <StatChip
            label="Success rate"
            value={`${successRate}%`}
            tone={successRate >= 95 ? "success" : successRate >= 80 ? "warning" : "danger"}
          />
          <StatChip label="Failed" value={String(failed)} tone={failed ? "danger" : "default"} />
          <StatChip label="Events" value={String(w.events.length)} />
        </div>
      </HeroPanel>

      <Tabs
        tabs={[
          {
            id: "deliveries",
            label: "Delivery log",
            content: (
              <SectionCard className="p-0">
                {w.deliveryHistory.length === 0 ? (
                  <EmptyState
                    icon={Send}
                    message="No deliveries yet. Deliveries will appear here once events are sent to this endpoint."
                    action={
                      <Button variant="secondary" onClick={() => demoSuccess("Test event sent")}>
                        <Send className="size-3.5" /> Send test event
                      </Button>
                    }
                  />
                ) : (
                  <Table headers={["Event", "Status", "Duration", "Retries", "Time", ""]}>
                    {w.deliveryHistory.map((d) => (
                      <Tr key={d.id}>
                        <Td className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{d.eventType}</Td>
                        <Td><StatusCodeBadge code={d.statusCode} /></Td>
                        <Td className="tabular-nums">{d.duration}ms</Td>
                        <Td className="tabular-nums text-[var(--text2)]">{d.retryCount}</Td>
                        <Td><Timestamp value={d.timestamp} /></Td>
                        <Td>
                          <Button variant="ghost" onClick={() => demoSuccess("Redelivered")}>
                            <RotateCw className="size-3.5" /> Redeliver
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Table>
                )}
              </SectionCard>
            ),
          },
          {
            id: "last",
            label: "Last response",
            content: (
              <SectionCard>
                <div className="flex items-center gap-2">
                  <StatusCodeBadge code={w.lastDelivery.statusCode} />
                  <Timestamp value={w.lastDelivery.timestamp} />
                </div>
                <pre className="mt-3 overflow-x-auto rounded-[8px] border border-[var(--border)] bg-[var(--bg)] p-3 font-[family-name:var(--mono)] text-[12px] leading-relaxed text-[var(--text2)]">{w.lastDelivery.responsePreview}</pre>
              </SectionCard>
            ),
          },
        ]}
      />
    </div>
  );
}
