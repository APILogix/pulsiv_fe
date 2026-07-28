import { useState } from "react";
import {
  Bell,
  BellOff,
  CheckCircle2,
  Hash,
  Mail,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Settings2,
  Star,
  Trash2,
  Webhook,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  useAlertChannelMutations,
  useAlertChannels,
  useMyChannelPreferences,
} from "@/modules/projects/hooks/useProjectAlerting";
import {
  CHANNEL_DIGEST_MODES,
  CHANNEL_SEVERITIES,
  type AlertChannelBody,
  type ChannelDigestMode,
  type ChannelSeverity,
  type ProjectAlertChannel,
} from "@/modules/projects/api/types";
import { useCurrentProject } from "./ProjectShellPage";
import {
  IconChip,
  Notice,
  Panel,
  Pill,
  RowStack,
  SectionHeading,
  StatCard,
  Toggle,
  Toolbar,
  fieldInputClass,
  fieldTextareaClass,
} from "@/shared/ui/pulse";
import { FilterSelect, Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  ConfirmDialog,
  DialogField,
  FormDialog,
  apiErrorMessage,
  optionalText,
} from "@/modules/projects/components/project-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const CHANNEL_TYPES: Array<{ value: string; label: string; icon: LucideIcon; hint: string }> = [
  { value: "email", label: "Email", icon: Mail, hint: "Destination optional -- falls back to member emails." },
  { value: "slack", label: "Slack", icon: Hash, hint: "Use a connector or a channel webhook URL." },
  { value: "webhook", label: "Webhook", icon: Webhook, hint: "HTTPS endpoint receiving the alert payload." },
  { value: "teams", label: "Microsoft Teams", icon: MessageSquare, hint: "Incoming webhook URL." },
  { value: "sms", label: "SMS", icon: Send, hint: "E.164 phone number." },
];

const CHANNEL_ICON: Record<string, LucideIcon> = {
  email: Mail,
  slack: Hash,
  webhook: Webhook,
  teams: MessageSquare,
  sms: Send,
};

/** Channel-type specific accent colors */
const CHANNEL_ACCENT: Record<string, string> = {
  email: "var(--blue)",
  slack: "var(--brand)",
  webhook: "var(--violet)",
  teams: "var(--blue)",
  sms: "var(--green)",
};

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "All types" },
  ...CHANNEL_TYPES.map((type) => ({ value: type.value, label: type.label })),
];

const ENABLED_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "true", label: "Enabled" },
  { value: "false", label: "Disabled" },
];

const asMessage = apiErrorMessage;

// ── channel form ─────────────────────────────────────────────

