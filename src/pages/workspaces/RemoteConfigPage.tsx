import { useState } from "react";
import {
  CheckCircle2,
  Code,
  History,
  Layers,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  TestTube2,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentProject } from "./ProjectShellPage";
import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import {
  useSdkConfigs,
  useSdkConfigVersions,
  useSdkConfigDeployments,
  useSdkConfigMutations,
  useResolveSdkConfig,
} from "@/modules/projects/hooks/useSdkConfigs";
import {
  IconChip,
  Panel,
  Pill,
  SectionHeading,
  SegmentedControl,
  StatCard,
  Toggle,
  fieldInputClass,
  fieldTextareaClass,
  type SegmentOption,
} from "@/shared/ui/pulse";
import { Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { DialogField, FormDialog } from "@/modules/projects/components/project-ui";
import { cn } from "@/lib/utils";

// ── module-level constants (rules.md) ────────────────────────

type TabKey = "editor" | "json" | "history" | "rollouts" | "resolve";

const TAB_OPTIONS: SegmentOption<TabKey>[] = [
  { value: "editor", label: "Editor" },
  { value: "json", label: "JSON" },
  { value: "history", label: "History" },
  { value: "rollouts", label: "Rollouts" },
  { value: "resolve", label: "Resolve" },
];

function getCurrentPlanTier(): "free" | "pro" | "enterprise" {
  return "enterprise";
}

// ── page ─────────────────────────────────────────────────────

export default function RemoteConfigPage() {
  const { projectId } = useCurrentProject();
  const { activeOrgId } = useOrganizations();

  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [localConfig, setLocalConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("editor");
  const [resolveEnv, setResolveEnv] = useState("production");
  const [resolvePlatform, setResolvePlatform] = useState("web");
  const [resolvedResult, setResolvedResult] = useState<any>(null);

  const tier = getCurrentPlanTier();
  const isPro = tier === "pro" || tier === "enterprise";
  const isEnt = tier === "enterprise";

  const { data: configs, isLoading: _configsLoading } = useSdkConfigs(activeOrgId!, projectId);
  const selectedConfig = configs?.find((c: any) => c.id === selectedConfigId) || null;
  const { data: versions } = useSdkConfigVersions(activeOrgId!, selectedConfigId!);
  const { data: deployments } = useSdkConfigDeployments(activeOrgId!, selectedConfigId!);
  const { createConfig, updateConfig, rollbackConfig, ackVersion } = useSdkConfigMutations();
  const resolveMutation = useResolveSdkConfig();

  const [prevSelectedConfig, setPrevSelectedConfig] = useState(selectedConfig);
  if (selectedConfig !== prevSelectedConfig) {
    setPrevSelectedConfig(selectedConfig);
    if (selectedConfig) {
      setLocalConfig(selectedConfig.configValue);
      setShowCreate(false);
    }
  }

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedConfigId || !activeOrgId) return;
    const formData = new FormData(e.currentTarget);
    updateConfig.mutate({
      orgId: activeOrgId,
      configId: selectedConfigId,
      projectId,
      data: {
        environment: formData.get("environment"),
        rolloutPercentage: Number(formData.get("rolloutPercentage")),
        changeSummary: formData.get("changeSummary"),
        isActive: formData.get("isActive") === "on",
        configValue: localConfig,
      },
    });
  };

  const handleJsonUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedConfigId || !activeOrgId) return;
    const formData = new FormData(e.currentTarget);
    try {
      updateConfig.mutate({
        orgId: activeOrgId,
        configId: selectedConfigId,
        projectId,
        data: {
          environment: formData.get("environment"),
          rolloutPercentage: Number(formData.get("rolloutPercentage")),
          changeSummary: formData.get("changeSummary"),
          isActive: formData.get("isActive") === "on",
          configValue: JSON.parse(formData.get("configValue") as string),
        },
      });
    } catch {
      toast.error("Invalid JSON");
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId) return;
    try {
      const result = await resolveMutation.mutateAsync({
        orgId: activeOrgId,
        projectId,
        environment: resolveEnv,
        platform: resolvePlatform,
      });
      setResolvedResult(result);
      toast.success("Config resolved");
    } catch {
      toast.error("Failed to resolve config");
    }
  };

  const updateFeature = (key: string, val: boolean) =>
    setLocalConfig((prev: any) => ({ ...prev, features: { ...(prev?.features || {}), [key]: val } }));
  const updateSampling = (key: string, val: number) =>
    setLocalConfig((prev: any) => ({ ...prev, sampling: { ...(prev?.sampling || {}), [key]: val } }));
  const updateLimit = (key: string, val: number) =>
    setLocalConfig((prev: any) => ({ ...prev, limits: { ...(prev?.limits || {}), [key]: val } }));
  const updatePrivacy = (key: string, val: any) =>
    setLocalConfig((prev: any) => ({ ...prev, privacy: { ...(prev?.privacy || {}), [key]: val } }));

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Remote configuration"
        description="SDK configuration delivered to clients at runtime. Manage feature flags, sampling rates, and instrumentation settings."
        actions={
          <UiButton size="lg" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 size-4" /> New config
          </UiButton>
        }
      />

      {/* stat row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Configs" value={configs?.length ?? 0} icon={SlidersHorizontal} tone="brand" />
        <StatCard
          label="Active"
          value={configs?.filter((c: any) => c.isActive).length ?? 0}
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard label="Versions" value={versions?.length ?? 0} icon={History} tone="violet" />
        <StatCard label="Deployments" value={deployments?.length ?? 0} icon={Layers} tone="blue" />
      </div>

      {/* config selector */}
      <Panel title="Active configuration" icon={Settings2}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <select
              className={cn(fieldInputClass, "max-w-[280px]")}
              value={selectedConfigId || ""}
              aria-label="Select config"
              onChange={(e) => {
                setSelectedConfigId(e.target.value);
                setShowCreate(false);
                setActiveTab("editor");
              }}
            >
              <option value="" disabled>
                Select a configuration...
              </option>
              {(configs ?? []).map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.configKey} ({c.environment})
                </option>
              ))}
            </select>
            {selectedConfig && (
              <Pill tone={selectedConfig.isActive ? "green" : "neutral"} dot>
                {selectedConfig.isActive ? "Active" : "Inactive"}
              </Pill>
            )}
          </div>
        </div>
      </Panel>

      {/* main content */}
      {!selectedConfig && !showCreate && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--border)] py-16 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[var(--brand)]/10 blur-xl" aria-hidden="true" />
            <IconChip icon={SlidersHorizontal} size="lg" tone="brand" />
          </div>
          <p className="text-[15px] font-semibold text-[var(--text)]">Select or create a config</p>
          <p className="max-w-[44ch] text-[13px] text-[var(--text2)]">
            Choose a configuration from the dropdown above, or create a new one to begin editing.
          </p>
        </div>
      )}

      {selectedConfig && !showCreate && (
        <>
          <SegmentedControl
            value={activeTab}
            onChange={setActiveTab}
            options={TAB_OPTIONS}
            ariaLabel="Config editor tabs"
          />

          {activeTab === "editor" && (
            <form onSubmit={handleUpdate}>
              <Panel title="Visual editor" icon={Sparkles}>
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <DialogField label="Environment" name="environment">
                      <input
                        name="environment"
                        defaultValue={selectedConfig.environment}
                        className={fieldInputClass}
                      />
                    </DialogField>
                    <DialogField label="Rollout %" name="rolloutPercentage">
                      <input
                        name="rolloutPercentage"
                        type="number"
                        min="0"
                        max="100"
                        defaultValue={selectedConfig.rolloutPercentage}
                        className={fieldInputClass}
                      />
                    </DialogField>
                    <DialogField label="Change summary" name="changeSummary">
                      <input name="changeSummary" placeholder="What changed?" className={fieldInputClass} />
                    </DialogField>
                    <div className="flex items-center gap-3 pt-6">
                      <input type="checkbox" name="isActive" defaultChecked={selectedConfig.isActive} id="isActive" className="size-4" />
                      <label htmlFor="isActive" className="text-[13px] text-[var(--text)]">Config active</label>
                    </div>
                  </div>

                  {/* feature toggles */}
                  {isPro && (
                    <div className="rounded-xl border border-[var(--border)] p-4">
                      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--text3)]">Features</h3>
                      <div className="flex flex-col divide-y divide-[var(--border)]">
                        {isPro && (
                          <div className="flex items-center justify-between py-3">
                            <div>
                              <p className="text-[13px] font-medium text-[var(--text)]">Custom metrics</p>
                              <p className="text-[11.5px] text-[var(--text3)]">Ingest custom business metrics</p>
                            </div>
                            <Toggle
                              checked={localConfig?.features?.metrics ?? false}
                              onChange={(v) => updateFeature("metrics", v)}
                              label="Metrics"
                            />
                          </div>
                        )}
                        {isEnt && (
                          <div className="flex items-center justify-between py-3">
                            <div>
                              <p className="text-[13px] font-medium text-[var(--text)]">Profiling</p>
                              <p className="text-[11.5px] text-[var(--text3)]">CPU/Memory profiling in production</p>
                            </div>
                            <Toggle
                              checked={localConfig?.features?.profiling ?? false}
                              onChange={(v) => updateFeature("profiling", v)}
                              label="Profiling"
                            />
                          </div>
                        )}
                        {isEnt && (
                          <div className="flex items-center justify-between py-3">
                            <div>
                              <p className="text-[13px] font-medium text-[var(--text)]">Session replay</p>
                              <p className="text-[11.5px] text-[var(--text3)]">Capture DOM changes and interactions</p>
                            </div>
                            <Toggle
                              checked={localConfig?.features?.sessionReplay ?? false}
                              onChange={(v) => updateFeature("sessionReplay", v)}
                              label="Session replay"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* sampling */}
                  <div className="rounded-xl border border-[var(--border)] p-4">
                    <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--text3)]">Sampling</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-[var(--text)]">Trace sampling rate</p>
                        <p className="text-[11.5px] text-[var(--text3)]">Percentage of traces to ingest (0.0 to 1.0)</p>
                      </div>
                      <span className="font-[family-name:var(--mono)] text-[14px] font-semibold text-[var(--brand)]">
                        {localConfig?.sampling?.traces ?? 0.1}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={isPro ? 1.0 : 0.1}
                      step={0.01}
                      value={localConfig?.sampling?.traces ?? 0.1}
                      onChange={(e) => updateSampling("traces", Number(e.target.value))}
                      className="mt-2 w-full accent-[var(--brand)]"
                      aria-label="Trace sampling rate"
                    />
                  </div>

                  {/* limits */}
                  {isPro && (
                    <div className="rounded-xl border border-[var(--border)] p-4">
                      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--text3)]">Limits</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-medium text-[var(--text)]">Max spans per trace</p>
                          <p className="text-[11.5px] text-[var(--text3)]">Hard limit on spans per trace tree</p>
                        </div>
                        <span className="font-[family-name:var(--mono)] text-[14px] font-semibold text-[var(--brand)]">
                          {localConfig?.limits?.maxSpansPerTrace ?? 100}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={100}
                        max={isEnt ? 10000 : isPro ? 2000 : 100}
                        step={100}
                        value={localConfig?.limits?.maxSpansPerTrace ?? 100}
                        onChange={(e) => updateLimit("maxSpansPerTrace", Number(e.target.value))}
                        disabled={!isPro}
                        className="mt-2 w-full accent-[var(--brand)]"
                        aria-label="Max spans per trace"
                      />
                    </div>
                  )}

                  {/* privacy */}
                  <div className="rounded-xl border border-[var(--border)] p-4">
                    <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--text3)]">Privacy</h3>
                    <DialogField label="Scrubbed headers" name="scrubbedHeaders" hint="Comma-separated list of HTTP headers to mask.">
                      <input
                        className={fieldInputClass}
                        value={(localConfig?.privacy?.scrubbing?.headers || []).join(", ")}
                        onChange={(e) =>
                          updatePrivacy("scrubbing", {
                            ...(localConfig?.privacy?.scrubbing || {}),
                            headers: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean),
                          })
                        }
                        placeholder="authorization, cookie, x-api-key"
                      />
                    </DialogField>
                  </div>

                  <div className="flex justify-end pt-2">
                    <UiButton type="submit" size="lg" disabled={updateConfig.isPending}>
                      <Save className="mr-1.5 size-4" /> Save configuration
                    </UiButton>
                  </div>
                </div>
              </Panel>
            </form>
          )}

          {activeTab === "json" && (
            <form onSubmit={handleJsonUpdate}>
              <Panel title="JSON editor" icon={Code}>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <DialogField label="Environment" name="environment">
                      <input name="environment" defaultValue={selectedConfig.environment} className={fieldInputClass} />
                    </DialogField>
                    <DialogField label="Rollout %" name="rolloutPercentage">
                      <input name="rolloutPercentage" type="number" min="0" max="100" defaultValue={selectedConfig.rolloutPercentage} className={fieldInputClass} />
                    </DialogField>
                    <DialogField label="Change summary" name="changeSummary">
                      <input name="changeSummary" placeholder="What changed?" className={fieldInputClass} />
                    </DialogField>
                    <div className="flex items-center gap-3 pt-6">
                      <input type="checkbox" name="isActive" defaultChecked={selectedConfig.isActive} id="isActiveJson" className="size-4" />
                      <label htmlFor="isActiveJson" className="text-[13px] text-[var(--text)]">Config active</label>
                    </div>
                  </div>
                  <DialogField label="Configuration JSON" name="configValue">
                    <textarea
                      name="configValue"
                      rows={16}
                      defaultValue={JSON.stringify(selectedConfig.configValue, null, 2)}
                      className={cn(fieldTextareaClass, "font-[family-name:var(--mono)] text-[12px]")}
                    />
                  </DialogField>
                  <div className="flex justify-end">
                    <UiButton type="submit" size="lg" disabled={updateConfig.isPending}>
                      <Save className="mr-1.5 size-4" /> Save JSON
                    </UiButton>
                  </div>
                </div>
              </Panel>
            </form>
          )}

          {activeTab === "history" && (
            <Panel title="Version history" icon={History}>
              {(versions ?? []).length === 0 ? (
                <p className="py-8 text-center text-[13px] text-[var(--text3)]">No version history available.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {(versions ?? []).map((version: any) => (
                    <div key={version.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg2)]/50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-semibold text-[var(--text)]">Version {version.version}</p>
                          <p className="mt-0.5 text-[11.5px] text-[var(--text3)]">
                            {version.changeType} - <Timestamp value={version.createdAt} />
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <UiButton
                            variant="outline"
                            size="sm"
                            onClick={() => ackVersion.mutate({ orgId: activeOrgId!, configId: selectedConfigId!, version: version.version })}
                          >
                            Acknowledge
                          </UiButton>
                          <UiButton
                            variant="ghost"
                            size="sm"
                            onClick={() => rollbackConfig.mutate({ orgId: activeOrgId!, configId: selectedConfigId!, version: version.version })}
                          >
                            <RotateCcw className="mr-1.5 size-3.5" /> Rollback
                          </UiButton>
                        </div>
                      </div>
                      <pre className="mt-3 overflow-x-auto rounded-lg bg-[var(--bg1)] p-3 font-[family-name:var(--mono)] text-[11.5px] text-[var(--text2)] ring-1 ring-inset ring-[var(--border)]">
                        {JSON.stringify(version.changeDiff || version.configValue, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {activeTab === "rollouts" && (
            <Panel title="Deployments" icon={Layers}>
              {(deployments ?? []).length === 0 ? (
                <p className="py-8 text-center text-[13px] text-[var(--text3)]">No deployments recorded.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {(deployments ?? []).map((dep: any) => (
                    <div key={dep.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg2)]/50 p-4">
                      <div>
                        <p className="text-[13px] font-semibold text-[var(--text)]">Version {dep.version}</p>
                        <p className="mt-0.5 text-[11.5px] text-[var(--text3)]">Rollout {dep.rolloutPercentage}%</p>
                      </div>
                      <Pill tone={dep.status === "active" ? "green" : "neutral"} dot>
                        {dep.status}
                      </Pill>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {activeTab === "resolve" && (
            <Panel title="Resolve tester" icon={TestTube2}>
              <form onSubmit={handleResolve} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DialogField label="Environment" name="resolveEnv">
                    <select className={fieldInputClass} value={resolveEnv} onChange={(e) => setResolveEnv(e.target.value)}>
                      <option value="production">Production</option>
                      <option value="staging">Staging</option>
                      <option value="development">Development</option>
                    </select>
                  </DialogField>
                  <DialogField label="Platform" name="resolvePlatform">
                    <select className={fieldInputClass} value={resolvePlatform} onChange={(e) => setResolvePlatform(e.target.value)}>
                      <option value="web">Web (Browser)</option>
                      <option value="node">Node.js</option>
                      <option value="python">Python</option>
                      <option value="ios">iOS</option>
                      <option value="android">Android</option>
                    </select>
                  </DialogField>
                </div>
                <UiButton type="submit" size="lg" disabled={resolveMutation.isPending}>
                  <TestTube2 className="mr-1.5 size-4" /> Simulate resolution
                </UiButton>
                {resolvedResult && (
                  <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg2)]/50 p-4">
                    <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                      Resolved payload
                    </p>
                    <pre className="overflow-x-auto rounded-lg bg-[var(--bg1)] p-4 font-[family-name:var(--mono)] text-[12px] text-[var(--text2)] ring-1 ring-inset ring-[var(--border)]">
                      {JSON.stringify(resolvedResult, null, 2)}
                    </pre>
                  </div>
                )}
              </form>
            </Panel>
          )}
        </>
      )}

      {/* Create config dialog */}
      <FormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="New SDK configuration"
        description="Create a new remote config for SDK clients."
        submitLabel="Create config"
        pending={createConfig.isPending}
        onSubmit={async (form) => {
          if (!activeOrgId) return;
          try {
            await createConfig.mutateAsync({
              orgId: activeOrgId,
              projectId,
              data: {
                configKey: form.get("configKey"),
                configType: form.get("configType"),
                environment: form.get("environment"),
                schemaVersion: form.get("schemaVersion"),
                rolloutPercentage: Number(form.get("rolloutPercentage")),
                isEncrypted: form.get("isEncrypted") === "on",
                configValue: JSON.parse(form.get("configValue") as string),
              },
            });
            setShowCreate(false);
            toast.success("Config created");
          } catch {
            toast.error("Failed to create config");
          }
        }}
        width="sm:max-w-[640px]"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DialogField label="Config key" name="configKey" required>
            <input name="configKey" required placeholder="sdk.client" className={fieldInputClass} />
          </DialogField>
          <DialogField label="Config type" name="configType">
            <select name="configType" className={fieldInputClass} defaultValue="json">
              <option value="json">JSON</option>
              <option value="yaml">YAML</option>
              <option value="env">ENV</option>
              <option value="feature_flag">Feature flag</option>
            </select>
          </DialogField>
          <DialogField label="Environment" name="environment">
            <input name="environment" defaultValue="all" className={fieldInputClass} />
          </DialogField>
          <DialogField label="Schema version" name="schemaVersion">
            <input name="schemaVersion" placeholder="1" className={fieldInputClass} />
          </DialogField>
          <DialogField label="Rollout %" name="rolloutPercentage">
            <input name="rolloutPercentage" type="number" min="0" max="100" defaultValue="100" className={fieldInputClass} />
          </DialogField>
          <label className="flex items-center gap-2 pt-6 text-[13px] text-[var(--text)]">
            <input type="checkbox" name="isEncrypted" className="size-4" />
            Encrypt config value
          </label>
        </div>
        <DialogField label="Initial JSON" name="configValue">
          <textarea
            name="configValue"
            rows={6}
            defaultValue={'{\n  "schemaVersion": 1,\n  "features": {}\n}'}
            className={cn(fieldTextareaClass, "font-[family-name:var(--mono)] text-[12px]")}
          />
        </DialogField>
      </FormDialog>
    </div>
  );
}
