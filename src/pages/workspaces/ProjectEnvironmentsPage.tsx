import { useState } from "react";
import {
  Gauge,
  Globe,
  Layers,
  Lock,
  Mail,
  Pencil,
  Plus,
  ShieldBan,
  ShieldCheck,
  Star,
  Trash2,
  Webhook,
} from "lucide-react";
import { useEnvironment, useEnvironmentMutations, useEnvironments } from "@/modules/projects/hooks/useEnvironments";
import type { EnvironmentBody, ProjectEnvironment } from "@/modules/projects/api/types";
import { WELL_KNOWN_ENVIRONMENTS } from "@/modules/projects/api/types";
import { useCurrentProject } from "./ProjectShellPage";
import { IconChip, Notice, Panel, Pill, SectionHeading, fieldInputClass, fieldTextareaClass } from "@/shared/ui/pulse";
import { Timestamp, formatBytes, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  ConfirmDialog,
  DialogField,
  FormDialog,
  apiErrorMessage,
  optionalNumber,
  optionalText,
  parseList,
} from "@/modules/projects/components/project-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

const PROD_LIKE = new Set(["production", "prod", "live"]);

function envTone(environment: ProjectEnvironment) {
  if (!environment.isActive) return "neutral" as const;
  if (PROD_LIKE.has(environment.slug)) return "red" as const;
  if (environment.slug.includes("stag") || environment.slug === "canary") return "amber" as const;
  return "green" as const;
}

// ── environment form ─────────────────────────────────────────

function readEnvironmentForm(form: FormData): EnvironmentBody & { name: string } {
  return {
    name: String(form.get("name") ?? "").trim(),
    description: optionalText(form.get("description")) ?? null,
    isActive: form.get("isActive") === "on",
    isDefault: form.get("isDefault") === "on",
    requireHttps: form.get("requireHttps") === "on",
    rateLimitPerSecond: optionalNumber(form.get("rateLimitPerSecond")) ?? null,
    rateLimitPerMinute: optionalNumber(form.get("rateLimitPerMinute")) ?? null,
    rateLimitPerHour: optionalNumber(form.get("rateLimitPerHour")) ?? null,
    burstLimit: optionalNumber(form.get("burstLimit")) ?? null,
    maxEventSizeBytes: optionalNumber(form.get("maxEventSizeBytes")) ?? null,
    maxBatchSize: optionalNumber(form.get("maxBatchSize")) ?? null,
    allowedEventTypes: parseList(form.get("allowedEventTypes")),
    ipAllowlist: parseList(form.get("ipAllowlist")),
    ipBlocklist: parseList(form.get("ipBlocklist")),
    alertEmail: optionalText(form.get("alertEmail")) ?? null,
    alertWebhookUrl: optionalText(form.get("alertWebhookUrl")) ?? null,
  };
}

