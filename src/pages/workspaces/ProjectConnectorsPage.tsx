import { useState, type ReactNode } from "react";
import { AlertTriangle, Plus } from "lucide-react";

import {
  useConnectorSubscriptionMutations,
  useConnectorSubscriptions,
} from "@/modules/projects/hooks/useProjectAlerting";
import { useNotificationEntitlement } from "@/modules/alerting/hooks/useAlerting";
import { EntitlementRestrictedBanner } from "@/modules/alerting/components/EntitlementRestrictedBanner";
import { useProjectMembers } from "@/modules/projects/hooks/useMembers";
import { useConnectors } from "@/modules/organizations/hooks/useConnectors";
import {
  ALERT_CATEGORIES,
  type AlertCategory,
  type ProjectConnectorSubscription,
} from "@/modules/projects/api/types";
import type { ConnectorSubscriptionBody } from "@/modules/projects/api/alerting.api";
import { orgRoutes } from "@/app/router/org-routes";
import {
  ConfirmDialog,
  DialogField,
  FormDialog,
  apiErrorMessage,
  optionalText,
} from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  HIDE_BELOW_XL,
  ProjectPageHeader,
  Readouts,
  RowActions,
  RowTitle,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  TextLink,
  ToolbarCount,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Notice, Pill, Toggle, fieldInputClass } from "@/shared/ui/pulse";
import { Timestamp, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useCurrentProject } from "./ProjectShellPage";

// ── module-level constants (rules.md §1.2) ───────────────────

const SEVERITY_CHOICES = ["info", "warning", "error", "critical"] as const;
const DIGEST_CHOICES = ["immediate", "hourly", "daily", "weekly"] as const;

// Categories shown inline before the rest collapse into "+n".
const VISIBLE_CATEGORIES = 3;

// The identity column takes the free width and truncates; the rest hug their content.
const COLUMNS: SheetColumn[] = [
  { key: "connector", header: "Connector", className: "w-full" },
  { key: "categories", header: "Categories", className: `w-[240px] ${HIDE_BELOW_LG}` },
  { key: "severity", header: "Min severity", className: `w-[120px] ${HIDE_BELOW_MD}` },
  { key: "delivery", header: "Delivery", className: `w-[150px] ${HIDE_BELOW_XL}` },
  { key: "updated", header: "Updated", className: `w-[112px] ${HIDE_BELOW_XL}` },
  { key: "enabled", header: "Enabled", className: "w-[88px]" },
  { key: "actions", header: "Actions", srOnly: true, align: "right", className: "w-px" },
];

const CHECKBOX_CLASS = "size-4 shrink-0 cursor-pointer accent-[var(--text)]";

const asMessage = apiErrorMessage;

type ConnectorOption = { id: string; name?: string; provider?: string };

