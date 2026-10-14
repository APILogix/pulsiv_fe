import { useState, type ReactNode } from "react";
import { AlertTriangle, Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import {
  useAlertChannelMutations,
  useAlertChannels,
  useMyChannelPreferences,
} from "@/modules/projects/hooks/useProjectAlerting";
import { useNotificationEntitlement } from "@/modules/alerting/hooks/useAlerting";
import { EntitlementRestrictedBanner } from "@/modules/alerting/components/EntitlementRestrictedBanner";
import {
  CHANNEL_DIGEST_MODES,
  CHANNEL_SEVERITIES,
  type AlertChannelBody,
  type ChannelDigestMode,
  type ChannelSeverity,
  type MemberChannelPreference,
  type ProjectAlertChannel,
} from "@/modules/projects/api/types";
import {
  ConfirmDialog,
  DialogField,
  FormDialog,
  apiErrorMessage,
  optionalText,
} from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_XL,
  ProjectPageHeader,
  Readouts,
  RowActions,
  RowTitle,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetList,
  SheetListItem,
  SheetLoading,
  SheetRow,
  SheetTable,
  ToolbarCount,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import {
  Notice,
  Pill,
  SegmentedControl,
  Toggle,
  fieldInputClass,
  fieldMonoClass,
  fieldTextareaClass,
  type SegmentOption,
} from "@/shared/ui/pulse";
import { FilterSelect, Timestamp, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useCurrentProject } from "./ProjectShellPage";

// ── module-level constants (rules.md §1.2) ───────────────────

const CHANNEL_TYPES: Array<{ value: string; label: string; hint: string; placeholder: string }> = [
  {
    value: "email",
    label: "Email",
    hint: "Optional. Without one, alerts go to members' email addresses.",
    placeholder: "oncall@example.com",
  },
  {
    value: "slack",
    label: "Slack",
    hint: "A channel webhook URL, or leave it empty and use a connector.",
    placeholder: "https://hooks.example.com/…",
  },
  {
    value: "webhook",
    label: "Webhook",
    hint: "The HTTPS endpoint that receives the alert payload.",
    placeholder: "https://hooks.example.com/…",
  },
  {
    value: "teams",
    label: "Microsoft Teams",
    hint: "The channel's incoming webhook URL.",
    placeholder: "https://hooks.example.com/…",
  },
  { value: "sms", label: "SMS", hint: "A phone number in E.164 format.", placeholder: "+14155550100" },
];

// Display names for types the list can return but the form does not create.
const TYPE_LABEL: Record<string, string> = {
  ...Object.fromEntries(CHANNEL_TYPES.map((type) => [type.value, type.label])),
  pagerduty: "PagerDuty",
  discord: "Discord",
  in_app: "In-app",
  route: "Route",
};

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "All types" },
  ...CHANNEL_TYPES.map((type) => ({ value: type.value, label: type.label })),
];

const DIGEST_LABEL: Record<ChannelDigestMode, string> = {
  immediate: "Immediate",
  hourly: "Hourly digest",
  daily: "Daily digest",
  weekly: "Weekly digest",
};

/** The shared helpers stop at xl; the updated date only fits from 2xl. */
const HIDE_BELOW_2XL = "hidden 2xl:table-cell";

const COLUMNS: SheetColumn[] = [
  { key: "channel", header: "Channel" },
  { key: "destination", header: "Destination", className: `w-[240px] ${HIDE_BELOW_LG}` },
  { key: "preference", header: "My delivery", className: `w-[184px] ${HIDE_BELOW_XL}` },
  { key: "updated", header: "Updated", className: `w-[120px] ${HIDE_BELOW_2XL}` },
  { key: "enabled", header: "Enabled", className: "w-[84px]" },
  { key: "actions", header: "Actions", srOnly: true, className: "w-[60px]" },
];

const CHECKBOX_CLASS =
  "size-4 shrink-0 cursor-pointer rounded-[4px] accent-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border2)]";

const sentenceCase = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);

function channelTypeLabel(type: string) {
  return TYPE_LABEL[type] ?? sentenceCase(type.replace(/_/g, " "));
}

/** "Warning+ · Hourly digest" in a row, the full sentence in a list or title. */
function preferenceSummary(preference: MemberChannelPreference, form: "compact" | "full") {
  const severity = sentenceCase(preference.severityThreshold);
  const parts = [
    form === "compact" ? `${severity}+` : `${severity} and above`,
    DIGEST_LABEL[preference.digestMode] ?? preference.digestMode,
  ];
  if (form === "full") parts.push(preference.category === "all" ? "All categories" : preference.category);
  else if (preference.category !== "all") parts.push(preference.category);
  return parts.join(" · ");
}