function EnvironmentFields({ environment }: { environment?: ProjectEnvironment }) {
  return (
    <>
      <DialogField label="Name" name="name" required hint="Letters, numbers, dashes, underscores.">
        <input
          id="name"
          name="name"
          required
          defaultValue={environment?.name}
          pattern="[a-zA-Z0-9_-]+"
          maxLength={100}
          placeholder="production"
          list="well-known-environments"
          className={fieldInputClass}
        />
        <datalist id="well-known-environments">
          {WELL_KNOWN_ENVIRONMENTS.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </DialogField>

      <DialogField label="Description" name="description">
        <textarea
          id="description"
          name="description"
          defaultValue={environment?.description ?? ""}
          maxLength={2000}
          className={fieldTextareaClass}
        />
      </DialogField>

      <div className="grid grid-cols-2 gap-3">
        <DialogField label="Rate / second" name="rateLimitPerSecond">
          <input
            id="rateLimitPerSecond"
            name="rateLimitPerSecond"
            type="number"
            min={1}
            defaultValue={environment?.rateLimitPerSecond ?? ""}
            placeholder="unlimited"
            className={fieldInputClass}
          />
        </DialogField>
        <DialogField label="Rate / minute" name="rateLimitPerMinute">
          <input
            id="rateLimitPerMinute"
            name="rateLimitPerMinute"
            type="number"
            min={1}
            defaultValue={environment?.rateLimitPerMinute ?? ""}
            placeholder="unlimited"
            className={fieldInputClass}
          />
        </DialogField>
        <DialogField label="Rate / hour" name="rateLimitPerHour">
          <input
            id="rateLimitPerHour"
            name="rateLimitPerHour"
            type="number"
            min={1}
            defaultValue={environment?.rateLimitPerHour ?? ""}
            placeholder="unlimited"
            className={fieldInputClass}
          />
        </DialogField>
        <DialogField label="Burst limit" name="burstLimit">
          <input
            id="burstLimit"
            name="burstLimit"
            type="number"
            min={1}
            defaultValue={environment?.burstLimit ?? ""}
            placeholder="unlimited"
            className={fieldInputClass}
          />
        </DialogField>
        <DialogField label="Max event size (bytes)" name="maxEventSizeBytes">
          <input
            id="maxEventSizeBytes"
            name="maxEventSizeBytes"
            type="number"
            min={1}
            defaultValue={environment?.maxEventSizeBytes ?? ""}
            placeholder="default"
            className={fieldInputClass}
          />
        </DialogField>
        <DialogField label="Max batch size" name="maxBatchSize">
          <input
            id="maxBatchSize"
            name="maxBatchSize"
            type="number"
            min={1}
            max={10000}
            defaultValue={environment?.maxBatchSize ?? ""}
            placeholder="default"
            className={fieldInputClass}
          />
        </DialogField>
      </div>

      <DialogField label="Allowed event types" name="allowedEventTypes" hint="Comma separated. Empty allows all.">
        <input
          id="allowedEventTypes"
          name="allowedEventTypes"
          defaultValue={environment?.allowedEventTypes?.join(", ") ?? ""}
          placeholder="error, request, log"
          className={fieldInputClass}
        />
      </DialogField>

      <div className="grid grid-cols-2 gap-3">
        <DialogField label="IP allowlist" name="ipAllowlist" hint="Comma separated IPv4/IPv6.">
          <textarea
            id="ipAllowlist"
            name="ipAllowlist"
            defaultValue={environment?.ipAllowlist?.join(", ") ?? ""}
            className={fieldTextareaClass}
          />
        </DialogField>
        <DialogField label="IP blocklist" name="ipBlocklist" hint="Comma separated IPv4/IPv6.">
          <textarea
            id="ipBlocklist"
            name="ipBlocklist"
            defaultValue={environment?.ipBlocklist?.join(", ") ?? ""}
            className={fieldTextareaClass}
          />
        </DialogField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DialogField label="Alert email" name="alertEmail">
          <input
            id="alertEmail"
            name="alertEmail"
            type="email"
            defaultValue={environment?.alertEmail ?? ""}
            className={fieldInputClass}
          />
        </DialogField>
        <DialogField label="Alert webhook URL" name="alertWebhookUrl">
          <input
            id="alertWebhookUrl"
            name="alertWebhookUrl"
            type="url"
            defaultValue={environment?.alertWebhookUrl ?? ""}
            className={fieldInputClass}
          />
        </DialogField>
      </div>

      <div className="flex flex-wrap gap-5 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-3.5 py-3">
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--text)]">
          <input type="checkbox" name="isActive" defaultChecked={environment?.isActive ?? true} className="size-4" />
          Active
        </label>
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--text)]">
          <input type="checkbox" name="isDefault" defaultChecked={environment?.isDefault ?? false} className="size-4" />
          Default environment
        </label>
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--text)]">
          <input
            type="checkbox"
            name="requireHttps"
            defaultChecked={environment?.requireHttps ?? true}
            className="size-4"
          />
          Require HTTPS
        </label>
      </div>
    </>
  );
}

// ── environment card ─────────────────────────────────────────

