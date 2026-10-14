import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import {
  useResolveSdkConfig,
  useSdkConfigs,
  useSdkConfigMutations,
  useSdkConfigVersions,
} from "@/modules/projects/hooks/useSdkConfigs";
import type { SdkConfigVersionView } from "@/modules/projects/api/sdk-configs.api";
import { useEnvironments } from "@/modules/projects/hooks/useEnvironments";
import type { ProjectEnvironment } from "@/modules/projects/api/types";
import { ConfirmDialog, DialogField, apiErrorMessage } from "@/modules/projects/components/project-ui";
import {
  ProjectPageHeader,
  Readouts,
  Sheet,
  SheetEmpty,
  SheetList,
  SheetListItem,
  WorkspacePage,
  type Readout,
} from "@/modules/projects/components/project-page";
import { Notice, Panel, Pill, fieldInputClass } from "@/shared/ui/pulse";
import { CodeBlock, Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
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

// ── helpers ──────────────────────────────────────────────────

const EDITOR_SECTIONS = new Set([
  "features",
  "transport",
  "sampling",
  "privacy",
  "instrumentation",
  "limits",
  "killswitches",
]);

const PLATFORM_OPTIONS = [
  { value: "web", label: "Web browser (JavaScript / TypeScript)" },
  { value: "node", label: "Node.js (Express / Fastify / NestJS)" },
  { value: "python", label: "Python (FastAPI / Django / Flask)" },
  { value: "ios", label: "iOS (native Swift SDK)" },
  { value: "android", label: "Android (native Kotlin SDK)" },
];

function shortHash(value?: string | null) {
  return value ? `${value.slice(0, 10)}…${value.slice(-6)}` : "—";
}

function sentenceCase(value: string) {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function envLabel(environment?: Pick<ProjectEnvironment, "name" | "slug"> | null) {
  return environment ? `${environment.name} (${environment.slug})` : "All environments";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function countChangedKeys(a?: Record<string, unknown> | null, b?: Record<string, unknown> | null): number {
  const seen = new Set<string>();
  const walk = (prev: unknown, next: unknown, path: string) => {
    if (isPlainObject(prev) && isPlainObject(next)) {
      const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
      keys.forEach((key) => walk(prev[key], next[key], path ? `${path}.${key}` : key));
      return;
    }
    if (JSON.stringify(prev) !== JSON.stringify(next)) seen.add(path);
  };
  walk(a ?? {}, b ?? {}, "");
  return seen.size;
}

function countEnabled(section: unknown): { on: number; total: number } {
  if (!isPlainObject(section)) return { on: 0, total: 0 };
  const bools = Object.values(section).filter((value): value is boolean => typeof value === "boolean");
  return { on: bools.filter(Boolean).length, total: bools.length };
}

type RollbackMutation = ReturnType<typeof useSdkConfigMutations>["rollbackConfig"];

// ── revision history ─────────────────────────────────────────

function VersionsTab({
  versions,
  rollbackConfig,
  activeOrgId,
  selectedConfigId,
  currentRevision,
}: {
  versions: SdkConfigVersionView[];
  rollbackConfig: RollbackMutation;
  activeOrgId?: string | null;
  selectedConfigId: string;
  currentRevision: number;
}) {
  const [confirmRevision, setConfirmRevision] = useState<number | null>(null);
  const sorted = [...versions].sort((a, b) => (b.revision ?? 0) - (a.revision ?? 0));

  const handleRollback = (revision: number) => {
    if (!activeOrgId) return;
    rollbackConfig.mutate(
      { orgId: activeOrgId, configId: selectedConfigId, revision },
      { onSettled: () => setConfirmRevision(null) },
    );
  };

  return (
    <Sheet
      title="Revision history"
      description="Every publish creates an immutable revision. Restoring one publishes its snapshot again as a new revision."
    >
      {sorted.length === 0 ? (
        <SheetEmpty
          title="No revisions yet"
          description="A revision is recorded each time this configuration is published."
        />
      ) : (
        <SheetList label="Revisions">
          {sorted.map((version, index) => {
            const previous = sorted[index + 1];
            const changedCount = previous ? countChangedKeys(previous.compiledSnapshot, version.compiledSnapshot) : null;
            const isCurrent = version.revision === currentRevision;
            return (
              <SheetListItem key={version.id} className="items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-[family-name:var(--mono)] text-[13px] font-medium tabular-nums text-[var(--text)]">
                      #{version.revision}
                    </span>
                    <Pill>{sentenceCase(version.changeType ?? "publish")}</Pill>
                    {isCurrent && (
                      <Pill tone="green" dot>
                        Serving
                      </Pill>
                    )}
                    {version.revisionHash && (
                      <code
                        className="font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]"
                        title={version.revisionHash}
                      >
                        {shortHash(version.revisionHash)}
                      </code>
                    )}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12px] text-[var(--text3)]">
                    <span>{version.environmentName || "All environments"}</span>
                    <span aria-hidden="true">·</span>
                    <Timestamp value={version.publishedAt} />
                    {changedCount !== null && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          {changedCount === 0
                            ? "No field changes"
                            : `${changedCount} ${changedCount === 1 ? "field" : "fields"} changed`}
                        </span>
                      </>
                    )}
                  </p>
                  {version.changeSummary && (
                    <p className="mt-1.5 text-[13px] leading-[1.5] text-[var(--text2)]">{version.changeSummary}</p>
                  )}
                </div>
                <UiButton
                  variant="outline"
                  size="sm"
                  disabled={rollbackConfig.isPending || isCurrent}
                  title={isCurrent ? "This revision is already serving" : undefined}
                  onClick={() => setConfirmRevision(version.revision)}
                >
                  Restore
                </UiButton>
              </SheetListItem>
            );
          })}
        </SheetList>
      )}

      <ConfirmDialog
        open={confirmRevision !== null}
        onOpenChange={(open) => !open && setConfirmRevision(null)}
        destructive={false}
        title={`Restore revision #${confirmRevision ?? ""}?`}
        description={`This creates a new revision with the snapshot from revision #${confirmRevision ?? ""} and delivers it to every connected SDK.`}
        confirmLabel={`Restore revision #${confirmRevision ?? ""}`}
        pending={rollbackConfig.isPending}
        onConfirm={() => confirmRevision !== null && handleRollback(confirmRevision)}
      />
    </Sheet>
  );
}

// ── payload simulator ────────────────────────────────────────

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
  const result = isPlainObject(resolvedResult) ? resolvedResult : null;
  const [copied, setCopied] = useState(false);

  const features = countEnabled(result?.features);
  const instrumentation = countEnabled(result?.instrumentation);
  const killswitches = countEnabled(result?.killswitches);
  const samplingEntries: Array<[string, number]> = isPlainObject(result?.sampling)
    ? Object.entries(result.sampling).filter((entry): entry is [string, number] => typeof entry[1] === "number")
    : [];

  const readouts: Readout[] = [
    { label: "Features on", value: `${features.on}`, sub: `of ${features.total} features` },
    { label: "Instrumentation on", value: `${instrumentation.on}`, sub: `of ${instrumentation.total} integrations` },
    {
      label: "Killswitches armed",
      value: `${killswitches.on}`,
      sub: `of ${killswitches.total} killswitches`,
      tone: killswitches.on > 0 ? "bad" : "neutral",
    },
  ];

  const handleCopyJson = () => {
    if (!result) return;
    void navigator.clipboard?.writeText(JSON.stringify(result, null, 2)).then(() => {
      setCopied(true);
      toast.success("Resolved SDK config JSON copied to clipboard");
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Panel
        title="Payload simulator"
        description="Compile the payload a running SDK receives for an environment and platform."
      >
        <form onSubmit={handleResolve} className="flex flex-col gap-4">
          <DialogField label="Environment" name="resolve-environment">
            <select
              id="resolve-environment"
              className={fieldInputClass}
              value={resolveEnv}
              onChange={(event) => setResolveEnv(event.target.value)}
            >
              {environments.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {envLabel(environment)}
                </option>
              ))}
            </select>
          </DialogField>

          <DialogField label="SDK platform" name="resolve-platform">
            <select
              id="resolve-platform"
              className={fieldInputClass}
              value={resolvePlatform}
              onChange={(event) => setResolvePlatform(event.target.value)}
            >
              {PLATFORM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </DialogField>

          <UiButton type="submit" size="lg" disabled={isResolving || !resolveEnv}>
            {isResolving ? "Compiling payload…" : "Simulate resolution"}
          </UiButton>
        </form>
      </Panel>

      <div className="flex min-w-0 flex-col gap-6">
        {result ? (
          <>
            <Readouts cells={readouts} label="Resolved payload summary" />

            {samplingEntries.length > 0 && (
              <Panel title="Sampling rates" description="Share of each signal the SDK keeps.">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                  {samplingEntries.map(([key, value]) => (
                    <div key={key} className="flex min-w-0 flex-col gap-1">
                      <dt className="truncate font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]">{key}</dt>
                      <dd className="font-[family-name:var(--mono)] text-[15px] font-medium tabular-nums text-[var(--text)]">
                        {Math.round(value <= 1 ? value * 100 : value)}%
                      </dd>
                    </div>
                  ))}
                </dl>
              </Panel>
            )}

            <Panel
              title={selectedEnvironment ? `Delivered payload · ${selectedEnvironment.name}` : "Delivered payload"}
              description="The exact JSON document SDK instances receive."
              actions={
                <UiButton variant="outline" size="sm" onClick={handleCopyJson}>
                  {copied ? "Copied" : "Copy JSON"}
                </UiButton>
              }
              bodyClassName="p-0"
            >
              <CodeBlock maxHeight={440} className="rounded-none border-0">
                {JSON.stringify(result, null, 2)}
              </CodeBlock>
            </Panel>
          </>
        ) : (
          <Sheet label="Resolved payload">
            <SheetEmpty
              title="Nothing compiled yet"
              description="Choose an environment and an SDK platform, then simulate to inspect the exact JSON document SDK instances receive."
            />
          </Sheet>
        )}
      </div>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────

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
  } = useSdkConfigs(activeOrgId ?? "", projectId, environmentId ? { environmentId } : undefined);

  const { updateConfig, rollbackConfig } = useSdkConfigMutations();
  const resolveMutation = useResolveSdkConfig();

  const selectedConfig = useMemo(
    () => configs.find((config) => config.id === selectedConfigId) ?? configs[0] ?? null,
    [configs, selectedConfigId],
  );

  const selectedEnvironment = useMemo(
    () => environments.find((env) => env.id === (environmentId || selectedConfig?.environmentId)),
    [environmentId, environments, selectedConfig?.environmentId],
  );

  const { data: versions = [] } = useSdkConfigVersions(activeOrgId ?? "", selectedConfig?.id ?? "");

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
        onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to publish SDK config")),
      },
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
    return <RemoteConfigSkeleton />;
  }

  if (configsError || environmentsError) {
    return (
      <WorkspacePage>
        <ProjectPageHeader
          title="Remote config"
          description="Values delivered to SDKs at runtime. Each environment has its own configuration."
        />
        <RemoteConfigErrorState
          error={(configsError || environmentsError) as Error}
          onRetry={() => {
            void refetchEnvironments();
            void refetchConfigs();
          }}
        />
      </WorkspacePage>
    );
  }

  const envName = selectedConfig?.environmentName || selectedEnvironment?.name || "All environments";

  return (
    <WorkspacePage>
      <RemoteConfigHeader
        environments={environments}
        selectedEnvironmentId={environmentId}
        onSelectEnvironment={handleSelectEnvironment}
        isDraft={panelState.isDirty}
        draftChangesCount={panelState.diffCount}
        hasErrors={panelState.hasErrors}
        onOpenPublishDrawer={() => setPublishDrawerOpen(true)}
        onDiscardDraft={panelState.discardDraft}
      />

      {selectedConfig && (
        <RemoteConfigOverview
          environmentName={envName}
          currentRevision={selectedConfig.revision ?? 1}
          revisionHash={shortHash(selectedConfig.revisionHash)}
          publishedAt={selectedConfig.publishedAt}
          isDraft={panelState.isDirty}
          diffCount={panelState.diffCount}
          hasErrors={panelState.hasErrors}
          errorCount={panelState.errorCount}
        />
      )}

      {updateConfig.isSuccess && !updateConfig.isPending && !panelState.isDirty && (
        <div role="status">
          <Notice tone="green" title="Revision published">
            Connected SDKs pick up the update on their next config refresh, within their refresh interval.
          </Notice>
        </div>
      )}

      {configs.length === 0 ? (
        <RemoteConfigEmptyState environmentName={envName} onResetScope={() => setEnvironmentId("")} />
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-8">
          <RemoteConfigNav
            activeSection={activeSection}
            onSelectSection={setActiveSection}
            changedCounts={panelState.changedCounts}
            errorCounts={panelState.errorCounts}
          />

          <div className="min-w-0">
            {EDITOR_SECTIONS.has(activeSection) && selectedConfig && (
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

            {activeSection === "inheritance" && <InheritanceVisualizer environmentName={envName} />}
            {activeSection === "rollout" && <RolloutStrategyPanel environmentName={envName} />}
            {activeSection === "telemetry" && <SdkTelemetryPanel environmentName={envName} />}

            {activeSection === "history" && selectedConfig && (
              <VersionsTab
                versions={versions}
                rollbackConfig={rollbackConfig}
                activeOrgId={activeOrgId}
                selectedConfigId={selectedConfig.id}
                currentRevision={selectedConfig.revision}
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

      <DraftStateBanner
        isDirty={panelState.isDirty}
        hasErrors={panelState.hasErrors}
        diffCount={panelState.diffCount}
        errorCount={panelState.errorCount}
        onDiscard={panelState.discardDraft}
        onReviewPublish={() => setPublishDrawerOpen(true)}
      />

      <ConfirmDialog
        open={confirmEnvSwitchId !== null}
        onOpenChange={(open) => !open && setConfirmEnvSwitchId(null)}
        title="Discard unpublished changes?"
        description={`The draft for ${envName} has changes that aren't published. Switching environments discards them.`}
        confirmLabel="Discard and switch"
        onConfirm={confirmSwitchEnv}
      />
    </WorkspacePage>
  );
}
