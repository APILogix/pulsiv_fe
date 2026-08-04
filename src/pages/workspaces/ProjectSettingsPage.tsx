import { useState } from "react";
import { useNavigate } from "react-router";
import { projectsListPath } from "@/modules/projects/navigation/project-routes";
import {
  AlertTriangle,
  Archive,
  Ban,
  Database,
  Eye,
  FileText,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Trash2,
} from "lucide-react";
import { useProjectMutations, useProjectSettings } from "@/modules/projects/hooks/useProjects";
import type { ProjectSettings, UpdateProjectSettingsBody } from "@/modules/projects/api/types";
import { useCurrentProject } from "./ProjectShellPage";
import {
  Notice,
  Panel,
  Pill,
  RowStack,
  SectionHeading,
  SplitShell,
  fieldInputClass,
  fieldTextareaClass,
} from "@/shared/ui/pulse";
import { Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  ConfirmDialog,
  DialogField,
  TogglePanelRow,
  apiErrorMessage,
  optionalText,
  parseList,
} from "@/modules/projects/components/project-ui";

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

const asMessage = apiErrorMessage;

// ── page ─────────────────────────────────────────────────────

export default function ProjectSettingsPage() {
  const navigate = useNavigate();
  const { projectId, project, orgSlug } = useCurrentProject();
  const { data: settings, isLoading } = useProjectSettings(projectId);
  const { updateProject, updateSettings, deleteProject, transition } = useProjectMutations(projectId);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteAcknowledged, setDeleteAcknowledged] = useState("");

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
          visibility: String(form.get("visibility") ?? project.visibility) as typeof project.visibility,
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

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Project settings"
        description="Identity, ingestion policy, retention, and privacy controls. Changes are audit-logged."
      />

      {settingsError && (
        <Notice tone="red" icon={AlertTriangle} title="Could not save settings">
          {settingsError}
        </Notice>
      )}

      <SplitShell
        rail={
          <>
            <Panel title="Lifecycle" description="Control ingestion without deleting data." icon={Play}>
              <div className="flex flex-col gap-2">
                {project.status === "active" ? (
                  <UiButton
                    variant="outline"
                    size="lg"
                    className="justify-start"
                    onClick={() => transition.mutate({ id: projectId, action: "pause" })}
                    disabled={transition.isPending}
                  >
                    <Pause className="mr-2 size-4 text-[var(--amber)]" /> Pause ingestion
                  </UiButton>
                ) : (
                  <UiButton
                    variant="outline"
                    size="lg"
                    className="justify-start"
                    onClick={() => transition.mutate({ id: projectId, action: "resume" })}
                    disabled={transition.isPending}
                  >
                    <Play className="mr-2 size-4 text-[var(--green)]" /> Resume ingestion
                  </UiButton>
                )}
                {project.status === "archived" ? (
                  <UiButton
                    variant="outline"
                    size="lg"
                    className="justify-start"
                    onClick={() => transition.mutate({ id: projectId, action: "unarchive" })}
                    disabled={transition.isPending}
                  >
                    <RotateCcw className="mr-2 size-4" /> Unarchive project
                  </UiButton>
                ) : (
                  <UiButton
                    variant="outline"
                    size="lg"
                    className="justify-start"
                    onClick={() => transition.mutate({ id: projectId, action: "archive" })}
                    disabled={transition.isPending}
                  >
                    <Archive className="mr-2 size-4" /> Archive project
                  </UiButton>
                )}
                <UiButton
                  variant="outline"
                  size="lg"
                  className="justify-start"
                  onClick={() => transition.mutate({ id: projectId, action: "restore" })}
                  disabled={transition.isPending}
                >
                  <RotateCcw className="mr-2 size-4" /> Restore soft-deleted
                </UiButton>
              </div>
              <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--text3)]">
                Current state: <Pill tone={project.status === "active" ? "green" : "amber"}>{project.status}</Pill>
              </p>
            </Panel>

            <Panel title="Metadata" icon={FileText}>
              <dl className="flex flex-col gap-3 text-[12.5px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--text3)]">Slug</dt>
                  <dd className="font-[family-name:var(--mono)] text-[var(--text)]">{project.slug}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--text3)]">Version</dt>
                  <dd className="tabular-nums text-[var(--text)]">{project.version}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--text3)]">Created</dt>
                  <dd className="text-[var(--text)]">
                    <Timestamp value={project.createdAt} />
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--text3)]">Updated</dt>
                  <dd className="text-[var(--text)]">
                    <Timestamp value={project.updatedAt} />
                  </dd>
                </div>
                {settings && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--text3)]">Settings version</dt>
                    <dd className="tabular-nums text-[var(--text)]">{settings.version}</dd>
                  </div>
                )}
              </dl>
            </Panel>
          </>
        }
      >
        {/* ── identity ── */}
        <form onSubmit={handleProfileSubmit}>
          <Panel
            title="Identity"
            description="Name, description, visibility, and tags."
            icon={Sliders}
            footer={
              <UiButton type="submit" size="lg" disabled={updateProject.isPending}>
                {updateProject.isPending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 size-3.5" />
                )}
                Save identity
              </UiButton>
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DialogField label="Visibility" name="visibility">
                  <select
                    id="visibility"
                    name="visibility"
                    defaultValue={project.visibility}
                    className={fieldInputClass}
                  >
                    <option value="private">Private</option>
                    <option value="organization">Organization</option>
                    <option value="public">Public</option>
                  </select>
                </DialogField>
                <DialogField label="Timezone" name="timezone">
                  <input
                    id="timezone"
                    name="timezone"
                    defaultValue={project.timezone}
                    maxLength={100}
                    className={fieldInputClass}
                  />
                </DialogField>
              </div>
              <DialogField label="Tags" name="tags" hint="Comma separated, up to 20.">
                <input id="tags" name="tags" defaultValue={project.tags.join(", ")} className={fieldInputClass} />
              </DialogField>
              {profileError && (
                <Notice tone="red" icon={AlertTriangle}>
                  {profileError}
                </Notice>
              )}
            </div>
          </Panel>
        </form>

        {/* ── retention + sampling ── */}
        <form onSubmit={handleRetentionSubmit}>
          <Panel
            title="Retention & sampling"
            description="How long telemetry is kept and what fraction of traffic is stored."
            icon={Database}
            footer={
              <UiButton type="submit" size="lg" disabled={updateSettings.isPending || isLoading}>
                {updateSettings.isPending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 size-3.5" />
                )}
                Save retention
              </UiButton>
            }
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <DialogField label="Retention (days)" name="dataRetentionDays" hint="1–3650 days.">
                <input
                  id="dataRetentionDays"
                  name="dataRetentionDays"
                  type="number"
                  min={1}
                  max={3650}
                  defaultValue={settings?.dataRetentionDays ?? 30}
                  className={fieldInputClass}
                />
              </DialogField>
              <DialogField label="Sampling rate (%)" name="samplingRate" hint="100% stores every event.">
                <input
                  id="samplingRate"
                  name="samplingRate"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={settings ? Math.round(settings.samplingRate * 100) : 100}
                  className={fieldInputClass}
                />
              </DialogField>
            </div>
          </Panel>
        </form>

        {/* ── pipelines ── */}
        <Panel
          title="Ingestion pipelines"
          description="Reject a telemetry type at the edge by turning it off here."
          icon={ShieldCheck}
          bodyClassName="p-0"
        >
          <RowStack>
            {PIPELINE_TOGGLES.map((toggle) => (
              <TogglePanelRow
                key={String(toggle.key)}
                label={toggle.label}
                description={toggle.description}
                checked={Boolean(settings?.[toggle.key])}
                disabled={isLoading || updateSettings.isPending}
                onChange={(next) => patchSettings({ [toggle.key]: next } as UpdateProjectSettingsBody)}
              />
            ))}
          </RowStack>
        </Panel>

        {/* ── privacy ── */}
        <Panel title="Privacy" description="Data minimisation controls applied at ingest." icon={Eye} bodyClassName="p-0">
          <RowStack>
            {PRIVACY_TOGGLES.map((toggle) => (
              <TogglePanelRow
                key={String(toggle.key)}
                label={toggle.label}
                description={toggle.description}
                checked={Boolean(settings?.[toggle.key])}
                disabled={isLoading || updateSettings.isPending}
                onChange={(next) => patchSettings({ [toggle.key]: next } as UpdateProjectSettingsBody)}
              />
            ))}
          </RowStack>
        </Panel>

        {/* ── domains ── */}
        <form onSubmit={handleDomainsSubmit}>
          <Panel
            title="Domain rules"
            description="Restrict which origins may submit browser telemetry to this project."
            icon={Ban}
            footer={
              <UiButton type="submit" size="lg" disabled={updateSettings.isPending || isLoading}>
                {updateSettings.isPending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 size-3.5" />
                )}
                Save domains
              </UiButton>
            }
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <DialogField label="Allowed domains" name="allowedDomains" hint="Comma or newline separated.">
                <textarea
                  id="allowedDomains"
                  name="allowedDomains"
                  defaultValue={settings?.allowedDomains.join(", ") ?? ""}
                  placeholder="app.example.com"
                  className={fieldTextareaClass}
                />
              </DialogField>
              <DialogField label="Blocked domains" name="blockedDomains" hint="Takes precedence over the allowlist.">
                <textarea
                  id="blockedDomains"
                  name="blockedDomains"
                  defaultValue={settings?.blockedDomains.join(", ") ?? ""}
                  placeholder="staging.example.com"
                  className={fieldTextareaClass}
                />
              </DialogField>
            </div>
          </Panel>
        </form>

        {/* ── danger zone ── */}
        <Panel
          title="Danger zone"
          description="Deleting a project soft-deletes it. Data is purged when retention expires."
          icon={ShieldAlert}
          danger
          footer={
            <UiButton variant="destructive" size="lg" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-1.5 size-4" /> Delete project
            </UiButton>
          }
        >
          <Notice tone="red" icon={AlertTriangle} title="This stops ingestion immediately">
            Every API key for this project is revoked and all alert routing stops. A soft-deleted project can be
            recovered with <strong>Restore soft-deleted</strong> until retention expires.
          </Notice>
        </Panel>
      </SplitShell>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={(open) => {
          setConfirmDelete(open);
          if (!open) setDeleteAcknowledged("");
        }}
        title={`Delete ${project.name}?`}
        description="Type the project slug to confirm. This revokes all keys and stops ingestion."
        confirmLabel="Delete project"
        pending={deleteProject.isPending}
        onConfirm={() => {
          if (deleteAcknowledged !== project.slug) return;
          deleteProject.mutate(projectId, { onSuccess: () => navigate(projectsListPath(orgSlug)) });
        }}
      >
        <div className="flex flex-col gap-2 px-4">
          <label htmlFor="confirm-slug" className="text-[12px] text-[var(--text2)]">
            Type <code className="font-[family-name:var(--mono)] text-[var(--text)]">{project.slug}</code> to confirm
          </label>
          <input
            id="confirm-slug"
            value={deleteAcknowledged}
            onChange={(event) => setDeleteAcknowledged(event.target.value)}
            className={fieldInputClass}
            autoComplete="off"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
