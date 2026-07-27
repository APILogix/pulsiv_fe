import { useState } from "react";
import { KeyRound, Lock, Pencil, Plus, Shield, Star, Trash2 } from "lucide-react";
import { useMemberMutations, useProjectRoles } from "@/modules/projects/hooks/useMembers";
import type { ProjectRole } from "@/modules/projects/api/types";
import { useCurrentProject } from "./ProjectShellPage";
import {
  IconChip,
  Notice,
  Panel,
  Pill,
  SectionHeading,
  StatCard,
  fieldInputClass,
  fieldTextareaClass,
} from "@/shared/ui/pulse";
import { Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  ConfirmDialog,
  DialogField,
  FormDialog,
  apiErrorMessage,
  optionalText,
  parseList,
} from "@/modules/projects/components/project-ui";

// ── module-level constants (rules.md §1.2) ───────────────────

/** Common project-scoped permission strings, offered as quick picks. */
const SUGGESTED_PERMISSIONS = [
  "project:read",
  "project:write",
  "settings:read",
  "settings:write",
  "keys:read",
  "keys:write",
  "members:read",
  "members:write",
  "alerts:read",
  "alerts:write",
  "telemetry:read",
  "telemetry:export",
] as const;

const SLUG_PATTERN = "[a-z0-9_-]+";

// ── role card ────────────────────────────────────────────────

function RoleCard({
  role,
  onEdit,
  onDelete,
}: {
  role: ProjectRole;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="pulse-edge flex flex-col gap-3.5 rounded-[14px] border border-[var(--border)] bg-[var(--bg1)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconChip icon={role.isSystem ? Lock : Shield} tone={role.isSystem ? "neutral" : "brand"} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-[14px] font-semibold text-[var(--text)]">{role.name}</p>
              {role.isSystem && <Pill tone="neutral">System</Pill>}
              {role.isDefault && (
                <Pill tone="brand">
                  <Star className="size-3" aria-hidden="true" /> Default
                </Pill>
              )}
            </div>
            <code className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">{role.slug}</code>
          </div>
        </div>
        {!role.isSystem && (
          <div className="flex shrink-0 items-center gap-1">
            <UiButton variant="outline" size="icon-sm" aria-label={`Edit ${role.name}`} onClick={onEdit}>
              <Pencil className="size-3.5" />
            </UiButton>
            <UiButton variant="outline" size="icon-sm" aria-label={`Delete ${role.name}`} onClick={onDelete}>
              <Trash2 className="size-3.5 text-[var(--red)]" />
            </UiButton>
          </div>
        )}
      </div>

      {role.description && (
        <p className="text-[12.5px] leading-relaxed text-[var(--text2)]">{role.description}</p>
      )}

      <div>
        <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)]">
          Permissions ({role.permissions.length})
        </p>
        {role.permissions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {role.permissions.map((permission) => (
              <code
                key={permission}
                className="rounded-[5px] bg-[var(--bg2)] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[10.5px] text-[var(--text2)] ring-1 ring-inset ring-[var(--border)]"
              >
                {permission}
              </code>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-[var(--text3)]">No explicit permissions granted.</p>
        )}
      </div>

      <p className="border-t border-[var(--border)] pt-3 text-[11.5px] text-[var(--text3)]">
        {role.projectId ? "Project-scoped" : "Organization-wide"} · created <Timestamp value={role.createdAt} />
      </p>
    </div>
  );
}

// ── role form ────────────────────────────────────────────────

