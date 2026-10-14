import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Plus } from "lucide-react";

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
import { ConfirmDialog, DialogField, FormDialog, apiErrorMessage, optionalText } from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_MD,
  HIDE_BELOW_SM,
  ProjectPageHeader,
  Readouts,
  RowActions,
  RowTitle,
  SearchField,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  ToolbarCount,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { Notice, Pill, fieldInputClass, fieldMonoClass, fieldTextareaClass, type SurfaceTone } from "@/shared/ui/pulse";
import { FilterSelect, Timestamp, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useCurrentProject } from "./ProjectShellPage";

// ── module-level constants (rules.md §1.2) ───────────────────

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

// The identity column takes the free width and truncates; the rest hug their content.
const COLUMNS: SheetColumn[] = [
  { key: "environment", header: "Environment", className: "w-full" },
  { key: "type", header: "Type", className: `w-[148px] ${HIDE_BELOW_SM}` },
  { key: "status", header: "Status", className: "w-[112px]" },
  { key: "updated", header: "Updated", className: `w-[120px] ${HIDE_BELOW_MD}` },
  { key: "actions", header: "Actions", srOnly: true, align: "right", className: "w-px" },
];

type EnvironmentState = "active" | "inactive" | "deleted";

// Status is the only coloured reading: a production type is not a failure.
const STATE_TONE: Record<EnvironmentState, SurfaceTone> = {
  active: "green",
  inactive: "amber",
  deleted: "neutral",
};

// Reasons mirror the rules the API enforces for default and last-active environments.
const REASON_NOT_ACTIVE = "Activate it first";
const REASON_DEFAULT = "Set another default first";
const REASON_LAST_ACTIVE = "It's the last active environment";

// Disabled menu items stay legible so the reason under the label can be read.
const EXPLAINED_ITEM = "data-disabled:opacity-100";

const SWATCH_CLASS =
  "size-9 shrink-0 cursor-pointer rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] p-1 transition-colors hover:border-[var(--border2)] focus-visible:border-[var(--brand)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--brand-bg)] [&::-moz-color-swatch]:rounded-[4px] [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-[4px] [&::-webkit-color-swatch]:border-0";

const CHECKBOX_CLASS =
  "size-4 shrink-0 cursor-pointer accent-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text2)]";

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

// ── form fields ──────────────────────────────────────────────

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
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </DialogField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DialogField label="Name" name="name" required>
          <input
            id="name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            placeholder="Customer demo"
            className={fieldInputClass}
            required
          />
        </DialogField>
        <DialogField label="SDK slug" name="slug" required hint="Lowercase letters, numbers, and hyphens.">
          <input
            id="slug"
            name="slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            maxLength={100}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="customer-demo"
            spellCheck={false}
            autoComplete="off"
            className={fieldMonoClass}
            required
          />
        </DialogField>
      </div>

      <DialogField label="Color" name="color" required hint="Six-digit hex color, such as #2563EB.">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={/^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#64748B"}
            onChange={(event) => setColor(event.target.value.toUpperCase())}
            aria-label="Environment color picker"
            className={SWATCH_CLASS}
          />
          <input
            id="color"
            name="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            pattern="#[0-9A-Fa-f]{6}"
            placeholder="#2563EB"
            spellCheck={false}
            autoComplete="off"
            className={fieldMonoClass}
            required
          />
        </div>
      </DialogField>

      <DialogField label="Description" name="description">
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={2000}
          placeholder="Where and how this environment is used"
          className={fieldTextareaClass}
        />
      </DialogField>

      {allowDefault && (
        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-[13px] text-[var(--text)]">
          <input type="checkbox" name="isDefault" className={CHECKBOX_CLASS} />
          Make this the project default
        </label>
      )}
    </>
  );
}

// ── rows ─────────────────────────────────────────────────────

/** Menu item label, with the reason underneath when the action is unavailable. */
function MenuItemText({ label, reason }: { label: string; reason?: string }) {
  if (!reason) return <>{label}</>;
  return (
    <span className="flex min-w-0 flex-col gap-0.5 py-0.5">
      <span className="text-[var(--text3)]">{label}</span>
      <span className="text-[12px] leading-[1.35] text-[var(--text3)]">{reason}</span>
    </span>
  );
}

