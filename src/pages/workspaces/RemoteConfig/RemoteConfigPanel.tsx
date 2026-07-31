import { useMemo, useState, useEffect } from 'react';
import { FeaturesTab } from './tabs/FeaturesTab';
import { TransportTab } from './tabs/TransportTab';
import { SamplingTab } from './tabs/SamplingTab';
import { PrivacyTab } from './tabs/PrivacyTab';
import { InstrumentationTab } from './tabs/InstrumentationTab';
import { LimitsTab } from './tabs/LimitsTab';
import { KillswitchesTab } from './tabs/KillswitchesTab';
import { ConfigNav, type ConfigNavItem } from './components/ConfigNav';
import { PublishDrawer } from './components/PublishDrawer';
import { type RouteKey, type SdkConfigState } from './schema';
import { normalizeSdkConfig, buildEditableConfig, validateDraft, diffDraft } from './mapping';
import type { CompressionMode, QueueOverflowStrategy, RetryBackoff, TransportPriority } from './bounds';
import { Button } from '@/shared/observe';
import { AlertTriangle, RotateCcw, Rocket } from 'lucide-react';

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a == null || b == null) return false;
  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}

interface RemoteConfigPanelProps {
  /** The compiled backend document as returned by GET (read-only, never edited directly). */
  initialConfig: unknown;
  /** Receives the exact `editableConfig` object + summary to PATCH — already allowlist-filtered. */
  onSave: (editableConfig: Record<string, unknown>, changeSummary: string) => void;
  isSaving?: boolean;
  environmentName: string;
  currentRevision: number;
}

const NAV_SECTIONS: Array<{ id: string; label: string; icon: string; danger?: boolean; prefixes: string[] }> = [
  { id: 'features', label: 'Features', icon: 'features', prefixes: ['features'] },
  { id: 'transport', label: 'Transport', icon: 'transport', prefixes: ['transport', 'runtime'] },
  { id: 'sampling', label: 'Sampling', icon: 'sampling', prefixes: ['sampling'] },
  { id: 'privacy', label: 'Privacy', icon: 'privacy', prefixes: ['privacy'] },
  { id: 'instrumentation', label: 'Instrumentation', icon: 'instrumentation', prefixes: ['instrumentation'] },
  { id: 'limits', label: 'Limits', icon: 'limits', prefixes: ['limits'] },
  { id: 'killswitches', label: 'Killswitches', icon: 'killswitches', danger: true, prefixes: ['killswitches'] },
];

