import { useMemo, useState, type ReactNode } from "react";
import { Navigate } from "react-router";
import { AlertTriangle, Check, ChevronDown, Copy, Plus } from "lucide-react";

import { useApiKey, useApiKeyMutations, useApiKeyUsage, useApiKeys } from "@/modules/projects/hooks/useApiKeys";
import { useEnvironments } from "@/modules/projects/hooks/useEnvironments";
import { environmentTypeLabel } from "@/modules/projects/environment.constants";
import type {
  ApiKeyStatus,
  ApiKeyUsageGranularity,
  CreateApiKeyBody,
  ProjectApiKey,
} from "@/modules/projects/api/types";
import { projectPath } from "@/modules/projects/navigation/project-routes";
import {
  ApiKeyRevealModal,
  ConfirmDialog,
  DialogField,
  FormDialog,
  type RevealedSecret,
  apiErrorMessage,
  optionalText,
} from "@/modules/projects/components/project-ui";
import {
  HIDE_BELOW_LG,
  HIDE_BELOW_MD,
  HIDE_BELOW_SM,
  ProjectPageHeader,
  Readouts,
  RowActions,
  RowTitle,
  Sheet,
  SheetCell,
  SheetEmpty,
  SheetError,
  SheetLoading,
  SheetRow,
  SheetTable,
  TextLink,
  ToolbarCount,
  WorkspacePage,
  type Readout,
  type SheetColumn,
} from "@/modules/projects/components/project-page";
import { UsageTrendChart } from "@/modules/projects/components/UsageTrendChart";
import { Notice, Panel, Pill, SegmentedControl, fieldInputClass, type SurfaceTone } from "@/shared/ui/pulse";
import {
  FilterSelect,
  KeyValueList,
  Timestamp,
  formatBytes,
  formatCompact,
  formatNumber,
  type KeyValueItem,
} from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet as Drawer,
  SheetContent as DrawerContent,
  SheetDescription as DrawerDescription,
  SheetHeader as DrawerHeader,
  SheetTitle as DrawerTitle,
} from "@/components/ui/sheet";
import { API_KEY_WORKFLOW, useWorkflow } from "@/shared/motion";
import { useOptionalCurrentProject } from "./ProjectShellPage";

// ── module-level constants (rules.md §1.2) ───────────────────

// State colour only: rotated keys sit in their grace window, suspended keys are
// paused, revoked keys are rejected.
const KEY_STATUS_TONE: Record<ApiKeyStatus, SurfaceTone> = {
  active: "green",
  revoked: "red",
  expired: "neutral",
  rotated: "amber",
  suspended: "amber",
};

const USAGE_RANGE_OPTIONS = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
];

const USAGE_GRANULARITY_OPTIONS: { value: ApiKeyUsageGranularity; label: string }[] = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
];

const USAGE_RANGE_HOURS: Record<string, number> = { "24h": 24, "7d": 168, "30d": 720, "90d": 2160 };

const USAGE_RANGE_LABEL: Record<string, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "revoked", label: "Revoked" },
  { value: "expired", label: "Expired" },
  { value: "rotated", label: "Rotated" },
  { value: "suspended", label: "Suspended" },
];

const EXPIRY_WARNING_MS = 30 * 24 * 60 * 60 * 1000;

// The identity column takes the free width and truncates; the rest hug their content.
const COLUMNS: SheetColumn[] = [
  { key: "key", header: "Key", className: "w-full" },
  { key: "environment", header: "Environment", className: `w-[168px] ${HIDE_BELOW_SM}` },
  { key: "status", header: "Status", className: "w-[112px]" },
  { key: "expires", header: "Expires", className: `w-[112px] ${HIDE_BELOW_LG}` },
  { key: "lastUsed", header: "Last used", className: `w-[112px] ${HIDE_BELOW_MD}` },
  { key: "actions", header: "Actions", srOnly: true, align: "right", className: "w-px" },
];

// Series follow design/dashboards/DESIGN.md: the product's own data in white
// and blue, state explicitly in red (errors) and amber (failures).
const USAGE_SERIES = [
  { key: "requests", label: "Requests", color: "var(--text)" },
  { key: "acceptedEvents", label: "Accepted", color: "var(--blue)" },
  { key: "errorEvents", label: "Errors", color: "var(--red)" },
  { key: "ingestionFailures", label: "Failures", color: "var(--amber)" },
];

