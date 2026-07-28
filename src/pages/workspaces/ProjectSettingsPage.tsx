import { useState } from "react";
import { useNavigate } from "react-router";
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
import { cn } from "@/lib/utils";

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
  const { projectId, project } = useCurrentProject();
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
            {/* Lifecycle card with glassmorphism */}
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg1)]/70 backdrop-blur-sm">
              <div className="border-b border-[var(--border)] px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--green)]/10">
                    <Play className="size-3.5 text-[var(--green)]" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-semibold text-[var(--text)]">Lifecycle</h3>
                    <p className="text-[11px] text-[var(--text3)]">Control ingestion without deleting data</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 p-4">
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
              <div className="border-t border-[var(--border)] px-5 py-3">
                <p className="text-[11.5px] text-[var(--text3)]">
                  Current state: <Pill tone={project.status === "active" ? "green" : "amber"}>{project.status}</Pill>
                </p>
              </div>
            </div>

            {/* Metadata card */}
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg1)]/70 backdrop-blur-sm">
              <div className="border-b border-[var(--border)] px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <FileText className="size-4 text-[var(--text2)]" />
                  <h3 className="text-[13px] font-semibold text-[var(--text)]">Metadata</h3>
                </div>
              </div>
              <dl className="flex flex-col gap-3 p-5 text-[12.5px]">
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
            </div>
          </>
        }
      >
        {/* ── identity section ── */}
        <form onSubmit={handleProfileSubmit}>
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg1)]/70 backdrop-blur-sm transition-all duration-200 hover:shadow-md hover:shadow-[var(--brand)]/5">
            <div className="border-b border-[var(--border)] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--brand)]/10">
                  <Sliders className="size-4 text-[var(--brand)]" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">Identity</h3>
                  <p className="text-[12px] text-[var(--text3)]">Name, description, visibility, and tags</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-5 p-6">
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
            <div className="border-t border-[var(--border)] px-6 py-3.5">
              <UiButton type="submit" size="lg" disabled={updateProject.isPending}>
                {updateProject.isPending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 size-3.5" />
                )}
                Save identity
              </UiButton>
            </div>
          </div>
        </form>

        {/* ── retention + sampling ── */}
        <form onSubmit={handleRetentionSubmit}>
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg1)]/70 backdrop-blur-sm transition-all duration-200 hover:shadow-md hover:shadow-[var(--brand)]/5">
            <div className="border-b border-[var(--border)] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--blue)]/10">
                  <Database className="size-4 text-[var(--blue)]" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">Retention & sampling</h3>
                  <p className="text-[12px] text-[var(--text3)]">How long telemetry is kept and what fraction is stored</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
              <DialogField label="Retention (days)" name="dataRetentionDays" hint="1-3650 days.">
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
            <div className="border-t border-[var(--border)] px-6 py-3.5">
              <UiButton type="submit" size="lg" disabled={updateSettings.isPending || isLoading}>
                {updateSettings.isPending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 size-3.5" />
                )}
                Save retention
              </UiButton>
            </div>
          </div>
        </form>

        {/* ── pipelines ── */}
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg1)]/70 backdrop-blur-sm">
          <div className="border-b border-[var(--border)] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--green)]/10">
                <ShieldCheck className="size-4 text-[var(--green)]" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">Ingestion pipelines</h3>
                <p className="text-[12px] text-[var(--text3)]">Reject a telemetry type at the edge by turning it off</p>
              </div>
            </div>
          </div>
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
        </div>

        {/* ── privacy ── */}
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg1)]/70 backdrop-blur-sm">
          <div className="border-b border-[var(--border)] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--violet)]/10">
                <Eye className="size-4 text-[var(--violet)]" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">Privacy</h3>
                <p className="text-[12px] text-[var(--text3)]">Data minimisation controls applied at ingest</p>
              </div>
            </div>
          </div>
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
        </div>

        {/* ── domains ── */}
        <form onSubmit={handleDomainsSubmit}>
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg1)]/70 backdrop-blur-sm transition-all duration-200 hover:shadow-md hover:shadow-[var(--brand)]/5">
            <div className="border-b border-[var(--border)] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--amber)]/10">
                  <Ban className="size-4 text-[var(--amber)]" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">Domain rules</h3>
                  <p className="text-[12px] text-[var(--text3)]">Restrict which origins may submit browser telemetry</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
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
            <div className="border-t border-[var(--border)] px-6 py-3.5">
              <UiButton type="submit" size="lg" disabled={updateSettings.isPending || isLoading}>
                {updateSettings.isPending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 size-3.5" />
                )}
                Save domains
              </UiButton>
            </div>
          </div>
        </form>

        {/* ── danger zone with gradient red border ── */}
        <div className={cn(
          "overflow-hidden rounded-2xl border-2 border-[var(--red)]/30 bg-gradient-to-br from-[var(--red)]/5 to-transparent",
        )}>
          <div className="border-b border-[var(--red)]/20 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--red)]/10">
                <ShieldAlert className="size-4 text-[var(--red)]" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--red)]">Danger zone</h3>
                <p className="text-[12px] text-[var(--text3)]">Deleting a project soft-deletes it. Data is purged when retention expires.</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <Notice tone="red" icon={AlertTriangle} title="This stops ingestion immediately">
              Every API key for this project is revoked and all alert routing stops. A soft-deleted project can be
              recovered with <strong>Restore soft-deleted</strong> until retention expires.
            </Notice>
          </div>
          <div className="border-t border-[var(--red)]/20 px-6 py-3.5">
            <UiButton variant="destructive" size="lg" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-1.5 size-4" /> Delete project
            </UiButton>
          </div>
        </div>
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
          deleteProject.mutate(projectId, { onSuccess: () => navigate("/projects") });
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