// ── row pieces ───────────────────────────────────────────────

function ChannelDestination({ channel }: { channel: ProjectAlertChannel }) {
  if (channel.destination) {
    return (
      <span
        className="block truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]"
        title={channel.destination}
      >
        {channel.destination}
      </span>
    );
  }
  if (channel.connectorId) {
    return (
      <span className="block truncate text-[12px] text-[var(--text3)]" title={channel.connectorId}>
        Connector{" "}
        <span className="font-[family-name:var(--mono)] text-[var(--text2)]">{channel.connectorId.slice(0, 8)}</span>
      </span>
    );
  }
  return (
    <span className="text-[12px] text-[var(--text3)]">
      {channel.channelType === "email" ? "Member emails" : "Not set"}
    </span>
  );
}

function PreferenceCell({ preference }: { preference?: MemberChannelPreference }) {
  if (!preference) return <span className="text-[12px] text-[var(--text3)]">Project defaults</span>;
  if (!preference.enabled) return <Pill>Muted</Pill>;
  return (
    <span className="block truncate text-[12px] text-[var(--text2)]" title={preferenceSummary(preference, "full")}>
      {preferenceSummary(preference, "compact")}
    </span>
  );
}

// ── channel form ─────────────────────────────────────────────

function ChannelFields({ channel }: { channel?: ProjectAlertChannel }) {
  const [channelType, setChannelType] = useState(channel?.channelType ?? "email");
  const active = CHANNEL_TYPES.find((type) => type.value === channelType);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DialogField label="Channel type" name="channelType" required>
          <select
            id="channelType"
            name="channelType"
            required
            value={channelType}
            onChange={(event) => setChannelType(event.target.value)}
            className={fieldInputClass}
          >
            {CHANNEL_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </DialogField>

        <DialogField label="Name" name="name" required>
          <input
            id="name"
            name="name"
            required
            defaultValue={channel?.name}
            maxLength={150}
            autoComplete="off"
            placeholder="On-call Slack"
            className={fieldInputClass}
          />
        </DialogField>
      </div>

      <DialogField label="Destination" name="destination" hint={active?.hint}>
        <input
          id="destination"
          name="destination"
          defaultValue={channel?.destination ?? ""}
          maxLength={2048}
          autoComplete="off"
          spellCheck={false}
          placeholder={active?.placeholder ?? "https://hooks.example.com/…"}
          className={fieldMonoClass}
        />
      </DialogField>

      <DialogField
        label="Connector ID"
        name="connectorId"
        hint="Optional. Route through an organization connector instead of a raw destination."
      >
        <input
          id="connectorId"
          name="connectorId"
          defaultValue={channel?.connectorId ?? ""}
          autoComplete="off"
          spellCheck={false}
          placeholder="UUID of an organization connector"
          className={fieldMonoClass}
        />
      </DialogField>

      <DialogField label="Description" name="description">
        <textarea
          id="description"
          name="description"
          defaultValue={channel?.description ?? ""}
          maxLength={5000}
          className={fieldTextareaClass}
        />
      </DialogField>

      <fieldset className="flex flex-col gap-3 border-t border-[var(--border)] pt-4">
        <legend className="sr-only">Channel options</legend>
        <label className="flex items-center gap-2.5 text-[13px] text-[var(--text)]">
          <input type="checkbox" name="enabled" defaultChecked={channel?.enabled ?? true} className={CHECKBOX_CLASS} />
          Enabled
        </label>
        <label className="flex items-center gap-2.5 text-[13px] text-[var(--text)]">
          <input
            type="checkbox"
            name="isDefault"
            defaultChecked={channel?.isDefault ?? false}
            className={CHECKBOX_CLASS}
          />
          Default channel for this project
        </label>
      </fieldset>
    </>
  );
}

