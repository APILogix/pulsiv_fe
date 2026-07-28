/* Hallmark · genre: modern-minimal · tone: technical · component: environment management */
import { useMemo, useState } from "react";
import { ArchiveRestore, Layers, Pencil, Plus, Power, Search, Star, Trash2 } from "lucide-react";
import { useEnvironmentMutations, useEnvironments } from "@/modules/projects/hooks/useEnvironments";
import {
  EnvironmentType,
  type CreateEnvironmentBody,
  type EnvironmentBody,
  type ProjectEnvironment,
} from "@/modules/projects/api/types";
import {
  ENVIRONMENT_TYPE_OPTIONS,
  environmentTemplate,
  environmentTypeLabel,
} from "@/modules/projects/environment.constants";
import { useCurrentProject } from "./ProjectShellPage";
import { IconChip, Notice, Panel, Pill, SectionHeading, Toolbar, fieldInputClass, fieldTextareaClass } from "@/shared/ui/pulse";
import { FilterSelect, Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { ConfirmDialog, DialogField, FormDialog, apiErrorMessage, optionalText } from "@/modules/projects/components/project-ui";
import { cn } from "@/lib/utils";

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "All types" },
  ...ENVIRONMENT_TYPE_OPTIONS,
];
const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "deleted", label: "Deleted" },
];
const DEFAULT_FILTER_OPTIONS = [
  { value: "", label: "Default or standard" },
  { value: "default", label: "Default only" },
  { value: "standard", label: "Not default" },
];

const ENV_TYPE_BORDER_COLOR: Record<string, string> = {
  [EnvironmentType.PRODUCTION]: "border-l-[var(--red)]",
  [EnvironmentType.STAGING]: "border-l-[var(--amber)]",
  [EnvironmentType.PRE_STAGING]: "border-l-[var(--amber)]",
  [EnvironmentType.PRE_PRODUCTION]: "border-l-[var(--amber)]",
  [EnvironmentType.DEVELOPMENT]: "border-l-[var(--blue)]",
  [EnvironmentType.TESTING]: "border-l-[var(--violet)]",
  [EnvironmentType.CUSTOM]: "border-l-[var(--text3)]",
};

function typeTone(type: EnvironmentType) {
  if (type === EnvironmentType.PRODUCTION) return "red" as const;
  if ([EnvironmentType.STAGING, EnvironmentType.PRE_STAGING, EnvironmentType.PRE_PRODUCTION].includes(type)) return "amber" as const;
  if (type === EnvironmentType.DEVELOPMENT) return "blue" as const;
  return "neutral" as const;
}

function readEnvironmentForm(form: FormData): CreateEnvironmentBody {
  return {
    name: String(form.get("name") ?? "").trim(),
    slug: String(form.get("slug") ?? "").trim(),
    type: String(form.get("type") ?? EnvironmentType.CUSTOM) as EnvironmentType,
    description: optionalText(form.get("description")) ?? null,
    color: String(form.get("color") ?? "").trim(),
    isDefault: form.get("isDefault") === "on",
  };
}

