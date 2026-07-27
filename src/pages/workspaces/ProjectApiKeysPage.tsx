import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Ban,
  BarChart3,
  CheckCircle2,
  KeyRound,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useApiKey, useApiKeyMutations, useApiKeyUsage, useApiKeys } from "@/modules/projects/hooks/useApiKeys";
import { useEnvironments } from "@/modules/projects/hooks/useEnvironments";
import {
  API_KEY_PERMISSIONS,
  type ApiKeyPermission,
  type ApiKeyStatus,
  type ApiKeyType,
  type CreateApiKeyBody,
  type ProjectApiKey,
} from "@/modules/projects/api/types";
import { useCurrentProject } from "./ProjectShellPage";
import {
  IconChip,
  Notice,
  Panel,
  Pill,
  SecretField,
  SectionHeading,
  StatCard,
  Toolbar,
  fieldInputClass,
  fieldTextareaClass,
  type SurfaceTone,
} from "@/shared/ui/pulse";
import { CopyButton, FilterSelect, Table, Td, Timestamp, Tr, formatBytes, formatCompact, formatNumber } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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

const KEY_STATUS_TONE: Record<ApiKeyStatus, SurfaceTone> = {
  active: "green",
  revoked: "red",
  expired: "neutral",
  rotated: "amber",
  suspended: "amber",
};

const KEY_TYPE_OPTIONS: Array<{ value: ApiKeyType; label: string }> = [
  { value: "read_write", label: "Read & write" },
  { value: "read_only", label: "Read only" },
  { value: "write_only", label: "Write only (ingest)" },
  { value: "temporary", label: "Temporary" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "revoked", label: "Revoked" },
  { value: "expired", label: "Expired" },
  { value: "rotated", label: "Rotated" },
  { value: "suspended", label: "Suspended" },
];

const KEY_TABLE_HEADERS = ["Key", "Environment", "Type", "Status", "Last used", "Usage", ""];

const asMessage = apiErrorMessage;

// ── per-key usage sheet ──────────────────────────────────────

