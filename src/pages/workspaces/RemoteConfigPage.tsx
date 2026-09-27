import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  RotateCcw,
  ServerCog,
  ShieldCheck,
  ShieldOff,
  Copy,
  Check,
  AlertTriangle,
  History,
  FlaskConical,
} from "lucide-react";
import {
  Button,
  FillPage,
  SectionCard,
  StatusBadge,
  SubmitButton,
  inputClass,
} from "@/shared/observe";
import { toast } from "sonner";
import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import {
  useResolveSdkConfig,
  useSdkConfigs,
  useSdkConfigMutations,
  useSdkConfigVersions,
} from "@/modules/projects/hooks/useSdkConfigs";
import { useEnvironments } from "@/modules/projects/hooks/useEnvironments";
import type { ProjectEnvironment } from "@/modules/projects/api/types";
import { useCurrentProject } from "@/pages/workspaces/ProjectShellPage";

import { RemoteConfigHeader } from "./RemoteConfig/components/RemoteConfigHeader";
import { RemoteConfigOverview } from "./RemoteConfig/components/RemoteConfigOverview";
import { RemoteConfigNav } from "./RemoteConfig/components/RemoteConfigNav";
import { RemoteConfigSkeleton } from "./RemoteConfig/components/RemoteConfigSkeleton";
import { RemoteConfigEmptyState } from "./RemoteConfig/components/RemoteConfigEmptyState";
import { RemoteConfigErrorState } from "./RemoteConfig/components/RemoteConfigErrorState";
import { DraftStateBanner } from "./RemoteConfig/components/DraftStateBanner";
import { InheritanceVisualizer } from "./RemoteConfig/components/InheritanceVisualizer";
import { RolloutStrategyPanel } from "./RemoteConfig/components/RolloutStrategyPanel";
import { AuditLogPanel } from "./RemoteConfig/components/AuditLogPanel";
import { SdkTelemetryPanel } from "./RemoteConfig/components/SdkTelemetryPanel";
import { RemoteConfigPanel, type RemoteConfigPanelHandle } from "./RemoteConfig/RemoteConfigPanel";

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

function shortHash(value?: string | null) {
  return value ? `${value.slice(0, 10)}...${value.slice(-6)}` : "-";
}

function envLabel(environment?: Pick<ProjectEnvironment, "name" | "slug"> | null) {
  return environment ? `${environment.name} (${environment.slug})` : "All environments";
}

function countChangedKeys(
  a: Record<string, unknown> | null | undefined,
  b: Record<string, unknown> | null | undefined
): number {
  const seen = new Set<string>();
  const walk = (prev: any, next: any, path: string) => {
    if (
      prev &&
      next &&
      typeof prev === "object" &&
      typeof next === "object" &&
      !Array.isArray(prev) &&
      !Array.isArray(next)
    ) {
      const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
      keys.forEach((key) => walk(prev[key], next[key], path ? `${path}.${key}` : key));
      return;
    }
    if (JSON.stringify(prev) !== JSON.stringify(next)) seen.add(path);
  };
  walk(a ?? {}, b ?? {}, "");
  return seen.size;
}

