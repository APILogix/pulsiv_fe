import { useState } from "react";
import {
  Activity,
  Cable,
  CheckCircle2,
  Layers,
  Pencil,
  Plus,
  Shield,
  Trash2,
  Users,
  Volume2,
} from "lucide-react";
import {
  useConnectorSubscriptionMutations,
  useConnectorSubscriptions,
} from "@/modules/projects/hooks/useProjectAlerting";
import { useProjectMembers } from "@/modules/projects/hooks/useMembers";
import { useConnectors } from "@/modules/organizations/hooks/useConnectors";
import {
  ALERT_CATEGORIES,
  type AlertCategory,
  type ProjectConnectorSubscription,
} from "@/modules/projects/api/types";
import type { ConnectorSubscriptionBody } from "@/modules/projects/api/alerting.api";
import { useCurrentProject } from "./ProjectShellPage";
import {
  IconChip,
  Notice,
  Panel,
  Pill,
  SectionHeading,
  StatCard,
  Toggle,
  fieldInputClass,
} from "@/shared/ui/pulse";
import { Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  ConfirmDialog,
  DialogField,
  FormDialog,
  apiErrorMessage,
  optionalText,
} from "@/modules/projects/components/project-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const SEVERITY_CHOICES = ["info", "warning", "error", "critical"] as const;
const DIGEST_CHOICES = ["immediate", "hourly", "daily", "weekly"] as const;

const CATEGORY_ICON: Record<string, typeof Activity> = {
  error: Shield,
  performance: Activity,
  security: Shield,
  usage: Layers,
  deployment: Cable,
};

const asMessage = apiErrorMessage;

// ── subscription form ────────────────────────────────────────