const USAGE_TABLE_SERIES = [
  { key: "requests", label: "Requests", color: "var(--text)" },
  { key: "acceptedEvents", label: "Accepted events", color: "var(--blue)" },
  { key: "errorEvents", label: "Error events", color: "var(--red)" },
  { key: "ingestionFailures", label: "Failures", color: "var(--amber)" },
  { key: "acceptedBytes", label: "Accepted bytes", color: "var(--violet)" },
  { key: "rateLimitedRequests", label: "Rate limited", color: "var(--text3)" },
];

// Disabled menu items stay legible so the reason under the label can be read.
const EXPLAINED_ITEM = "data-disabled:opacity-100";

const asMessage = apiErrorMessage;

function keyLabel(key: Pick<ProjectApiKey, "name">) {
  return key.name || "Unnamed key";
}

// ── small pieces ─────────────────────────────────────────────

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

/** Icon-only copy control with a real accessible name. */
function CopyIconButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <UiButton
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
      title={copied ? "Copied" : `Copy ${label}`}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="shrink-0 text-[var(--text3)] hover:text-[var(--text)]"
    >
      {copied ? <Check className="size-3" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
    </UiButton>
  );
}

// ── per-key usage drawer ─────────────────────────────────────

function KeyUsageDrawer({
  projectId,
  apiKey,
  environmentName,
  onOpenChange,
}: {
  projectId: string;
  apiKey: ProjectApiKey | null;
  environmentName?: string;
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

  const summary = usage?.summary;
  const errorRate = summary?.errorRate ?? 0;
  const lastUsed = usage?.lastUsedAt ?? detail?.lastUsedAt ?? null;

  const readouts: Readout[] = summary
    ? [
        { label: "Requests", value: formatCompact(summary.requests), sub: USAGE_RANGE_LABEL[range] },
        {
          label: "Accepted events",
          value: formatCompact(summary.acceptedEvents),
          sub: `${formatBytes(summary.acceptedBytes)} accepted`,
        },
        {
          label: "Error rate",
          value: `${errorRate.toFixed(1)}%`,
          sub: `${formatCompact(summary.errorEvents)} error events`,
          tone: errorRate > 5 ? "bad" : errorRate > 1 ? "warn" : "neutral",
        },
        {
          label: "Failures",
          value: formatCompact(summary.ingestionFailures),
          sub: "Ingestion failures",
          tone: summary.ingestionFailures > 0 ? "warn" : "neutral",
        },
        {
          label: "Rate limited",
          value: formatCompact(summary.rateLimitedRequests),
          sub: "Rate-limited requests",
          tone: summary.rateLimitedRequests > 0 ? "warn" : "neutral",
        },
      ]
    : [];

  const details: KeyValueItem[] = detail
    ? [
        { label: "Environment", value: detail.environment?.name ?? environmentName ?? "—" },
        { label: "Key prefix", value: usage?.keyPrefix ?? "—", mono: true },
        { label: "Created", value: <Timestamp value={detail.createdAt} /> },
        { label: "Expires", value: detail.expiresAt ? <Timestamp value={detail.expiresAt} /> : "Never" },
        { label: "Last used", value: lastUsed ? <Timestamp value={lastUsed} /> : "Never" },
        {
          label: "Rotated from",
          value: detail.rotatedFromKeyId ?? "—",
          mono: true,
          copyable: Boolean(detail.rotatedFromKeyId),
        },
      ]
    : [];

  return (
    <Drawer open={!!apiKey} onOpenChange={onOpenChange}>
      <DrawerContent className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[880px]">
        <DrawerHeader className="gap-1.5 border-b border-[var(--border)] px-5 py-4 pr-12">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <DrawerTitle className="min-w-0 truncate text-[16px] font-semibold tracking-[-0.01em] text-[var(--text)]">
              {detail ? keyLabel(detail) : "Ingestion key"}
            </DrawerTitle>
            {detail && (
              <Pill tone={KEY_STATUS_TONE[detail.status]} dot>
                {detail.status}
              </Pill>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-1">
            <DrawerDescription className="min-w-0 truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text2)]">
              {detail?.publicKey ?? ""}
            </DrawerDescription>
            {detail?.publicKey && <CopyIconButton value={detail.publicKey} label="public key" />}
          </div>
        </DrawerHeader>

        <div className="sidebar-scroll flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl value={range} onChange={setRange} options={USAGE_RANGE_OPTIONS} ariaLabel="Usage range" />
            <SegmentedControl
              value={granularity}
              onChange={(value) => setGranularity(value as ApiKeyUsageGranularity)}
              options={USAGE_GRANULARITY_OPTIONS}
              ariaLabel="Usage granularity"
            />
            <span className="ml-auto whitespace-nowrap text-[12px] text-[var(--text3)]">
              {lastUsed ? (
                <>
                  Last used <Timestamp value={lastUsed} />
                </>
              ) : (
                "Never used"
              )}
            </span>
          </div>

          {isLoading ? (
            <div role="status" aria-label="Loading usage" className="flex flex-col gap-4">
              <div aria-hidden="true" className="loading-skeleton h-[88px] rounded-[var(--radius-lg)]" />
              <div aria-hidden="true" className="loading-skeleton h-[320px] rounded-[var(--radius-lg)]" />
            </div>
          ) : error ? (
            <div role="alert">
              <Notice tone="red" icon={AlertTriangle} title="Could not load usage">
                {asMessage(error)}
              </Notice>
            </div>
          ) : usage ? (
            <>
              <Readouts cells={readouts} label="Usage summary" />
              <Panel
                title="Usage over time"
                description="Requests, accepted events, errors, and failures in the selected range."
              >
                <UsageTrendChart
                  ariaLabel={`Usage for ${detail ? keyLabel(detail) : usage.keyPrefix}`}
                  showTable
                  points={usage.series.map((point) => ({ ...point }))}
                  series={USAGE_SERIES}
                  tableSeries={USAGE_TABLE_SERIES}
                  emptyMessage="No usage was recorded for this key in this range."
                />
              </Panel>
            </>
          ) : null}

          {detail && (
            <Panel
              title="Key details"
              bodyClassName="px-5 py-1 [&_dl>div:last-child]:border-b-0 md:[&_dl>div:nth-last-child(2)]:border-b-0"
            >
              <KeyValueList items={details} columns={2} labelWidth={112} />
            </Panel>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ── page ─────────────────────────────────────────────────────

export default function ProjectApiKeysPage() {
  const currentProject = useOptionalCurrentProject();

  if (!currentProject) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <ProjectApiKeysContent
      projectId={currentProject.projectId}
      orgSlug={currentProject.orgSlug}
      publicId={currentProject.publicId}
    />
  );
}

function ProjectApiKeysContent({
  projectId,
  orgSlug,
  publicId,
}: {
  projectId: string;
  orgSlug: string;
  publicId: string;
}) {
  const { data: environments = [], isLoading: environmentsLoading } = useEnvironments(projectId);
  const activeEnvironments = environments.filter((environment) => environment.isActive);
  const environmentById = new Map(environments.map((environment) => [environment.id, environment]));

  const [environmentId, setEnvironmentId] = useState("");
  const [status, setStatus] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);

  const { data, isLoading, error, refetch } = useApiKeys(projectId, {
    ...(environmentId ? { environmentId } : {}),
    ...(status ? { status: status as ApiKeyStatus } : {}),
    includeInactive,
    limit: 100,
  });
  const keys = data?.data ?? [];

  // Readings cover every key. Without filters this is the same query and cache
  // entry as the table.
  const { data: summary, isLoading: summaryLoading } = useApiKeys(projectId, { includeInactive: true, limit: 100 });
  const allKeys = summary?.data ?? [];

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
  const [revealed, setRevealed] = useState<RevealedSecret | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [createEnvironmentId, setCreateEnvironmentId] = useState("");

  const countStatus = (value: ApiKeyStatus) => allKeys.filter((key) => key.status === value).length;
  const activeCount = countStatus("active");
  const suspendedCount = countStatus("suspended");
  const revokedCount = countStatus("revoked");
  const now = Date.now();
  const expiringCount = allKeys.filter((key) => {
    if (key.status !== "active" || !key.expiresAt) return false;
    const remaining = new Date(key.expiresAt).getTime() - now;
    return remaining > 0 && remaining <= EXPIRY_WARNING_MS;
  }).length;

  const readouts: Readout[] = [
    {
      label: "Keys",
      value: formatNumber(summary?.total ?? allKeys.length),
      sub: `Across ${formatNumber(environments.length)} ${environments.length === 1 ? "environment" : "environments"}`,
    },
    { label: "Active", value: formatNumber(activeCount), sub: "Valid for ingestion" },
    {
      label: "Suspended",
      value: formatNumber(suspendedCount),
      sub: suspendedCount > 0 ? "Paused until activated again" : "None suspended",
      tone: suspendedCount > 0 ? "warn" : "neutral",
    },
    {
      label: "Expiring soon",
      value: formatNumber(expiringCount),
      sub: "Active keys expiring within 30 days",
      tone: expiringCount > 0 ? "warn" : "neutral",
    },
    { label: "Revoked", value: formatNumber(revokedCount), sub: "Their telemetry is rejected" },
  ];

  const environmentOptions = [
    { value: "", label: "All environments" },
    ...environments.map((environment) => ({
      value: environment.id,
      label: `${environment.name} · ${environmentTypeLabel(environment.type)}`,
    })),
  ];

  const createEnvironment = activeEnvironments.find((environment) => environment.id === createEnvironmentId);

  /**
   * Key creation generates, encrypts and persists a secret — three distinct
   * server-side steps, so it narrates rather than spins (Phase 4).
   */
  const keyWorkflow = useWorkflow(API_KEY_WORKFLOW, { pace: 450, successHold: 320 });

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

    void keyWorkflow.run(() => createKey.mutateAsync(payload), {
      onSuccess: (result) => {
        keyWorkflow.reset();
        setCreating(false);
        setRevealed({
          value: result.fullKey,
          label: result.apiKey.name || result.apiKey.publicKey,
          keyName: result.apiKey.name ?? undefined,
          publicKey: result.apiKey.publicKey,
          environmentName: createEnvironment?.name,
          environmentType: createEnvironment?.type,
        });
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

  const hasFilters = Boolean(environmentId || status || !includeInactive);
  const clearFilters = () => {
    setEnvironmentId("");
    setStatus("");
    setIncludeInactive(true);
  };

  const noActiveEnvironment = !environmentsLoading && activeEnvironments.length === 0;
  const createButton = (
    <UiButton size="lg" onClick={() => setCreating(true)} disabled={activeEnvironments.length === 0}>
      <Plus className="size-4" aria-hidden="true" /> Create key
    </UiButton>
  );

  let body: ReactNode;
  if (isLoading) {
    body = <SheetLoading rows={4} label="Loading API keys" />;
  } else if (error) {
    body = <SheetError title="Could not load API keys" message={asMessage(error)} onRetry={() => void refetch()} />;
  } else if (keys.length === 0) {
    body = hasFilters ? (
      <SheetEmpty
        title="No keys match"
        description="No key has this combination of environment and status."
        action={
          <UiButton variant="outline" size="lg" onClick={clearFilters}>
            Clear filters
          </UiButton>
        }
      />
    ) : (
      <SheetEmpty
        title="No API keys yet"
        description="An ingestion key lets an SDK send telemetry to one environment of this project. Create one, then copy its secret into the SDK configuration."
        action={activeEnvironments.length > 0 ? createButton : undefined}
      />
    );
  } else {
    body = (
      <SheetTable columns={COLUMNS} caption="API keys" minWidth={560}>
        {keys.map((key) => {
          const label = keyLabel(key);
          const environment = environmentById.get(key.environmentId);
          const environmentName = key.environment?.name ?? environment?.name;
          const canToggle = key.status === "active" || key.status === "suspended";
          return (
            <SheetRow key={key.id} muted={key.status === "revoked" || key.status === "expired"}>
              <SheetCell className="w-full max-w-0">
                <RowTitle
                  title={
                    <button
                      type="button"
                      onClick={() => setInspecting(key)}
                      className="max-w-full truncate rounded-[2px] text-left decoration-[var(--border2)] underline-offset-[3px] hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border2)]"
                    >
                      <span className="sr-only">View usage for </span>
                      {label}
                    </button>
                  }
                  subtitle={
                    <span className="flex min-w-0 items-center gap-1">
                      <code className="min-w-0 truncate font-[family-name:var(--mono)] text-[11.5px]">{key.publicKey}</code>
                      <CopyIconButton value={key.publicKey} label={`public key for ${label}`} />
                    </span>
                  }
                />
              </SheetCell>
              <SheetCell className={HIDE_BELOW_SM}>
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full ring-1 ring-[var(--border2)]"
                    style={{ backgroundColor: environment?.color ?? "var(--text3)" }}
                  />
                  <span className="truncate text-[13px] text-[var(--text2)]">{environmentName ?? "—"}</span>
                </span>
              </SheetCell>
              <SheetCell>
                <Pill tone={KEY_STATUS_TONE[key.status]} dot>
                  {key.status}
                </Pill>
              </SheetCell>
              <SheetCell className={HIDE_BELOW_LG}>
                {key.expiresAt ? (
                  <Timestamp value={key.expiresAt} />
                ) : (
                  <span className="text-[12px] text-[var(--text3)]">Never</span>
                )}
              </SheetCell>
              <SheetCell className={HIDE_BELOW_MD}>
                {key.lastUsedAt ? (
                  <Timestamp value={key.lastUsedAt} />
                ) : (
                  <span className="text-[12px] text-[var(--text3)]">Never</span>
                )}
              </SheetCell>
              <SheetCell align="right">
                <RowActions label={`Actions for ${label}`}>
                  <DropdownMenuItem onSelect={() => setInspecting(key)}>View usage</DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setFormError(null);
                      setEditing(key);
                    }}
                  >
                    Edit label
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setRotating(key)}>Rotate with grace period</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setRegenerating(key)}>Regenerate now</DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!canToggle}
                    className={EXPLAINED_ITEM}
                    onSelect={() => setKeyEnabled.mutate({ apiKeyId: key.id, enabled: key.status === "suspended" })}
                  >
                    <MenuItemText
                      label={key.status === "suspended" ? "Activate" : "Suspend"}
                      reason={canToggle ? undefined : "Only active or suspended keys"}
                    />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={key.status === "revoked"}
                    className={EXPLAINED_ITEM}
                    onSelect={() => {
                      setFormError(null);
                      setRevoking(key);
                    }}
                  >
                    <MenuItemText label="Revoke key" reason={key.status === "revoked" ? "Already revoked" : undefined} />
                  </DropdownMenuItem>
                </RowActions>
              </SheetCell>
            </SheetRow>
          );
        })}
      </SheetTable>
    );
  }

  const inspectingEnvironmentName = inspecting
    ? inspecting.environment?.name ?? environmentById.get(inspecting.environmentId)?.name
    : undefined;

  return (
    <WorkspacePage>
      <ProjectPageHeader
        title="API keys"
        description="Ingestion credentials, each scoped to one environment. A key's secret is shown once, when the key is created or rotated."
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <UiButton variant="outline" size="lg">
                  Bulk actions <ChevronDown className="size-3.5" aria-hidden="true" />
                </UiButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onSelect={() => {
                    setFormError(null);
                    setBulkMode("rotate");
                  }}
                >
                  Rotate keys…
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    setFormError(null);
                    setBulkMode("revoke");
                  }}
                >
                  Revoke keys…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {createButton}
          </>
        }
      />

      {noActiveEnvironment && (
        <Notice
          tone="amber"
          icon={AlertTriangle}
          title="No active environments"
          action={
            <TextLink to={projectPath(orgSlug, publicId, "environments")} size="sm">
              Open environments
            </TextLink>
          }
        >
          API keys must belong to an active environment. Create or reactivate one on the Environments tab first.
        </Notice>
      )}

      <Readouts cells={readouts} loading={summaryLoading} label="API keys summary" />

      <Sheet
        label="API key list"
        toolbar={
          <>
            <FilterSelect label="Environment" value={environmentId} onChange={setEnvironmentId} options={environmentOptions} />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_FILTER_OPTIONS} />
            <label className="flex h-9 cursor-pointer items-center gap-2 text-[13px] text-[var(--text2)]">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
                className="size-4 cursor-pointer accent-[var(--text)]"
              />
              Include inactive
            </label>
            {!isLoading && !error && (
              <ToolbarCount>
                {hasFilters
                  ? `${formatNumber(keys.length)} of ${formatNumber(summary?.total ?? allKeys.length)}`
                  : `${formatNumber(data?.total ?? keys.length)} ${(data?.total ?? keys.length) === 1 ? "key" : "keys"}`}
              </ToolbarCount>
            )}
          </>
        }
      >
        {body}
      </Sheet>

      {/* ── create ── */}
      <FormDialog
        open={creating}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setFormError(null);
            keyWorkflow.reset();
          }
        }}
        title="Create ingestion key"
        description="Keys are scoped to one environment and don't expire."
        submitLabel="Create key"
        pending={keyWorkflow.isActive}
        error={formError}
        onSubmit={handleCreate}
      >
        <Notice tone="amber" icon={AlertTriangle}>
          Only one active key is kept per environment. Creating a key automatically replaces and revokes the
          environment's current active key.
        </Notice>
        <DialogField label="Environment" name="environmentId" required>
          <select
            id="environmentId"
            name="environmentId"
            className={fieldInputClass}
            value={createEnvironmentId || (activeEnvironments[0]?.id ?? "")}
            onChange={(e) => setCreateEnvironmentId(e.target.value)}
            required
          >
            {activeEnvironments.map((environment) => (
              <option key={environment.id} value={environment.id}>
                {environment.name} ({environmentTypeLabel(environment.type)})
              </option>
            ))}
          </select>
        </DialogField>
        <DialogField label="Key label" name="name" hint="Optional. Helps you tell keys apart, such as backend-ingest-prod.">
          <input id="name" name="name" maxLength={100} placeholder="backend-ingest" autoComplete="off" className={fieldInputClass} />
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
        title={editing ? `Edit ${keyLabel(editing)}` : "Edit key"}
        description="Update key metadata. Key secrets and environments cannot be changed."
        submitLabel="Save changes"
        pending={updateKey.isPending}
        error={formError}
        onSubmit={handleEdit}
      >
        <DialogField label="Key label" name="name">
          <input
            id="name"
            name="name"
            defaultValue={editing?.name ?? ""}
            maxLength={100}
            autoComplete="off"
            className={fieldInputClass}
          />
        </DialogField>
      </FormDialog>

      {/* ── rotate ── */}
      <ConfirmDialog
        open={!!rotating}
        onOpenChange={(open) => !open && setRotating(null)}
        title={`Rotate ${rotating ? keyLabel(rotating) : "key"}?`}
        description="Rotates the key secret. A new secret will be displayed and the old secret will enter its rotation grace window."
        confirmLabel="Rotate key"
        pending={rotateKey.isPending}
        onConfirm={() => {
          if (!rotating) return;
          rotateKey.mutate(rotating.id, {
            onSuccess: (result) => {
              const env = rotating.environment ?? environments.find((e) => e.id === rotating.environmentId);
              setRotating(null);
              setRevealed({
                value: result.fullKey,
                label: result.apiKey.name || result.apiKey.publicKey,
                keyName: result.apiKey.name ?? undefined,
                publicKey: result.apiKey.publicKey,
                environmentName: env?.name,
              });
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
              const env = regenerating.environment ?? environments.find((e) => e.id === regenerating.environmentId);
              setRegenerating(null);
              setRevealed({
                value: result.fullKey,
                label: result.apiKey.name || result.apiKey.publicKey,
                keyName: result.apiKey.name ?? undefined,
                publicKey: result.apiKey.publicKey,
                environmentName: env?.name,
              });
            },
            onError: (mutationError) => setFormError(asMessage(mutationError)),
          });
        }}
      />

      {/* ── revoke ── */}
      <FormDialog
        open={!!revoking}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={`Revoke ${revoking ? keyLabel(revoking) : "key"}?`}
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
        <Notice tone="red" icon={AlertTriangle}>
          This cannot be undone. Rotate instead if you need a grace period.
        </Notice>
        <DialogField label="Revocation reason" name="revokedReason" hint="Optional. Recorded in the audit log.">
          <input
            id="revokedReason"
            name="revokedReason"
            maxLength={500}
            placeholder="Leaked in client bundle"
            autoComplete="off"
            className={fieldInputClass}
          />
        </DialogField>
      </FormDialog>

      {/* ── bulk ── */}
      <FormDialog
        open={!!bulkMode}
        onOpenChange={(open) => !open && setBulkMode(null)}
        title={bulkMode === "rotate" ? "Rotate keys in bulk" : "Revoke keys in bulk"}
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
          <DialogField label="Reason" name="reason" hint="Optional. Recorded in the audit log.">
            <input id="reason" name="reason" maxLength={500} autoComplete="off" className={fieldInputClass} />
          </DialogField>
        )}
      </FormDialog>

      {/* ── one-time secret ── */}
      <ApiKeyRevealModal revealed={revealed} onClose={() => setRevealed(null)} />

      <KeyUsageDrawer
        projectId={projectId}
        apiKey={inspecting}
        environmentName={inspectingEnvironmentName}
        onOpenChange={(open) => !open && setInspecting(null)}
      />
    </WorkspacePage>
  );
}
