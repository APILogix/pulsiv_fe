import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Activity,
  Clock,
  Mail,
  MessageSquare,
  Play,
  Plug,
  Settings2,
  Slack,
  TriangleAlert,
  Trash2,
  Webhook,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useConnector, useConnectorMutations, useConnectorTestRuns } from "@/modules/organizations/hooks/useConnectors";
import {
  HeroFacts,
  Notice,
  PageHero,
  Panel,
  Pill,
  Row,
  RowStack,
  SecretField,
  SettingRow,
  SetupSteps,
  SplitShell,
  Toggle,
  type Crumb,
  type HeroFact,
  type SetupStepItem,
} from "@/shared/ui/pulse";
import { KeyValueGrid, type KeyValueItem } from "@/shared/ui/pulse";
import { Button, DetailSkeleton, StatusBadge, Tabs, Timestamp, demoSuccess, formatLatency } from "@/shared/observe";
import { IntegrationRoutes } from "./components/IntegrationRoutes";
import { IntegrationDeliveries } from "./components/IntegrationDeliveries";
import { IntegrationAudit } from "./components/IntegrationAudit";

// ── module-level constants (rules.md §1.2) ──

const CONNECTOR_GLYPH: Record<string, LucideIcon> = {
  slack: Slack,
  webhook: Webhook,
  email: Mail,
};

const SECRET_KEY = /token|secret|password|credential|signing/i;
const ENDPOINT_KEY = /url|endpoint|webhook/i;

const NOT_FOUND_CRUMBS: Crumb[] = [
  { label: "Connectors", to: "/connectors/integrations" },
  { label: "Not found" },
];

const HEALTHY_TEST_STATUSES = new Set(["healthy", "success", "ok"]);

function glyphFor(type: string): LucideIcon {
  return CONNECTOR_GLYPH[type] ?? Plug;
}

