import { useState } from "react";
import { useParams } from "react-router";
import { GitBranch, Plus, RotateCcw, Settings2 } from "lucide-react";
import {
  Panel,
  Pill,
  SectionHeading,
  Toggle as PulseToggle,
  fieldInputClass,
} from "@/shared/ui/pulse";
import { Tabs, Timestamp } from "@/shared/observe";
import { Button as UiButton } from "@/components/ui/button";
import { RouteLoadingRegion } from "@/shared/ui/loading";
import { toast } from "sonner";
import { useOrganizations } from "@/modules/organizations/hooks/useOrganizations";
import { useSdkConfigs, useSdkConfigVersions, useSdkConfigDeployments, useSdkConfigMutations, useResolveSdkConfig } from "@/modules/projects/hooks/useSdkConfigs";
import { DialogField } from "@/modules/projects/components/project-ui";

function ConfigToggle({ checked, onChange, disabled, label, description, badge }: any) {
  return (
    <div className={`flex items-start justify-between py-3 ${disabled ? "opacity-60" : ""}`}>
      <div className="flex-1 pr-4">
        <div className="flex items-center gap-2">
          <div className="text-[13px] font-medium text-[var(--text)]">{label}</div>
          {badge && <Pill tone="brand">{badge}</Pill>}
        </div>
        {description && <div className="text-[12px] text-[var(--text3)] mt-0.5">{description}</div>}
      </div>
      <PulseToggle
        checked={checked}
        onChange={onChange}
        label={label}
        disabled={disabled}
      />
    </div>
  );
}

