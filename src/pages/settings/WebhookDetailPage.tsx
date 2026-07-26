import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Activity, KeyRound, RotateCw, Trash2, TriangleAlert, Webhook } from "lucide-react";
import { useWebhook } from "@/hooks/useDummyData";
import {
  HeroFacts,
  Notice,
  PageHero,
  Panel,
  Pill,
  SecretField,
  SettingRow,
  Toggle,
  type Crumb,
  type HeroFact,
} from "@/shared/ui/pulse";
import {
  Button,
  DetailSkeleton,
  StatusBadge,
  StatusCodeBadge,
  Table,
  Tabs,
  Td,
  Timestamp,
  Tr,
  demoAction,
  demoSuccess,
  formatLatency,
} from "@/shared/observe";

// ── module-level constants (rules.md §1.2) ──

const DELIVERY_HEADERS = ["Event", "Status", "Latency", "Retries", "Time", ""];

const NOT_FOUND_CRUMBS: Crumb[] = [
  { label: "Connectors" },
  { label: "Webhooks", to: "/connectors/webhooks" },
  { label: "Not found" },
];

export default function WebhookDetailPage() {
  const { webhookId = "" } = useParams();
  const navigate = useNavigate();
  const { data: w, isLoading } = useWebhook(webhookId);

  const [enabled, setEnabled] = useState(true);

  if (isLoading) return <DetailSkeleton />;

  if (!w) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          eyebrow="Developer"
          title="Webhook not found"
          description="This endpoint may have been deleted."
          icon={Webhook}
          breadcrumbs={NOT_FOUND_CRUMBS}
          actions={<Button onClick={() => navigate("/connectors/webhooks")}>Back to webhooks</Button>}
        />
        <Notice tone="red" icon={TriangleAlert} title="Nothing to show">
          We could not load a webhook endpoint with this identifier.
        </Notice>
      </div>
    );
  }

  const attempts = w.deliveryHistory;
  const failures = attempts.filter((attempt) => attempt.statusCode >= 400).length;
  const successRate = attempts.length === 0 ? 100 : ((attempts.length - failures) / attempts.length) * 100;
  const avgLatency =
    attempts.length === 0 ? 0 : attempts.reduce((sum, attempt) => sum + attempt.duration, 0) / attempts.length;

  const crumbs: Crumb[] = [
    { label: "Connectors" },
    { label: "Webhooks", to: "/connectors/webhooks" },
    { label: w.name },
  ];

  const facts: HeroFact[] = [
    { label: "Status", value: <StatusBadge status={w.status} /> },
    { label: "Attempts", value: attempts.length, tone: "brand" },
    { label: "Success rate", value: `${successRate.toFixed(1)}%`, tone: successRate >= 99 ? "green" : "amber" },
    { label: "Average latency", value: formatLatency(avgLatency), tone: "blue" },
  ];

  const deliveryLog = (
    <Table headers={DELIVERY_HEADERS} maxHeight="32rem">
      {attempts.map((attempt) => (
        <Tr key={attempt.id} className={attempt.statusCode >= 400 ? "bg-[var(--red-bg)]" : undefined}>
          <Td className="font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">{attempt.eventType}</Td>
          <Td>
            <StatusCodeBadge code={attempt.statusCode} />
          </Td>
          <Td className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text2)]">
            {formatLatency(attempt.duration)}
          </Td>
          <Td className="font-[family-name:var(--mono)] tabular-nums text-[12px] text-[var(--text2)]">
            {attempt.retryCount}
          </Td>
          <Td>
            <Timestamp value={attempt.timestamp} />
          </Td>
          <Td>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => demoSuccess("Redelivered")}>
                <RotateCw className="size-4" aria-hidden="true" />
                Redeliver
              </Button>
            </div>
          </Td>
        </Tr>
      ))}
    </Table>
  );

  const lastResponse = (
    <Panel title="Last response" description="Body returned by your endpoint on the most recent attempt." icon={Activity}>
      <div className="flex items-center gap-2">
        <StatusCodeBadge code={w.lastDelivery.statusCode} />
        <Timestamp value={w.lastDelivery.timestamp} />
      </div>
      <pre className="mt-3 overflow-x-auto rounded-[10px] border border-[var(--border)] bg-[var(--bg)] p-3 font-[family-name:var(--mono)] text-[12px] leading-relaxed text-[var(--text2)]">
        <code>{w.lastDelivery.responsePreview}</code>
      </pre>
    </Panel>
  );

  const tabs = [
    { id: "deliveries", label: "Delivery log", content: deliveryLog },
    { id: "last", label: "Last response", content: lastResponse },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Webhook endpoint"
        title={w.name}
        description="Signing details, subscribed events, and every delivery attempt for this endpoint."
        icon={Webhook}
        breadcrumbs={crumbs}
        actions={<Button onClick={() => navigate("/connectors/webhooks")}>All endpoints</Button>}
      >
        <HeroFacts facts={facts} />
      </PageHero>

      <Panel title="Endpoint" description="Verify payloads with the signing secret before trusting a request." icon={KeyRound}>
        <div className="flex flex-col gap-4">
          <SecretField label="Endpoint URL" value={w.url} />
          <SecretField label="Signing secret" value={w.secret} masked />
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">
              Subscribed events
            </span>
            <div className="flex flex-wrap gap-1.5">
              {w.events.map((event) => (
                <Pill key={event} tone="ai" className="font-[family-name:var(--mono)] tracking-[0.04em]">
                  {event}
                </Pill>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Delivery settings" description="Control whether Pulsiv sends events to this endpoint." icon={Activity}>
        <SettingRow
          label="Endpoint enabled"
          description="Disable to pause deliveries. The endpoint keeps its secret and event subscriptions."
          htmlFor="webhook-enabled"
        >
          <Toggle
            id="webhook-enabled"
            checked={enabled}
            label="Endpoint enabled"
            onChange={(next) => {
              setEnabled(next);
              demoSuccess(next ? "Endpoint enabled" : "Endpoint disabled");
            }}
          />
        </SettingRow>
      </Panel>

      <Tabs tabs={tabs} />

      <Panel
        danger
        title="Delete this endpoint"
        description="Pulsiv stops delivering events immediately. Delivery history is kept for auditing."
        icon={Trash2}
        footer={
          <Button variant="danger" onClick={() => demoAction("Delete webhook endpoint")}>
            <Trash2 className="size-4" aria-hidden="true" />
            Delete endpoint
          </Button>
        }
      />
    </div>
  );
}