function SubscriptionFields({
  subscription,
  connectors,
  members,
}: {
  subscription?: ProjectConnectorSubscription;
  connectors: Array<{ id: string; name?: string; provider?: string }>;
  members: Array<{ userId: string; label: string }>;
}) {
  const selectedCategories = new Set(subscription?.alertCategories ?? ["error", "performance", "security"]);
  const selectedMembers = new Set(subscription?.memberIds ?? []);

  return (
    <>
      {!subscription && (
        <DialogField label="Connector" name="connectorId" required hint="Organization connectors are managed under Connections.">
          <select id="connectorId" name="connectorId" required className={fieldInputClass}>
            <option value="">Select a connector...</option>
            {connectors.map((connector) => (
              <option key={connector.id} value={connector.id}>
                {connector.name ?? connector.id}
                {connector.provider ? ` · ${connector.provider}` : ""}
              </option>
            ))}
          </select>
        </DialogField>
      )}

      <DialogField label="Alert categories" hint="Which alert families this connector receives.">
        <div className="grid grid-cols-2 gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] p-3 sm:grid-cols-3">
          {ALERT_CATEGORIES.map((category) => (
            <label key={category} className="flex items-center gap-2 text-[12.5px] text-[var(--text)]">
              <input
                type="checkbox"
                name={`category:${category}`}
                defaultChecked={selectedCategories.has(category)}
                className="size-4"
              />
              {category}
            </label>
          ))}
        </div>
      </DialogField>

      <div className="grid grid-cols-2 gap-3">
        <DialogField label="Minimum severity" name="severityThreshold">
          <select
            id="severityThreshold"
            name="severityThreshold"
            defaultValue={subscription?.severityThreshold ?? "error"}
            className={fieldInputClass}
          >
            {SEVERITY_CHOICES.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
        </DialogField>
        <DialogField label="Digest mode" name="digestMode">
          <select
            id="digestMode"
            name="digestMode"
            defaultValue={subscription?.digestMode ?? "immediate"}
            className={fieldInputClass}
          >
            {DIGEST_CHOICES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </DialogField>
      </div>

      {members.length > 0 && (
        <DialogField label="Target members" hint="Leave empty to notify everyone subscribed to the category.">
          <div className="sidebar-scroll grid max-h-40 grid-cols-1 gap-2 overflow-y-auto rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] p-3 sm:grid-cols-2">
            {members.map((member) => (
              <label key={member.userId} className="flex items-center gap-2 text-[12.5px] text-[var(--text)]">
                <input
                  type="checkbox"
                  name={`member:${member.userId}`}
                  defaultChecked={selectedMembers.has(member.userId)}
                  className="size-4"
                />
                <span className="truncate">{member.label}</span>
              </label>
            ))}
          </div>
        </DialogField>
      )}

      <label className="flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-3.5 py-3 text-[12.5px] text-[var(--text)]">
        <input type="checkbox" name="enabled" defaultChecked={subscription?.enabled ?? true} className="size-4" />
        Subscription enabled
      </label>
    </>
  );
}

function readSubscriptionForm(form: FormData): ConnectorSubscriptionBody {
  const alertCategories = ALERT_CATEGORIES.filter((category) => form.get(`category:${category}`) === "on");
  const memberIds: string[] = [];
  for (const [key, value] of form.entries()) {
    if (key.startsWith("member:") && value === "on") memberIds.push(key.slice("member:".length));
  }
  return {
    enabled: form.get("enabled") === "on",
    ...(alertCategories.length > 0 ? { alertCategories: alertCategories as AlertCategory[] } : {}),
    severityThreshold: String(form.get("severityThreshold") ?? "error"),
    digestMode: optionalText(form.get("digestMode")) ?? null,
    memberIds,
  };
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectConnectorsPage() {
  const { projectId } = useCurrentProject();
  const { data, isLoading, error } = useConnectorSubscriptions(projectId);
  const subscriptions = data?.data ?? [];

  const { data: connectors = [] } = useConnectors();
  const { data: memberPage } = useProjectMembers(projectId, { status: "active" });

  const { createSubscription, updateSubscription, deleteSubscription } =
    useConnectorSubscriptionMutations(projectId);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProjectConnectorSubscription | null>(null);
  const [deleting, setDeleting] = useState<ProjectConnectorSubscription | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const memberOptions = (memberPage?.data ?? []).map((member) => ({
    userId: member.userId,
    label: member.user?.fullName || member.user?.email || member.userId,
  }));

  const connectorName = (connectorId: string) => {
    const connector = (connectors as Array<{ id: string; name?: string }>).find(
      (candidate) => candidate.id === connectorId,
    );
    return connector?.name ?? connectorId;
  };

  const subscribedIds = new Set(subscriptions.map((subscription) => subscription.connectorId));
  const availableConnectors = (connectors as Array<{ id: string; name?: string; provider?: string }>).filter(
    (connector) => !subscribedIds.has(connector.id),
  );

  const enabledCount = subscriptions.filter((subscription) => subscription.enabled).length;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Connector subscriptions"
        description="Bind organization connectors (Slack, Teams, webhooks) to this project's alert stream, with per-category and per-member targeting."
        actions={
          <UiButton size="lg" onClick={() => setCreating(true)} disabled={availableConnectors.length === 0}>
            <Plus className="mr-1.5 size-4" /> Subscribe connector
          </UiButton>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Subscriptions" value={data?.total ?? subscriptions.length} icon={Cable} tone="brand" />
        <StatCard label="Enabled" value={enabledCount} icon={CheckCircle2} tone="green" />
        <StatCard label="Org connectors" value={(connectors as unknown[]).length} icon={Layers} tone="blue" />
        <StatCard label="Project members" value={memberOptions.length} icon={Users} tone="violet" />
      </div>

      {(connectors as unknown[]).length === 0 && (
        <Notice tone="amber" icon={Cable} title="No organization connectors">
          Create a Slack, Teams, or webhook connector under Connections before subscribing this project to it.
        </Notice>
      )}

      {error && <Notice tone="red">{asMessage(error)}</Notice>}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((row) => (
            <div key={row} className="h-40 animate-pulse rounded-[14px] bg-[var(--bg2)]" />
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <IconChip icon={Cable} size="lg" tone="brand" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">No connector subscriptions</p>
            <p className="max-w-[48ch] text-[12.5px] text-[var(--text2)]">
              Subscribing a connector lets this project fan alerts out to chat and webhook destinations shared across
              the organization.
            </p>
            <UiButton size="lg" onClick={() => setCreating(true)} disabled={availableConnectors.length === 0}>
              <Plus className="mr-1.5 size-4" /> Subscribe connector
            </UiButton>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {subscriptions.map((subscription) => (
            <div
              key={subscription.id}
              className="pulse-edge relative flex flex-col gap-3.5 overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg1)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="relative">
                    <IconChip icon={Cable} tone={subscription.enabled ? "brand" : "neutral"} />
                    {/* Pulsing dot for active connectors */}
                    {subscription.enabled && (
                      <span className="absolute -right-0.5 -top-0.5 flex size-2.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--green)] opacity-60" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-[var(--green)]" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-[var(--text)]">
                      {connectorName(subscription.connectorId)}
                    </p>
                    <code className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
                      {subscription.connectorId}
                    </code>
                  </div>
                </div>
                <Toggle
                  checked={subscription.enabled}
                  label={`Toggle ${connectorName(subscription.connectorId)}`}
                  disabled={updateSubscription.isPending}
                  onChange={(next) =>
                    updateSubscription.mutate({ id: subscription.id, payload: { enabled: next } })
                  }
                />
              </div>

              {/* Category pills with icons */}
              <div className="flex flex-wrap gap-1.5">
                {subscription.alertCategories.map((category) => {
                  const CatIcon = CATEGORY_ICON[category] ?? Activity;
                  return (
                    <Pill key={category} tone="blue">
                      <CatIcon className="size-3" aria-hidden="true" />
                      {category}
                    </Pill>
                  );
                })}
              </div>

              {/* Key-value grid with improved styling */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--border)]">
                <div className="flex flex-col gap-0.5 bg-[var(--bg2)] px-3 py-2">
                  <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">
                    Min severity
                  </span>
                  <span className="text-[12.5px] font-medium capitalize text-[var(--text)]">
                    {subscription.severityThreshold}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 bg-[var(--bg2)] px-3 py-2">
                  <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">
                    <Volume2 className="size-2.5" aria-hidden="true" /> Digest
                  </span>
                  <span className="text-[12.5px] font-medium text-[var(--text)]">
                    {subscription.digestMode ?? "immediate"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 bg-[var(--bg2)] px-3 py-2">
                  <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Targets</span>
                  <span className="text-[12.5px] font-medium text-[var(--text)]">
                    {subscription.memberIds.length > 0
                      ? `${subscription.memberIds.length} member${subscription.memberIds.length === 1 ? "" : "s"}`
                      : "All subscribers"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 bg-[var(--bg2)] px-3 py-2">
                  <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">
                    Quiet hours
                  </span>
                  <span className="text-[12.5px] font-medium text-[var(--text)]">
                    {subscription.quietHours && Object.keys(subscription.quietHours).length > 0
                      ? "Configured"
                      : "None"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                <span className="text-[11.5px] text-[var(--text3)]">
                  Updated <Timestamp value={subscription.updatedAt} />
                </span>
                <div className="flex items-center gap-1.5">
                  <UiButton
                    variant="outline"
                    size="icon-sm"
                    aria-label="Edit subscription"
                    onClick={() => {
                      setFormError(null);
                      setEditing(subscription);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </UiButton>
                  <UiButton
                    variant="outline"
                    size="icon-sm"
                    aria-label="Delete subscription"
                    onClick={() => setDeleting(subscription)}
                  >
                    <Trash2 className="size-3.5 text-[var(--red)]" />
                  </UiButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <FormDialog
        open={creating}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open) setFormError(null);
        }}
        title="Subscribe a connector"
        submitLabel="Create subscription"
        pending={createSubscription.isPending}
        error={formError}
        onSubmit={(form) => {
          setFormError(null);
          const connectorId = String(form.get("connectorId") ?? "");
          if (!connectorId) {
            setFormError("Select a connector.");
            return;
          }
          createSubscription.mutate(
            { ...readSubscriptionForm(form), connectorId },
            {
              onSuccess: () => setCreating(false),
              onError: (mutationError) => setFormError(asMessage(mutationError)),
            },
          );
        }}
        width="sm:max-w-[620px]"
      >
        <SubscriptionFields connectors={availableConnectors} members={memberOptions} />
      </FormDialog>

      <FormDialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setFormError(null);
          }
        }}
        title={editing ? `Edit ${connectorName(editing.connectorId)} subscription` : "Edit subscription"}
        submitLabel="Save changes"
        pending={updateSubscription.isPending}
        error={formError}
        onSubmit={(form) => {
          if (!editing) return;
          setFormError(null);
          updateSubscription.mutate(
            { id: editing.id, payload: readSubscriptionForm(form) },
            {
              onSuccess: () => setEditing(null),
              onError: (mutationError) => setFormError(asMessage(mutationError)),
            },
          );
        }}
        width="sm:max-w-[620px]"
      >
        {editing && (
          <SubscriptionFields subscription={editing} connectors={availableConnectors} members={memberOptions} />
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove connector subscription?"
        description="This project stops delivering alerts through the connector. The connector itself is unchanged."
        confirmLabel="Remove subscription"
        pending={deleteSubscription.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteSubscription.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
      />
    </div>
  );
}