function RoleFields({ role }: { role?: ProjectRole }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <DialogField label="Name" name="name" required>
          <input id="name" name="name" required defaultValue={role?.name} maxLength={100} className={fieldInputClass} />
        </DialogField>
        {!role && (
          <DialogField label="Slug" name="slug" required hint="Lowercase letters, numbers, dash, underscore.">
            <input
              id="slug"
              name="slug"
              required
              pattern={SLUG_PATTERN}
              maxLength={100}
              placeholder="release-manager"
              className={fieldInputClass}
            />
          </DialogField>
        )}
      </div>

      <DialogField label="Description" name="description">
        <textarea
          id="description"
          name="description"
          defaultValue={role?.description ?? ""}
          maxLength={5000}
          className={fieldTextareaClass}
        />
      </DialogField>

      <DialogField
        label="Permissions"
        name="permissions"
        hint="Comma or newline separated. Use the quick picks below as a starting point."
      >
        <textarea
          id="permissions"
          name="permissions"
          defaultValue={role?.permissions.join(", ") ?? ""}
          className={fieldTextareaClass}
        />
      </DialogField>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED_PERMISSIONS.map((permission) => (
          <code
            key={permission}
            className="rounded-[5px] bg-[var(--bg2)] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[10.5px] text-[var(--text3)] ring-1 ring-inset ring-[var(--border)]"
          >
            {permission}
          </code>
        ))}
      </div>

      <label className="flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-3.5 py-3 text-[12.5px] text-[var(--text)]">
        <input type="checkbox" name="isDefault" defaultChecked={role?.isDefault ?? false} className="size-4" />
        Assign this role to new members by default
      </label>
    </>
  );
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectRolesPage() {
  const { projectId } = useCurrentProject();
  const { data: roles = [], isLoading, error } = useProjectRoles(projectId);
  const { createRole, updateRole, deleteRole } = useMemberMutations(projectId);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProjectRole | null>(null);
  const [deleting, setDeleting] = useState<ProjectRole | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const asMessage = apiErrorMessage;

  const custom = roles.filter((role) => !role.isSystem);
  const system = roles.filter((role) => role.isSystem);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Custom roles"
        description="Define permission bundles beyond the five built-in project roles. System roles cannot be edited or removed."
        actions={
          <UiButton size="lg" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 size-4" /> New role
          </UiButton>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard label="Roles" value={roles.length} icon={Shield} tone="brand" />
        <StatCard label="Custom" value={custom.length} icon={KeyRound} tone="blue" />
        <StatCard label="System" value={system.length} icon={Lock} tone="neutral" />
      </div>

      {error && <Notice tone="red">{asMessage(error)}</Notice>}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((row) => (
            <div key={row} className="h-44 animate-pulse rounded-[14px] bg-[var(--bg2)]" />
          ))}
        </div>
      ) : roles.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <IconChip icon={Shield} size="lg" tone="brand" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">No custom roles yet</p>
            <p className="max-w-[46ch] text-[12.5px] text-[var(--text2)]">
              The built-in owner, admin, developer, QA, and viewer roles cover most teams. Create a custom role when you
              need a narrower permission set.
            </p>
            <UiButton size="lg" onClick={() => setCreating(true)}>
              <Plus className="mr-1.5 size-4" /> New role
            </UiButton>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              onEdit={() => {
                setFormError(null);
                setEditing(role);
              }}
              onDelete={() => setDeleting(role)}
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
        title="New custom role"
        submitLabel="Create role"
        pending={createRole.isPending}
        error={formError}
        onSubmit={(form) => {
          setFormError(null);
          createRole.mutate(
            {
              name: String(form.get("name") ?? "").trim(),
              slug: String(form.get("slug") ?? "").trim(),
              description: optionalText(form.get("description")) ?? null,
              permissions: parseList(form.get("permissions")),
              isDefault: form.get("isDefault") === "on",
            },
            {
              onSuccess: () => setCreating(false),
              onError: (mutationError) => setFormError(asMessage(mutationError)),
            },
          );
        }}
      >
        <RoleFields />
      </FormDialog>

      <FormDialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setFormError(null);
          }
        }}
        title={editing ? `Edit ${editing.name}` : "Edit role"}
        description="The slug is immutable once created."
        submitLabel="Save changes"
        pending={updateRole.isPending}
        error={formError}
        onSubmit={(form) => {
          if (!editing) return;
          setFormError(null);
          updateRole.mutate(
            {
              roleId: editing.id,
              payload: {
                name: String(form.get("name") ?? "").trim(),
                description: optionalText(form.get("description")) ?? null,
                permissions: parseList(form.get("permissions")),
                isDefault: form.get("isDefault") === "on",
              },
            },
            {
              onSuccess: () => setEditing(null),
              onError: (mutationError) => setFormError(asMessage(mutationError)),
            },
          );
        }}
      >
        {editing && <RoleFields role={editing} />}
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "role"}?`}
        description="Members holding this role fall back to their base project role."
        confirmLabel="Delete role"
        pending={deleteRole.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteRole.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
      />
    </div>
  );
}
