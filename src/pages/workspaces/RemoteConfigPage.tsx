import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  RotateCcw,
  ServerCog,
  ShieldCheck,
  ShieldOff,
  Copy,
  Check,
} from "lucide-react";
import {
  Button,
  FillPage,
  SectionCard,
  StatusBadge,
  SubmitButton,
  inputClass,
} from "@/shared/observe";
import { RouteLoadingRegion } from "@/shared/ui/loading";
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
import { RemoteConfigNav } from "./RemoteConfig/components/RemoteConfigNav";
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
  return value ? `${value.slice(0, 12)}...${value.slice(-6)}` : "-";
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
    if (prev && next && typeof prev === "object" && typeof next === "object" && !Array.isArray(prev) && !Array.isArray(next)) {
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
  if (!versions.length) {
    return (
      <SectionCard title="Revision History">
        <div className="text-[13px] text-[var(--text-tertiary)]">No revisions have been published for this config yet.</div>
      </SectionCard>
    );
  }

  const sorted = [...versions].sort((a, b) => (b.revision ?? 0) - (a.revision ?? 0));

  return (
    <SectionCard title="Published Revision Log & Rollbacks">
      <p className="text-[12px] text-[var(--text-secondary)] mb-4">
        Immutable historical snapshot tree. Instantly compare or restore previous revisions.
      </p>
      <div className="space-y-3">
        {sorted.map((version, index) => {
          const previous = sorted[index + 1];
          const changedCount = previous ? countChangedKeys(previous.compiledSnapshot, version.compiledSnapshot) : null;
          return (
            <div key={version.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3.5 transition-colors hover:border-[var(--border-default)] flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px] font-medium text-[var(--text-primary)]">Revision #{version.revision}</span>
                  <StatusBadge status={version.changeType ?? "publish"} />
                </div>
                <div className="mt-1 text-[12px] text-[var(--text-tertiary)]">
                  {version.environmentName || "Environment Scope"} · {formatDate(version.publishedAt)}
                  {changedCount !== null && (
                    <> · {changedCount === 0 ? "No field changes" : `${changedCount} field${changedCount === 1 ? "" : "s"} modified`}</>
                  )}
                </div>
                {version.changeSummary && <div className="mt-1 font-mono text-[12px] text-[var(--brand)]">{version.changeSummary}</div>}
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={rollbackConfig.isPending}
                onClick={() =>
                  rollbackConfig.mutate({
                    orgId: activeOrgId,
                    configId: selectedConfigId,
                    revision: version.revision,
                  })
                }
                className="h-8 px-2.5 text-[12px] gap-1.5"
              >
                <RotateCcw className="size-3 text-[var(--warning)]" />
                Rollback
              </Button>
            </div>
          );
        })}
      </div>
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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text3)]">{label}</span>
        <Icon className={`size-4 ${tone === "danger" ? "text-red-400" : "text-[var(--brand)]"}`} />
      </div>
      <div className={`mt-2 text-[16px] font-extrabold ${tone === "danger" && on > 0 ? "text-red-400" : "text-[var(--text)]"}`}>
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
    toast.success("Resolved SDK config JSON copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <SectionCard title="SDK Delivery Sandbox">
        <p className="text-[12px] text-[var(--text-secondary)] mb-4">
          Simulate live payload resolution for any environment and SDK target platform.
        </p>
        <form onSubmit={handleResolve} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--text3)]">Target Environment</span>
            <select className={inputClass} value={resolveEnv} onChange={(e) => setResolveEnv(e.target.value)}>
              {environments.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {envLabel(environment)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--text3)]">SDK Target Platform</span>
            <select className={inputClass} value={resolvePlatform} onChange={(e) => setResolvePlatform(e.target.value)}>
              <option value="web">Web Browser (JS / TS SDK)</option>
              <option value="node">Node.js / Express / Fastify</option>
              <option value="python">Python / FastAPI / Django</option>
              <option value="ios">iOS (Swift Native SDK)</option>
              <option value="android">Android (Kotlin SDK)</option>
            </select>
          </label>

          <SubmitButton className="h-9 font-semibold text-xs bg-[var(--brand)] text-white hover:bg-[var(--brand)]/90 shadow-md">
            {isResolving ? "Resolving Payload..." : "Simulate SDK Resolution"}
          </SubmitButton>
        </form>
      </SectionCard>

      <SectionCard title={selectedEnvironment ? `Live Payload: ${selectedEnvironment.name}` : "Live Telemetry Payload"}>
        {result ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <ResolveSummaryTile label="Active Features" icon={ShieldCheck} on={features.on} total={features.total} />
              <ResolveSummaryTile label="Instrumentation" icon={ServerCog} on={instrumentation.on} total={instrumentation.total} />
              <ResolveSummaryTile label="Killswitches Armed" icon={ShieldOff} on={killswitches.on} total={killswitches.total} tone="danger" />
            </div>

            {samplingEntries.length > 0 && (
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text3)]">Compiled Sampling Rates</div>
                <div className="flex flex-wrap gap-2">
                  {samplingEntries.map(([key, value]) => (
                    <span key={key} className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-2.5 py-1 font-mono text-[11px] text-[var(--text2)]">
                      {key}: <strong className="text-[var(--brand)]">{Math.round(value <= 1 ? value * 100 : value)}%</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text3)]">Delivered JSON Payload</span>
                <Button type="button" variant="ghost" className="h-7 text-xs gap-1" onClick={handleCopyJson}>
                  {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  {copied ? "Copied!" : "Copy JSON"}
                </Button>
              </div>
              <pre className="max-h-[380px] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 font-mono text-[11px] leading-relaxed text-[var(--text)]">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-xs text-[var(--text3)]">
            Select an environment and SDK platform above, then click <strong>Simulate SDK Resolution</strong> to inspect the live JSON payload delivered to SDK instances.
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

  const { data: environments = [], isLoading: environmentsLoading } = useEnvironments(projectId);
  const { data: configs = [], isLoading: configsLoading } = useSdkConfigs(
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
        onSuccess: () => toast.success(`Published revision ${selectedConfig.revision + 1}`),
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

  if (configsLoading || environmentsLoading) {
    return (
      <FillPage>
        <RouteLoadingRegion className="p-0" label="Loading remote configuration engine" />
      </FillPage>
    );
  }

  const envName = selectedConfig?.environmentName || selectedEnvironment?.name || "All Environments";

  return (
    <FillPage>
      <div className="flex flex-col gap-5 p-2 sm:p-4 max-w-[1400px] mx-auto w-full pb-28">
        {/* Enterprise Control Center Header */}
        <RemoteConfigHeader
          environments={environments}
          selectedEnvironmentId={environmentId}
          onSelectEnvironment={(id) => {
            setEnvironmentId(id);
            setSelectedConfigId(null);
          }}
          currentRevision={selectedConfig?.revision ?? 1}
          revisionHash={shortHash(selectedConfig?.revisionHash)}
          publishedAt={formatDate(selectedConfig?.publishedAt)}
          isDraft={panelState.isDirty}
          draftChangesCount={panelState.diffCount}
          hasErrors={panelState.hasErrors}
          onOpenPublishDrawer={() => setPublishDrawerOpen(true)}
          onOpenRollout={() => setActiveSection("rollout")}
          onOpenInheritance={() => setActiveSection("inheritance")}
          onOpenTelemetry={() => setActiveSection("telemetry")}
        />

        {updateConfig.isSuccess && !updateConfig.isPending && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-400 animate-in fade-in">
            <CheckCircle2 className="size-4 shrink-0" />
            Revision published successfully! Connected SDK instances pick up changes on their next 300s TTL cache refresh.
          </div>
        )}

        {/* Core Layout Grid: Search Navigation + Tab Workspace */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <RemoteConfigNav
            activeSection={activeSection}
            onSelectSection={setActiveSection}
            changedCounts={panelState.changedCounts}
            errorCounts={panelState.errorCounts}
          />

          <div className="min-w-0 flex-1">
            {/* Primary Settings Workspace */}
            {["features", "transport", "sampling", "privacy", "instrumentation", "limits", "killswitches"].includes(
              activeSection
            ) && selectedConfig && (
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

        {/* Floating Draft Action Bar */}
        <DraftStateBanner
          isDirty={panelState.isDirty}
          hasErrors={panelState.hasErrors}
          diffCount={panelState.diffCount}
          errorCount={panelState.errorCount}
          onDiscard={panelState.discardDraft}
          onReviewPublish={() => setPublishDrawerOpen(true)}
        />
      </div>
    </FillPage>
  );
}