function Slider({ value, min, max, step, onChange, disabled, label, description, badge }: any) {
  return (
    <div className={`py-3 ${disabled ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-[13px] font-medium text-[var(--text)]">{label}</div>
            {badge && <Pill tone="brand">{badge}</Pill>}
          </div>
          {description && <div className="text-[12px] text-[var(--text3)] mt-0.5">{description}</div>}
        </div>
        <div className="text-[13px] font-[family-name:var(--mono)] font-medium text-[var(--brand)]">{value}</div>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        aria-label={label}
        className="w-full accent-[var(--brand)] cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  );
}

function getCurrentPlanTier(): "free" | "pro" | "enterprise" {
  return "enterprise";
}

function ConfigVisualEditor({ localConfig, setLocalConfig, selectedConfig, updateMutation, isPro, isEnt }: any) {
  const updateFeature = (key: string, val: boolean) => setLocalConfig((prev: any) => ({ ...prev, features: { ...(prev?.features || {}), [key]: val } }));
  const updateSampling = (key: string, val: number) => setLocalConfig((prev: any) => ({ ...prev, sampling: { ...(prev?.sampling || {}), [key]: val } }));
  const updateLimit = (key: string, val: number) => setLocalConfig((prev: any) => ({ ...prev, limits: { ...(prev?.limits || {}), [key]: val } }));
  const updatePrivacy = (key: string, val: any) => setLocalConfig((prev: any) => ({ ...prev, privacy: { ...(prev?.privacy || {}), [key]: val } }));
  const updateInstrumentation = (key: string, val: any) => setLocalConfig((prev: any) => ({ ...prev, instrumentation: { ...(prev?.instrumentation || {}), [key]: val } }));

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const payload = {
          environment: formData.get("environment"),
          rolloutPercentage: Number(formData.get("rolloutPercentage")),
          changeSummary: formData.get("changeSummary"),
          isActive: formData.get("isActive") === "on",
          configValue: localConfig,
        };
        updateMutation.mutate(payload);
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DialogField label="Environment" name="environment">
          <input name="environment" defaultValue={selectedConfig?.environment} className={fieldInputClass} />
        </DialogField>
        <DialogField label="Rollout percentage" name="rolloutPercentage">
          <input name="rolloutPercentage" type="number" min="0" max="100" defaultValue={selectedConfig?.rolloutPercentage} className={fieldInputClass} />
        </DialogField>
        <DialogField label="Change summary" name="changeSummary">
          <input name="changeSummary" placeholder="What changed?" className={fieldInputClass} />
        </DialogField>
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--text)] mt-7">
          <input type="checkbox" name="isActive" defaultChecked={selectedConfig?.isActive} className="size-4" />
          Config active
        </label>
      </div>

      <Panel title="Performance & features" icon={Settings2}>
        {isPro && <ConfigToggle label="Custom metrics collection" description="Enable ingestion of custom business metrics." checked={localConfig?.features?.metrics ?? false} onChange={(v: boolean) => updateFeature("metrics", v)} badge={!isEnt ? "Pro" : undefined} />}
        {isEnt && <ConfigToggle label="CPU/Memory profiling" description="Continuous profiling in production." checked={localConfig?.features?.profiling ?? false} onChange={(v: boolean) => updateFeature("profiling", v)} badge="Enterprise" />}
        {isEnt && <ConfigToggle label="Session replay" description="Capture DOM changes and user interactions." checked={localConfig?.features?.sessionReplay ?? false} onChange={(v: boolean) => updateFeature("sessionReplay", v)} badge="Enterprise" />}
        {!isPro && <div className="text-[12px] text-[var(--text3)] italic py-2">Advanced performance monitoring features require a Pro or Enterprise plan.</div>}
      </Panel>

      <Panel title="Sampling">
        <Slider label="Trace sampling rate" description="Percentage of distributed traces to ingest (0.0 to 1.0)." value={localConfig?.sampling?.traces ?? 0.1} min={0} max={isPro ? 1.0 : 0.1} step={0.01} onChange={(v: number) => updateSampling("traces", v)} badge={!isPro ? "Free Limit: 10%" : undefined} />
      </Panel>

      <Panel title="Limits">
        <Slider label="Max spans per trace" description="Hard limit on spans allowed per single trace tree." value={localConfig?.limits?.maxSpansPerTrace ?? 100} min={100} max={isEnt ? 10000 : isPro ? 2000 : 100} step={100} disabled={!isPro} onChange={(v: number) => updateLimit("maxSpansPerTrace", v)} badge={isEnt ? "Enterprise" : isPro ? "Pro" : "Free Limit: 100"} />
      </Panel>

      <Panel title="Privacy & scrubbing">
        <DialogField label="Scrubbed headers" name="scrubHeaders" hint="Comma-separated list of HTTP headers to mask.">
          <input className={fieldInputClass} value={(localConfig?.privacy?.scrubbing?.headers || []).join(", ")} onChange={(e) => updatePrivacy("scrubbing", { ...(localConfig?.privacy?.scrubbing || {}), headers: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} placeholder="authorization, cookie, x-api-key" />
        </DialogField>
      </Panel>

      {(isPro || isEnt) && (
        <Panel title="Instrumentation">
          {isPro && <ConfigToggle label="MongoDB driver" description="Auto-instrument MongoDB queries." checked={localConfig?.instrumentation?.mongodb ?? false} onChange={(v: boolean) => updateInstrumentation("mongodb", v)} badge={!isEnt ? "Pro" : undefined} />}
          {isEnt && <ConfigToggle label="Redis driver" description="Auto-instrument Redis commands." checked={localConfig?.instrumentation?.redis ?? false} onChange={(v: boolean) => updateInstrumentation("redis", v)} badge="Enterprise" />}
        </Panel>
      )}

      <div className="flex items-center gap-3 pt-2">
        <UiButton type="submit" size="lg">
          Save configuration
        </UiButton>
      </div>
    </form>
  );
}

function ConfigAdvancedEditor({ selectedConfig, updateMutation }: any) {
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const payload = {
          environment: formData.get("environment"),
          rolloutPercentage: Number(formData.get("rolloutPercentage")),
          changeSummary: formData.get("changeSummary"),
          isActive: formData.get("isActive") === "on",
          configValue: JSON.parse(formData.get("configValue") as string),
        };
        updateMutation.mutate(payload);
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DialogField label="Environment" name="environment">
          <input name="environment" defaultValue={selectedConfig?.environment} className={fieldInputClass} />
        </DialogField>
        <DialogField label="Rollout percentage" name="rolloutPercentage">
          <input name="rolloutPercentage" type="number" min="0" max="100" defaultValue={selectedConfig?.rolloutPercentage} className={fieldInputClass} />
        </DialogField>
        <DialogField label="Change summary" name="changeSummary">
          <input name="changeSummary" placeholder="What changed?" className={fieldInputClass} />
        </DialogField>
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--text)] mt-7">
          <input type="checkbox" name="isActive" defaultChecked={selectedConfig?.isActive} className="size-4" />
          Config active
        </label>
      </div>
      <DialogField label="Config value JSON" name="configValue">
        <textarea name="configValue" rows={20} defaultValue={JSON.stringify(selectedConfig?.configValue, null, 2)} className={fieldInputClass + " min-h-[360px] font-[family-name:var(--mono)] text-[12px] leading-relaxed"} />
      </DialogField>
      <div className="flex items-center gap-3 pt-2">
        <UiButton type="submit" size="lg">Save JSON directly</UiButton>
      </div>
    </form>
  );
}

function ConfigVersionsTab({ versions, ackVersion, rollbackConfig, activeOrgId, selectedConfigId }: any) {
  return (
    <div className="relative space-y-0 pl-6">
      {/* Timeline left border */}
      <div className="absolute left-2 top-2 bottom-2 w-px bg-[var(--border)]" aria-hidden="true" />
      {(versions || []).map((version: any) => (
        <div key={version.id} className="relative pb-4">
          {/* Timeline dot */}
          <span
            className="absolute -left-4 top-3 size-2 rounded-full bg-[var(--brand)] ring-2 ring-[var(--bg1)]"
            aria-hidden="true"
          />
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-semibold text-[var(--text)]">Version {version.version}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Pill tone="neutral">{version.changeType}</Pill>
                  <span className="text-[11px] text-[var(--text3)]"><Timestamp value={version.createdAt} /></span>
                </div>
              </div>
              <div className="flex gap-2">
                <UiButton type="button" variant="outline" size="sm" onClick={() => ackVersion.mutate({ orgId: activeOrgId!, configId: selectedConfigId!, version: version.version })}>Acknowledge</UiButton>
                <UiButton type="button" variant="ghost" size="sm" onClick={() => rollbackConfig.mutate({ orgId: activeOrgId!, configId: selectedConfigId!, version: version.version })}><RotateCcw className="mr-1.5 size-3.5" />Rollback</UiButton>
              </div>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-[8px] bg-[var(--bg2)] border border-[var(--border)] p-3 text-[11.5px] font-[family-name:var(--mono)] text-[var(--text2)] leading-relaxed">{JSON.stringify(version.changeDiff || version.configValue, null, 2)}</pre>
          </div>
        </div>
      ))}
      {(!versions || versions.length === 0) && (
        <p className="text-[12.5px] text-[var(--text3)] py-4">No version history available.</p>
      )}
    </div>
  );
}

function ConfigDeploymentsTab({ deployments }: any) {
  return (
    <div className="space-y-3">
      {(deployments || []).length === 0 ? (
        <p className="text-[12.5px] text-[var(--text3)] py-4">No deployments recorded for this config.</p>
      ) : (
        (deployments || []).map((deployment: any) => (
          <div key={deployment.id} className="rounded-[12px] border border-[var(--border)] p-4 bg-[var(--bg1)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-semibold text-[var(--text)]">Version {deployment.version}</div>
                <div className="text-[11.5px] text-[var(--text3)] mt-0.5">Rollout {deployment.rolloutPercentage}%</div>
              </div>
              <Pill tone={deployment.status === "active" ? "green" : deployment.status === "failed" ? "red" : "amber"} dot>
                {deployment.status}
              </Pill>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ConfigResolveTab({ resolveEnv, setResolveEnv, resolvePlatform, setResolvePlatform, handleResolve, resolvedResult }: any) {
  return (
    <div className="flex flex-col gap-6 max-w-[800px] mt-4">
      <Panel title="Test resolution">
        <form onSubmit={handleResolve} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div className="sm:col-span-2 pt-2">
            <UiButton type="submit" size="lg">Simulate resolution</UiButton>
          </div>
        </form>
        {resolvedResult && (
          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-3">Final merged payload</div>
            <pre className="overflow-x-auto rounded-[8px] bg-[var(--bg2)] border border-[var(--border)] p-4 text-[12px] font-[family-name:var(--mono)] text-[var(--text2)] leading-relaxed">
              {JSON.stringify(resolvedResult, null, 2)}
            </pre>
          </div>
        )}
      </Panel>
    </div>
  );
}

function ConfigCreateForm({ activeOrgId, projectId, createConfig, setShowCreate }: any) {
  return (
    <Panel title="Create SDK config">
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!activeOrgId) return;
          const formData = new FormData(event.currentTarget);
          const payload = {
            configKey: formData.get("configKey"),
            configType: formData.get("configType"),
            environment: formData.get("environment"),
            schemaVersion: formData.get("schemaVersion"),
            rolloutPercentage: Number(formData.get("rolloutPercentage")),
            isEncrypted: formData.get("isEncrypted") === "on",
            configValue: JSON.parse(formData.get("configValue") as string),
          };
          await createConfig.mutateAsync({ orgId: activeOrgId, projectId, data: payload });
          event.currentTarget.reset();
          setShowCreate(false);
        }}
      >
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
        <DialogField label="Rollout percentage" name="rolloutPercentage">
          <input name="rolloutPercentage" type="number" min="0" max="100" defaultValue="100" className={fieldInputClass} />
        </DialogField>
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--text)]">
          <input type="checkbox" name="isEncrypted" className="size-4" />
          Encrypt config value
        </label>
        <div className="sm:col-span-2">
          <DialogField label="Initial JSON" name="configValue">
            <textarea name="configValue" rows={6} defaultValue={'{\n  "schemaVersion": 1,\n  "features": {}\n}'} className={fieldInputClass + " min-h-[144px] font-[family-name:var(--mono)] text-[12px] leading-relaxed"} />
          </DialogField>
        </div>
        <div className="sm:col-span-2">
          <UiButton type="submit" size="lg">Create config</UiButton>
        </div>
      </form>
    </Panel>
  );
}

export default function RemoteConfigPage() {
  const { projectId } = useParams();
  const { activeOrgId } = useOrganizations();
  
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [localConfig, setLocalConfig] = useState<any>(null);

  const [resolveEnv, setResolveEnv] = useState("production");
  const [resolvePlatform, setResolvePlatform] = useState("web");
  const [resolvedResult, setResolvedResult] = useState<any>(null);

  const tier = getCurrentPlanTier();
  const isPro = tier === "pro" || tier === "enterprise";
  const isEnt = tier === "enterprise";

  const { data: configs, isLoading } = useSdkConfigs(activeOrgId!, projectId);
  const selectedConfig = configs?.find((config: any) => config.id === selectedConfigId) || null;
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

  const updateMutation = { mutate: (payload: any) => {
    if (!selectedConfigId || !activeOrgId) return;
    updateConfig.mutate({ orgId: activeOrgId, configId: selectedConfigId, projectId, data: payload });
  }};

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId) return;
    try {
      const result = await resolveMutation.mutateAsync({ orgId: activeOrgId, projectId, environment: resolveEnv, platform: resolvePlatform });
      setResolvedResult(result);
      toast.success("Resolved config retrieved");
    } catch (err) {
      toast.error("Failed to resolve config");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <RouteLoadingRegion className="p-0" label="Loading remote configuration" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        title="Remote config"
        description={projectId ? `Manage SDK configuration and overrides for this project.` : "Manage organization-wide SDK configuration, rollout percentages, and client-side feature flags."}
        actions={
          <UiButton variant={showCreate ? "outline" : "default"} size="lg" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? "Cancel" : <><Plus className="mr-1.5 size-4" /> New config</>}
          </UiButton>
        }
      />

      {/* Config selector strip */}
      <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg1)] px-4 py-2.5">
        <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text3)]">Active config</span>
        {configs && configs.length > 0 ? (
          <select
            className={fieldInputClass + " max-w-[260px]"}
            value={selectedConfigId || ""}
            aria-label="Select config"
            onChange={(e) => {
              setSelectedConfigId(e.target.value);
              setShowCreate(false);
            }}
          >
            {configs.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.configKey} ({c.environment})
              </option>
            ))}
          </select>
        ) : (
          <span className="text-[12px] text-[var(--text3)]">No configs available</span>
        )}
        {selectedConfig && (
          <Pill tone={selectedConfig.isActive ? "green" : "neutral"} dot>
            {selectedConfig.isActive ? "active" : "inactive"}
          </Pill>
        )}
      </div>

      <div className="max-w-[800px] w-full">
        {showCreate ? (
          <ConfigCreateForm activeOrgId={activeOrgId} projectId={projectId} createConfig={createConfig} setShowCreate={setShowCreate} />
        ) : selectedConfig ? (
          <Tabs
            tabs={[
              { id: "visual", label: "Editor", content: <ConfigVisualEditor localConfig={localConfig} setLocalConfig={setLocalConfig} selectedConfig={selectedConfig} updateMutation={updateMutation} isPro={isPro} isEnt={isEnt} /> },
              { id: "advanced", label: "JSON", content: <ConfigAdvancedEditor selectedConfig={selectedConfig} updateMutation={updateMutation} /> },
              { id: "history", label: "History", content: <ConfigVersionsTab versions={versions} ackVersion={ackVersion} rollbackConfig={rollbackConfig} activeOrgId={activeOrgId} selectedConfigId={selectedConfigId} /> },
              { id: "rollouts", label: "Rollouts", content: <ConfigDeploymentsTab deployments={deployments} /> },
              { id: "resolve", label: "Resolve tester", content: <ConfigResolveTab resolveEnv={resolveEnv} setResolveEnv={setResolveEnv} resolvePlatform={resolvePlatform} setResolvePlatform={setResolvePlatform} handleResolve={handleResolve} resolvedResult={resolvedResult} /> },
            ]}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-[var(--border)] bg-[var(--bg1)] px-6 py-14 text-center">
            <GitBranch className="size-8 text-[var(--text3)]" />
            <p className="text-[13.5px] font-semibold text-[var(--text)]">No config selected</p>
            <p className="max-w-[42ch] text-[12.5px] leading-relaxed text-[var(--text2)]">
              Choose a config from the selector above or create a new one to begin editing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