function humanizeKey(key: string) {
  const spaced = key.replace(/([A-Z])/g, " $1").replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// ── one-off local components ─────────────────────────────────

function ConfigValue({ name, value }: { name: string; value: unknown }) {
  if (typeof value === "boolean") {
    return <Pill tone={value ? "green" : "neutral"}>{value ? "Enabled" : "Disabled"}</Pill>;
  }
  const text = value === null || value === undefined ? "-" : String(value);
  if (SECRET_KEY.test(name)) return <SecretField value={text} masked />;
  if (ENDPOINT_KEY.test(name)) return <SecretField value={text} />;
  return <span className="font-[family-name:var(--mono)] text-[12.5px] text-[var(--text)]">{text}</span>;
}

export default function IntegrationDetailPage() {
  const { integrationId = "" } = useParams();
  const navigate = useNavigate();
  const { data: i, isLoading } = useConnector(integrationId, true);
  const { data: testRunsData } = useConnectorTestRuns(integrationId);
  const { testConnector, sendTest, enableConnector, disableConnector, deleteConnector } = useConnectorMutations();

  const [isTesting, setIsTesting] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this integration?")) {
      try {
        await deleteConnector.mutateAsync(integrationId);
        demoSuccess("Integration deleted successfully");
        navigate("/connectors/integrations");
      } catch (err: any) {
        demoSuccess(`Failed to delete integration: ${err.message}`);
      }
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await testConnector.mutateAsync(integrationId);
      demoSuccess("Test connection successful");
    } catch (err: any) {
      demoSuccess(`Test failed: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendMessage = async () => {
    setIsSending(true);
    try {
      await sendTest.mutateAsync({
        id: integrationId,
        payload: {
          title: "Pulse Integration Test Successful",
          body: "Hello! This is a test message from Pulse. Your integration is correctly configured and ready to receive real alerts.",
        },
      });
      demoSuccess("Test message sent successfully");
    } catch (err: any) {
      demoSuccess(`Failed to send message: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleState = async () => {
    const isActive = i?.status === "active";
    if (isActive) {
      await disableConnector.mutateAsync(integrationId);
      demoSuccess("Connector disabled");
    } else {
      await enableConnector.mutateAsync(integrationId);
      demoSuccess("Connector enabled");
    }
  };

  if (isLoading) return <DetailSkeleton />;

  if (!i) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          eyebrow="Connectors"
          title="Integration not found"
          description="This connector may have been deleted, or it belongs to a different organization."
          icon={Plug}
          breadcrumbs={NOT_FOUND_CRUMBS}
          actions={<Button onClick={() => navigate("/connectors/integrations")}>Back to integrations</Button>}
        />
        <Notice tone="red" icon={TriangleAlert} title="Nothing to show">
          We could not load a connector with this identifier.
        </Notice>
      </div>
    );
  }

  const Glyph = glyphFor(i.type);
  const isActive = i.status === "active";
  const testRuns = testRunsData?.data ?? [];
  const displayConfig: Record<string, unknown> = i.displayConfig || {};
  const configEntries = Object.entries(displayConfig);
  const latestRun = testRuns[0];
  const togglePending = enableConnector.isPending || disableConnector.isPending;

  const crumbs: Crumb[] = [{ label: "Connectors", to: "/connectors/integrations" }, { label: i.name }];

  const facts: HeroFact[] = [
    { label: "Connection", value: <StatusBadge status={i.status} /> },
    {
      label: "Last delivery",
      value: i.health?.lastSuccessfulDeliveryAt ? <Timestamp value={i.health.lastSuccessfulDeliveryAt} /> : "Never",
      tone: i.health?.lastSuccessfulDeliveryAt ? "green" : "neutral",
    },
    {
      label: "Consecutive failures",
      value: i.health?.consecutiveFailures ?? 0,
      tone: (i.health?.consecutiveFailures ?? 0) > 0 ? "red" : "neutral",
      icon: TriangleAlert,
    },
    { label: "Last test", value: latestRun ? <Timestamp value={latestRun.createdAt} /> : "Not run", icon: Clock },
  ];

  const detailItems: KeyValueItem[] = [
    { label: "Type", value: <span className="font-[family-name:var(--mono)] text-[12.5px] uppercase">{i.type}</span> },
    { label: "Created", value: <Timestamp value={i.createdAt} /> },
    {
      label: "Last delivery",
      value: i.health?.lastSuccessfulDeliveryAt ? <Timestamp value={i.health.lastSuccessfulDeliveryAt} /> : "Never",
    },
    { label: "Failure threshold", value: <span className="tabular-nums">{i.health?.failureThreshold ?? "-"}</span> },
  ];

  const setupSteps: SetupStepItem[] = [
    { title: "Create the connector", description: "Credentials are stored encrypted for this organization.", done: true },
    {
      title: "Enable the connection",
      description: "A disabled connector keeps its config but stops receiving deliveries.",
      done: isActive,
    },
    {
      title: "Verify connectivity",
      description: "Run a test connection to confirm Pulsiv can reach the destination.",
      done: testRuns.length > 0,
    },
    {
      title: "Add routing rules",
      description: "Scope which event types, severities, and environments reach this connector.",
      done: false,
    },
  ];

  const overview = (
    <SplitShell
      rail={
        <>
          <Panel title="Connector details" icon={Activity} tone="ai">
            <KeyValueGrid items={detailItems} columns={1} />
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <SecretField label="Connector ID" value={i.id} />
            </div>
          </Panel>
          <Panel title="Setup guide" description="Four steps to a reliable delivery path." icon={Settings2} tone="blue">
            <SetupSteps steps={setupSteps} />
          </Panel>
        </>
      }
    >
      <Panel
        title="Configuration"
        description="Public connection settings. Secrets are stored encrypted and are shown masked."
        icon={Settings2}
        bodyClassName="p-0"
      >
        {configEntries.length === 0 && !i.metadata?.teamName ? (
          <Row>
            <p className="text-[13px] text-[var(--text2)]">This connector has no public configuration to display.</p>
          </Row>
        ) : (
          <RowStack>
            {configEntries.map(([key, value]) => (
              <Row key={key}>
                <SettingRow label={humanizeKey(key)}>
                  <ConfigValue name={key} value={value} />
                </SettingRow>
              </Row>
            ))}
            {i.metadata?.teamName && (
              <Row>
                <SettingRow label="Workspace">
                  <Pill tone="ai">{i.metadata.teamName}</Pill>
                </SettingRow>
              </Row>
            )}
          </RowStack>
        )}
      </Panel>

      <Panel title="Connection state" description="Pause deliveries without losing this configuration." icon={Activity}>
        <SettingRow
          label={isActive ? "Connector enabled" : "Connector disabled"}
          description={
            isActive
              ? "Pulsiv is delivering matching events to this connector."
              : "Deliveries are paused. Existing configuration and routes are preserved."
          }
          htmlFor="connector-enabled"
        >
          <Toggle
            id="connector-enabled"
            checked={isActive}
            disabled={togglePending}
            onChange={handleToggleState}
            label="Connector enabled"
          />
        </SettingRow>
      </Panel>

      <Panel
        title="Recent test runs"
        description="Connectivity checks and the latency Pulsiv measured."
        icon={Clock}
        bodyClassName={testRuns.length === 0 ? undefined : "p-0"}
        actions={
          <Button disabled={isTesting} onClick={handleTest}>
            <Play className="size-4" aria-hidden="true" />
            {isTesting ? "Testing…" : "Test connection"}
          </Button>
        }
      >
        {testRuns.length === 0 ? (
          <p className="text-[13px] text-[var(--text2)]">
            No test runs yet. Run a test connection to record latency and confirm credentials.
          </p>
        ) : (
          <RowStack>
            {testRuns.map((run: any) => (
              <Row key={run.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Pill tone={HEALTHY_TEST_STATUSES.has(run.status) ? "green" : "red"} dot>
                    {run.status}
                  </Pill>
                </div>
                <div className="flex items-center gap-5 text-[12.5px]">
                  <span className="font-[family-name:var(--mono)] tabular-nums text-[var(--text2)]">
                    {run.durationMs ? formatLatency(run.durationMs) : "-"}
                  </span>
                  <Timestamp value={run.createdAt} />
                </div>
              </Row>
            ))}
          </RowStack>
        )}
      </Panel>

      <Panel
        danger
        title="Delete this integration"
        description="Removes the connector, its routing rules, and its stored credentials. Delivery history is retained in the audit log."
        icon={Trash2}
        footer={
          <Button variant="danger" disabled={deleteConnector.isPending} onClick={handleDelete}>
            <Trash2 className="size-4" aria-hidden="true" />
            {deleteConnector.isPending ? "Deleting…" : "Delete integration"}
          </Button>
        }
      />
    </SplitShell>
  );

  const tabs = [
    { id: "overview", label: "Overview", content: overview },
    {
      id: "routes",
      label: i.type === "slack" ? "Channels and routing" : "Routing",
      content: <IntegrationRoutes integrationId={i.id} type={i.type} />,
    },
    { id: "deliveries", label: "Deliveries", content: <IntegrationDeliveries integrationId={i.id} /> },
    { id: "audit", label: "Audit", content: <IntegrationAudit integrationId={i.id} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow={`${i.type} connector`}
        title={i.name}
        description="Configuration, routing rules, delivery history, and the audit trail for this connector."
        icon={Glyph}
        breadcrumbs={crumbs}
        actions={
          <>
            <Button disabled={isSending || !isActive} onClick={handleSendMessage}>
              <MessageSquare className="size-4" aria-hidden="true" />
              {isSending ? "Sending…" : "Send test message"}
            </Button>
            <Button variant="primary" disabled={isTesting} onClick={handleTest}>
              <Play className="size-4" aria-hidden="true" />
              {isTesting ? "Testing…" : "Test connection"}
            </Button>
          </>
        }
      >
        <HeroFacts facts={facts} />
      </PageHero>

      <Tabs tabs={tabs} />
    </div>
  );
}
