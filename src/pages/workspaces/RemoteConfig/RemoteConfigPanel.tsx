import { useMemo, useState, useEffect } from 'react';
import { FeaturesTab } from './tabs/FeaturesTab';
import { TransportTab } from './tabs/TransportTab';
import { SamplingTab } from './tabs/SamplingTab';
import { PrivacyTab } from './tabs/PrivacyTab';
import { InstrumentationTab } from './tabs/InstrumentationTab';
import { LimitsTab } from './tabs/LimitsTab';
import { KillswitchesTab } from './tabs/KillswitchesTab';
import { PublishDrawer } from './components/PublishDrawer';
import { type RouteKey, type SdkConfigState } from './schema';
import { normalizeSdkConfig, buildEditableConfig, validateDraft, diffDraft } from './mapping';
import type { CompressionMode, QueueOverflowStrategy, RetryBackoff, TransportPriority } from './bounds';

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a == null || b == null) return false;
  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}

export interface RemoteConfigPanelHandle {
  isDirty: boolean;
  hasErrors: boolean;
  diffCount: number;
  errorCount: number;
  changedCounts: Record<string, number>;
  errorCounts: Record<string, number>;
  openPublishDrawer: () => void;
  discardDraft: () => void;
}

interface RemoteConfigPanelProps {
  initialConfig: unknown;
  onSave: (editableConfig: Record<string, unknown>, changeSummary: string) => void;
  isSaving?: boolean;
  environmentName: string;
  currentRevision: number;
  activeSection?: string;
  onStateChange?: (state: RemoteConfigPanelHandle) => void;
  publishDrawerOpen?: boolean;
  onClosePublishDrawer?: () => void;
}

export function RemoteConfigPanel({
  initialConfig,
  onSave,
  isSaving,
  environmentName,
  currentRevision,
  activeSection = "features",
  onStateChange,
  publishDrawerOpen = false,
  onClosePublishDrawer = () => {},
}: RemoteConfigPanelProps) {
  const baseConfig: SdkConfigState = useMemo(() => normalizeSdkConfig(initialConfig), [initialConfig]);
  const [draft, setDraft] = useState<SdkConfigState>(baseConfig);

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

  const handleDiscard = () => setDraft(baseConfig);

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        isDirty,
        hasErrors,
        diffCount: diff.length,
        errorCount: errors.length,
        changedCounts: changedCountBySection,
        errorCounts: errorCountBySection,
        openPublishDrawer: () => {},
        discardDraft: handleDiscard,
      });
    }
  }, [isDirty, hasErrors, diff.length, errors.length, changedCountBySection, errorCountBySection]);

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

  const handleConfirmPublish = (changeSummary: string) => {
    if (hasErrors) return;
    onSave(buildEditableConfig(draft), changeSummary);
    onClosePublishDrawer();
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
    <div className="w-full">
      <div className="max-w-[780px]">
        {sectionContent[activeSection] || sectionContent.features}
      </div>

      <PublishDrawer
        open={publishDrawerOpen}
        onClose={onClosePublishDrawer}
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
