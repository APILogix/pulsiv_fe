import { useState } from "react";
import {
  Bell,
  BellRing,
  Hash,
  Mail,
  MonitorSmartphone,
  RefreshCcw,
  Send,
  Webhook,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  useAlertPreferenceMutations,
  useAlertPreferences,
  type MemberNotificationPreference,
} from "@/modules/projects/hooks/useAlertPreferences";
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
import { QuietHoursPicker, type QuietHours } from "@/components/ui/quiet-hours-picker";
import { DialogField, FormDialog, apiErrorMessage } from "@/modules/projects/components/project-ui";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md §1.2) ───────────────────

const CHANNEL_ICON: Record<string, LucideIcon> = {
  email: Mail,
  slack: Hash,
  webhook: Webhook,
  push: MonitorSmartphone,
  sms: Send,
};

const CHANNEL_COLOR: Record<string, string> = {
  email: "var(--blue)",
  slack: "var(--violet)",
  webhook: "var(--green)",
  push: "var(--amber)",
  sms: "var(--amber)",
};

const SEVERITY_CHOICES = ["info", "warning", "error", "critical"] as const;
const DIGEST_CHOICES = ["immediate", "hourly", "daily", "weekly"] as const;

const SEVERITY_TONE: Record<string, "blue" | "amber" | "red" | "neutral"> = {
  info: "blue",
  warning: "amber",
  error: "red",
  critical: "red",
};

