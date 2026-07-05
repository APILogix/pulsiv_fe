import { useEffect, useState } from "react";
import { Loader2, Plus, RotateCcw } from "lucide-react";
import {
  PageHeader, FillPage, SectionCard, StatusBadge, Field, SubmitButton, inputClass, Button, Tabs,
} from "@/shared/observe";
import { toast } from "sonner";

function Toggle({ checked, onChange, disabled, label, description, badge }: any) {
  return (
    <div className={`flex items-start justify-between py-3 ${disabled ? "opacity-60" : ""}`}>
      <div className="flex-1 pr-4">
        <div className="flex items-center gap-2">
          <div className="text-[14px] font-medium text-[var(--text)]">{label}</div>
          {badge && <span className="rounded-full bg-[var(--brand)]/10 px-1.5 py-px text-[10px] font-semibold text-[var(--brand)] uppercase">{badge}</span>}
        </div>
        <div className="text-[12px] text-[var(--text3)] mt-0.5">{description}</div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 ${
          checked ? "bg-[var(--brand)]" : "bg-[var(--bg3)]"
        } ${disabled ? "cursor-not-allowed" : ""}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function Slider({ value, min, max, step, onChange, disabled, label, description, badge }: any) {
  return (
    <div className={`py-3 ${disabled ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-[14px] font-medium text-[var(--text)]">{label}</div>
            {badge && <span className="rounded-full bg-[var(--brand)]/10 px-1.5 py-px text-[10px] font-semibold text-[var(--brand)] uppercase">{badge}</span>}
          </div>
          {description && <div className="text-[12px] text-[var(--text3)] mt-0.5">{description}</div>}
        </div>
        <div className="text-[14px] font-mono font-medium text-[var(--brand)]">{value}</div>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full accent-[var(--brand)] cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  );
}

// DUMMY DATA FOR NOW
const DUMMY_CONFIGS = [
  {
    id: "conf_1",
    configKey: "sdk.client",
    environment: "production",
    isActive: true,
    rolloutPercentage: 100,
    configValue: {
      schemaVersion: 1,
      features: { metrics: true, profiling: false, sessionReplay: true },
      sampling: { traces: 0.5 },
      limits: { maxSpansPerTrace: 2000 },
      privacy: { scrubbing: { headers: ["authorization", "cookie"] } },
      instrumentation: { mongodb: true, redis: false }
    }
  },
  {
    id: "conf_2",
    configKey: "sdk.backend",
    environment: "staging",
    isActive: false,
    rolloutPercentage: 50,
    configValue: { schemaVersion: 1 }
  }
];

const DUMMY_VERSIONS = [
  { id: "v_2", version: 2, changeType: "Updated metrics flag", createdAt: new Date().toISOString(), changeDiff: { "features.metrics": true } },
  { id: "v_1", version: 1, changeType: "Initial creation", createdAt: new Date(Date.now() - 86400000).toISOString(), changeDiff: {} }
];

const DUMMY_DEPLOYMENTS = [
  { id: "d_1", version: 2, rolloutPercentage: 100, status: "active" }
];

export default function RemoteConfigPage() {
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>("conf_1");
  const [showCreate, setShowCreate] = useState(false);
  const [localConfig, setLocalConfig] = useState<any>(null);

  const tier = "enterprise";
  const isPro = tier === "pro" || tier === "enterprise";
  const isEnt = tier === "enterprise";

  const configs = DUMMY_CONFIGS;
  const selectedConfig = configs.find((config) => config.id === selectedConfigId) || null;
  const versions = DUMMY_VERSIONS;
  const deployments = DUMMY_DEPLOYMENTS;
  const isLoading = false;

  useEffect(() => {
    if (selectedConfig) {
      setLocalConfig(selectedConfig.configValue);
      setShowCreate(false);
    }
  }, [selectedConfig]);

  const updateFeature = (key: string, val: boolean) => {
    setLocalConfig((prev: any) => ({ ...prev, features: { ...(prev?.features || {}), [key]: val } }));
  };
  const updateSampling = (key: string, val: number) => {
    setLocalConfig((prev: any) => ({ ...prev, sampling: { ...(prev?.sampling || {}), [key]: val } }));
  };
  const updateLimit = (key: string, val: number) => {
    setLocalConfig((prev: any) => ({ ...prev, limits: { ...(prev?.limits || {}), [key]: val } }));
  };
  const updatePrivacy = (key: string, val: any) => {
    setLocalConfig((prev: any) => ({ ...prev, privacy: { ...(prev?.privacy || {}), [key]: val } }));
  };
  const updateInstrumentation = (key: string, val: any) => {
    setLocalConfig((prev: any) => ({ ...prev, instrumentation: { ...(prev?.instrumentation || {}), [key]: val } }));
  };

  const createMutation = { mutate: (fd: FormData) => toast.success("Dummy Create") };
  const updateMutation = { mutate: (fd: FormData) => toast.success("Dummy Update") };
  const rollbackMutation = { mutate: (v: number) => toast.success("Dummy Rollback") };
  const ackMutation = { mutate: (v: number) => toast.success("Dummy Ack") };

  const visualEditor = (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        toast.success("Saved Configuration (Dummy)");
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Environment"><input name="environment" defaultValue={selectedConfig?.environment} className={inputClass} /></Field>
        <Field label="Rollout percentage"><input name="rolloutPercentage" type="number" min="0" max="100" defaultValue={selectedConfig?.rolloutPercentage} className={inputClass} /></Field>
        <Field label="Change summary"><input name="changeSummary" placeholder="What changed?" className={inputClass} /></Field>
        <label className="flex items-center gap-2 text-sm text-[var(--text)] mt-7">
          <input type="checkbox" name="isActive" defaultChecked={selectedConfig?.isActive} />
          Config active
        </label>
      </div>

      <SectionCard title="Performance & Features">
        {isPro && (
          <Toggle 
            label="Custom Metrics Collection" 
            description="Enable ingestion of custom business metrics."
            checked={localConfig?.features?.metrics ?? false}
            onChange={(v: boolean) => updateFeature("metrics", v)}
            badge={!isEnt ? "Pro" : undefined}
          />
        )}
        {isEnt && (
          <Toggle 
            label="CPU/Memory Profiling" 
            description="Continuous profiling in production."
            checked={localConfig?.features?.profiling ?? false}
            onChange={(v: boolean) => updateFeature("profiling", v)}
            badge="Enterprise"
          />
        )}
        {isEnt && (
          <Toggle 
            label="Session Replay" 
            description="Capture DOM changes and user interactions."
            checked={localConfig?.features?.sessionReplay ?? false}
            onChange={(v: boolean) => updateFeature("sessionReplay", v)}
            badge="Enterprise"
          />
        )}
        {!isPro && (
          <div className="text-sm text-[var(--text3)] italic py-2">
            Advanced performance monitoring features require a Pro or Enterprise plan.
          </div>
        )}
      </SectionCard>

      <SectionCard title="Sampling">
        <Slider
          label="Trace Sampling Rate"
          description="Percentage of distributed traces to ingest (0.0 to 1.0)."
          value={localConfig?.sampling?.traces ?? 0.1}
          min={0}
          max={isPro ? 1.0 : 0.1}
          step={0.01}
          onChange={(v: number) => updateSampling("traces", v)}
          badge={!isPro ? "Free Limit: 10%" : undefined}
        />
      </SectionCard>

      <SectionCard title="Limits">
        <Slider
          label="Max Spans Per Trace"
          description="Hard limit on spans allowed per single trace tree."
          value={localConfig?.limits?.maxSpansPerTrace ?? 100}
          min={100}
          max={isEnt ? 10000 : isPro ? 2000 : 100}
          step={100}
          disabled={!isPro}
          onChange={(v: number) => updateLimit("maxSpansPerTrace", v)}
          badge={isEnt ? "Enterprise" : isPro ? "Pro" : "Free Limit: 100"}
        />
      </SectionCard>

      <SectionCard title="Privacy & Scrubbing">
        <Field label="Scrubbed Headers" hint="Comma-separated list of HTTP headers to mask.">
          <input
            className={inputClass}
            value={(localConfig?.privacy?.scrubbing?.headers || []).join(", ")}
            onChange={(e) => updatePrivacy("scrubbing", { 
              ...(localConfig?.privacy?.scrubbing || {}), 
              headers: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) 
            })}
            placeholder="authorization, cookie, x-api-key"
          />
        </Field>
      </SectionCard>

      {(isPro || isEnt) && (
        <SectionCard title="Instrumentation">
          {isPro && (
            <Toggle 
              label="MongoDB Driver" 
              description="Auto-instrument MongoDB queries."
              checked={localConfig?.instrumentation?.mongodb ?? false}
              onChange={(v: boolean) => updateInstrumentation("mongodb", v)}
              badge={!isEnt ? "Pro" : undefined}
            />
          )}
          {isEnt && (
            <Toggle 
              label="Redis Driver" 
              description="Auto-instrument Redis commands."
              checked={localConfig?.instrumentation?.redis ?? false}
              onChange={(v: boolean) => updateInstrumentation("redis", v)}
              badge="Enterprise"
            />
          )}
        </SectionCard>
      )}

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton>Save Configuration</SubmitButton>
      </div>
    </form>
  );

  const advancedEditor = (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        toast.success("Saved JSON (Dummy)");
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Environment"><input name="environment" defaultValue={selectedConfig?.environment} className={inputClass} /></Field>
        <Field label="Rollout percentage"><input name="rolloutPercentage" type="number" min="0" max="100" defaultValue={selectedConfig?.rolloutPercentage} className={inputClass} /></Field>
        <Field label="Change summary"><input name="changeSummary" placeholder="What changed?" className={inputClass} /></Field>
        <label className="flex items-center gap-2 text-sm text-[var(--text)] mt-7">
          <input type="checkbox" name="isActive" defaultChecked={selectedConfig?.isActive} />
          Config active
        </label>
      </div>
      <Field label="Config value JSON">
        <textarea name="configValue" rows={20} defaultValue={JSON.stringify(selectedConfig?.configValue, null, 2)} className={inputClass + " font-mono text-sm"} />
      </Field>
      <div className="flex items-center gap-3 pt-2">
        <SubmitButton>Save JSON Directly</SubmitButton>
      </div>
    </form>
  );

  const versionsTab = (
    <div className="space-y-3">
      {(versions || []).map((version) => (
        <div key={version.id} className="rounded border border-[var(--border)] p-3 bg-[var(--bg2)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-[var(--text)]">Version {version.version}</div>
              <div className="text-xs text-[var(--text3)]">{version.changeType} · {new Date(version.createdAt).toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => ackMutation.mutate(version.version)}>Acknowledge</Button>
              <Button variant="ghost" onClick={() => rollbackMutation.mutate(version.version)}><RotateCcw className="mr-2 size-4" />Rollback</Button>
            </div>
          </div>
          <pre className="mt-3 overflow-x-auto rounded bg-[var(--bg1)] border border-[var(--border)] p-3 text-[12px] text-[var(--text2)]">{JSON.stringify(version.changeDiff || version.configValue, null, 2)}</pre>
        </div>
      ))}
    </div>
  );

  const deploymentsTab = (
    <div className="space-y-3">
      {(deployments || []).length === 0 ? (
        <p className="text-sm text-[var(--text2)]">No deployments recorded for this config.</p>
      ) : (
        (deployments || []).map((deployment) => (
          <div key={deployment.id} className="rounded border border-[var(--border)] p-3 bg-[var(--bg2)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-[var(--text)]">Version {deployment.version}</div>
                <div className="text-xs text-[var(--text3)]">Rollout {deployment.rolloutPercentage}%</div>
              </div>
              <StatusBadge status={deployment.status as any} />
            </div>
          </div>
        ))
      )}
    </div>
  );

  if (isLoading) {
    return <FillPage><div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" /></div></FillPage>;
  }

  return (
    <FillPage>
      <PageHeader
        title="Remote Config"
        description="Manage SDK configuration, rollout percentages, and client-side feature flags."
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-[var(--text2)]">Select Config:</span>
          {configs && configs.length > 0 ? (
            <select
              className={inputClass + " w-[240px]"}
              value={selectedConfigId || ""}
              onChange={(e) => {
                setSelectedConfigId(e.target.value);
                setShowCreate(false);
              }}
            >
              {configs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.configKey} ({c.environment})
                </option>
              ))}
            </select>
          ) : (
            <span className="text-[13px] text-[var(--text3)]">No configs available</span>
          )}
          {selectedConfig && <StatusBadge status={selectedConfig.isActive ? "active" : "inactive"} />}
        </div>
        <Button variant="secondary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel Creation" : <><Plus className="mr-2 size-4" /> New Config</>}
        </Button>
      </div>

      <div className="max-w-[800px] w-full mx-auto sm:mx-0">
        {showCreate ? (
          <SectionCard title="Create SDK Config">
            <form
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                createMutation.mutate(new FormData(event.currentTarget));
                event.currentTarget.reset();
              }}
            >
              <Field label="Config key"><input name="configKey" required placeholder="sdk.client" className={inputClass} /></Field>
              <Field label="Config type">
                <select name="configType" className={inputClass} defaultValue="json">
                  <option value="json">JSON</option>
                  <option value="yaml">YAML</option>
                  <option value="env">ENV</option>
                  <option value="feature_flag">Feature flag</option>
                </select>
              </Field>
              <Field label="Environment"><input name="environment" defaultValue="all" className={inputClass} /></Field>
              <Field label="Schema version"><input name="schemaVersion" placeholder="1" className={inputClass} /></Field>
              <Field label="Rollout percentage"><input name="rolloutPercentage" type="number" min="0" max="100" defaultValue="100" className={inputClass} /></Field>
              <label className="flex items-center gap-2 text-sm text-[var(--text)]">
                <input type="checkbox" name="isEncrypted" />
                Encrypt config value
              </label>
              <div className="sm:col-span-2">
                <Field label="Initial JSON">
                  <textarea name="configValue" rows={6} defaultValue={'{\n  "schemaVersion": 1,\n  "features": {}\n}'} className={inputClass} />
                </Field>
              </div>
              <div className="sm:col-span-2"><SubmitButton>Create Config</SubmitButton></div>
            </form>
          </SectionCard>
        ) : selectedConfig ? (
          <Tabs
            tabs={[
              { id: "visual", label: "Editor", content: visualEditor },
              { id: "advanced", label: "JSON", content: advancedEditor },
              { id: "history", label: "History", content: versionsTab },
              { id: "rollouts", label: "Rollouts", content: deploymentsTab },
            ]}
          />
        ) : (
          <div className="p-8 text-center text-[var(--text3)] text-sm border border-dashed border-[var(--border)] rounded-xl">
            Choose a config from the list or create a new one to begin editing.
          </div>
        )}
      </div>
    </FillPage>
  );
}