function EnvironmentCard({
  environment,
  onEdit,
  onDelete,
}: {
  environment: ProjectEnvironment;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tone = envTone(environment);
  const limits = [
    environment.rateLimitPerSecond ? `${formatNumber(environment.rateLimitPerSecond)}/s` : null,
    environment.rateLimitPerMinute ? `${formatNumber(environment.rateLimitPerMinute)}/min` : null,
    environment.rateLimitPerHour ? `${formatNumber(environment.rateLimitPerHour)}/hr` : null,
  ].filter(Boolean);

  return (
    <div className="pulse-edge flex flex-col gap-4 rounded-[14px] border border-[var(--border)] bg-[var(--bg1)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconChip icon={Layers} tone={tone} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-[14px] font-semibold text-[var(--text)]">{environment.name}</p>
              {environment.isDefault && (
                <Pill tone="brand">
                  <Star className="size-3" aria-hidden="true" /> Default
                </Pill>
              )}
              <Pill tone={environment.isActive ? "green" : "neutral"} dot>
                {environment.isActive ? "active" : "inactive"}
              </Pill>
            </div>
            <code className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">{environment.slug}</code>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <UiButton variant="outline" size="icon-sm" aria-label={`Edit ${environment.name}`} onClick={onEdit}>
            <Pencil className="size-3.5" />
          </UiButton>
          <UiButton
            variant="outline"
            size="icon-sm"
            aria-label={`Delete ${environment.name}`}
            onClick={onDelete}
            disabled={environment.isDefault}
          >
            <Trash2 className="size-3.5 text-[var(--red)]" />
          </UiButton>
        </div>
      </div>

      {environment.description && (
        <p className="text-[12.5px] leading-relaxed text-[var(--text2)]">{environment.description}</p>
      )}

      <dl className="grid grid-cols-2 gap-x-5 gap-y-3">
        <div className="flex flex-col gap-0.5">
          <dt className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">
            <Gauge className="size-3" aria-hidden="true" /> Rate limits
          </dt>
          <dd className="text-[12.5px] font-medium text-[var(--text)]">
            {limits.length > 0 ? limits.join(" · ") : "Inherited"}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">
            <Lock className="size-3" aria-hidden="true" /> Transport
          </dt>
          <dd className="text-[12.5px] font-medium text-[var(--text)]">
            {environment.requireHttps ? "HTTPS required" : "HTTP allowed"}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">
            <Globe className="size-3" aria-hidden="true" /> Payload caps
          </dt>
          <dd className="text-[12.5px] font-medium text-[var(--text)]">
            {environment.maxEventSizeBytes ? formatBytes(environment.maxEventSizeBytes) : "Default"}
            {environment.maxBatchSize ? ` · batch ${formatNumber(environment.maxBatchSize)}` : ""}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">
            <ShieldCheck className="size-3" aria-hidden="true" /> IP rules
          </dt>
          <dd className="text-[12.5px] font-medium text-[var(--text)]">
            {(environment.ipAllowlist?.length ?? 0) > 0
              ? `${environment.ipAllowlist!.length} allowed`
              : "No allowlist"}
            {(environment.ipBlocklist?.length ?? 0) > 0 ? ` · ${environment.ipBlocklist!.length} blocked` : ""}
          </dd>
        </div>
      </dl>

      {(environment.allowedEventTypes?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {environment.allowedEventTypes.map((type) => (
            <span
              key={type}
              className="rounded-full bg-[var(--bg2)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--text2)] ring-1 ring-inset ring-[var(--border)]"
            >
              {type}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--border)] pt-3 text-[11.5px] text-[var(--text3)]">
        <span>
          Created <Timestamp value={environment.createdAt} />
        </span>
        {environment.alertEmail && (
          <span className="inline-flex items-center gap-1">
            <Mail className="size-3" aria-hidden="true" /> {environment.alertEmail}
          </span>
        )}
        {environment.alertWebhookUrl && (
          <span className="inline-flex items-center gap-1">
            <Webhook className="size-3" aria-hidden="true" /> webhook set
          </span>
        )}
      </div>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectEnvironmentsPage() {
  const { projectId } = useCurrentProject();
  const { data: environments = [], isLoading, error } = useEnvironments(projectId);
  const { createEnvironment, updateEnvironment, deleteEnvironment } = useEnvironmentMutations(projectId);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProjectEnvironment | null>(null);
  const [deleting, setDeleting] = useState<ProjectEnvironment | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // The list projection can omit or stale-cache policy fields, so the edit form
  // is populated from a fresh single-environment read when available.
  const { data: editingDetail } = useEnvironment(projectId, editing?.id);
  const editingSource = editingDetail ?? editing;

  const asMessage = apiErrorMessage;

  const handleCreate = (form: FormData) => {
    setFormError(null);
    createEnvironment.mutate(readEnvironmentForm(form), {
      onSuccess: () => setCreating(false),
      onError: (mutationError) => setFormError(asMessage(mutationError)),
    });
  };

  const handleUpdate = (form: FormData) => {
    if (!editing) return;
    setFormError(null);
    updateEnvironment.mutate(
      { environmentId: editing.id, payload: readEnvironmentForm(form) },
      {
        onSuccess: () => setEditing(null),
        onError: (mutationError) => setFormError(asMessage(mutationError)),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Environments"
        description="Environments scope ingestion keys, rate limits, and payload policy. Every API key belongs to exactly one environment."
        actions={
          <UiButton size="lg" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 size-4" /> New environment
          </UiButton>
        }
      />

      {environments.length === 0 && !isLoading && !error && (
        <Notice tone="amber" icon={ShieldBan} title="No environments yet">
          Ingestion keys cannot be created until at least one environment exists. Start with{" "}
          <code className="font-[family-name:var(--mono)]">development</code> and{" "}
          <code className="font-[family-name:var(--mono)]">production</code>.
        </Notice>
      )}

      {isLoading || error || environments.length === 0 ? (
        <Panel>
          {isLoading && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {[0, 1].map((row) => (
                <div key={row} className="h-56 animate-pulse rounded-[12px] bg-[var(--bg2)]" />
              ))}
            </div>
          )}
          {error && (
            <p className="text-[13px] text-[var(--red)]">{(error as Error).message}</p>
          )}
          {!isLoading && !error && environments.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <IconChip icon={Layers} size="lg" tone="brand" />
              <p className="text-[13.5px] font-semibold text-[var(--text)]">Create your first environment</p>
              <UiButton size="lg" onClick={() => setCreating(true)}>
                <Plus className="mr-1.5 size-4" /> New environment
              </UiButton>
            </div>
          )}
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {environments.map((environment) => (
            <EnvironmentCard
              key={environment.id}
              environment={environment}
              onEdit={() => {
                setFormError(null);
                setEditing(environment);
              }}
              onDelete={() => setDeleting(environment)}
            />
          ))}
        </div>
      )}

      <FormDialog
        open={creating}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open) setFormError(null);
        }}
        title="New environment"
        description="Rate limits and payload caps left blank inherit organization defaults."
        submitLabel="Create environment"
        pending={createEnvironment.isPending}
        error={formError}
        onSubmit={handleCreate}
        width="sm:max-w-[680px]"
      >
        <EnvironmentFields />
      </FormDialog>

      <FormDialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setFormError(null);
          }
        }}
        title={editingSource ? `Edit ${editingSource.name}` : "Edit environment"}
        submitLabel="Save changes"
        pending={updateEnvironment.isPending}
        error={formError}
        onSubmit={handleUpdate}
        width="sm:max-w-[680px]"
      >
        {editingSource && <EnvironmentFields key={editingSource.id} environment={editingSource} />}
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "environment"}?`}
        description="Ingestion keys bound to this environment stop working immediately. Historical data is retained until retention expires."
        confirmLabel="Delete environment"
        pending={deleteEnvironment.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteEnvironment.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
      />
    </div>
  );
}