const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: false,
  start: "22:00",
  end: "08:00",
  timezone: "UTC",
};

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
  const { data: preferences = [], isLoading, error } = useAlertPreferences(projectId);
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

  const openTuning = (preference: MemberNotificationPreference) => {
    setFormError(null);
    setQuietHours(quietHoursOf(preference));
    setTuning(preference);
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="My notification preferences"
        description="Personal delivery settings for this project, per channel and alert category."
        actions={
          <UiButton
            variant="outline"
            size="lg"
            onClick={() => syncPreferences.mutate()}
            disabled={syncPreferences.isPending}
          >
            <RefreshCcw className={cn("mr-1.5 size-4", syncPreferences.isPending && "animate-spin")} />
            Sync defaults
          </UiButton>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Preferences" value={preferences.length} icon={Bell} tone="brand" />
        <StatCard label="Receiving" value={enabledCount} icon={BellRing} tone="green" />
        <StatCard label="Muted" value={mutedCount} icon={Bell} tone={mutedCount > 0 ? "amber" : "neutral"} />
        <StatCard label="Quiet hours set" value={quietCount} icon={MonitorSmartphone} tone="violet" />
      </div>

      {error && <Notice tone="red">{apiErrorMessage(error)}</Notice>}

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[0, 1].map((row) => (
            <div key={row} className="h-48 animate-pulse rounded-2xl bg-[var(--bg2)]" />
          ))}
        </div>
      ) : preferences.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <IconChip icon={Bell} size="lg" tone="brand" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">No preferences yet</p>
            <p className="max-w-[48ch] text-[12.5px] text-[var(--text2)]">
              Run <strong>Sync defaults</strong> to create a preference row for every channel and alert category this
              project supports.
            </p>
            <UiButton size="lg" onClick={() => syncPreferences.mutate()} disabled={syncPreferences.isPending}>
              <RefreshCcw className="mr-1.5 size-4" /> Sync defaults
            </UiButton>
          </div>
        </Panel>
      ) : (
        Object.entries(byChannel).map(([channel, entries]) => {
          const Icon = CHANNEL_ICON[channel] ?? Bell;
          const channelColor = CHANNEL_COLOR[channel] ?? "var(--text3)";
          const channelEnabled = entries.filter((entry) => entry.enabled).length;

          return (
            <div
              key={channel}
              className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg1)]/70 backdrop-blur-sm"
            >
              {/* Channel header with colored icon */}
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className="flex size-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `color-mix(in srgb, ${channelColor} 12%, transparent)` }}
                  >
                    <Icon className="size-5" style={{ color: channelColor }} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold capitalize tracking-[-0.01em] text-[var(--text)]">{channel}</h3>
                    <p className="text-[11.5px] text-[var(--text3)]">
                      {channelEnabled} of {entries.length} categories delivering
                    </p>
                  </div>
                </div>
                {/* Severity matrix summary */}
                <div className="hidden items-center gap-1 sm:flex">
                  {SEVERITY_CHOICES.map((sev) => {
                    const count = entries.filter((e) => e.severityThreshold === sev && e.enabled).length;
                    return (
                      <div
                        key={sev}
                        className={cn(
                          "flex size-7 items-center justify-center rounded-md text-[10px] font-bold",
                          count > 0
                            ? sev === "critical" || sev === "error"
                              ? "bg-[var(--red)]/10 text-[var(--red)]"
                              : sev === "warning"
                                ? "bg-[var(--amber)]/10 text-[var(--amber)]"
                                : "bg-[var(--blue)]/10 text-[var(--blue)]"
                            : "bg-[var(--bg2)] text-[var(--text3)]",
                        )}
                        title={`${sev}: ${count} active`}
                      >
                        {count}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preference rows */}
              <div className="divide-y divide-[var(--border)]">
                {entries.map((preference) => {
                  const quiet = quietHoursOf(preference);
                  return (
                    <div
                      key={preference.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--bg2)]/30"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-semibold capitalize text-[var(--text)]">
                            {preference.category}
                          </p>
                          <Pill tone={SEVERITY_TONE[preference.severityThreshold] ?? "neutral"}>
                            {preference.severityThreshold}+
                          </Pill>
                          <Pill tone="neutral">{preference.digestMode}</Pill>
                          {quiet.enabled && (
                            <Pill tone="violet">
                              quiet {quiet.start}-{quiet.end}
                            </Pill>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-[var(--text3)]">
                          Updated <Timestamp value={preference.updatedAt} />
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <UiButton variant="outline" size="sm" onClick={() => openTuning(preference)}>
                          Configure
                        </UiButton>
                        <Toggle
                          checked={preference.enabled}
                          label={`Toggle ${preference.channel} ${preference.category}`}
                          disabled={updatePreference.isPending}
                          onChange={(next) =>
                            updatePreference.mutate({
                              prefId: preference.id,
                              payload: { enabled: next },
                            })
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      <FormDialog
        open={!!tuning}
        onOpenChange={(open) => {
          if (!open) {
            setTuning(null);
            setFormError(null);
          }
        }}
        title={tuning ? `${tuning.channel} · ${tuning.category}` : "Configure preference"}
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
            <div className="grid grid-cols-2 gap-3">
              <DialogField label="Minimum severity" name="severityThreshold">
                <select
                  id="severityThreshold"
                  name="severityThreshold"
                  defaultValue={tuning.severityThreshold}
                  className={fieldInputClass}
                >
                  {SEVERITY_CHOICES.map((severity) => (
                    <option key={severity} value={severity}>
                      {severity}
                    </option>
                  ))}
                </select>
              </DialogField>
              <DialogField label="Digest cadence" name="digestMode">
                <select id="digestMode" name="digestMode" defaultValue={tuning.digestMode} className={fieldInputClass}>
                  {DIGEST_CHOICES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </DialogField>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-3.5 py-3 text-[12.5px] text-[var(--text)]">
              <input type="checkbox" name="enabled" defaultChecked={tuning.enabled} className="size-4" />
              Deliver these alerts to me
            </label>

            <QuietHoursPicker value={quietHours} onChange={setQuietHours} />

            <Notice tone="amber" icon={BellRing}>
              Quiet hours suppress non-critical delivery on this channel. Critical alerts may still be delivered
              depending on organization policy.
            </Notice>
          </>
        )}
      </FormDialog>
    </div>
  );
}
