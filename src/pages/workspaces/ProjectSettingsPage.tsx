import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, Loader2 } from "lucide-react";

import { projectsListPath } from "@/modules/projects/navigation/project-routes";
import { useProjectMutations, useProjectSettings } from "@/modules/projects/hooks/useProjects";
import type { ProjectSettings, UpdateProjectSettingsBody } from "@/modules/projects/api/types";
import {
  ConfirmDialog,
  DialogField,
  TogglePanelRow,
  apiErrorMessage,
  optionalText,
  parseList,
} from "@/modules/projects/components/project-ui";
import { ProjectPageHeader, SETTINGS_COLUMN, WorkspacePage } from "@/modules/projects/components/project-page";
import {
  Notice,
  Panel,
  Pill,
  RowStack,
  SettingRow,
  fieldInputClass,
  fieldMonoClass,
  fieldTextareaClass,
} from "@/shared/ui/pulse";
import { Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { PROJECT_STATUS_TONE, useCurrentProject } from "./ProjectShellPage";

// ── module-level constants (rules.md §1.2) ───────────────────

const PIPELINE_TOGGLES: Array<{
  key: keyof ProjectSettings;
  label: string;
  description: string;
}> = [
  { key: "errorMonitoringEnabled", label: "Error monitoring", description: "Accept exception and crash events." },
  {
    key: "performanceMonitoringEnabled",
    label: "Performance monitoring",
    description: "Accept transactions and latency measurements.",
  },
  { key: "traceIngestionEnabled", label: "Trace ingestion", description: "Accept distributed traces and spans." },
  { key: "logIngestionEnabled", label: "Log ingestion", description: "Accept structured log lines." },
  { key: "metricIngestionEnabled", label: "Metric ingestion", description: "Accept custom and system metrics." },
  { key: "profileIngestionEnabled", label: "Profile ingestion", description: "Accept CPU and memory profiles." },
  {
    key: "sessionReplayEnabled",
    label: "Session replay",
    description: "Accept replay recordings. Increases storage consumption substantially.",
  },
  {
    key: "releaseTrackingEnabled",
    label: "Release tracking",
    description: "Associate events with releases and deploy markers.",
  },
];

const PRIVACY_TOGGLES: Array<{ key: keyof ProjectSettings; label: string; description: string }> = [
  {
    key: "piiScrubbingEnabled",
    label: "PII scrubbing",
    description: "Strip emails, tokens, and card-like strings from payloads before storage.",
  },
  {
    key: "ipCollectionEnabled",
    label: "Store client IP addresses",
    description: "Disable to drop IPs at ingest for stricter privacy compliance.",
  },
];

// Rows inside a flush panel share the panel header's inset.
const ROW_CLASS = "px-5 py-4";

const asMessage = apiErrorMessage;

function SaveButton({ pending, disabled, children }: { pending: boolean; disabled?: boolean; children: ReactNode }) {
  return (
    <UiButton type="submit" size="lg" disabled={pending || disabled}>
      {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
      {children}
    </UiButton>
  );
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectSettingsPage() {
  const navigate = useNavigate();
  const { projectId, project, orgSlug } = useCurrentProject();
  const { data: settings, isLoading, error: settingsLoadError, refetch: refetchSettings } = useProjectSettings(projectId);
  const { updateProject, updateSettings, deleteProject, transition } = useProjectMutations(projectId);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteAcknowledged, setDeleteAcknowledged] = useState("");
  const [deleteMismatch, setDeleteMismatch] = useState(false);

  // Uncontrolled fields read their defaults once. Remount the settings forms
  // when the settings first arrive, so a form rendered during the load never
  // shows (and saves) the fallback values.
  const settingsFormKey = settings ? "ready" : "loading";

  const patchSettings = (payload: UpdateProjectSettingsBody) => {
    setSettingsError(null);
    updateSettings.mutate(
      { id: projectId, payload: { ...payload, ...(settings ? { version: settings.version } : {}) } },
      { onError: (mutationError) => setSettingsError(asMessage(mutationError)) },
    );
  };

  const handleProfileSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError(null);
    const form = new FormData(event.currentTarget);
    updateProject.mutate(
      {
        id: projectId,
        payload: {
          name: String(form.get("name") ?? "").trim(),
          description: optionalText(form.get("description")) ?? null,
          timezone: String(form.get("timezone") ?? project.timezone).trim(),
          tags: parseList(form.get("tags")),
          version: project.version,
        },
      },
      { onError: (mutationError) => setProfileError(asMessage(mutationError)) },
    );
  };

  const handleDomainsSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    patchSettings({
      allowedDomains: parseList(form.get("allowedDomains")),
      blockedDomains: parseList(form.get("blockedDomains")),
    });
  };

  const handleRetentionSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const retention = Number(form.get("dataRetentionDays"));
    const sampling = Number(form.get("samplingRate"));
    patchSettings({
      ...(Number.isFinite(retention) ? { dataRetentionDays: retention } : {}),
      ...(Number.isFinite(sampling) ? { samplingRate: sampling / 100 } : {}),
    });
  };

  const closeDeleteDialog = (open: boolean) => {
    setConfirmDelete(open);
    if (!open) {
      setDeleteAcknowledged("");
      setDeleteMismatch(false);
    }
  };

  const settingsBusy = updateSettings.isPending;

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="General"
        description="Identity, ingestion, retention, privacy, and deletion for this project. Every change is recorded in the audit log."
        meta={[
          { label: "Slug", value: project.slug, mono: true },
          { label: "Public ID", value: project.publicId, mono: true },
          { label: "Created", value: <Timestamp value={project.createdAt} /> },
          { label: "Updated", value: <Timestamp value={project.updatedAt} /> },
          { label: "Version", value: project.version, mono: true },
          settings ? { label: "Settings version", value: settings.version, mono: true } : null,
        ]}
      />

      <div className={`${SETTINGS_COLUMN} flex flex-col gap-6`}>
        {settingsLoadError && (
          <div role="alert">
            <Notice
              tone="red"
              icon={AlertTriangle}
              title="Could not load settings"
              action={
                <UiButton variant="outline" size="sm" onClick={() => void refetchSettings()}>
                  Try again
                </UiButton>
              }
            >
              {asMessage(settingsLoadError)} Retention, ingestion, privacy, and domain settings can't be edited until they load.
            </Notice>
          </div>
        )}

        {settingsError && (
          <div role="alert">
            <Notice tone="red" icon={AlertTriangle} title="Could not save settings">
              {settingsError}
            </Notice>
          </div>
        )}

        {/* ── identity ── */}
        <form onSubmit={handleProfileSubmit}>
          <Panel
            title="Identity"
            description="How this project is named and described across the organization."
            footer={
              <SaveButton pending={updateProject.isPending}>Save identity</SaveButton>
            }
          >
            <div className="flex flex-col gap-5">
              <DialogField label="Name" name="name" required>
                <input
                  id="name"
                  name="name"
                  required
                  defaultValue={project.name}
                  maxLength={255}
                  autoComplete="off"
                  className={fieldInputClass}
                />
              </DialogField>
              <DialogField label="Description" name="description">
                <textarea
                  id="description"
                  name="description"
                  defaultValue={project.description ?? ""}
                  maxLength={5000}
                  className={fieldTextareaClass}
                />
              </DialogField>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <DialogField
                  label="Timezone"
                  name="timezone"
                  hint="An IANA name such as Europe/Berlin. Used for daily rollups and digests."
                >
                  <input
                    id="timezone"
                    name="timezone"
                    defaultValue={project.timezone}
                    maxLength={100}
                    autoComplete="off"
                    spellCheck={false}
                    className={fieldMonoClass}
                  />
                </DialogField>
                <DialogField label="Tags" name="tags" hint="Comma separated, up to 20.">
                  <input
                    id="tags"
                    name="tags"
                    defaultValue={project.tags.join(", ")}
                    autoComplete="off"
                    className={fieldInputClass}
                  />
                </DialogField>
              </div>
              {profileError && (
                <div role="alert">
                  <Notice tone="red" icon={AlertTriangle} title="Could not save identity">
                    {profileError}
                  </Notice>
                </div>
              )}
            </div>
          </Panel>
        </form>

        {/* ── retention + sampling ── */}
        <form key={`retention-${settingsFormKey}`} onSubmit={handleRetentionSubmit}>
          <Panel
            title="Retention and sampling"
            description="How long telemetry is kept, and what share of traffic is stored."
            footer={
              <SaveButton pending={settingsBusy} disabled={isLoading || !settings}>
                Save retention
              </SaveButton>
            }
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <DialogField label="Retention (days)" name="dataRetentionDays" hint="Between 1 and 3,650 days.">
                <input
                  id="dataRetentionDays"
                  name="dataRetentionDays"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={3650}
                  defaultValue={settings?.dataRetentionDays ?? 30}
                  disabled={!settings}
                  className={fieldMonoClass}
                />
              </DialogField>
              <DialogField label="Sampling rate (%)" name="samplingRate" hint="100% stores every event.">
                <input
                  id="samplingRate"
                  name="samplingRate"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={settings ? Math.round(settings.samplingRate * 100) : 100}
                  disabled={!settings}
                  className={fieldMonoClass}
                />
              </DialogField>
            </div>
          </Panel>
        </form>

        {/* ── pipelines ── */}
        <Panel
          title="Ingestion"
          description="Turn a telemetry type off to reject it at the edge. Changes save as you toggle."
          bodyClassName="p-0"
        >
          <RowStack>
            {PIPELINE_TOGGLES.map((toggle) => (
              <TogglePanelRow
                key={String(toggle.key)}
                label={toggle.label}
                description={toggle.description}
                checked={Boolean(settings?.[toggle.key])}
                disabled={isLoading || !settings || settingsBusy}
                onChange={(next) => patchSettings({ [toggle.key]: next } as UpdateProjectSettingsBody)}
              />
            ))}
          </RowStack>
        </Panel>

        {/* ── privacy ── */}
        <Panel
          title="Privacy"
          description="Data minimisation applied at ingest. Changes save as you toggle."
          bodyClassName="p-0"
        >
          <RowStack>
            {PRIVACY_TOGGLES.map((toggle) => (
              <TogglePanelRow
                key={String(toggle.key)}
                label={toggle.label}
                description={toggle.description}
                checked={Boolean(settings?.[toggle.key])}
                disabled={isLoading || !settings || settingsBusy}
                onChange={(next) => patchSettings({ [toggle.key]: next } as UpdateProjectSettingsBody)}
              />
            ))}
          </RowStack>
        </Panel>

        {/* ── domains ── */}
        <form key={`domains-${settingsFormKey}`} onSubmit={handleDomainsSubmit}>
          <Panel
            title="Domain rules"
            description="Restrict which origins may send browser telemetry to this project."
            footer={
              <SaveButton pending={settingsBusy} disabled={isLoading || !settings}>
                Save domains
              </SaveButton>
            }
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <DialogField label="Allowed domains" name="allowedDomains" hint="Comma or newline separated.">
                <textarea
                  id="allowedDomains"
                  name="allowedDomains"
                  defaultValue={settings?.allowedDomains.join(", ") ?? ""}
                  placeholder="app.example.com"
                  disabled={!settings}
                  spellCheck={false}
                  className={`${fieldTextareaClass} font-[family-name:var(--mono)] text-[12px]`}
                />
              </DialogField>
              <DialogField label="Blocked domains" name="blockedDomains" hint="Takes precedence over the allowlist.">
                <textarea
                  id="blockedDomains"
                  name="blockedDomains"
                  defaultValue={settings?.blockedDomains.join(", ") ?? ""}
                  placeholder="staging.example.com"
                  disabled={!settings}
                  spellCheck={false}
                  className={`${fieldTextareaClass} font-[family-name:var(--mono)] text-[12px]`}
                />
              </DialogField>
            </div>
          </Panel>
        </form>

        {/* ── lifecycle ── */}
        <Panel
          title="Lifecycle"
          description="Pause ingestion or archive the project. Neither deletes data."
          actions={
            <Pill tone={PROJECT_STATUS_TONE[project.status]} dot>
              {project.status}
            </Pill>
          }
          bodyClassName="p-0"
        >
          <RowStack>
            <div className={ROW_CLASS}>
              {project.status === "active" ? (
                <SettingRow
                  label="Ingestion"
                  description="The project is accepting events. Pausing stops ingestion until you resume; existing data is kept."
                >
                  <UiButton
                    variant="outline"
                    onClick={() => transition.mutate({ id: projectId, action: "pause" })}
                    disabled={transition.isPending}
                  >
                    Pause ingestion
                  </UiButton>
                </SettingRow>
              ) : (
                <SettingRow label="Ingestion" description="Ingestion is stopped. Resume to accept events again.">
                  <UiButton
                    variant="outline"
                    onClick={() => transition.mutate({ id: projectId, action: "resume" })}
                    disabled={transition.isPending}
                  >
                    Resume ingestion
                  </UiButton>
                </SettingRow>
              )}
            </div>
            <div className={ROW_CLASS}>
              {project.status === "archived" ? (
                <SettingRow label="Archive" description="This project is archived. Unarchive it to use it again.">
                  <UiButton
                    variant="outline"
                    onClick={() => transition.mutate({ id: projectId, action: "unarchive" })}
                    disabled={transition.isPending}
                  >
                    Unarchive project
                  </UiButton>
                </SettingRow>
              ) : (
                <SettingRow
                  label="Archive"
                  description="Archived projects stop ingesting and keep their data until retention expires."
                >
                  <UiButton
                    variant="outline"
                    onClick={() => transition.mutate({ id: projectId, action: "archive" })}
                    disabled={transition.isPending}
                  >
                    Archive project
                  </UiButton>
                </SettingRow>
              )}
            </div>
            <div className={ROW_CLASS}>
              <SettingRow
                label="Restore"
                description="Recovers a soft-deleted project, as long as its retention period hasn't expired."
              >
                <UiButton
                  variant="outline"
                  onClick={() => transition.mutate({ id: projectId, action: "restore" })}
                  disabled={transition.isPending}
                >
                  Restore soft-deleted
                </UiButton>
              </SettingRow>
            </div>
          </RowStack>
        </Panel>

        {/* ── danger zone ── */}
        <Panel title="Danger zone" icon={AlertTriangle} danger>
          <SettingRow
            label="Delete this project"
            description="Stops ingestion immediately: every API key for this project is revoked and all alert routing stops. The project is soft-deleted, so Restore soft-deleted recovers it until retention expires and its data is purged."
          >
            <UiButton variant="destructive" size="lg" onClick={() => setConfirmDelete(true)}>
              Delete project
            </UiButton>
          </SettingRow>
        </Panel>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={closeDeleteDialog}
        title={`Delete ${project.name}?`}
        description="This revokes every API key and stops ingestion. Type the project slug to confirm."
        confirmLabel="Delete project"
        pending={deleteProject.isPending}
        onConfirm={() => {
          if (deleteAcknowledged !== project.slug) {
            setDeleteMismatch(true);
            return;
          }
          deleteProject.mutate(projectId, { onSuccess: () => navigate(projectsListPath(orgSlug)) });
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm-slug" className="text-[13px] text-[var(--text2)]">
            Type <code className="font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{project.slug}</code> to
            confirm
          </label>
          <input
            id="confirm-slug"
            value={deleteAcknowledged}
            onChange={(event) => {
              setDeleteAcknowledged(event.target.value);
              setDeleteMismatch(false);
            }}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={deleteMismatch || undefined}
            aria-describedby={deleteMismatch ? "confirm-slug-error" : undefined}
            className={fieldMonoClass}
          />
          {deleteMismatch && (
            <p id="confirm-slug-error" role="alert" className="text-[12px] text-[var(--red)]">
              That doesn't match the slug. Type it exactly as shown.
            </p>
          )}
        </div>
      </ConfirmDialog>
    </WorkspacePage>
  );
}