function ChannelFields({ channel }: { channel?: ProjectAlertChannel }) {
  const [channelType, setChannelType] = useState(channel?.channelType ?? "email");
  const active = CHANNEL_TYPES.find((type) => type.value === channelType);

  return (
    <>
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
          placeholder="On-call Slack"
          className={fieldInputClass}
        />
      </DialogField>

      <DialogField label="Destination" name="destination" hint={active?.hint}>
        <input
          id="destination"
          name="destination"
          defaultValue={channel?.destination ?? ""}
          maxLength={2048}
          placeholder={channelType === "email" ? "oncall@example.com" : "https://hooks.example.com/..."}
          className={fieldInputClass}
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
          placeholder="UUID of an organization connector"
          className={fieldInputClass}
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

      <div className="flex flex-wrap gap-5 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-3.5 py-3">
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--text)]">
          <input type="checkbox" name="enabled" defaultChecked={channel?.enabled ?? true} className="size-4" />
          Enabled
        </label>
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--text)]">
          <input type="checkbox" name="isDefault" defaultChecked={channel?.isDefault ?? false} className="size-4" />
          Default channel for this project
        </label>
      </div>
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

  const { data, isLoading, error } = useAlertChannels(projectId, {
    ...(channelType ? { channelType } : {}),
    ...(enabledFilter ? { enabled: enabledFilter === "true" } : {}),
  });
  const channels = data?.data ?? [];

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

  const enabledCount = channels.filter((channel) => channel.enabled).length;
  const defaultChannel = channels.find((channel) => channel.isDefault);

  // Sort: enabled first, disabled at bottom
  const sortedChannels = [...channels].sort((a, b) => {
    if (a.enabled === b.enabled) return 0;
    return a.enabled ? -1 : 1;
  });

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Alert channels"
        description="Where this project delivers alerts. Each member can additionally tune severity, digest cadence, and quiet hours per channel."
        actions={
          <UiButton size="lg" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 size-4" /> New channel
          </UiButton>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Channels" value={data?.total ?? channels.length} icon={Bell} tone="brand" />
        <StatCard label="Enabled" value={enabledCount} icon={CheckCircle2} tone="green" />
        <StatCard
          label="Disabled"
          value={channels.length - enabledCount}
          icon={BellOff}
          tone={channels.length - enabledCount > 0 ? "amber" : "neutral"}
        />
        <StatCard label="My preferences" value={preferences.length} icon={Settings2} tone="violet" />
      </div>

      {channels.length > 0 && !defaultChannel && (
        <Notice tone="amber" icon={Star} title="No default channel">
          Alerts without an explicit route fall back to the default channel. Mark one channel as default.
        </Notice>
      )}

      <Toolbar>
        <FilterSelect label="Type" value={channelType} onChange={setChannelType} options={TYPE_FILTER_OPTIONS} />
        <FilterSelect label="State" value={enabledFilter} onChange={setEnabledFilter} options={ENABLED_FILTER_OPTIONS} />
      </Toolbar>

      {error && <Notice tone="red">{asMessage(error)}</Notice>}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((row) => (
            <div key={row} className="h-40 animate-pulse rounded-[14px] bg-[var(--bg2)]" />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <IconChip icon={Bell} size="lg" tone="brand" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">No alert channels yet</p>
            <p className="max-w-[48ch] text-[12.5px] text-[var(--text2)]">
              Add an email or Slack channel so threshold breaches and alert routes have somewhere to go.
            </p>
            <UiButton size="lg" onClick={() => setCreating(true)}>
              <Plus className="mr-1.5 size-4" /> New channel
            </UiButton>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sortedChannels.map((channel) => {
            const Icon = CHANNEL_ICON[channel.channelType] ?? Bell;
            const preference = preferenceFor(channel.id);
            const accent = CHANNEL_ACCENT[channel.channelType] ?? "var(--brand)";
            return (
              <div
                key={channel.id}
                className="pulse-edge relative flex flex-col gap-3.5 overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-opacity"
                style={{ opacity: channel.enabled ? 1 : 0.6 }}
              >
                {/* Channel-type accent bar at top */}
                <span
                  className="absolute inset-x-0 top-0 h-[3px]"
                  style={{ background: `linear-gradient(90deg, ${accent}, transparent 80%)` }}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <IconChip icon={Icon} tone={channel.enabled ? "brand" : "neutral"} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[14px] font-semibold text-[var(--text)]">{channel.name}</p>
                        {channel.isDefault && (
                          <Pill tone="brand">
                            <Star className="size-3" aria-hidden="true" /> Default
                          </Pill>
                        )}
                      </div>
                      <p className="truncate font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">
                        {channel.channelType}
                        {channel.destination ? ` · ${channel.destination}` : ""}
                      </p>
                    </div>
                  </div>
                  <Toggle
                    checked={channel.enabled}
                    label={`Toggle ${channel.name}`}
                    disabled={toggleChannel.isPending}
                    onChange={(next) =>
                      toggleChannel.mutate({ id: channel.id, enabled: next, version: channel.version })
                    }
                  />
                </div>

                {channel.description && (
                  <p className="text-[12.5px] leading-relaxed text-[var(--text2)]">{channel.description}</p>
                )}

                {/* Preference badge strip */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {preference ? (
                    <>
                      <Pill tone={preference.enabled ? "green" : "neutral"} dot>
                        {preference.enabled ? "delivering" : "muted"}
                      </Pill>
                      <Pill tone="blue">{preference.severityThreshold}+</Pill>
                      <Pill tone="neutral">{preference.digestMode}</Pill>
                      <Pill tone="neutral">{preference.category}</Pill>
                    </>
                  ) : (
                    <span className="text-[11.5px] text-[var(--text3)]">Using project defaults</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                  <span className="text-[11.5px] text-[var(--text3)]">
                    Updated <Timestamp value={channel.updatedAt} />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <UiButton
                      variant="outline"
                      size="sm"
                      disabled
                      title="Coming soon"
                    >
                      <Zap className="mr-1 size-3.5" /> Test delivery
                    </UiButton>
                    <UiButton variant="outline" size="sm" onClick={() => setTuning(channel)}>
                      <Settings2 className="mr-1 size-3.5" /> Preferences
                    </UiButton>
                    <UiButton
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Edit ${channel.name}`}
                      onClick={() => {
                        setFormError(null);
                        setEditing(channel);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </UiButton>
                    <UiButton
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Delete ${channel.name}`}
                      onClick={() => setDeleting(channel)}
                    >
                      <Trash2 className="size-3.5 text-[var(--red)]" />
                    </UiButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {preferences.length > 0 && (
        <Panel
          title="My channel preferences"
          description="Personal overrides across every channel in this project."
          icon={Settings2}
          bodyClassName="p-0"
        >
          <RowStack>
            {preferences.map((preference) => (
              <div key={preference.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[var(--text)]">
                    {preference.channel?.name ?? preference.projectAlertChannelId}
                  </p>
                  <p className="text-[11.5px] text-[var(--text3)]">
                    {preference.category} · {preference.severityThreshold}+ · {preference.digestMode}
                  </p>
                </div>
                <UiButton
                  variant="ghost"
                  size="sm"
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
              </div>
            ))}
          </RowStack>
        </Panel>
      )}

      {/* ── create ── */}
      <FormDialog
        open={creating}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open) setFormError(null);
        }}
        title="New alert channel"
        submitLabel="Create channel"
        pending={createChannel.isPending}
        error={formError}
        onSubmit={(form) => {
          setFormError(null);
          createChannel.mutate(readChannelForm(form), {
            onSuccess: () => setCreating(false),
            onError: (mutationError) => setFormError(asMessage(mutationError)),
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
              onError: (mutationError) => setFormError(asMessage(mutationError)),
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
        title={tuning ? `My preferences for ${tuning.name}` : "Channel preferences"}
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
              onError: (mutationError) => setFormError(asMessage(mutationError)),
            },
          );
        }}
      >
        {tuning && (
          <>
            <DialogField label="Category" name="category" hint="Use 'all' to cover every alert category.">
              <input
                id="category"
                name="category"
                defaultValue={preferenceFor(tuning.id)?.category ?? "all"}
                maxLength={100}
                className={fieldInputClass}
              />
            </DialogField>
            <div className="grid grid-cols-2 gap-3">
              <DialogField label="Minimum severity" name="severityThreshold">
                <select
                  id="severityThreshold"
                  name="severityThreshold"
                  defaultValue={preferenceFor(tuning.id)?.severityThreshold ?? "warning"}
                  className={fieldInputClass}
                >
                  {CHANNEL_SEVERITIES.map((severity) => (
                    <option key={severity} value={severity}>
                      {severity}
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
                      {mode}
                    </option>
                  ))}
                </select>
              </DialogField>
            </div>
            <label className="flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-3.5 py-3 text-[12.5px] text-[var(--text)]">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={preferenceFor(tuning.id)?.enabled ?? true}
                className="size-4"
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
    </div>
  );
}