function sentenceCase(value: string) {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ── subscription form ────────────────────────────────────────

/** A labelled group of checkboxes: a fieldset, so the label names the group. */
function CheckboxGroup({ legend, hint, children }: { legend: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-[13px] font-medium text-[var(--text2)]">{legend}</legend>
      <div className="rounded-[var(--radius)] border border-[var(--border)] p-3">{children}</div>
      {hint && <span className="text-[12px] leading-[1.5] text-[var(--text3)]">{hint}</span>}
    </fieldset>
  );
}

function SubscriptionFields({
  subscription,
  connectors,
  members,
  connectorsPath,
}: {
  subscription?: ProjectConnectorSubscription;
  connectors: ConnectorOption[];
  members: Array<{ userId: string; label: string }>;
  connectorsPath: string;
}) {
  const selectedCategories = new Set(subscription?.alertCategories ?? ["error", "performance", "security"]);
  const selectedMembers = new Set(subscription?.memberIds ?? []);

  return (
    <>
      {!subscription && (
        <DialogField label="Connector" name="connectorId" required>
          <select id="connectorId" name="connectorId" required className={fieldInputClass}>
            <option value="">Select a connector…</option>
            {connectors.map((connector) => (
              <option key={connector.id} value={connector.id}>
                {connector.name ?? connector.id}
                {connector.provider ? ` · ${connector.provider}` : ""}
              </option>
            ))}
          </select>
          <span className="text-[12px] leading-[1.5] text-[var(--text3)]">
            Organization connectors are managed under{" "}
            <TextLink to={connectorsPath} size="sm">
              Connections
            </TextLink>
            .
          </span>
        </DialogField>
      )}

      <CheckboxGroup legend="Alert categories" hint="Which alert families this connector receives.">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
          {ALERT_CATEGORIES.map((category) => (
            <label key={category} className="flex cursor-pointer items-center gap-2 text-[13px] text-[var(--text)]">
              <input
                type="checkbox"
                name={`category:${category}`}
                defaultChecked={selectedCategories.has(category)}
                className={CHECKBOX_CLASS}
              />
              {sentenceCase(category)}
            </label>
          ))}
        </div>
      </CheckboxGroup>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DialogField label="Minimum severity" name="severityThreshold">
          <select
            id="severityThreshold"
            name="severityThreshold"
            defaultValue={subscription?.severityThreshold ?? "error"}
            className={fieldInputClass}
          >
            {SEVERITY_CHOICES.map((severity) => (
              <option key={severity} value={severity}>
                {sentenceCase(severity)}
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
                {sentenceCase(mode)}
              </option>
            ))}
          </select>
        </DialogField>
      </div>

      {members.length > 0 && (
        <CheckboxGroup legend="Target members" hint="Leave all unchecked to notify everyone subscribed to the category.">
          <div className="sidebar-scroll grid max-h-40 grid-cols-1 gap-x-4 gap-y-2.5 overflow-y-auto sm:grid-cols-2">
            {members.map((member) => (
              <label
                key={member.userId}
                className="flex min-w-0 cursor-pointer items-center gap-2 text-[13px] text-[var(--text)]"
              >
                <input
                  type="checkbox"
                  name={`member:${member.userId}`}
                  defaultChecked={selectedMembers.has(member.userId)}
                  className={CHECKBOX_CLASS}
                />
                <span className="truncate">{member.label}</span>
              </label>
            ))}
          </div>
        </CheckboxGroup>
      )}

      <label className="flex w-fit cursor-pointer items-center gap-2.5 text-[13px] text-[var(--text)]">
        <input type="checkbox" name="enabled" defaultChecked={subscription?.enabled ?? true} className={CHECKBOX_CLASS} />
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
  const { projectId, orgSlug } = useCurrentProject();
  const { data, isLoading, error, refetch } = useConnectorSubscriptions(projectId);
  const subscriptions = data?.data ?? [];

  const { data: connectorData = [], isLoading: connectorsLoading } = useConnectors();
  const connectors = connectorData as ConnectorOption[];
  const { data: memberPage } = useProjectMembers(projectId, { status: "active" });

  const { createSubscription, updateSubscription, deleteSubscription } =
    useConnectorSubscriptionMutations(projectId);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProjectConnectorSubscription | null>(null);
  const [deleting, setDeleting] = useState<ProjectConnectorSubscription | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const connectorsPath = orgRoutes.connectors(orgSlug, "integrations");

  const memberOptions = (memberPage?.data ?? []).map((member) => ({
    userId: member.userId,
    label: member.user?.fullName || member.user?.email || member.userId,
  }));

  const connectorById = new Map(connectors.map((connector) => [connector.id, connector]));
  const connectorName = (connectorId: string) => connectorById.get(connectorId)?.name ?? connectorId;

  const subscribedIds = new Set(subscriptions.map((subscription) => subscription.connectorId));
  const availableConnectors = connectors.filter((connector) => !subscribedIds.has(connector.id));

  const { isRestricted } = useNotificationEntitlement();
  const enabledCount = subscriptions.filter((subscription) => subscription.enabled).length;
  const total = data?.total ?? subscriptions.length;

  const readouts: Readout[] = [
    { label: "Subscriptions", value: formatNumber(total), sub: `${formatNumber(enabledCount)} enabled` },
    {
      label: "Paused",
      value: formatNumber(subscriptions.length - enabledCount),
      sub: "Subscribed but not delivering",
      tone: subscriptions.length - enabledCount > 0 ? "warn" : "neutral",
    },
    {
      label: "Org connectors",
      value: formatNumber(connectors.length),
      sub: `${formatNumber(availableConnectors.length)} not subscribed yet`,
    },
    { label: "Project members", value: formatNumber(memberOptions.length), sub: "Can be targeted" },
  ];

  const canSubscribe = !isRestricted && availableConnectors.length > 0;
  const subscribeButton = (
    <UiButton
      size="lg"
      onClick={() => {
        setFormError(null);
        setCreating(true);
      }}
      disabled={!canSubscribe}
    >
      <Plus className="size-4" aria-hidden="true" /> Subscribe connector
    </UiButton>
  );

  let body: ReactNode;
  if (isLoading) {
    body = <SheetLoading rows={3} label="Loading connector subscriptions" />;
  } else if (error) {
    body = (
      <SheetError
        title="Could not load connector subscriptions"
        message={asMessage(error)}
        onRetry={() => void refetch()}
      />
    );
  } else if (subscriptions.length === 0) {
    body = (
      <SheetEmpty
        title="No connector subscriptions"
        description="Connectors are set up once for the organization. Subscribe this project to one and its alerts fan out to that chat or webhook destination."
        action={
          connectors.length > 0 ? (
            subscribeButton
          ) : (
            <TextLink to={connectorsPath} arrow>
              Set up an organization connector
            </TextLink>
          )
        }
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Connector subscriptions" minWidth={520}>
        {subscriptions.map((subscription) => {
          const name = connectorName(subscription.connectorId);
          const provider = connectorById.get(subscription.connectorId)?.provider;
          const categories = subscription.alertCategories;
          const hiddenCategories = categories.length - VISIBLE_CATEGORIES;
          const hasQuietHours = Boolean(subscription.quietHours && Object.keys(subscription.quietHours).length > 0);
          return (
            <SheetRow key={subscription.id} muted={!subscription.enabled}>
              <SheetCell className="w-full max-w-0">
                <RowTitle
                  title={name}
                  subtitle={provider ? sentenceCase(provider) : subscription.connectorId}
                  subtitleMono={!provider}
                />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                <span className="flex flex-wrap items-center gap-1">
                  {categories.slice(0, VISIBLE_CATEGORIES).map((category) => (
                    <Pill key={category}>{sentenceCase(category)}</Pill>
                  ))}
                  {hiddenCategories > 0 && (
                    <span
                      className="font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]"
                      title={categories.slice(VISIBLE_CATEGORIES).map(sentenceCase).join(", ")}
                    >
                      +{hiddenCategories}
                    </span>
                  )}
                </span>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD}>
                <span className="text-[13px] text-[var(--text2)]">{sentenceCase(subscription.severityThreshold)}</span>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_XL}>
                <span className="block text-[13px] text-[var(--text2)]">
                  {sentenceCase(subscription.digestMode ?? "immediate")}
                  {" · "}
                  {subscription.memberIds.length > 0
                    ? `${subscription.memberIds.length} member${subscription.memberIds.length === 1 ? "" : "s"}`
                    : "All subscribers"}
                </span>
                {hasQuietHours && <span className="block text-[12px] text-[var(--text3)]">Quiet hours set</span>}
              </SheetCell>
              <SheetCell className={HIDE_BELOW_XL}>
                <Timestamp value={subscription.updatedAt} />
              </SheetCell>
              <SheetCell>
                <Toggle
                  checked={subscription.enabled}
                  label={`${subscription.enabled ? "Pause" : "Resume"} alerts through ${name}`}
                  disabled={updateSubscription.isPending}
                  onChange={(next) => updateSubscription.mutate({ id: subscription.id, payload: { enabled: next } })}
                />
              </SheetCell>
              <SheetCell align="right">
                <RowActions label={`Actions for ${name}`}>
                  <DropdownMenuItem
                    onSelect={() => {
                      setFormError(null);
                      setEditing(subscription);
                    }}
                  >
                    Edit subscription
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(subscription)}>
                    Remove subscription
                  </DropdownMenuItem>
                </RowActions>
              </SheetCell>
            </SheetRow>
          );
        })}
      </SheetTable>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Connectors"
        description="Organization connectors (Slack, Teams, webhooks) that receive this project's alerts, with per-category and per-member targeting."
        actions={subscribeButton}
      />

      <EntitlementRestrictedBanner projectId={projectId} />

      {!connectorsLoading && connectors.length === 0 && (
        <Notice
          tone="amber"
          icon={AlertTriangle}
          title="No organization connectors"
          action={
            <TextLink to={connectorsPath} size="sm">
              Open connections
            </TextLink>
          }
        >
          Create a Slack, Teams, or webhook connector under Connections before subscribing this project to it.
        </Notice>
      )}

      <Readouts cells={readouts} loading={isLoading} label="Connector summary" />

      <Sheet
        label="Connector subscriptions"
        toolbar={
          !isLoading && !error && subscriptions.length > 0 ? (
            <>
              <span className="text-[12px] text-[var(--text3)]">
                Pausing a subscription keeps its targeting; resume it any time.
              </span>
              <ToolbarCount>
                {formatNumber(total)} {total === 1 ? "subscription" : "subscriptions"}
              </ToolbarCount>
            </>
          ) : undefined
        }
      >
        {body}
      </Sheet>

      <FormDialog
        open={creating}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open) setFormError(null);
        }}
        title="Subscribe a connector"
        description="Choose an organization connector and which of this project's alerts it receives."
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
        <SubscriptionFields connectors={availableConnectors} members={memberOptions} connectorsPath={connectorsPath} />
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
          <SubscriptionFields
            subscription={editing}
            connectors={availableConnectors}
            members={memberOptions}
            connectorsPath={connectorsPath}
          />
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
    </WorkspacePage>
  );
}