function readChannelForm(form: FormData): AlertChannelBody {
  return {
    channelType: String(form.get("channelType") ?? "email"),
    name: String(form.get("name") ?? "").trim(),
    destination: optionalText(form.get("destination")) ?? null,
    connectorId: optionalText(form.get("connectorId")) ?? null,
    description: optionalText(form.get("description")) ?? null,
    enabled: form.get("enabled") === "on",
    isDefault: form.get("isDefault") === "on",
  };
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectAlertChannelsPage() {
  const { projectId } = useCurrentProject();

  const [channelType, setChannelType] = useState("");
  const [enabledFilter, setEnabledFilter] = useState("");

  const { data, isLoading, error, refetch } = useAlertChannels(projectId, {
    ...(channelType ? { channelType } : {}),
    ...(enabledFilter ? { enabled: enabledFilter === "true" } : {}),
  });
  const channels = data?.data ?? [];

  // Readings describe every channel in the project, never the filtered view.
  // With no filter applied this is the same query as the list above.
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useAlertChannels(projectId);
  const allChannels = summary?.data ?? [];

  const { data: preferences = [] } = useMyChannelPreferences(projectId);
  const {
    createChannel,
    updateChannel,
    toggleChannel,
    deleteChannel,
    upsertPreference,
    deletePreference,
  } = useAlertChannelMutations(projectId);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProjectAlertChannel | null>(null);
  const [deleting, setDeleting] = useState<ProjectAlertChannel | null>(null);
  const [tuning, setTuning] = useState<ProjectAlertChannel | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const preferenceFor = (channelId: string) =>
    preferences.find((preference) => preference.projectAlertChannelId === channelId);

  const { isRestricted, decision, isLoading: entitlementLoading } = useNotificationEntitlement();
  // Until entitlements load every provider reads as not allowed, so the plan
  // badge waits for them instead of flashing on every row.
  const blockedByPlan = (channel: ProjectAlertChannel) =>
    !entitlementLoading && channel.channelType !== "email" && !decision.isProviderAllowed(channel.channelType);

  const totalChannels = summary?.total ?? allChannels.length;
  const enabledCount = allChannels.filter((channel) => channel.enabled).length;
  const disabledCount = allChannels.length - enabledCount;
  const defaultChannels = allChannels.filter((channel) => channel.isDefault);
  const blockedCount = allChannels.filter(blockedByPlan).length;

  const filtered = Boolean(channelType) || Boolean(enabledFilter);
  const clearFilters = () => {
    setChannelType("");
    setEnabledFilter("");
  };

  // A failed summary shows dashes, never zeros that read as "no channels".
  const channelReading = (value: number) => (summaryError ? "—" : formatNumber(value));
  const ofChannels = summaryError
    ? "Could not load channels"
    : allChannels.length > 0
      ? `of ${formatNumber(allChannels.length)} channels`
      : "None yet";
  const readouts: Readout[] = [
    {
      label: "Channels",
      value: channelReading(totalChannels),
      sub: summaryError
        ? "Could not load channels"
        : defaultChannels.length === 1
          ? `Default: ${defaultChannels[0].name}`
          : defaultChannels.length > 1
            ? `${formatNumber(defaultChannels.length)} default channels`
            : totalChannels > 0
              ? "No default channel"
              : "None yet",
    },
    { label: "Enabled", value: channelReading(enabledCount), sub: ofChannels },
    {
      label: "Disabled",
      value: channelReading(disabledCount),
      sub: disabledCount > 0 || summaryError ? ofChannels : "None disabled",
    },
    {
      label: "My preferences",
      value: formatNumber(preferences.length),
      sub: preferences.length > 0 ? "Overrides on your account" : "Using project defaults",
    },
  ];
  if (blockedCount > 0) {
    readouts.push({
      label: "Unavailable on plan",
      value: formatNumber(blockedCount),
      sub: "Configured, but not in your plan",
      tone: "warn",
    });
  }

  const stateOptions: SegmentOption<string>[] = [
    { value: "", label: "All", count: summary ? allChannels.length : undefined },
    { value: "true", label: "Enabled", count: summary ? enabledCount : undefined },
    { value: "false", label: "Disabled", count: summary ? disabledCount : undefined },
  ];

  const newChannelButton = (
    <UiButton size="lg" onClick={() => setCreating(true)}>
      <Plus className="size-4" aria-hidden="true" /> New channel
    </UiButton>
  );

  let body: ReactNode;
  if (isLoading) {
    body = <SheetLoading rows={4} label="Loading channels" />;
  } else if (error) {
    body = <SheetError title="Could not load channels" message={apiErrorMessage(error)} onRetry={() => void refetch()} />;
  } else if (channels.length === 0) {
    body = filtered ? (
      <SheetEmpty
        title="No channels match"
        description="No channel in this project has the selected type and state."
        action={
          <UiButton variant="outline" size="lg" onClick={clearFilters}>
            Clear filters
          </UiButton>
        }
      />
    ) : (
      <SheetEmpty
        title="Add your first channel"
        description="Add an email or Slack channel so threshold breaches and alert routes have somewhere to go."
        action={newChannelButton}
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Alert channels" className="[&_table]:table-fixed">
        {channels.map((channel) => {
          const preference = preferenceFor(channel.id);
          const blocked = blockedByPlan(channel);
          const typeLabel = channelTypeLabel(channel.channelType);
          const subtitle = channel.description ? `${typeLabel} · ${channel.description}` : typeLabel;

          return (
            <SheetRow key={channel.id}>
              <SheetCell>
                <RowTitle
                  title={channel.name}
                  badges={
                    (channel.isDefault || blocked) && (
                      <span className="flex shrink-0 items-center gap-1.5">
                        {channel.isDefault && <Pill>Default</Pill>}
                        {blocked && <Pill tone="amber">Not in your plan</Pill>}
                      </span>
                    )
                  }
                  subtitle={<span title={subtitle}>{subtitle}</span>}
                />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                <ChannelDestination channel={channel} />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_XL}>
                <PreferenceCell preference={preference} />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_2XL}>
                <Timestamp value={channel.updatedAt} />
              </SheetCell>
              <SheetCell>
                <Toggle
                  checked={channel.enabled}
                  label={`${channel.name} enabled`}
                  disabled={toggleChannel.isPending}
                  onChange={(next) =>
                    toggleChannel.mutate({ id: channel.id, enabled: next, version: channel.version })
                  }
                />
              </SheetCell>
              <SheetCell align="right">
                <RowActions label={`Actions for ${channel.name}`}>
                  <DropdownMenuItem
                    onSelect={() => {
                      setFormError(null);
                      setEditing(channel);
                    }}
                  >
                    <Pencil aria-hidden="true" /> Edit channel
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setTuning(channel)}>
                    <SlidersHorizontal aria-hidden="true" /> My delivery preferences
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(channel)}>
                    <Trash2 aria-hidden="true" /> Delete channel
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
        title="Channels"
        description="Where this project delivers alerts. Each member can also set their own minimum severity and digest cadence on any channel."
        actions={newChannelButton}
      />

      <Readouts cells={readouts} loading={summaryLoading} label="Channels summary" />

      {isRestricted && <EntitlementRestrictedBanner projectId={projectId} />}

      {allChannels.length > 0 && defaultChannels.length === 0 && (
        <Notice tone="amber" icon={AlertTriangle} title="No default channel">
          <span className="block max-w-[72ch]">
            Alerts without a matching route fall back to the default channel. Edit a channel and turn on “Default
            channel for this project”.
          </span>
        </Notice>
      )}

      <Sheet
        label="Alert channels"
        toolbar={
          <>
            <SegmentedControl
              value={enabledFilter}
              onChange={setEnabledFilter}
              options={stateOptions}
              ariaLabel="Filter channels by state"
            />
            <FilterSelect label="Type" value={channelType} onChange={setChannelType} options={TYPE_FILTER_OPTIONS} />
            {!isLoading && !error && (
              <ToolbarCount>
                {formatNumber(channels.length)} {channels.length === 1 ? "channel" : "channels"}
              </ToolbarCount>
            )}
          </>
        }
      >
        {body}
      </Sheet>

      {preferences.length > 0 && (
        <Sheet
          title="My delivery preferences"
          description="Your overrides on this project's channels. They apply to your account only."
        >
          <SheetList label="My delivery preferences">
            {preferences.map((preference) => (
              <SheetListItem key={preference.id}>
                <div className="min-w-0 flex-1">
                  {preference.channel?.name ? (
                    <p className="truncate text-[13px] font-medium text-[var(--text)]">{preference.channel.name}</p>
                  ) : (
                    <p className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">
                      {preference.projectAlertChannelId}
                    </p>
                  )}
                  <div className="mt-1 flex min-w-0 items-center gap-2">
                    {!preference.enabled && <Pill>Muted</Pill>}
                    <span className="truncate text-[12px] text-[var(--text3)]">
                      {preferenceSummary(preference, "full")}
                    </span>
                  </div>
                </div>
                <UiButton
                  variant="outline"
                  size="sm"
                  aria-label={`Reset to default for ${preference.channel?.name ?? "this channel"}`}
                  onClick={() =>
                    deletePreference.mutate({
                      channelId: preference.projectAlertChannelId,
                      category: preference.category,
                    })
                  }
                  disabled={deletePreference.isPending}
                >
                  Reset to default
                </UiButton>
              </SheetListItem>
            ))}
          </SheetList>
        </Sheet>
      )}

      {/* ── create ── */}
      <FormDialog
        open={creating}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open) setFormError(null);
        }}
        title="New channel"
        submitLabel="Create channel"
        pending={createChannel.isPending}
        error={formError}
        onSubmit={(form) => {
          setFormError(null);
          createChannel.mutate(readChannelForm(form), {
            onSuccess: () => setCreating(false),
            onError: (mutationError) => setFormError(apiErrorMessage(mutationError)),
          });
        }}
      >
        <ChannelFields />
      </FormDialog>

      {/* ── edit ── */}
      <FormDialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setFormError(null);
          }
        }}
        title={editing ? `Edit ${editing.name}` : "Edit channel"}
        submitLabel="Save changes"
        pending={updateChannel.isPending}
        error={formError}
        onSubmit={(form) => {
          if (!editing) return;
          setFormError(null);
          updateChannel.mutate(
            { id: editing.id, payload: { ...readChannelForm(form), version: editing.version } },
            {
              onSuccess: () => setEditing(null),
              onError: (mutationError) => setFormError(apiErrorMessage(mutationError)),
            },
          );
        }}
      >
        {editing && <ChannelFields channel={editing} />}
      </FormDialog>

      {/* ── personal preference ── */}
      <FormDialog
        open={!!tuning}
        onOpenChange={(open) => {
          if (!open) {
            setTuning(null);
            setFormError(null);
          }
        }}
        title={tuning ? `My delivery preferences for ${tuning.name}` : "My delivery preferences"}
        description="These settings apply to your account only."
        submitLabel="Save preference"
        pending={upsertPreference.isPending}
        error={formError}
        onSubmit={(form) => {
          if (!tuning) return;
          setFormError(null);
          upsertPreference.mutate(
            {
              channelId: tuning.id,
              payload: {
                category: String(form.get("category") ?? "all"),
                severityThreshold: String(form.get("severityThreshold") ?? "warning") as ChannelSeverity,
                digestMode: String(form.get("digestMode") ?? "immediate") as ChannelDigestMode,
                enabled: form.get("enabled") === "on",
              },
            },
            {
              onSuccess: () => setTuning(null),
              onError: (mutationError) => setFormError(apiErrorMessage(mutationError)),
            },
          );
        }}
      >
        {tuning && (
          <>
            <DialogField label="Category" name="category" hint="Enter “all” to cover every alert category.">
              <input
                id="category"
                name="category"
                defaultValue={preferenceFor(tuning.id)?.category ?? "all"}
                maxLength={100}
                autoComplete="off"
                className={fieldInputClass}
              />
            </DialogField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DialogField label="Minimum severity" name="severityThreshold">
                <select
                  id="severityThreshold"
                  name="severityThreshold"
                  defaultValue={preferenceFor(tuning.id)?.severityThreshold ?? "warning"}
                  className={fieldInputClass}
                >
                  {CHANNEL_SEVERITIES.map((severity) => (
                    <option key={severity} value={severity}>
                      {sentenceCase(severity)}
                    </option>
                  ))}
                </select>
              </DialogField>
              <DialogField label="Digest cadence" name="digestMode">
                <select
                  id="digestMode"
                  name="digestMode"
                  defaultValue={preferenceFor(tuning.id)?.digestMode ?? "immediate"}
                  className={fieldInputClass}
                >
                  {CHANNEL_DIGEST_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {sentenceCase(mode)}
                    </option>
                  ))}
                </select>
              </DialogField>
            </div>
            <label className="flex items-center gap-2.5 border-t border-[var(--border)] pt-4 text-[13px] text-[var(--text)]">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={preferenceFor(tuning.id)?.enabled ?? true}
                className={CHECKBOX_CLASS}
              />
              Deliver alerts to me on this channel
            </label>
          </>
        )}
      </FormDialog>

      {/* ── delete ── */}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "channel"}?`}
        description="Alert routes and thresholds pointing at this channel stop delivering. Member preferences for it are removed."
        confirmLabel="Delete channel"
        pending={deleteChannel.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteChannel.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
      />
    </WorkspacePage>
  );
}