export function RemoteConfigPanel({ initialConfig, onSave, isSaving, environmentName, currentRevision }: RemoteConfigPanelProps) {
  const baseConfig: SdkConfigState = useMemo(() => normalizeSdkConfig(initialConfig), [initialConfig]);
  const [draft, setDraft] = useState<SdkConfigState>(baseConfig);
  const [activeSection, setActiveSection] = useState('features');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDraft(baseConfig);
  }, [baseConfig]);

  const isDirty = !deepEqual(baseConfig, draft);
  const errors = useMemo(() => validateDraft(draft), [draft]);
  const hasErrors = errors.length > 0;
  const diff = useMemo(() => diffDraft(baseConfig, draft), [baseConfig, draft]);

  const changedCountBySection = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of diff) counts[entry.section] = (counts[entry.section] ?? 0) + 1;
    return counts;
  }, [diff]);

  const errorCountBySection = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const error of errors) {
      const section = error.path.split('.')[0];
      counts[section] = (counts[section] ?? 0) + 1;
    }
    return counts;
  }, [errors]);

  const navItems: ConfigNavItem[] = NAV_SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    icon: section.icon,
    danger: section.danger,
    changedCount: (changedCountBySection[section.id] ?? 0) + (errorCountBySection[section.id] ?? 0),
  }));

  const updateFeature = (key: keyof SdkConfigState['features'], value: boolean) =>
    setDraft((prev) => ({ ...prev, features: { ...prev.features, [key]: value } }));

  const updateKillswitch = (key: keyof SdkConfigState['killswitches'], value: boolean) =>
    setDraft((prev) => ({ ...prev, killswitches: { ...prev.killswitches, [key]: value } }));

  const updateSampling = (key: keyof SdkConfigState['sampling'], value: number) =>
    setDraft((prev) => ({ ...prev, sampling: { ...prev.sampling, [key]: value } }));

  const updateInstrumentation = (key: keyof SdkConfigState['instrumentation'], value: boolean) =>
    setDraft((prev) => ({ ...prev, instrumentation: { ...prev.instrumentation, [key]: value } }));

  const updatePrivacyCapture = (key: keyof SdkConfigState['privacy']['capture'], value: boolean) =>
    setDraft((prev) => ({ ...prev, privacy: { ...prev.privacy, capture: { ...prev.privacy.capture, [key]: value } } }));

  const updatePrivacyPii = (key: keyof SdkConfigState['privacy']['piiDetection'], value: boolean) =>
    setDraft((prev) => ({ ...prev, privacy: { ...prev.privacy, piiDetection: { ...prev.privacy.piiDetection, [key]: value } } }));

  const updatePrivacyScrubbing = (key: 'enabled' | 'headers' | 'fields', value: boolean | string[]) =>
    setDraft((prev) => ({ ...prev, privacy: { ...prev.privacy, scrubbing: { ...prev.privacy.scrubbing, [key]: value } } }));

  const updateLimit = (key: keyof Omit<SdkConfigState['limits'], 'tenantGovernance'>, value: number | 'auto') =>
    setDraft((prev) => ({ ...prev, limits: { ...prev.limits, [key]: value } }));

  const updateTenant = (key: keyof SdkConfigState['limits']['tenantGovernance'], value: number | boolean) =>
    setDraft((prev) => ({
      ...prev,
      limits: { ...prev.limits, tenantGovernance: { ...prev.limits.tenantGovernance, [key]: value } },
    }));

  const updateTransport = (key: 'keepAlive', value: boolean) =>
    setDraft((prev) => ({ ...prev, transport: { ...prev.transport, [key]: value } }));

  const updateRetry = (key: keyof SdkConfigState['transport']['retry'], value: number | boolean | RetryBackoff) =>
    setDraft((prev) => ({ ...prev, transport: { ...prev.transport, retry: { ...prev.transport.retry, [key]: value } } }));

  const updateQueue = (key: keyof SdkConfigState['transport']['queue'], value: number | QueueOverflowStrategy) =>
    setDraft((prev) => ({ ...prev, transport: { ...prev.transport, queue: { ...prev.transport.queue, [key]: value } } }));

  const updateConnections = (key: keyof SdkConfigState['transport']['connections'], value: number) =>
    setDraft((prev) => ({
      ...prev,
      transport: { ...prev.transport, connections: { ...prev.transport.connections, [key]: value } },
    }));

  const updateRoute = (
    route: RouteKey,
    field: keyof SdkConfigState['transport']['routes'][RouteKey],
    value: number | CompressionMode | TransportPriority,
  ) =>
    setDraft((prev) => ({
      ...prev,
      transport: {
        ...prev.transport,
        routes: {
          ...prev.transport.routes,
          [route]: { ...prev.transport.routes[route], [field]: value },
        },
      },
    }));

  const updateRuntime = (key: keyof SdkConfigState['runtime'], value: number | boolean) =>
    setDraft((prev) => ({ ...prev, runtime: { ...prev.runtime, [key]: value } }));

  const handleDiscard = () => setDraft(baseConfig);

  const handleConfirmPublish = (changeSummary: string) => {
    if (hasErrors) return;
    onSave(buildEditableConfig(draft), changeSummary);
    setDrawerOpen(false);
  };

  const sectionContent: Record<string, React.ReactNode> = {
    features: <FeaturesTab features={draft.features} onChange={updateFeature} />,
    transport: (
      <TransportTab
        transport={draft.transport}
        runtime={draft.runtime}
        onChange={updateTransport}
        onChangeRetry={updateRetry}
        onChangeQueue={updateQueue}
        onChangeConnections={updateConnections}
        onChangeRoute={updateRoute}
        onChangeRuntime={updateRuntime}
        errors={errors}
      />
    ),
    sampling: <SamplingTab sampling={draft.sampling} onChange={updateSampling} errors={errors} />,
    privacy: (
      <PrivacyTab
        privacy={draft.privacy}
        onChangeCapture={updatePrivacyCapture}
        onChangePii={updatePrivacyPii}
        onChangeScrubbing={updatePrivacyScrubbing}
        errors={errors}
      />
    ),
    instrumentation: <InstrumentationTab instrumentation={draft.instrumentation} onChange={updateInstrumentation} />,
    limits: <LimitsTab limits={draft.limits} onChange={updateLimit} onChangeTenant={updateTenant} errors={errors} />,
    killswitches: <KillswitchesTab killswitches={draft.killswitches} onChange={updateKillswitch} />,
  };

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <ConfigNav items={navItems} active={activeSection} onSelect={setActiveSection} />

      <div className="min-w-0 flex-1">
        {sectionContent[activeSection]}

        <div className="h-24" />
      </div>

      {(isDirty || hasErrors) && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 lg:pl-[280px]">
          <div className="flex w-full max-w-2xl items-center justify-between gap-4 rounded-[16px] border border-[var(--border)] bg-[var(--bg1)]/80 px-5 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-3">
              {hasErrors ? (
                <>
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-500">
                    <AlertTriangle className="size-3.5" />
                  </span>
                  <span className="truncate text-[13px] font-medium text-red-500">
                    {errors.length} field{errors.length === 1 ? '' : 's'} out of range
                  </span>
                </>
              ) : (
                <>
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/20 text-[12px] font-bold text-[var(--brand)]">
                    {diff.length}
                  </span>
                  <span className="truncate text-[13px] font-medium text-[var(--text)]">
                    unsaved change{diff.length === 1 ? '' : 's'}
                  </span>
                </>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" onClick={handleDiscard}>
                <RotateCcw className="mr-1.5 size-3.5" />
                Discard
              </Button>
              <Button
                onClick={() => setDrawerOpen(true)}
                disabled={hasErrors}
                className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                <Rocket className="mr-1.5 size-3.5" />
                Review & Publish
              </Button>
            </div>
          </div>
        </div>
      )}

      <PublishDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onConfirm={handleConfirmPublish}
        diff={diff}
        errors={errors}
        isSaving={!!isSaving}
        environmentName={environmentName}
        currentRevision={currentRevision}
      />
    </div>
  );
}
