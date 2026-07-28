import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  KeyRound,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  RefreshCcw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useApiKey, useApiKeyMutations, useApiKeyUsage, useApiKeys } from "@/modules/projects/hooks/useApiKeys";
import { useEnvironments } from "@/modules/projects/hooks/useEnvironments";
import { environmentTypeLabel } from "@/modules/projects/environment.constants";
import {
  type ApiKeyStatus,
  type ApiKeyUsageGranularity,
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
  type SurfaceTone,
} from "@/shared/ui/pulse";
import { CopyButton, FilterSelect, Timestamp, formatBytes, formatCompact } from "@/shared/observe";
import { UsageTrendChart } from "@/modules/projects/components/UsageTrendChart";
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
  optionalText,
} from "@/modules/projects/components/project-ui";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md §1.2) ───────────────────

const KEY_STATUS_TONE: Record<ApiKeyStatus, SurfaceTone> = {
  active: "green",
  revoked: "red",
  expired: "neutral",
  rotated: "amber",
  suspended: "amber",
};

const USAGE_RANGE_OPTIONS = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

const USAGE_GRANULARITY_OPTIONS = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
];

const USAGE_RANGE_HOURS: Record<string, number> = { "24h": 24, "7d": 168, "30d": 720, "90d": 2160 };

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "revoked", label: "Revoked" },
  { value: "expired", label: "Expired" },
  { value: "rotated", label: "Rotated" },
  { value: "suspended", label: "Suspended" },
];

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
  const [range, setRange] = useState("7d");
  const [granularity, setGranularity] = useState<ApiKeyUsageGranularity>("daily");
  const query = useMemo(() => {
    const end = new Date();
    end.setMinutes(0, 0, 0);
    return {
      to: end.toISOString(),
      from: new Date(end.getTime() - USAGE_RANGE_HOURS[range] * 60 * 60 * 1000).toISOString(),
      granularity,
    };
  }, [granularity, range]);
  const { data: usage, isLoading, error } = useApiKeyUsage(projectId, apiKey?.id, query);
  const { data: fresh } = useApiKey(projectId, apiKey?.id);
  const detail = fresh ?? apiKey;

  return (
    <Sheet open={!!apiKey} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[900px]">
        <SheetHeader>
          <SheetTitle>{detail?.name || "Ingestion key"}</SheetTitle>
          <SheetDescription><code className="font-[family-name:var(--mono)]">{detail?.publicKey}</code></SheetDescription>
        </SheetHeader>
        <div className="sidebar-scroll flex flex-col gap-5 overflow-y-auto px-4 pb-6">
          <Toolbar>
            <FilterSelect label="Range" value={range} onChange={setRange} options={USAGE_RANGE_OPTIONS} />
            <FilterSelect
              label="Granularity"
              value={granularity}
              onChange={(value) => setGranularity(value as ApiKeyUsageGranularity)}
              options={USAGE_GRANULARITY_OPTIONS}
            />
          </Toolbar>
          {isLoading && <div className="h-64 animate-pulse rounded-[12px] bg-[var(--bg2)]" />}
          {error && <Notice tone="red">{asMessage(error)}</Notice>}
          {usage && (
            <>
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
                {[
                  { label: "Requests", value: formatCompact(usage.summary.requests) },
                  { label: "Accepted events", value: formatCompact(usage.summary.acceptedEvents) },
                  { label: "Error events", value: formatCompact(usage.summary.errorEvents) },
                  { label: "Failures", value: formatCompact(usage.summary.ingestionFailures) },
                  { label: "Accepted bytes", value: formatBytes(usage.summary.acceptedBytes) },
                  { label: "Rate limited", value: formatCompact(usage.summary.rateLimitedRequests) },
                  { label: "Error rate", value: `${usage.summary.errorRate.toFixed(2)}%` },
                  { label: "Last used", value: usage.lastUsedAt ? <Timestamp value={usage.lastUsedAt} /> : "Never" },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col gap-1 bg-[var(--bg1)] px-3.5 py-3">
                    <dt className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">{item.label}</dt>
                    <dd className="text-[14px] font-semibold tabular-nums text-[var(--text)]">{item.value}</dd>
                  </div>
                ))}
              </dl>
              <UsageTrendChart
                ariaLabel={`Usage for ${detail?.name || usage.keyPrefix}`}
                showTable
                points={usage.series.map((point) => ({ ...point }))}
                series={[
                  { key: "requests", label: "Requests", color: "var(--brand)" },
                  { key: "acceptedEvents", label: "Accepted", color: "var(--green)" },
                  { key: "errorEvents", label: "Errors", color: "var(--red)" },
                  { key: "ingestionFailures", label: "Failures", color: "var(--amber)" },
                ]}
                tableSeries={[
                  { key: "requests", label: "Requests", color: "var(--brand)" },
                  { key: "acceptedEvents", label: "Accepted events", color: "var(--green)" },
                  { key: "errorEvents", label: "Error events", color: "var(--red)" },
                  { key: "ingestionFailures", label: "Failures", color: "var(--amber)" },
                  { key: "acceptedBytes", label: "Accepted bytes", color: "var(--blue)" },
                  { key: "rateLimitedRequests", label: "Rate limited", color: "var(--violet)" },
                ]}
                emptyMessage="No API-key usage was recorded in this range."
              />
            </>
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
  const activeEnvironments = environments.filter((environment) => environment.isActive);

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

  const activeCount = keys.filter((key) => key.status === "active").length;
  const suspendedCount = keys.filter((key) => key.status === "suspended").length;
  const expiringCount = keys.filter((key) => {
    if (!key.expiresAt) return false;
    const remaining = new Date(key.expiresAt).getTime() - Date.now();
    return remaining > 0 && remaining <= 30 * 24 * 60 * 60 * 1000;
  }).length;

  const environmentOptions = [
    { value: "", label: "All environments" },
    ...environments.map((environment) => ({
      value: environment.id,
      label: `${environment.name} · ${environmentTypeLabel(environment.type)}`,
    })),
  ];

  const handleCreate = (form: FormData) => {
    setFormError(null);
    const selectedEnvironment = String(form.get("environmentId") ?? "");
    if (!selectedEnvironment) {
      setFormError("Select an environment for this key.");
      return;
    }
    const payload: CreateApiKeyBody = {
      environmentId: selectedEnvironment,
      name: optionalText(form.get("name")) ?? null,
      expiresAt: optionalText(form.get("expiresAt"))
        ? new Date(String(form.get("expiresAt"))).toISOString()
        : null,
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
          expiresAt: optionalText(form.get("expiresAt"))
            ? new Date(String(form.get("expiresAt"))).toISOString()
            : null,
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
            <UiButton size="lg" onClick={() => setCreating(true)} disabled={activeEnvironments.length === 0}>
              <Plus className="mr-1.5 size-4" /> New key
            </UiButton>
          </div>
        }
      />

      {activeEnvironments.length === 0 && (
        <Notice tone="amber" icon={Layers} title="No active environments">
          API keys must belong to an active environment. Create or reactivate one on the Environments tab first.
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Keys" value={data?.total ?? keys.length} icon={KeyRound} tone="brand" />
        <StatCard label="Active" value={activeCount} icon={CheckCircle2} tone="green" />
        <StatCard label="Suspended" value={suspendedCount} icon={Ban} tone={suspendedCount > 0 ? "amber" : "neutral"} />
        <StatCard label="Expiring in 30 days" value={expiringCount} icon={CalendarClock} tone="blue" />
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

      {/* ── Key cards with glassmorphism ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-32 animate-pulse rounded-2xl bg-[var(--bg2)]" />
          ))}
        </div>
      ) : error ? (
        <Notice tone="red" icon={AlertTriangle} title="Could not load API keys">
          {asMessage(error)}
        </Notice>
      ) : keys.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <IconChip icon={KeyRound} size="lg" tone="brand" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">No API keys match these filters</p>
            <p className="max-w-[44ch] text-[12.5px] text-[var(--text2)]">
              Create an environment-scoped key to start sending telemetry from an SDK.
            </p>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="group relative flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg1)]/70 p-4 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--brand)]/5"
            >
              {/* Status dot in top right */}
              <div className="absolute right-4 top-4">
                <span className={cn(
                  "flex size-2.5 rounded-full",
                  key.status === "active" && "bg-[var(--green)] shadow-[0_0_6px_var(--green)]",
                  key.status === "revoked" && "bg-[var(--red)]",
                  key.status === "expired" && "bg-[var(--text3)]",
                  key.status === "suspended" && "bg-[var(--amber)]",
                  key.status === "rotated" && "bg-[var(--amber)]",
                )} />
              </div>

              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)]/10">
                  <KeyRound className="size-4 text-[var(--brand)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-[var(--text)]">{key.name || "Unnamed key"}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <code className="truncate font-[family-name:var(--mono)] text-[10.5px] text-[var(--text3)]">
                      {key.publicKey}
                    </code>
                    <CopyButton value={key.publicKey} label="" className="h-5 border-0 bg-transparent px-1 py-0" />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={KEY_STATUS_TONE[key.status]} dot>{key.status}</Pill>
                <span className="text-[11px] text-[var(--text3)]">
                  {key.environment?.name ?? environments.find((env) => env.id === key.environmentId)?.name ?? "-"}
                </span>
                {key.expiresAt && (
                  <span className="text-[11px] text-[var(--text3)]">
                    exp: <Timestamp value={key.expiresAt} />
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[var(--border)] pt-2.5">
                <span className="text-[10.5px] text-[var(--text3)]">
                  {key.lastUsedAt ? (<>Last used <Timestamp value={key.lastUsedAt} /></>) : "Never used"}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <UiButton variant="ghost" size="icon-sm" aria-label={`Actions for ${key.name ?? key.publicKey}`}>
                      <MoreHorizontal className="size-4" />
                    </UiButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => setInspecting(key)}>
                      <BarChart3 className="mr-2 size-4" /> Usage
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
                      <RefreshCcw className="mr-2 size-4" /> Regenerate now
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!(["active", "suspended"] as ApiKeyStatus[]).includes(key.status)}
                      onClick={() => setKeyEnabled.mutate({ apiKeyId: key.id, enabled: key.status === "suspended" })}
                    >
                      <Power className="mr-2 size-4" /> {key.status === "suspended" ? "Activate" : "Suspend"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setRevoking(key)}>
                      <Trash2 className="mr-2 size-4 text-[var(--red)]" /> Revoke permanently
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── create ── */}
      <FormDialog
        open={creating}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open) setFormError(null);
        }}
        title="New ingestion key"
        description="The secret is returned once. You can optionally set a hard expiry."
        submitLabel="Create key"
        pending={createKey.isPending}
        error={formError}
        onSubmit={handleCreate}
        width="sm:max-w-[640px]"
      >
        <DialogField label="Environment" name="environmentId" required>
          <select id="environmentId" name="environmentId" required className={fieldInputClass}>
            <option value="">Select an environment…</option>
            {activeEnvironments.map((environment) => (
              <option key={environment.id} value={environment.id}>
                {environment.name} · {environmentTypeLabel(environment.type)}
                {environment.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
        </DialogField>

        <DialogField label="Name" name="name">
          <input id="name" name="name" maxLength={255} placeholder="Web SDK" className={fieldInputClass} />
        </DialogField>
        <DialogField label="Expires at" name="expiresAt" hint="Optional hard expiry.">
          <input id="expiresAt" name="expiresAt" type="datetime-local" className={fieldInputClass} />
        </DialogField>
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
        description="Name and expiry are the only editable key metadata."
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
            <DialogField label="Expires at" name="expiresAt" hint="Clear to remove the expiry.">
              <input
                id="expiresAt"
                name="expiresAt"
                type="datetime-local"
                defaultValue={editing.expiresAt?.slice(0, 16) ?? ""}
                className={fieldInputClass}
              />
            </DialogField>
          </>
        )}
      </FormDialog>

      {/* ── rotate ── */}
      <ConfirmDialog
        open={!!rotating}
        onOpenChange={(open) => !open && setRotating(null)}
        title="Rotate key?"
        description="A new secret will be issued and the current credential will be superseded. Update clients with the new secret immediately."
        confirmLabel="Rotate key"
        pending={rotateKey.isPending}
        onConfirm={() => {
          if (!rotating) return;
          rotateKey.mutate(rotating.id, {
            onSuccess: (result) => {
              setRotating(null);
              setRevealed({ value: result.fullKey, label: result.apiKey.name || result.apiKey.publicKey });
            },
            onError: (mutationError) => setFormError(asMessage(mutationError)),
          });
        }}
      />

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
              scopedEnvironment ? { environmentId: scopedEnvironment } : {},
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
        {bulkMode === "revoke" && (
          <DialogField label="Reason" name="reason">
            <input id="reason" name="reason" maxLength={500} className={fieldInputClass} />
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
