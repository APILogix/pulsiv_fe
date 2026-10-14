import { useState } from "react";
import { RefreshCcw } from "lucide-react";

import {
  useAlertPreferenceMutations,
  useAlertPreferences,
  type MemberNotificationPreference,
} from "@/modules/projects/hooks/useAlertPreferences";
import { EntitlementRestrictedBanner } from "@/modules/alerting/components/EntitlementRestrictedBanner";
import { DialogField, FormDialog, apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  ProjectPageHeader,
  Readouts,
  SETTINGS_COLUMN,
  Sheet,
  SheetEmpty,
  SheetError,
  WorkspacePage,
  type Readout,
} from "@/modules/projects/components/project-page";
import { Notice, Panel, Toggle, fieldInputClass } from "@/shared/ui/pulse";
import { Timestamp, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { QuietHoursPicker, type QuietHours } from "@/components/ui/quiet-hours-picker";
import { cn } from "@/lib/utils";
import { useCurrentProject } from "./ProjectShellPage";

// ── module-level constants (rules.md §1.2) ───────────────────

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  slack: "Slack",
  webhook: "Webhook",
  push: "Push",
  sms: "SMS",
};

const SEVERITY_CHOICES = ["info", "warning", "error", "critical"] as const;
const DIGEST_CHOICES = ["immediate", "hourly", "daily", "weekly"] as const;

const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: false,
  start: "22:00",
  end: "08:00",
  timezone: "UTC",
};

const CHECKBOX_CLASS = "size-4 shrink-0 cursor-pointer accent-[var(--text)]";