function EnvironmentRow({
  environment,
  activeCount,
  onEdit,
  onDefault,
  onActivate,
  onDeactivate,
  onDelete,
  onRestore,
}: {
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
  const state: EnvironmentState = deleted ? "deleted" : environment.isActive ? "active" : "inactive";

  // Same availability as before: the default and the last active environment
  // can be neither deactivated nor deleted.
  const defaultReason = environment.isActive ? undefined : REASON_NOT_ACTIVE;
  const deactivateReason = environment.isDefault ? REASON_DEFAULT : activeCount <= 1 ? REASON_LAST_ACTIVE : undefined;
  const deleteReason = environment.isDefault
    ? REASON_DEFAULT
    : environment.isActive && activeCount <= 1
      ? REASON_LAST_ACTIVE
      : undefined;

  return (
    <SheetRow muted={deleted}>
      <SheetCell className="w-full max-w-0">
        <RowTitle
          leading={
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full ring-1 ring-[var(--border2)]"
              style={{ backgroundColor: environment.color }}
            />
          }
          title={environment.name}
          badges={environment.isDefault ? <Pill tone="neutral">Default</Pill> : undefined}
          subtitle={
            <>
              <code className="font-[family-name:var(--mono)] text-[11.5px]">{environment.slug}</code>
              {environment.description && <span title={environment.description}> · {environment.description}</span>}
            </>
          }
        />
      </SheetCell>
      <SheetCell className={HIDE_BELOW_SM}>
        <span className="whitespace-nowrap text-[13px] text-[var(--text2)]">{environmentTypeLabel(environment.type)}</span>
      </SheetCell>
      <SheetCell>
        <Pill tone={STATE_TONE[state]} dot>
          {state}
        </Pill>
      </SheetCell>
      <SheetCell className={HIDE_BELOW_MD}>
        <Timestamp value={environment.updatedAt} />
      </SheetCell>
      <SheetCell align="right">
        <div className="flex items-center justify-end gap-1.5">
          {deleted ? (
            <>
              <UiButton variant="outline" size="sm" onClick={onRestore} aria-label={`Restore ${environment.name}`}>
                Restore
              </UiButton>
              {/* Keeps the inline button aligned with the rows that have a menu. */}
              <span aria-hidden="true" className="size-7 shrink-0" />
            </>
          ) : (
            <>
              <UiButton variant="outline" size="sm" onClick={onEdit} aria-label={`Edit ${environment.name}`}>
                Edit
              </UiButton>
              <RowActions label={`Actions for ${environment.name}`}>
                {!environment.isDefault && (
                  <DropdownMenuItem disabled={Boolean(defaultReason)} className={EXPLAINED_ITEM} onSelect={onDefault}>
                    <MenuItemText label="Set as default" reason={defaultReason} />
                  </DropdownMenuItem>
                )}
                {environment.isActive ? (
                  <DropdownMenuItem disabled={Boolean(deactivateReason)} className={EXPLAINED_ITEM} onSelect={onDeactivate}>
                    <MenuItemText label="Deactivate" reason={deactivateReason} />
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={onActivate}>Activate</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={Boolean(deleteReason)}
                  className={EXPLAINED_ITEM}
                  onSelect={onDelete}
                >
                  <MenuItemText label="Delete environment" reason={deleteReason} />
                </DropdownMenuItem>
              </RowActions>
            </>
          )}
        </div>
      </SheetCell>
    </SheetRow>
  );
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectEnvironmentsPage() {
  const { projectId } = useCurrentProject();
  const { data: environments = [], isLoading, error, refetch } = useEnvironments(projectId, { includeDeleted: true });
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
  const openCreate = () => {
    setFormError(null);
    setCreating(true);
  };

  // Readings cover every environment, never the filtered view.
  const live = environments.filter((environment) => !environment.deletedAt);
  const inactiveCount = live.filter((environment) => !environment.isActive).length;
  const deletedCount = environments.length - live.length;
  const defaultEnvironment = live.find((environment) => environment.isDefault);

  const readouts: Readout[] = [
    { label: "Environments", value: formatNumber(live.length), sub: `${formatNumber(activeCount)} active` },
    {
      label: "Default",
      value: defaultEnvironment?.name ?? "None",
      title: defaultEnvironment?.name,
      sub: defaultEnvironment ? (
        <code className="font-[family-name:var(--mono)] text-[11.5px]">{defaultEnvironment.slug}</code>
      ) : (
        "No default set"
      ),
    },
    {
      label: "Inactive",
      value: formatNumber(inactiveCount),
      sub: inactiveCount > 0 ? "Their keys stop authenticating" : "None inactive",
      tone: inactiveCount > 0 ? "warn" : "neutral",
    },
    {
      label: "Deleted",
      value: formatNumber(deletedCount),
      sub: deletedCount > 0 ? "Restorable, telemetry kept" : "None deleted",
    },
  ];

  const hasFilters = Boolean(search || type || status || defaultFilter);
  const clearFilters = () => {
    setSearch("");
    setType("");
    setStatus("");
    setDefaultFilter("");
  };

  let body: ReactNode;
  if (isLoading) {
    body = <SheetLoading rows={4} label="Loading environments" />;
  } else if (error) {
    body = (
      <SheetError title="Could not load environments" message={apiErrorMessage(error)} onRetry={() => void refetch()} />
    );
  } else if (environments.length === 0) {
    body = (
      <SheetEmpty
        title="No environments yet"
        description="An environment scopes API keys and SDK configuration to one deployment, such as production or staging. SDKs name it by its slug."
        action={
          <UiButton size="lg" onClick={openCreate}>
            <Plus className="size-4" aria-hidden="true" /> New environment
          </UiButton>
        }
      />
    );
  } else if (filtered.length === 0) {
    body = (
      <SheetEmpty
        title="No environments match"
        description={
          search
            ? `Nothing matches “${search}” with the current filters.`
            : "No environment has this combination of type, status, and default."
        }
        action={
          <UiButton variant="outline" size="lg" onClick={clearFilters}>
            Clear filters
          </UiButton>
        }
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="Environments" minWidth={560}>
        {filtered.map((environment) => (
          <EnvironmentRow
            key={environment.id}
            environment={environment}
            activeCount={activeCount}
            onEdit={() => { setFormError(null); setEditing(environment); }}
            onDefault={() => mutations.setDefaultEnvironment.mutate(environment.id, { onError: mutationError })}
            onActivate={() => mutations.updateEnvironment.mutate({ environmentId: environment.id, payload: { isActive: true } }, { onError: mutationError })}
            onDeactivate={() => setDeactivating(environment)}
            onDelete={() => setDeleting(environment)}
            onRestore={() => mutations.restoreEnvironment.mutate(environment.id, { onError: mutationError })}
          />
        ))}
      </SheetTable>
    );
  }

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="Environments"
        description="Deployment scopes for API keys and SDK configuration. Slugs identify environments in SDKs; types drive product behavior."
        actions={
          <UiButton size="lg" onClick={openCreate}>
            <Plus className="size-4" aria-hidden="true" /> New environment
          </UiButton>
        }
      />

      {!error && <Readouts cells={readouts} loading={isLoading} label="Environments summary" />}

      {formError && !creating && !editing && (
        <div role="alert">
          <Notice tone="red" icon={AlertTriangle} title="Could not update the environment">
            {formError}
          </Notice>
        </div>
      )}

      <Sheet
        label="Environment list"
        toolbar={
          <>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search by name or description"
              label="Search environments"
            />
            <FilterSelect label="Type" value={type} onChange={setType} options={TYPE_FILTER_OPTIONS} />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_FILTER_OPTIONS} />
            <FilterSelect label="Default" value={defaultFilter} onChange={setDefaultFilter} options={DEFAULT_FILTER_OPTIONS} />
            {!isLoading && !error && (
              <ToolbarCount>
                {hasFilters
                  ? `${formatNumber(filtered.length)} of ${formatNumber(environments.length)}`
                  : `${formatNumber(environments.length)} ${environments.length === 1 ? "environment" : "environments"}`}
              </ToolbarCount>
            )}
          </>
        }
        footer={
          deletedCount > 0 ? (
            <span>Deleted environments keep their historical telemetry. Restore one from its row to use it again.</span>
          ) : undefined
        }
      >
        {body}
      </Sheet>

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
    </WorkspacePage>
  );
}