function KeyUsageSheet({
  projectId,
  apiKey,
  onOpenChange,
}: {
  projectId: string;
  apiKey: ProjectApiKey | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: usage, isLoading } = useApiKeyUsage(projectId, apiKey?.id);
  // Re-read the key on open: rotation state and grace windows change
  // out-of-band and the list row can be stale.
  const { data: fresh } = useApiKey(projectId, apiKey?.id);
  const detail = fresh ?? apiKey;
  const maxDay = Math.max(...(usage?.requestsByDay ?? []).map((day) => day.count), 1);

  return (
    <Sheet open={!!apiKey} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle>{detail?.name || "Ingestion key"}</SheetTitle>
          <SheetDescription>
            <code className="font-[family-name:var(--mono)]">{detail?.publicKey}</code>
          </SheetDescription>
        </SheetHeader>

        <div className="sidebar-scroll flex flex-col gap-5 overflow-y-auto px-4 pb-6">
          {isLoading && <div className="h-40 animate-pulse rounded-[12px] bg-[var(--bg2)]" />}

          {usage && (
            <>
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--border)]">
                {[
                  { label: "Requests", value: formatCompact(usage.totalRequests) },
                  { label: "Successful", value: formatCompact(usage.totalSuccess) },
                  { label: "Errors", value: formatCompact(usage.totalErrors) },
                  { label: "Events", value: formatCompact(usage.eventsIngested) },
                  { label: "Ingested", value: formatBytes(usage.bytesIngested) },
                  {
                    label: "Last used",
                    value: usage.lastUsedAt ? <Timestamp value={usage.lastUsedAt} /> : "Never",
                  },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col gap-1 bg-[var(--bg1)] px-3.5 py-3">
                    <dt className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">
                      {item.label}
                    </dt>
                    <dd className="text-[14px] font-semibold tabular-nums text-[var(--text)]">{item.value}</dd>
                  </div>
                ))}
              </dl>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text3)]">
                  Requests by day
                </p>
                {usage.requestsByDay.length > 0 ? (
                  <ul className="flex flex-col gap-1.5">
                    {usage.requestsByDay.map((day) => (
                      <li key={day.date} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
                          {day.date}
                        </span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg3)]">
                          <span
                            className="block h-full rounded-full bg-[var(--brand)]"
                            style={{ width: `${(day.count / maxDay) * 100}%` }}
                          />
                        </span>
                        <span className="w-14 shrink-0 text-right text-[11.5px] tabular-nums text-[var(--text2)]">
                          {formatCompact(day.count)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12.5px] text-[var(--text3)]">No recorded requests yet.</p>
                )}
              </div>
            </>
          )}

          {detail && (
            <div className="flex flex-col gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg2)] p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text3)]">Scopes</p>
              <div className="flex flex-wrap gap-1.5">
                {detail.permissions.length > 0 ? (
                  detail.permissions.map((permission) => (
                    <Pill key={permission} tone="blue">
                      {permission}
                    </Pill>
                  ))
                ) : (
                  <span className="text-[12.5px] text-[var(--text3)]">Default scopes</span>
                )}
              </div>
              <p className="text-[11.5px] text-[var(--text3)]">
                Rotation state: {detail.rotationState} · version {detail.rotationVersion}
                {detail.gracePeriodEndsAt && (
                  <>
                    {" "}
                    · grace ends <Timestamp value={detail.gracePeriodEndsAt} />
                  </>
                )}
              </p>
              {detail.revokedReason && (
                <p className="text-[11.5px] text-[var(--red)]">Revoked: {detail.revokedReason}</p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectApiKeysPage() {
  const { projectId } = useCurrentProject();
  const { data: environments = [] } = useEnvironments(projectId);

  const [environmentId, setEnvironmentId] = useState("");
  const [status, setStatus] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);

  const { data, isLoading, error } = useApiKeys(projectId, {
    ...(environmentId ? { environmentId } : {}),
    ...(status ? { status: status as ApiKeyStatus } : {}),
    includeInactive,
    limit: 100,
  });
  const keys = data?.data ?? [];

  const {
    createKey,
    updateKey,
    revokeKey,
    rotateKey,
    regenerateKey,
    setKeyEnabled,
    bulkRotate,
    bulkRevoke,
  } = useApiKeyMutations(projectId);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProjectApiKey | null>(null);
  const [revoking, setRevoking] = useState<ProjectApiKey | null>(null);
  const [rotating, setRotating] = useState<ProjectApiKey | null>(null);
  const [regenerating, setRegenerating] = useState<ProjectApiKey | null>(null);
  const [bulkMode, setBulkMode] = useState<"rotate" | "revoke" | null>(null);
  const [inspecting, setInspecting] = useState<ProjectApiKey | null>(null);
  const [revealed, setRevealed] = useState<{ value: string; label: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const activeCount = keys.filter((key) => key.status === "active" && key.isActive).length;
  const revokedCount = keys.filter((key) => key.status === "revoked").length;
  const errorCount = keys.reduce((sum, key) => sum + key.errorCount, 0);
  const totalUsage = keys.reduce((sum, key) => sum + key.usageCount, 0);

  const environmentOptions = [
    { value: "", label: "All environments" },
    ...environments.map((environment) => ({ value: environment.id, label: environment.name })),
  ];

  const handleCreate = (form: FormData) => {
    setFormError(null);
    const selectedEnvironment = String(form.get("environmentId") ?? "");
    if (!selectedEnvironment) {
      setFormError("Select an environment for this key.");
      return;
    }
    const permissions = API_KEY_PERMISSIONS.filter((permission) => form.get(`perm:${permission}`) === "on");
    const payload: CreateApiKeyBody = {
      environmentId: selectedEnvironment,
      name: optionalText(form.get("name")) ?? null,
      description: optionalText(form.get("description")) ?? null,
      keyType: (String(form.get("keyType") ?? "read_write") as ApiKeyType) || "read_write",
      ...(optionalText(form.get("expiresAt")) ? { expiresAt: String(form.get("expiresAt")) } : {}),
      autoRotateEnabled: form.get("autoRotateEnabled") === "on",
      ...(optionalNumber(form.get("autoRotateDays")) !== undefined
        ? { autoRotateDays: optionalNumber(form.get("autoRotateDays")) }
        : {}),
      ...(permissions.length > 0 ? { permissions: permissions as ApiKeyPermission[] } : {}),
      ...(parseList(form.get("allowedOrigins")).length > 0
        ? { allowedOrigins: parseList(form.get("allowedOrigins")) }
        : {}),
      ...(parseList(form.get("allowedIps")).length > 0 ? { allowedIps: parseList(form.get("allowedIps")) } : {}),
      ...(parseList(form.get("allowedDomains")).length > 0
        ? { allowedDomains: parseList(form.get("allowedDomains")) }
        : {}),
      rateLimitPerSecond: optionalNumber(form.get("rateLimitPerSecond")) ?? null,
      rateLimitPerMinute: optionalNumber(form.get("rateLimitPerMinute")) ?? null,
    };

    createKey.mutate(payload, {
      onSuccess: (result) => {
        setCreating(false);
        setRevealed({ value: result.fullKey, label: result.apiKey.name || result.apiKey.publicKey });
      },
      onError: (mutationError) => setFormError(asMessage(mutationError)),
    });
  };

  const handleEdit = (form: FormData) => {
    if (!editing) return;
    setFormError(null);
    updateKey.mutate(
      {
        apiKeyId: editing.id,
        payload: {
          name: optionalText(form.get("name")) ?? null,
          description: optionalText(form.get("description")) ?? null,
          autoRotateEnabled: form.get("autoRotateEnabled") === "on",
          rateLimitPerSecond: optionalNumber(form.get("rateLimitPerSecond")) ?? null,
          rateLimitPerMinute: optionalNumber(form.get("rateLimitPerMinute")) ?? null,
        },
      },
      {
        onSuccess: () => setEditing(null),
        onError: (mutationError) => setFormError(asMessage(mutationError)),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Ingestion API keys"
        description="Keys are environment-scoped. The secret is shown once at creation or rotation — store it immediately."
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <UiButton variant="outline" size="lg">
                  Bulk actions
                </UiButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setBulkMode("rotate")}>
                  <RefreshCcw className="mr-2 size-4" /> Rotate keys…
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBulkMode("revoke")}>
                  <Ban className="mr-2 size-4 text-[var(--red)]" /> Revoke keys…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <UiButton size="lg" onClick={() => setCreating(true)} disabled={environments.length === 0}>
              <Plus className="mr-1.5 size-4" /> New key
            </UiButton>
          </div>
        }
      />

      {environments.length === 0 && (
        <Notice tone="amber" icon={Layers} title="No environments yet">
          API keys must belong to an environment. Create one on the Environments tab first.
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Keys" value={data?.total ?? keys.length} icon={KeyRound} tone="brand" />
        <StatCard label="Active" value={activeCount} icon={CheckCircle2} tone="green" />
        <StatCard label="Revoked" value={revokedCount} icon={Ban} tone={revokedCount > 0 ? "red" : "neutral"} />
        <StatCard
          label="Requests"
          value={formatCompact(totalUsage)}
          icon={Activity}
          tone="blue"
          footnote={`${formatNumber(errorCount)} errors recorded`}
        />
      </div>

      <Toolbar>
        <FilterSelect
          label="Environment"
          value={environmentId}
          onChange={setEnvironmentId}
          options={environmentOptions}
        />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_FILTER_OPTIONS} />
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--text2)]">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => setIncludeInactive(event.target.checked)}
            className="size-4"
          />
          Include inactive
        </label>
      </Toolbar>

      <Panel bodyClassName="p-0">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-10 animate-pulse rounded-[8px] bg-[var(--bg2)]" />
            ))}
          </div>
        ) : error ? (
          <div className="p-5">
            <Notice tone="red" icon={AlertTriangle} title="Could not load API keys">
              {asMessage(error)}
            </Notice>
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <IconChip icon={KeyRound} size="lg" tone="brand" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">No API keys match these filters</p>
            <p className="max-w-[44ch] text-[12.5px] text-[var(--text2)]">
              Create an environment-scoped key to start sending telemetry from an SDK.
            </p>
          </div>
        ) : (
          <Table headers={KEY_TABLE_HEADERS} maxHeight="34rem">
            {keys.map((key) => (
              <Tr key={key.id}>
                <Td>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-medium text-[var(--text)]">
                      {key.name || "Unnamed key"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <code className="truncate font-[family-name:var(--mono)] text-[11px] text-[var(--text3)]">
                        {key.publicKey}
                      </code>
                      <CopyButton value={key.publicKey} label="" className="h-5 border-0 bg-transparent px-1 py-0" />
                    </span>
                  </div>
                </Td>
                <Td>
                  <span className="text-[12.5px] text-[var(--text2)]">
                    {key.environment?.name ?? environments.find((env) => env.id === key.environmentId)?.name ?? "—"}
                  </span>
                </Td>
                <Td>
                  <span className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text2)]">
                    {key.keyType.replace(/_/g, " ")}
                  </span>
                </Td>
                <Td>
                  <Pill tone={KEY_STATUS_TONE[key.status]} dot>
                    {key.isActive ? key.status : "disabled"}
                  </Pill>
                </Td>
                <Td>
                  {key.lastUsedAt ? (
                    <Timestamp value={key.lastUsedAt} />
                  ) : (
                    <span className="text-[12px] text-[var(--text3)]">Never</span>
                  )}
                </Td>
                <Td>
                  <span className="text-[12.5px] tabular-nums text-[var(--text2)]">
                    {formatCompact(key.usageCount)}
                    {key.errorCount > 0 && (
                      <span className="ml-1.5 text-[var(--red)]">({formatCompact(key.errorCount)} err)</span>
                    )}
                  </span>
                </Td>
                <Td className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <UiButton variant="ghost" size="icon-sm" aria-label={`Actions for ${key.name ?? key.publicKey}`}>
                        <MoreHorizontal className="size-4" />
                      </UiButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => setInspecting(key)}>
                        <BarChart3 className="mr-2 size-4" /> Usage & scopes
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setFormError(null);
                          setEditing(key);
                        }}
                      >
                        <Pencil className="mr-2 size-4" /> Edit metadata
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setRotating(key)}>
                        <RefreshCcw className="mr-2 size-4" /> Rotate (with grace)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRegenerating(key)}>
                        <RotateCcw className="mr-2 size-4" /> Regenerate now
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setKeyEnabled.mutate({ apiKeyId: key.id, enabled: !key.isActive })}
                      >
                        <Power className="mr-2 size-4" /> {key.isActive ? "Disable" : "Enable"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setRevoking(key)}>
                        <Trash2 className="mr-2 size-4 text-[var(--red)]" /> Revoke permanently
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Panel>

      {/* ── create ── */}
      <FormDialog
        open={creating}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open) setFormError(null);
        }}
        title="New ingestion key"
        description="The secret is returned once. Blank rate limits inherit the environment configuration."
        submitLabel="Create key"
        pending={createKey.isPending}
        error={formError}
        onSubmit={handleCreate}
        width="sm:max-w-[640px]"
      >
        <DialogField label="Environment" name="environmentId" required>
          <select id="environmentId" name="environmentId" required className={fieldInputClass}>
            <option value="">Select an environment…</option>
            {environments.map((environment) => (
              <option key={environment.id} value={environment.id}>
                {environment.name}
                {environment.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
        </DialogField>

        <div className="grid grid-cols-2 gap-3">
          <DialogField label="Name" name="name">
            <input id="name" name="name" maxLength={255} placeholder="Web SDK" className={fieldInputClass} />
          </DialogField>
          <DialogField label="Key type" name="keyType">
            <select id="keyType" name="keyType" defaultValue="read_write" className={fieldInputClass}>
              {KEY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </DialogField>
        </div>

        <DialogField label="Description" name="description">
          <textarea id="description" name="description" maxLength={2000} className={fieldTextareaClass} />
        </DialogField>

        <DialogField label="Scopes" hint="Leave all unchecked to use the default scope set for the key type.">
          <div className="grid grid-cols-2 gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] p-3">
            {API_KEY_PERMISSIONS.map((permission) => (
              <label key={permission} className="flex items-center gap-2 text-[12.5px] text-[var(--text)]">
                <input type="checkbox" name={`perm:${permission}`} className="size-4" />
                <code className="font-[family-name:var(--mono)] text-[11.5px]">{permission}</code>
              </label>
            ))}
          </div>
        </DialogField>

        <div className="grid grid-cols-2 gap-3">
          <DialogField label="Expires at" name="expiresAt" hint="Optional hard expiry.">
            <input id="expiresAt" name="expiresAt" type="datetime-local" className={fieldInputClass} />
          </DialogField>
          <DialogField label="Auto-rotate days" name="autoRotateDays">
            <input
              id="autoRotateDays"
              name="autoRotateDays"
              type="number"
              min={1}
              max={365}
              placeholder="90"
              className={fieldInputClass}
            />
          </DialogField>
          <DialogField label="Rate / second" name="rateLimitPerSecond">
            <input
              id="rateLimitPerSecond"
              name="rateLimitPerSecond"
              type="number"
              min={1}
              placeholder="inherit"
              className={fieldInputClass}
            />
          </DialogField>
          <DialogField label="Rate / minute" name="rateLimitPerMinute">
            <input
              id="rateLimitPerMinute"
              name="rateLimitPerMinute"
              type="number"
              min={1}
              placeholder="inherit"
              className={fieldInputClass}
            />
          </DialogField>
        </div>

        <DialogField label="Allowed origins" name="allowedOrigins" hint="Comma separated. Browser SDK CORS control.">
          <input id="allowedOrigins" name="allowedOrigins" placeholder="https://app.example.com" className={fieldInputClass} />
        </DialogField>

        <div className="grid grid-cols-2 gap-3">
          <DialogField label="Allowed IPs" name="allowedIps">
            <input id="allowedIps" name="allowedIps" placeholder="203.0.113.7" className={fieldInputClass} />
          </DialogField>
          <DialogField label="Allowed domains" name="allowedDomains">
            <input id="allowedDomains" name="allowedDomains" placeholder="example.com" className={fieldInputClass} />
          </DialogField>
        </div>

        <label className="flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-3.5 py-3 text-[12.5px] text-[var(--text)]">
          <input type="checkbox" name="autoRotateEnabled" className="size-4" />
          Enable automatic rotation
        </label>
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
        title="Edit key metadata"
        description="Scopes and environment binding are immutable — rotate or recreate the key to change them."
        submitLabel="Save changes"
        pending={updateKey.isPending}
        error={formError}
        onSubmit={handleEdit}
      >
        {editing && (
          <>
            <DialogField label="Name" name="name">
              <input id="name" name="name" defaultValue={editing.name ?? ""} maxLength={255} className={fieldInputClass} />
            </DialogField>
            <DialogField label="Description" name="description">
              <textarea
                id="description"
                name="description"
                defaultValue={editing.description ?? ""}
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
                  defaultValue={editing.rateLimitPerSecond ?? ""}
                  placeholder="inherit"
                  className={fieldInputClass}
                />
              </DialogField>
              <DialogField label="Rate / minute" name="rateLimitPerMinute">
                <input
                  id="rateLimitPerMinute"
                  name="rateLimitPerMinute"
                  type="number"
                  min={1}
                  defaultValue={editing.rateLimitPerMinute ?? ""}
                  placeholder="inherit"
                  className={fieldInputClass}
                />
              </DialogField>
            </div>
            <label className="flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg2)] px-3.5 py-3 text-[12.5px] text-[var(--text)]">
              <input
                type="checkbox"
                name="autoRotateEnabled"
                defaultChecked={editing.autoRotateEnabled}
                className="size-4"
              />
              Enable automatic rotation
            </label>
          </>
        )}
      </FormDialog>

      {/* ── rotate (grace period) ── */}
      <FormDialog
        open={!!rotating}
        onOpenChange={(open) => !open && setRotating(null)}
        title="Rotate key"
        description="A new secret is issued now. The old secret keeps working until the grace period ends."
        submitLabel="Rotate key"
        pending={rotateKey.isPending}
        error={formError}
        onSubmit={(form) => {
          if (!rotating) return;
          rotateKey.mutate(
            {
              apiKeyId: rotating.id,
              rotationReason: optionalText(form.get("rotationReason")),
              gracePeriodHours: optionalNumber(form.get("gracePeriodHours")),
            },
            {
              onSuccess: (result) => {
                setRotating(null);
                setRevealed({ value: result.fullKey, label: result.apiKey.name || result.apiKey.publicKey });
              },
              onError: (mutationError) => setFormError(asMessage(mutationError)),
            },
          );
        }}
      >
        <DialogField label="Rotation reason" name="rotationReason">
          <input id="rotationReason" name="rotationReason" maxLength={500} placeholder="Scheduled rotation" className={fieldInputClass} />
        </DialogField>
        <DialogField label="Grace period (hours)" name="gracePeriodHours" hint="0–168. Old secret stays valid for this long.">
          <input
            id="gracePeriodHours"
            name="gracePeriodHours"
            type="number"
            min={0}
            max={168}
            defaultValue={24}
            className={fieldInputClass}
          />
        </DialogField>
      </FormDialog>

      {/* ── regenerate ── */}
      <ConfirmDialog
        open={!!regenerating}
        onOpenChange={(open) => !open && setRegenerating(null)}
        title="Regenerate key immediately?"
        description="The current secret is revoked instantly with no grace period. Any SDK still using it will start failing."
        confirmLabel="Regenerate now"
        pending={regenerateKey.isPending}
        onConfirm={() => {
          if (!regenerating) return;
          regenerateKey.mutate(regenerating.id, {
            onSuccess: (result) => {
              setRegenerating(null);
              setRevealed({ value: result.fullKey, label: result.apiKey.name || result.apiKey.publicKey });
            },
          });
        }}
      />

      {/* ── revoke ── */}
      <FormDialog
        open={!!revoking}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={`Revoke ${revoking?.name || "key"}?`}
        description="Revocation is permanent. Telemetry sent with this key will be rejected."
        submitLabel="Revoke key"
        pending={revokeKey.isPending}
        onSubmit={(form) => {
          if (!revoking) return;
          revokeKey.mutate(
            { apiKeyId: revoking.id, reason: optionalText(form.get("revokedReason")) },
            { onSuccess: () => setRevoking(null) },
          );
        }}
      >
        <Notice tone="red" icon={ShieldAlert}>
          This cannot be undone. Rotate instead if you need a grace period.
        </Notice>
        <DialogField label="Revocation reason" name="revokedReason">
          <input id="revokedReason" name="revokedReason" maxLength={500} placeholder="Leaked in client bundle" className={fieldInputClass} />
        </DialogField>
      </FormDialog>

      {/* ── bulk ── */}
      <FormDialog
        open={!!bulkMode}
        onOpenChange={(open) => !open && setBulkMode(null)}
        title={bulkMode === "rotate" ? "Bulk rotate keys" : "Bulk revoke keys"}
        description={
          bulkMode === "rotate"
            ? "Rotates every active key, optionally limited to one environment. New secrets are not displayed — retrieve them per key."
            : "Revokes every active key, optionally limited to one environment."
        }
        submitLabel={bulkMode === "rotate" ? "Rotate keys" : "Revoke keys"}
        pending={bulkRotate.isPending || bulkRevoke.isPending}
        error={formError}
        onSubmit={(form) => {
          const scopedEnvironment = optionalText(form.get("environmentId"));
          const reason = optionalText(form.get("reason"));
          const done = () => setBulkMode(null);
          if (bulkMode === "rotate") {
            bulkRotate.mutate(
              {
                ...(scopedEnvironment ? { environmentId: scopedEnvironment } : {}),
                ...(reason ? { rotationReason: reason } : {}),
                gracePeriodHours: optionalNumber(form.get("gracePeriodHours")) ?? 24,
              },
              { onSuccess: done, onError: (mutationError) => setFormError(asMessage(mutationError)) },
            );
          } else {
            bulkRevoke.mutate(
              {
                ...(scopedEnvironment ? { environmentId: scopedEnvironment } : {}),
                ...(reason ? { revokedReason: reason } : {}),
              },
              { onSuccess: done, onError: (mutationError) => setFormError(asMessage(mutationError)) },
            );
          }
        }}
      >
        <Notice tone="amber" icon={AlertTriangle}>
          Bulk operations affect every matching key in this project. Scope to an environment to limit the blast radius.
        </Notice>
        <DialogField label="Environment" name="environmentId" hint="Leave empty to include all environments.">
          <select id="environmentId" name="environmentId" className={fieldInputClass} defaultValue="">
            <option value="">All environments</option>
            {environments.map((environment) => (
              <option key={environment.id} value={environment.id}>
                {environment.name}
              </option>
            ))}
          </select>
        </DialogField>
        <DialogField label="Reason" name="reason">
          <input id="reason" name="reason" maxLength={500} className={fieldInputClass} />
        </DialogField>
        {bulkMode === "rotate" && (
          <DialogField label="Grace period (hours)" name="gracePeriodHours">
            <input
              id="gracePeriodHours"
              name="gracePeriodHours"
              type="number"
              min={0}
              max={168}
              defaultValue={24}
              className={fieldInputClass}
            />
          </DialogField>
        )}
      </FormDialog>

      {/* ── one-time secret ── */}
      <FormDialog
        open={!!revealed}
        onOpenChange={(open) => !open && setRevealed(null)}
        title="Copy your key now"
        description="This secret is shown once and cannot be retrieved later."
        submitLabel="I've stored it"
        onSubmit={() => setRevealed(null)}
      >
        <Notice tone="amber" icon={ShieldAlert} title="Shown once">
          Store this in your secret manager before closing the dialog.
        </Notice>
        {revealed && <SecretField label={revealed.label} value={revealed.value} />}
      </FormDialog>

      <KeyUsageSheet projectId={projectId} apiKey={inspecting} onOpenChange={(open) => !open && setInspecting(null)} />
    </div>
  );
}