function sentenceCase(value: string) {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function channelLabel(channel: string) {
  return CHANNEL_LABEL[channel] ?? sentenceCase(channel);
}

function quietHoursOf(preference: MemberNotificationPreference): QuietHours {
  const raw = (preference.quietHours ?? {}) as Partial<QuietHours>;
  return {
    enabled: Boolean(raw.enabled),
    start: raw.start ?? DEFAULT_QUIET_HOURS.start,
    end: raw.end ?? DEFAULT_QUIET_HOURS.end,
    timezone: raw.timezone ?? DEFAULT_QUIET_HOURS.timezone,
  };
}

// ── page ─────────────────────────────────────────────────────

export default function MemberAlertPreferencesPage() {
  const { projectId } = useCurrentProject();
  const { data: preferences = [], isLoading, error, refetch } = useAlertPreferences(projectId);
  const { updatePreference, syncPreferences } = useAlertPreferenceMutations(projectId);

  const [tuning, setTuning] = useState<MemberNotificationPreference | null>(null);
  const [quietHours, setQuietHours] = useState<QuietHours>(DEFAULT_QUIET_HOURS);
  const [formError, setFormError] = useState<string | null>(null);

  const enabledCount = preferences.filter((preference) => preference.enabled).length;
  const mutedCount = preferences.length - enabledCount;
  const quietCount = preferences.filter((preference) => quietHoursOf(preference).enabled).length;

  const byChannel = preferences.reduce<Record<string, MemberNotificationPreference[]>>((groups, preference) => {
    (groups[preference.channel] ??= []).push(preference);
    return groups;
  }, {});
  const channelCount = Object.keys(byChannel).length;

  const readouts: Readout[] = [
    {
      label: "Preferences",
      value: formatNumber(preferences.length),
      sub: `Across ${formatNumber(channelCount)} ${channelCount === 1 ? "channel" : "channels"}`,
    },
    { label: "Receiving", value: formatNumber(enabledCount), sub: "Delivered to you" },
    { label: "Muted", value: formatNumber(mutedCount), sub: "Turned off by you" },
    { label: "Quiet hours", value: formatNumber(quietCount), sub: "Preferences with quiet hours" },
  ];

  const openTuning = (preference: MemberNotificationPreference) => {
    setFormError(null);
    setQuietHours(quietHoursOf(preference));
    setTuning(preference);
  };

  const syncButton = (primary: boolean) => (
    <UiButton
      variant={primary ? "default" : "outline"}
      size="lg"
      onClick={() => syncPreferences.mutate()}
      disabled={syncPreferences.isPending}
    >
      <RefreshCcw className={cn("size-4", syncPreferences.isPending && "animate-spin")} aria-hidden="true" />
      {syncPreferences.isPending ? "Syncing defaults" : "Sync defaults"}
    </UiButton>
  );

  let content;
  if (isLoading && preferences.length === 0) {
    content = (
      <div role="status" aria-label="Loading preferences" className="flex flex-col gap-6">
        {[0, 1].map((row) => (
          <div key={row} aria-hidden="true" className="loading-skeleton h-44 rounded-[var(--radius-lg)]" />
        ))}
      </div>
    );
  } else if (error && preferences.length === 0) {
    content = (
      <Sheet label="Notification preferences">
        <SheetError
          title="Could not load your preferences"
          message={apiErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      </Sheet>
    );
  } else if (preferences.length === 0) {
    content = (
      <Sheet label="Notification preferences">
        <SheetEmpty
          title="No preferences yet"
          description="Sync defaults to create a preference for every channel and alert category this project supports. You can then mute or tune each one."
          action={syncButton(true)}
        />
      </Sheet>
    );
  } else {
    content = Object.entries(byChannel).map(([channel, entries]) => {
      const delivering = entries.filter((entry) => entry.enabled).length;
      return (
        <Panel
          key={channel}
          title={channelLabel(channel)}
          description={`${formatNumber(delivering)} of ${formatNumber(entries.length)} categories delivering.`}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-[var(--border)]">
            {entries.map((preference) => {
              const quiet = quietHoursOf(preference);
              const category = sentenceCase(preference.category);
              return (
                <li
                  key={preference.id}
                  className={cn(
                    "flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
                    !preference.enabled && "[&_.pref-copy]:opacity-60",
                  )}
                >
                  <div className="pref-copy min-w-0">
                    <p className="text-[13px] font-medium text-[var(--text)]">{category}</p>
                    <p className="mt-0.5 text-[12px] leading-[1.5] text-[var(--text2)]">
                      {sentenceCase(preference.severityThreshold)} and above · {sentenceCase(preference.digestMode)}
                      {quiet.enabled && (
                        <>
                          {" · Quiet "}
                          <span className="font-[family-name:var(--mono)] text-[11.5px] tabular-nums">
                            {quiet.start}–{quiet.end}
                          </span>{" "}
                          {quiet.timezone}
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--text3)]">
                      Updated <Timestamp value={preference.updatedAt} />
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <UiButton
                      variant="outline"
                      size="sm"
                      onClick={() => openTuning(preference)}
                      aria-label={`Configure ${category} alerts by ${channelLabel(channel)}`}
                    >
                      Configure
                    </UiButton>
                    <Toggle
                      checked={preference.enabled}
                      label={`Deliver ${category} alerts by ${channelLabel(channel)}`}
                      disabled={updatePreference.isPending}
                      onChange={(next) =>
                        updatePreference.mutate({
                          prefId: preference.id,
                          payload: { enabled: next },
                        })
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      );
    });
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="My notifications"
        description="Your personal delivery settings for this project, per channel and alert category. They apply to your account only."
        actions={preferences.length > 0 ? syncButton(false) : undefined}
      />

      <div className={`${SETTINGS_COLUMN} flex flex-col gap-6`}>
        <EntitlementRestrictedBanner projectId={projectId} />

        {preferences.length > 0 && <Readouts cells={readouts} label="Preference summary" />}

        {error && preferences.length > 0 && (
          <div role="alert">
            <Notice tone="red" title="Could not refresh your preferences">
              {apiErrorMessage(error)}
            </Notice>
          </div>
        )}

        {content}
      </div>

      <FormDialog
        open={!!tuning}
        onOpenChange={(open) => {
          if (!open) {
            setTuning(null);
            setFormError(null);
          }
        }}
        title={tuning ? `${sentenceCase(tuning.category)} by ${channelLabel(tuning.channel)}` : "Configure preference"}
        description="Severity floor, digest cadence, and quiet hours for this channel and category."
        submitLabel="Save preference"
        pending={updatePreference.isPending}
        error={formError}
        onSubmit={(form) => {
          if (!tuning) return;
          setFormError(null);
          updatePreference.mutate(
            {
              prefId: tuning.id,
              payload: {
                enabled: form.get("enabled") === "on",
                severityThreshold: String(form.get("severityThreshold") ?? "warning"),
                digestMode: String(form.get("digestMode") ?? "immediate"),
                quietHours: quietHours.enabled ? { ...quietHours } : null,
              },
            },
            {
              onSuccess: () => setTuning(null),
              onError: (mutationError) => setFormError(apiErrorMessage(mutationError)),
            },
          );
        }}
        width="sm:max-w-[560px]"
      >
        {tuning && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DialogField label="Minimum severity" name="severityThreshold">
                <select
                  id="severityThreshold"
                  name="severityThreshold"
                  defaultValue={tuning.severityThreshold}
                  className={fieldInputClass}
                >
                  {SEVERITY_CHOICES.map((severity) => (
                    <option key={severity} value={severity}>
                      {sentenceCase(severity)}
                    </option>
                  ))}
                </select>
              </DialogField>
              <DialogField label="Digest cadence" name="digestMode">
                <select id="digestMode" name="digestMode" defaultValue={tuning.digestMode} className={fieldInputClass}>
                  {DIGEST_CHOICES.map((mode) => (
                    <option key={mode} value={mode}>
                      {sentenceCase(mode)}
                    </option>
                  ))}
                </select>
              </DialogField>
            </div>

            <label className="flex w-fit cursor-pointer items-center gap-2.5 text-[13px] text-[var(--text)]">
              <input type="checkbox" name="enabled" defaultChecked={tuning.enabled} className={CHECKBOX_CLASS} />
              Deliver these alerts to me
            </label>

            <QuietHoursPicker value={quietHours} onChange={setQuietHours} />

            <Notice tone="neutral">
              Quiet hours suppress non-critical delivery on this channel. Critical alerts may still be delivered
              depending on organization policy.
            </Notice>
          </>
        )}
      </FormDialog>
    </WorkspacePage>
  );
}