function EnvironmentFields({ environment, allowDefault }: { environment?: ProjectEnvironment; allowDefault?: boolean }) {
  const initial = environment ?? environmentTemplate(EnvironmentType.CUSTOM);
  const [type, setType] = useState<EnvironmentType>(initial.type);
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [color, setColor] = useState(initial.color);
  const [description, setDescription] = useState(initial.description ?? "");

  const applyType = (nextType: EnvironmentType) => {
    const template = environmentTemplate(nextType);
    setType(nextType);
    setName(template.name);
    setSlug(template.slug);
    setColor(template.color);
    setDescription(template.description);
  };

  return (
    <>
      <DialogField label="Environment type" name="type" required hint="Choose a template, then edit any generated value.">
        <select
          id="type"
          name="type"
          value={type}
          onChange={(event) => applyType(event.target.value as EnvironmentType)}
          className={fieldInputClass}
          required
        >
          {ENVIRONMENT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </DialogField>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DialogField label="Name" name="name" required>
          <input id="name" name="name" value={name} onChange={(event) => setName(event.target.value)}
            maxLength={100} placeholder="Customer demo" className={fieldInputClass} required />
        </DialogField>
        <DialogField label="SDK slug" name="slug" required hint="Lowercase letters, numbers, and hyphens.">
          <input id="slug" name="slug" value={slug} onChange={(event) => setSlug(event.target.value)}
            maxLength={100} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="customer-demo"
            className={fieldInputClass} required />
        </DialogField>
      </div>

      <DialogField label="Color" name="color" required hint="Six-digit HEX color.">
        <div className="flex items-center gap-2">
          <input type="color" value={/^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#64748B"}
            onChange={(event) => setColor(event.target.value.toUpperCase())}
            className="size-11 shrink-0 rounded-[8px] border border-[var(--border)] bg-[var(--bg1)] p-1" aria-label="Environment color picker" />
          <input id="color" name="color" value={color} onChange={(event) => setColor(event.target.value)}
            pattern="#[0-9A-Fa-f]{6}" placeholder="#2563EB" className={fieldInputClass} required />
        </div>
      </DialogField>

      <DialogField label="Description" name="description">
        <textarea id="description" name="description" value={description}
          onChange={(event) => setDescription(event.target.value)} maxLength={2000}
          placeholder="Where and how this environment is used" className={fieldTextareaClass} />
      </DialogField>

      {allowDefault && (
        <label className="flex min-h-11 items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-3.5 text-[12.5px] text-[var(--text)]">
          <input type="checkbox" name="isDefault" className="size-4" />
          Make this the project default
        </label>
      )}
    </>
  );
}

function EnvironmentCard({ environment, activeCount, onEdit, onDefault, onActivate, onDeactivate, onDelete, onRestore }: {
  environment: ProjectEnvironment;
  activeCount: number;
  onEdit: () => void;
  onDefault: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const deleted = environment.deletedAt !== null;
  const borderClass = ENV_TYPE_BORDER_COLOR[environment.type] ?? "border-l-[var(--text3)]";

  return (
    <article
      className={cn(
        "group flex min-w-0 flex-col gap-4 rounded-2xl border border-[var(--border)] border-l-4 bg-[var(--bg1)]/70 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--brand)]/5",
        borderClass,
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3.5">
          {/* Large color swatch */}
          <div
            className="mt-0.5 size-10 shrink-0 rounded-xl ring-2 ring-[var(--border)] transition-transform duration-200 group-hover:scale-110"
            style={{ backgroundColor: environment.color }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-bold tracking-[-0.01em] text-[var(--text)]">{environment.name}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Pill tone={typeTone(environment.type)}>{environmentTypeLabel(environment.type)}</Pill>
              {environment.isDefault && <Pill tone="brand"><Star className="size-3" /> Default</Pill>}
              <Pill tone={deleted ? "neutral" : environment.isActive ? "green" : "amber"} dot>
                {deleted ? "deleted" : environment.isActive ? "active" : "inactive"}
              </Pill>
            </div>
          </div>
        </div>
      </div>

      <p className="min-h-10 text-[12.5px] leading-relaxed text-[var(--text2)]">
        {environment.description || "No description provided."}
      </p>

      {/* Slug display */}
      <div className="rounded-lg bg-[var(--bg2)]/60 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)]">SDK Slug</span>
        <code className="mt-0.5 block font-[family-name:var(--mono)] text-[12px] text-[var(--text)]">{environment.slug}</code>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3.5">
        <span className="text-[11px] text-[var(--text3)]">Updated <Timestamp value={environment.updatedAt} /></span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {deleted ? (
            <UiButton variant="outline" size="sm" onClick={onRestore}>
              <ArchiveRestore className="mr-1.5 size-3.5" /> Restore
            </UiButton>
          ) : (
            <>
              <UiButton variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="mr-1.5 size-3.5" /> Edit
              </UiButton>
              {!environment.isDefault && environment.isActive && (
                <UiButton variant="outline" size="sm" onClick={onDefault}>
                  <Star className="mr-1.5 size-3.5" /> Set default
                </UiButton>
              )}
              {!environment.isActive && (
                <UiButton variant="outline" size="sm" onClick={onActivate}>
                  <Power className="mr-1.5 size-3.5" /> Activate
                </UiButton>
              )}
              {environment.isActive && !environment.isDefault && (
                <UiButton variant="outline" size="sm" onClick={onDeactivate} disabled={activeCount <= 1}>
                  <Power className="mr-1.5 size-3.5" /> Deactivate
                </UiButton>
              )}
              <UiButton variant="outline" size="icon-sm" aria-label={`Delete ${environment.name}`}
                onClick={onDelete} disabled={environment.isDefault || (environment.isActive && activeCount <= 1)}>
                <Trash2 className="size-3.5 text-[var(--red)]" />
              </UiButton>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ProjectEnvironmentsPage() {
  const { projectId } = useCurrentProject();
  const { data: environments = [], isLoading, error } = useEnvironments(projectId, { includeDeleted: true });
  const mutations = useEnvironmentMutations(projectId);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [defaultFilter, setDefaultFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProjectEnvironment | null>(null);
  const [deleting, setDeleting] = useState<ProjectEnvironment | null>(null);
  const [deactivating, setDeactivating] = useState<ProjectEnvironment | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const activeCount = environments.filter((environment) => environment.isActive && !environment.deletedAt).length;
  const filtered = useMemo(() => environments.filter((environment) => {
    const haystack = `${environment.name} ${environment.description ?? ""}`.toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (type && environment.type !== type) return false;
    if (status === "active" && (!environment.isActive || environment.deletedAt)) return false;
    if (status === "inactive" && (environment.isActive || environment.deletedAt)) return false;
    if (status === "deleted" && !environment.deletedAt) return false;
    if (defaultFilter === "default" && !environment.isDefault) return false;
    if (defaultFilter === "standard" && environment.isDefault) return false;
    return true;
  }), [defaultFilter, environments, search, status, type]);

  const mutationError = (value: unknown) => setFormError(apiErrorMessage(value));
  const create = (form: FormData) => {
    setFormError(null);
    mutations.createEnvironment.mutate(readEnvironmentForm(form), {
      onSuccess: () => setCreating(false), onError: mutationError,
    });
  };
  const update = (form: FormData) => {
    if (!editing) return;
    const payload: EnvironmentBody = readEnvironmentForm(form);
    delete payload.isDefault;
    mutations.updateEnvironment.mutate({ environmentId: editing.id, payload }, {
      onSuccess: () => setEditing(null), onError: mutationError,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading title="Environments"
        description="Deployment scopes for API keys and SDK configuration. Slugs identify environments in SDKs; types drive product behavior."
        actions={<UiButton size="lg" onClick={() => { setFormError(null); setCreating(true); }}><Plus className="mr-1.5 size-4" /> New environment</UiButton>} />

      {/* Stat summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: environments.length, color: "var(--brand)" },
          { label: "Active", value: activeCount, color: "var(--green)" },
          { label: "Inactive", value: environments.filter((e) => !e.isActive && !e.deletedAt).length, color: "var(--amber)" },
          { label: "Deleted", value: environments.filter((e) => e.deletedAt).length, color: "var(--red)" },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg1)]/70 px-4 py-3 backdrop-blur-sm">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)]">{stat.label}</span>
            <span className="text-[24px] font-bold tabular-nums tracking-tight text-[var(--text)]">{stat.value}</span>
          </div>
        ))}
      </div>

      <Toolbar>
        <label className="relative min-w-0 flex-1 sm:max-w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text3)]" />
          <span className="sr-only">Search environments</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search environments"
            className={`${fieldInputClass} pl-9`} />
        </label>
        <FilterSelect label="Type" value={type} onChange={setType} options={TYPE_FILTER_OPTIONS} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_FILTER_OPTIONS} />
        <FilterSelect label="Default" value={defaultFilter} onChange={setDefaultFilter} options={DEFAULT_FILTER_OPTIONS} />
      </Toolbar>

      {error && <Notice tone="red">{apiErrorMessage(error)}</Notice>}
      {formError && !creating && !editing && <Notice tone="red">{formError}</Notice>}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((row) => <div key={row} className="h-52 animate-pulse rounded-2xl bg-[var(--bg2)]" />)}</div>
      ) : filtered.length === 0 ? (
        <Panel><div className="flex flex-col items-center gap-3 py-10 text-center">
          <IconChip icon={Layers} size="lg" tone="brand" />
          <p className="text-[13.5px] font-semibold text-[var(--text)]">No environments match these filters</p>
          <p className="text-[12.5px] text-[var(--text2)]">Clear a filter or create another deployment scope.</p>
        </div></Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((environment) => <EnvironmentCard key={environment.id} environment={environment} activeCount={activeCount}
            onEdit={() => { setFormError(null); setEditing(environment); }}
            onDefault={() => mutations.setDefaultEnvironment.mutate(environment.id, { onError: mutationError })}
            onActivate={() => mutations.updateEnvironment.mutate({ environmentId: environment.id, payload: { isActive: true } }, { onError: mutationError })}
            onDeactivate={() => setDeactivating(environment)} onDelete={() => setDeleting(environment)}
            onRestore={() => mutations.restoreEnvironment.mutate(environment.id, { onError: mutationError })} />)}
        </div>
      )}

      <FormDialog open={creating} onOpenChange={(open) => { setCreating(open); if (!open) setFormError(null); }}
        title="New environment" description="Start from a deployment type, then adjust the user-facing values."
        submitLabel="Create environment" pending={mutations.createEnvironment.isPending} error={formError}
        onSubmit={create} width="sm:max-w-[680px]">
        <EnvironmentFields key={String(creating)} allowDefault />
      </FormDialog>

      <FormDialog open={!!editing} onOpenChange={(open) => { if (!open) { setEditing(null); setFormError(null); } }}
        title={editing ? `Edit ${editing.name}` : "Edit environment"} submitLabel="Save changes"
        pending={mutations.updateEnvironment.isPending} error={formError} onSubmit={update} width="sm:max-w-[680px]">
        {editing && <EnvironmentFields key={editing.id} environment={editing} />}
      </FormDialog>

      <ConfirmDialog open={!!deactivating} onOpenChange={(open) => !open && setDeactivating(null)}
        title={`Deactivate ${deactivating?.name ?? "environment"}?`}
        description="API keys bound to this environment stop authenticating until it is reactivated."
        confirmLabel="Deactivate environment" pending={mutations.deactivateEnvironment.isPending}
        onConfirm={() => deactivating && mutations.deactivateEnvironment.mutate(deactivating.id, {
          onSuccess: () => setDeactivating(null), onError: mutationError,
        })} />

      <ConfirmDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "environment"}?`}
        description="The environment is soft-deleted. Historical telemetry remains and the environment can be restored."
        confirmLabel="Delete environment" pending={mutations.deleteEnvironment.isPending}
        onConfirm={() => deleting && mutations.deleteEnvironment.mutate(deleting.id, {
          onSuccess: () => setDeleting(null), onError: mutationError,
        })} />
    </div>
  );
}