function VersionsTab({
  versions,
  rollbackConfig,
  activeOrgId,
  selectedConfigId,
}: {
  versions: any[];
  rollbackConfig: { mutate: (payload: any) => void; isPending: boolean };
  activeOrgId?: string | null;
  selectedConfigId: string;
}) {
  const [confirmRollbackRevision, setConfirmRollbackRevision] = useState<number | null>(null);

  if (!versions.length) {
    return (
      <SectionCard title="Revision History & Rollbacks">
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--bg1)] p-8 text-center text-xs text-[var(--text3)]">
          No historical revisions have been recorded for this configuration yet.
        </div>
      </SectionCard>
    );
  }

  const sorted = [...versions].sort((a, b) => (b.revision ?? 0) - (a.revision ?? 0));

  const handleRollback = (rev: number) => {
    rollbackConfig.mutate({
      orgId: activeOrgId,
      configId: selectedConfigId,
      revision: rev,
    });
    setConfirmRollbackRevision(null);
  };

  return (
    <SectionCard
      title="Immutable Revision Log & Instant Rollbacks"
      description="Cryptographically hashed revision history. Every publish creates an immutable snapshot with instant zero-downtime rollback capability."
    >
      <div className="space-y-3">
        {sorted.map((version, index) => {
          const previous = sorted[index + 1];
          const changedCount = previous
            ? countChangedKeys(previous.compiledSnapshot, version.compiledSnapshot)
            : null;

          return (
            <div
              key={version.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 sm:p-5 transition-all hover:border-[var(--border2)]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[var(--text)]">
                    Revision #{version.revision}
                  </span>
                  <StatusBadge status={version.changeType ?? "publish"} />
                  {version.revisionHash && (
                    <span className="font-mono text-[11px] text-[var(--text3)]">
                      ({shortHash(version.revisionHash)})
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-[var(--text3)]">
                  Scope: <strong className="text-[var(--text2)]">{version.environmentName || "All Environments"}</strong> · {formatDate(version.publishedAt)}
                  {changedCount !== null && (
                    <> · {changedCount === 0 ? "No field changes" : `${changedCount} field${changedCount === 1 ? "" : "s"} modified`}</>
                  )}
                </div>
                {version.changeSummary && (
                  <div className="mt-1.5 rounded bg-[var(--bg2)] px-2.5 py-1 text-xs font-mono text-[var(--brand)] border border-[var(--border)] inline-block">
                    {version.changeSummary}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={rollbackConfig.isPending}
                  onClick={() => setConfirmRollbackRevision(version.revision)}
                  className="h-8 gap-1.5 border border-[var(--border)] px-3 text-xs text-[var(--text2)] hover:border-[var(--amber)] hover:text-[var(--amber)]"
                >
                  <RotateCcw className="size-3.5 text-[var(--amber)]" />
                  Restore Revision
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rollback confirmation modal */}
      {confirmRollbackRevision !== null && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[var(--overlay)] p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border2)] bg-[var(--bg1)] p-6 shadow-[var(--shadow-modal)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-[var(--amber)]">
              <RotateCcw className="size-6 shrink-0" />
              <h2 className="font-[family-name:var(--display)] text-[16px] font-bold text-[var(--text)]">
                Restore Revision #{confirmRollbackRevision}?
              </h2>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--text2)]">
              This action creates a new revision with the compiled snapshot from Revision #{confirmRollbackRevision} and delivers it to all connected SDKs.
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmRollbackRevision(null)}
                className="h-8.5 px-3.5 text-xs text-[var(--text2)]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleRollback(confirmRollbackRevision)}
                disabled={rollbackConfig.isPending}
                className="h-8.5 gap-1.5 bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-d)] px-4 text-xs font-semibold"
              >
                <RotateCcw className="size-3.5" />
                {rollbackConfig.isPending ? "Restoring..." : `Confirm Rollback to #${confirmRollbackRevision}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function countEnabled(section: unknown): { on: number; total: number } {
  if (!section || typeof section !== "object") return { on: 0, total: 0 };
  const values = Object.values(section as Record<string, unknown>);
  const bools = values.filter((v) => typeof v === "boolean");
  return { on: bools.filter(Boolean).length, total: bools.length };
}

function ResolveSummaryTile({
  label,
  icon: Icon,
  on,
  total,
  tone = "default",
}: {
  label: string;
  icon: typeof ServerCog;
  on: number;
  total: number;
  tone?: "default" | "danger";
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg2)]/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow text-[10px] text-[var(--text3)]">{label}</span>
        <Icon className={`size-4 ${tone === "danger" ? "text-[var(--red)]" : "text-[var(--brand)]"}`} />
      </div>
      <div className={`mt-2 text-base font-bold ${tone === "danger" && on > 0 ? "text-[var(--red)]" : "text-[var(--text)]"}`}>
        {on} / {total} Active
      </div>
    </div>
  );
}

function ResolveTab({
  environments,
  resolveEnv,
  setResolveEnv,
  resolvePlatform,
  setResolvePlatform,
  handleResolve,
  resolvedResult,
  isResolving,
}: {
  environments: ProjectEnvironment[];
  resolveEnv: string;
  setResolveEnv: (value: string) => void;
  resolvePlatform: string;
  setResolvePlatform: (value: string) => void;
  handleResolve: (event: React.FormEvent) => void;
  resolvedResult: unknown;
  isResolving: boolean;
}) {
  const selectedEnvironment = environments.find((environment) => environment.id === resolveEnv);
  const result = (resolvedResult ?? null) as Record<string, any> | null;
  const [copied, setCopied] = useState(false);

  const features = countEnabled(result?.features);
  const instrumentation = countEnabled(result?.instrumentation);
  const killswitches = countEnabled(result?.killswitches);
  const samplingEntries: Array<[string, number]> = result?.sampling
    ? (Object.entries(result.sampling) as Array<[string, unknown]>).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number"
      )
    : [];

  const handleCopyJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    toast.success("Resolved SDK config JSON copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <SectionCard
        title="SDK Delivery Sandbox"
        description="Simulate the compiled runtime payload delivered to running SDK instances for any environment and platform."
      >
        <form onSubmit={handleResolve} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow text-[11px] text-[var(--text3)]">Target Environment</span>
            <select
              className={inputClass}
              value={resolveEnv}
              onChange={(e) => setResolveEnv(e.target.value)}
            >
              {environments.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {envLabel(environment)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="eyebrow text-[11px] text-[var(--text3)]">SDK Target Platform</span>
            <select
              className={inputClass}
              value={resolvePlatform}
              onChange={(e) => setResolvePlatform(e.target.value)}
            >
              <option value="web">Web Browser (JavaScript / TypeScript)</option>
              <option value="node">Node.js (Express / Fastify / NestJS)</option>
              <option value="python">Python (FastAPI / Django / Flask)</option>
              <option value="ios">iOS (Native Swift SDK)</option>
              <option value="android">Android (Native Kotlin SDK)</option>
            </select>
          </label>

          <SubmitButton className="mt-2 h-8.5 font-semibold text-xs bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-d)]">
            {isResolving ? "Compiling Payload..." : "Simulate SDK Resolution"}
          </SubmitButton>
        </form>
      </SectionCard>

      <SectionCard
        title={
          selectedEnvironment
            ? `Compiled Live Payload: ${selectedEnvironment.name}`
            : "Compiled Live Telemetry Payload"
        }
      >
        {result ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <ResolveSummaryTile label="Active Features" icon={ShieldCheck} on={features.on} total={features.total} />
              <ResolveSummaryTile label="Instrumentation" icon={ServerCog} on={instrumentation.on} total={instrumentation.total} />
              <ResolveSummaryTile label="Killswitches Armed" icon={ShieldOff} on={killswitches.on} total={killswitches.total} tone="danger" />
            </div>

            {samplingEntries.length > 0 && (
              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg2)]/40 p-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text3)]">
                  Compiled Ingestion Rates
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {samplingEntries.map(([key, value]) => (
                    <span
                      key={key}
                      className="rounded border border-[var(--border)] bg-[var(--bg1)] px-2 py-0.5 font-mono text-[11px] text-[var(--text2)]"
                    >
                      {key}: <strong className="text-[var(--brand)]">{Math.round(value <= 1 ? value * 100 : value)}%</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="eyebrow text-[11px] text-[var(--text3)]">Delivered JSON Payload</span>
                <Button type="button" variant="ghost" className="h-7 text-xs gap-1 text-[var(--text2)]" onClick={handleCopyJson}>
                  {copied ? <Check className="size-3 text-[var(--green)]" /> : <Copy className="size-3" />}
                  {copied ? "Copied!" : "Copy JSON"}
                </Button>
              </div>
              <pre className="max-h-[380px] overflow-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 font-mono text-[11px] leading-relaxed text-[var(--text)]">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] p-12 text-center text-xs text-[var(--text3)]">
            Select an environment and SDK target platform above, then click <strong>Simulate SDK Resolution</strong> to inspect the exact JSON document received by SDK instances.
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export default function RemoteConfigPage() {
  const { projectId } = useCurrentProject();
  const { activeOrgId } = useOrganizations();
  const [environmentId, setEnvironmentId] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("features");
  const [resolveEnv, setResolveEnv] = useState("");
  const [resolvePlatform, setResolvePlatform] = useState("web");
  const [resolvedResult, setResolvedResult] = useState<unknown>(null);
  const [confirmEnvSwitchId, setConfirmEnvSwitchId] = useState<string | null>(null);

  const [panelState, setPanelState] = useState<RemoteConfigPanelHandle>({
    isDirty: false,
    hasErrors: false,
    diffCount: 0,
    errorCount: 0,
    changedCounts: {},
    errorCounts: {},
    openPublishDrawer: () => {},
    discardDraft: () => {},
  });

  const [publishDrawerOpen, setPublishDrawerOpen] = useState(false);

  const {
    data: environments = [],
    isLoading: environmentsLoading,
    error: environmentsError,
    refetch: refetchEnvironments,
  } = useEnvironments(projectId);

  const {
    data: configs = [],
    isLoading: configsLoading,
    error: configsError,
    refetch: refetchConfigs,
  } = useSdkConfigs(
    activeOrgId ?? "",
    projectId,
    environmentId ? { environmentId } : undefined
  );

  const { updateConfig, rollbackConfig } = useSdkConfigMutations();
  const resolveMutation = useResolveSdkConfig();

  const selectedConfig = useMemo(
    () => configs.find((config) => config.id === selectedConfigId) ?? configs[0] ?? null,
    [configs, selectedConfigId]
  );

  const selectedEnvironment = useMemo(
    () => environments.find((env) => env.id === (environmentId || selectedConfig?.environmentId)),
    [environmentId, environments, selectedConfig?.environmentId]
  );

  const { data: versions = [] } = useSdkConfigVersions(
    activeOrgId ?? "",
    selectedConfig?.id ?? ""
  );

  useEffect(() => {
    if (configs.length > 0 && !configs.some((config) => config.id === selectedConfigId)) {
      setSelectedConfigId(configs[0].id);
    }
    if (configs.length === 0) setSelectedConfigId(null);
  }, [configs, selectedConfigId]);

  useEffect(() => {
    if (!resolveEnv && environments.length > 0) setResolveEnv(environments[0].id);
  }, [environments, resolveEnv]);

  useEffect(() => {
    setResolvedResult(null);
  }, [resolveEnv, resolvePlatform]);

  const handleSelectEnvironment = (id: string) => {
    if (panelState.isDirty) {
      setConfirmEnvSwitchId(id);
    } else {
      setEnvironmentId(id);
      setSelectedConfigId(null);
    }
  };

  const confirmSwitchEnv = () => {
    if (confirmEnvSwitchId !== null) {
      panelState.discardDraft();
      setEnvironmentId(confirmEnvSwitchId);
      setSelectedConfigId(null);
      setConfirmEnvSwitchId(null);
    }
  };

  const handleSave = (editableConfig: Record<string, unknown>, changeSummary: string) => {
    if (!selectedConfig || !activeOrgId) return;
    updateConfig.mutate(
      {
        orgId: activeOrgId,
        configId: selectedConfig.id,
        projectId,
        data: {
          editableConfig,
          changeSummary: changeSummary || `Updated ${selectedConfig.environmentName} SDK config`,
        },
      },
      {
        onSuccess: () => toast.success(`Published revision #${selectedConfig.revision + 1}`),
        onError: (error: any) => {
          const message = error?.response?.data?.error?.message ?? "Failed to publish SDK config";
          toast.error(message);
        },
      }
    );
  };

  const handleResolve = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeOrgId || !resolveEnv) return;
    try {
      const result = await resolveMutation.mutateAsync({
        orgId: activeOrgId,
        projectId,
        environmentId: resolveEnv,
        platform: resolvePlatform,
      });
      setResolvedResult(result);
      toast.success("Resolved SDK config loaded");
    } catch {
      toast.error("Failed to resolve SDK config");
    }
  };

  if ((configsLoading && configs.length === 0) || (environmentsLoading && environments.length === 0)) {
    return (
      <FillPage>
        <RemoteConfigSkeleton />
      </FillPage>
    );
  }

  if (configsError || environmentsError) {
    return (
      <FillPage>
        <div className="data-rail mx-auto w-full p-4 sm:p-6">
          <RemoteConfigErrorState
            error={(configsError || environmentsError) as Error}
            onRetry={() => {
              refetchEnvironments();
              refetchConfigs();
            }}
          />
        </div>
      </FillPage>
    );
  }

  const envName = selectedConfig?.environmentName || selectedEnvironment?.name || "All Environments";

  // Check if current view is a wide data view
  const isWideDataView = [
    "transport",
    "inheritance",
    "rollout",
    "telemetry",
    "history",
    "resolve",
    "audit",
  ].includes(activeSection);

  return (
    <FillPage>
      <div className="data-rail mx-auto flex w-full flex-col gap-6 p-3 pb-28 sm:p-5">
        {/* Header with Scope Switcher & Status */}
        <RemoteConfigHeader
          environments={environments}
          selectedEnvironmentId={environmentId}
          onSelectEnvironment={handleSelectEnvironment}
          currentRevision={selectedConfig?.revision ?? 1}
          revisionHash={shortHash(selectedConfig?.revisionHash)}
          publishedAt={formatDate(selectedConfig?.publishedAt)}
          isDraft={panelState.isDirty}
          draftChangesCount={panelState.diffCount}
          hasErrors={panelState.hasErrors}
          onOpenPublishDrawer={() => setPublishDrawerOpen(true)}
          onDiscardDraft={panelState.discardDraft}
          onOpenRollout={() => setActiveSection("rollout")}
          onOpenInheritance={() => setActiveSection("inheritance")}
          onOpenTelemetry={() => setActiveSection("telemetry")}
        />

        {/* Configuration KPI Overview Cards */}
        {selectedConfig && (
          <RemoteConfigOverview
            environmentName={envName}
            currentRevision={selectedConfig?.revision ?? 1}
            revisionHash={shortHash(selectedConfig?.revisionHash)}
            publishedAt={formatDate(selectedConfig?.publishedAt)}
            isDraft={panelState.isDirty}
            diffCount={panelState.diffCount}
            hasErrors={panelState.hasErrors}
          />
        )}

        {/* Success Alert Banner */}
        {updateConfig.isSuccess && !updateConfig.isPending && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-[var(--green)]/30 bg-[var(--green-bg)] px-4 py-2.5 text-[12px] text-[var(--green)] animate-in fade-in"
          >
            <CheckCircle2 className="mt-px size-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-semibold">Revision published successfully.</span>{" "}
              <span className="text-[var(--text2)]">
                Connected SDKs pick up the update on their next cache refresh cycle (within TTL window).
              </span>
            </span>
          </div>
        )}

        {/* Main Content Workspace: Navigation Rail + Tab Workspace */}
        {configs.length === 0 ? (
          <RemoteConfigEmptyState
            environmentName={envName}
            onResetScope={() => setEnvironmentId("")}
          />
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <RemoteConfigNav
              activeSection={activeSection}
              onSelectSection={setActiveSection}
              changedCounts={panelState.changedCounts}
              errorCounts={panelState.errorCounts}
            />

            <div className={isWideDataView ? "min-w-0 flex-1" : "min-w-0 flex-1 max-w-[800px]"}>
              {/* Primary Settings Workspace */}
              {[
                "features",
                "transport",
                "sampling",
                "privacy",
                "instrumentation",
                "limits",
                "killswitches",
              ].includes(activeSection) && selectedConfig && (
                <RemoteConfigPanel
                  initialConfig={selectedConfig.compiledSnapshot}
                  onSave={handleSave}
                  isSaving={updateConfig.isPending}
                  environmentName={envName}
                  currentRevision={selectedConfig.revision}
                  activeSection={activeSection}
                  onStateChange={setPanelState}
                  publishDrawerOpen={publishDrawerOpen}
                  onClosePublishDrawer={() => setPublishDrawerOpen(false)}
                />
              )}

              {/* Operations & Overrides Views */}
              {activeSection === "inheritance" && <InheritanceVisualizer environmentName={envName} />}
              {activeSection === "rollout" && <RolloutStrategyPanel environmentName={envName} />}
              {activeSection === "telemetry" && <SdkTelemetryPanel environmentName={envName} />}

              {/* Control Plane & Audit Views */}
              {activeSection === "history" && selectedConfig && (
                <VersionsTab
                  versions={versions}
                  rollbackConfig={rollbackConfig}
                  activeOrgId={activeOrgId}
                  selectedConfigId={selectedConfig.id}
                />
              )}
              {activeSection === "resolve" && (
                <ResolveTab
                  environments={environments}
                  resolveEnv={resolveEnv}
                  setResolveEnv={setResolveEnv}
                  resolvePlatform={resolvePlatform}
                  setResolvePlatform={setResolvePlatform}
                  handleResolve={handleResolve}
                  resolvedResult={resolvedResult}
                  isResolving={resolveMutation.isPending}
                />
              )}
              {activeSection === "audit" && <AuditLogPanel />}
            </div>
          </div>
        )}

        {/* Floating Draft Action Bar */}
        <DraftStateBanner
          isDirty={panelState.isDirty}
          hasErrors={panelState.hasErrors}
          diffCount={panelState.diffCount}
          errorCount={panelState.errorCount}
          onDiscard={panelState.discardDraft}
          onReviewPublish={() => setPublishDrawerOpen(true)}
        />

        {/* Unsaved Changes Confirmation Modal */}
        {confirmEnvSwitchId !== null && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[var(--overlay)] p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border2)] bg-[var(--bg1)] p-6 shadow-[var(--shadow-modal)] animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 text-[var(--amber)]">
                <AlertTriangle className="size-6 shrink-0" />
                <h2 className="font-[family-name:var(--display)] text-[16px] font-bold text-[var(--text)]">
                  Discard Unsaved Draft Changes?
                </h2>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[var(--text2)]">
                You have unsaved changes in the local draft for <strong>{envName}</strong>. Switching environments will discard these buffered changes.
              </p>
              <div className="mt-6 flex justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setConfirmEnvSwitchId(null)}
                  className="h-8.5 px-3.5 text-xs text-[var(--text2)]"
                >
                  Stay on Page
                </Button>
                <Button
                  type="button"
                  onClick={confirmSwitchEnv}
                  className="h-8.5 bg-[var(--red)] text-white hover:bg-[var(--red-d)] px-4 text-xs font-semibold"
                >
                  Discard Changes & Switch
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </FillPage>
  );
}
