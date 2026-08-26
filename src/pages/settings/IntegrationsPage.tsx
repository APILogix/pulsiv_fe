import { useActionState, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Cable, Mail, Plug, Plus, ScrollText, Slack, TriangleAlert, Webhook } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useConnectors, useConnectorTypes, useConnectorMutations } from "@/modules/organizations/hooks/useConnectors";
import {
  EmptyPanel,
  HeroFacts,
  Notice,
  PageHero,
  Panel,
  Pill,
  SectionHeading,
  fieldInputClass,
  type HeroFact,
} from "@/shared/ui/pulse";
import { Button, CardSkeleton, Field, StatusBadge, SubmitButton, Timestamp, demoSuccess } from "@/shared/observe";
import { ConnectorIcon } from "@/shared/ui/connector-icon";

// ── module-level constants (rules.md §1.2 — no inline objects/arrays in JSX) ──

const CATALOG_ANCHOR = "connector-catalog";

const CONNECTOR_GLYPH: Record<string, LucideIcon> = {
  slack: Slack,
  webhook: Webhook,
  email: Mail,
};

const SKELETON_SLOTS = ["a", "b", "c"];

const HEALTHY_STATUS = "active";

interface CreateState {
  error: string | null;
}

const INITIAL_CREATE_STATE: CreateState = { error: null };

function glyphFor(type: string): LucideIcon {
  return CONNECTOR_GLYPH[type] ?? Plug;
}

// ── one-off local components ─────────────────────────────────

function ConnectorTile({ type }: { type: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)]"
    >
      <ConnectorIcon type={type} className="size-5" />
    </span>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function GridSkeleton() {
  return (
    <CardGrid>
      {SKELETON_SLOTS.map((slot) => (
        <CardSkeleton key={slot} />
      ))}
    </CardGrid>
  );
}

function ConnectorCardShell({ children }: { children: React.ReactNode }) {
  return (
    <article className="pulse-edge pulse-lift flex flex-col justify-between gap-5 rounded-[14px] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-colors hover:border-[var(--border2)]">
      {children}
    </article>
  );
}

function ConnectedConnectorCard({
  connector,
  onConfigure,
}: {
  connector: any;
  onConfigure: (id: string) => void;
}) {
  return (
    <ConnectorCardShell>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <ConnectorTile type={connector.type} />
            <div className="min-w-0">
              <p className="font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--text3)]">
                {connector.type}
              </p>
              <h3 className="mt-1 truncate text-[14px] font-semibold text-[var(--text)]">{connector.name}</h3>
            </div>
          </div>
          <StatusBadge status={connector.status} />
        </div>
        <dl className="flex flex-col gap-1.5 border-t border-[var(--border)] pt-3 text-[12.5px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--text3)]">Last delivery</dt>
            <dd>
              {connector.health?.lastSuccessfulDeliveryAt ? (
                <Timestamp value={connector.health.lastSuccessfulDeliveryAt} />
              ) : (
                <span className="text-[var(--text3)]">Never</span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--text3)]">Connected</dt>
            <dd>
              <Timestamp value={connector.createdAt} />
            </dd>
          </div>
        </dl>
      </div>
      <Button className="w-full justify-center" onClick={() => onConfigure(connector.id)}>
        Configure
      </Button>
    </ConnectorCardShell>
  );
}

function CatalogConnectorCard({
  connectorType,
  pending,
  onConnect,
}: {
  connectorType: any;
  pending: boolean;
  onConnect: (connectorType: any) => void;
}) {
  return (
    <ConnectorCardShell>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <ConnectorTile type={connectorType.type} />
            <div className="min-w-0">
              <p className="font-[family-name:var(--mono)] text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--text3)]">
                {connectorType.type}
              </p>
              <h3 className="mt-1 truncate text-[14px] font-semibold text-[var(--text)]">{connectorType.displayName}</h3>
            </div>
          </div>
          <Pill tone="neutral">Available</Pill>
        </div>
        <p className="line-clamp-3 text-[12.5px] leading-relaxed text-[var(--text2)]">{connectorType.description}</p>
      </div>
      <Button variant="primary" className="w-full justify-center" disabled={pending} onClick={() => onConnect(connectorType)}>
        <Plus className="size-4" aria-hidden="true" />
        Connect {connectorType.displayName}
      </Button>
    </ConnectorCardShell>
  );
}

// ── page ─────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const { data: integrations, isLoading: loadingInstances } = useConnectors();
  const { data: types, isLoading: loadingTypes } = useConnectorTypes();
  const { createConnector, startSlackOAuth } = useConnectorMutations();

  const [selectedType, setSelectedType] = useState<any | null>(null);

  const [createState, createAction] = useActionState(async (_prev: CreateState, form: FormData) => {
    if (!selectedType) return { error: "Select a connector first." };
    try {
      const config: Record<string, string> = {};
      for (const field of selectedType.configFields ?? []) {
        const raw = form.get(field.key);
        if (raw !== null && String(raw).length > 0) config[field.key] = String(raw);
      }
      const name = String(form.get("name") || "").trim();

      await createConnector.mutateAsync({
        name: name || selectedType.displayName,
        type: selectedType.type,
        config,
      });

      demoSuccess(`${selectedType.displayName} integration created`);
      setSelectedType(null);
      return INITIAL_CREATE_STATE;
    } catch (err: any) {
      return { error: err?.response?.data?.message || err?.message || "Failed to create the integration." };
    }
  }, INITIAL_CREATE_STATE);

  // Compute available integrations by filtering out those already installed
  const installedTypes = new Set((integrations || []).map((i: any) => i.type));
  const availableTypes = (types || []).filter((t: any) => !installedTypes.has(t.type));

  const installed = integrations ?? [];
  const connectedCount = installed.filter((i: any) => i.status === HEALTHY_STATUS).length;
  const attentionCount = installed.length - connectedCount;

  const facts: HeroFact[] = [
    { label: "Connected", value: connectedCount, tone: connectedCount > 0 ? "green" : "neutral" },
    { label: "Needs attention", value: attentionCount, tone: attentionCount > 0 ? "red" : "neutral", icon: TriangleAlert },
    { label: "Available", value: availableTypes.length, tone: "brand" },
  ];

  const handleConnect = async (connectorType: any) => {
    if (connectorType.type === "slack") {
      try {
        const res = await startSlackOAuth.mutateAsync();
        window.location.href = res.data.data.url;
      } catch (err) {
        console.error(err);
      }
      return;
    }
    setSelectedType(connectorType);
  };

  const scrollToCatalog = () => {
    document.getElementById(CATALOG_ANCHOR)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (selectedType) {
    const SelectedGlyph = glyphFor(selectedType.type);
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          eyebrow="Connectors"
          title={`Connect ${selectedType.displayName}`}
          description="Give this connection a name and enter its credentials. Secrets are encrypted at rest and never displayed again."
          icon={SelectedGlyph}
          breadcrumbs={[{ label: "Connectors", to: "/connectors/integrations" }, { label: selectedType.displayName }]}
          actions={
            <Button onClick={() => setSelectedType(null)}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to catalog
            </Button>
          }
        />

        <div className="max-w-[640px]">
          <Panel
            title={`${selectedType.displayName} configuration`}
            description={selectedType.description}
            icon={SelectedGlyph}
          >
            <form action={createAction} className="flex flex-col gap-5">
              {createState.error && (
                <Notice tone="red" icon={TriangleAlert} title="Could not create the integration">
                  {createState.error}
                </Notice>
              )}

              <Field label="Integration name" hint="A friendly name for this connection inside Sentinel.">
                <input
                  name="name"
                  required
                  placeholder={`Production ${selectedType.displayName}`}
                  className={fieldInputClass}
                />
              </Field>

              {(selectedType.configFields ?? []).map((field: any) => (
                <Field key={field.key} label={field.label}>
                  <input
                    name={field.key}
                    type={field.secret ? "password" : "text"}
                    required={field.required}
                    autoComplete={field.secret ? "new-password" : "off"}
                    className={fieldInputClass}
                  />
                </Field>
              ))}

              <div className="flex items-center gap-2 border-t border-[var(--border)] pt-4">
                <SubmitButton>Save integration</SubmitButton>
                <Button variant="ghost" onClick={() => setSelectedType(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Connectors"
        title="Integrations"
        description="Route alerts, incidents, and delivery events from Sentinel into the tools your team already runs on."
        icon={Cable}
        actions={
          <Button onClick={() => navigate("/connectors/audit")}>
            <ScrollText className="size-4" aria-hidden="true" />
            Delivery logs
          </Button>
        }
      >
        <HeroFacts facts={facts} />
      </PageHero>

      <section className="flex flex-col gap-4">
        <SectionHeading title="Connected" description="Connectors already installed in this organization." />
        {loadingInstances ? (
          <GridSkeleton />
        ) : installed.length === 0 ? (
          <EmptyPanel
            icon={Plug}
            title="No connectors yet"
            description="Connect Slack, a webhook endpoint, or email to start routing alerts out of Sentinel."
            action={
              <Button variant="primary" onClick={scrollToCatalog}>
                Browse the catalog
              </Button>
            }
          />
        ) : (
          <CardGrid>
            {installed.map((connector: any) => (
              <ConnectedConnectorCard
                key={connector.id}
                connector={connector}
                onConfigure={(id) => navigate(`/connectors/integrations/${id}`)}
              />
            ))}
          </CardGrid>
        )}
      </section>

      <section id={CATALOG_ANCHOR} className="flex flex-col gap-4">
        <SectionHeading title="Available connectors" description="Everything else Sentinel can deliver to." />
        {loadingTypes ? (
          <GridSkeleton />
        ) : availableTypes.length === 0 ? (
          <EmptyPanel
            icon={Cable}
            title="Every connector is installed"
            description="You have connected all connector types available on your plan."
          />
        ) : (
          <CardGrid>
            {availableTypes.map((connectorType: any) => (
              <CatalogConnectorCard
                key={connectorType.type}
                connectorType={connectorType}
                pending={startSlackOAuth.isPending && connectorType.type === "slack"}
                onConnect={handleConnect}
              />
            ))}
          </CardGrid>
        )}
      </section>
    </div>
  );
}
