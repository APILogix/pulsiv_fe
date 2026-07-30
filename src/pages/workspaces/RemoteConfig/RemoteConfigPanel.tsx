import { useState, useMemo, useEffect } from 'react';
import { Tabs } from '@/shared/observe';
import { AbstractIcon } from './components/HelpSystem';
import { FeaturesTab } from './tabs/FeaturesTab';
import { TransportTab } from './tabs/TransportTab';
import { SamplingTab } from './tabs/SamplingTab';
import { PrivacyTab } from './tabs/PrivacyTab';
import { InstrumentationTab } from './tabs/InstrumentationTab';
import { LimitsTab } from './tabs/LimitsTab';
import { KillswitchesTab } from './tabs/KillswitchesTab';
import { DEFAULT_SDK_CONFIG, type SdkConfigState } from './schema';
import { Button } from '@/shared/observe';
import { Download, Save, X } from 'lucide-react';

function rateToPercent(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  if (value > 0 && value < 1) return Math.round(value * 100);
  return value;
}

function normalizeRoutes(routes: unknown): SdkConfigState['transport']['routes'] {
  const routeMap = routes && typeof routes === 'object' && !Array.isArray(routes)
    ? routes as Record<string, any>
    : {};

  if (Array.isArray(routes)) {
    return routes.map((route, index) => ({
      id: String(route.id ?? route.name ?? `route-${index}`),
      priority: Number(route.priority ?? index + 1),
      name: String(route.name ?? route.id ?? `route-${index + 1}`),
      batchSize: Number(route.batchSize ?? DEFAULT_SDK_CONFIG.transport.routes[index]?.batchSize ?? 100),
      flushInterval: Number(route.flushInterval ?? route.flushIntervalMs ?? DEFAULT_SDK_CONFIG.transport.routes[index]?.flushInterval ?? 5000),
      timeout: Number(route.timeout ?? route.timeoutMs ?? DEFAULT_SDK_CONFIG.transport.routes[index]?.timeout ?? 10000),
      compression: String(route.compression ?? DEFAULT_SDK_CONFIG.transport.routes[index]?.compression ?? 'gzip'),
    }));
  }

  return DEFAULT_SDK_CONFIG.transport.routes.map((fallback) => {
    const route = routeMap[fallback.name] ?? {};
    return {
      ...fallback,
      priority: Number(route.priority ?? fallback.priority),
      batchSize: Number(route.batchSize ?? fallback.batchSize),
      flushInterval: Number(route.flushIntervalMs ?? route.flushInterval ?? fallback.flushInterval),
      timeout: Number(route.timeoutMs ?? route.timeout ?? fallback.timeout),
      compression: String(route.compression ?? fallback.compression),
    };
  });
}

function normalizeSdkConfig(input: any): SdkConfigState {
  const privacy = input?.privacy ?? {};
  const capture = privacy.capture ?? privacy;
  const pii = privacy.pii ?? privacy;
  const scrubbing = privacy.scrubbing ?? {};
  const transport = input?.transport ?? {};
  const retry = transport.retry ?? {};
  const queue = transport.queue ?? {};
  const connections = transport.connections ?? {};
  const instrumentation = input?.instrumentation ?? {};
  const instrumentationValue = (key: keyof SdkConfigState['instrumentation']) => {
    const value = instrumentation[key];
    if (typeof value === 'boolean') return value;
    if (value && typeof value === 'object' && 'enabled' in value) return Boolean(value.enabled);
    return DEFAULT_SDK_CONFIG.instrumentation[key];
  };

  return {
    features: { ...DEFAULT_SDK_CONFIG.features, ...(input?.features ?? {}) },
    transport: {
      ...DEFAULT_SDK_CONFIG.transport,
      routes: normalizeRoutes(transport.routes),
      maxConnections: Number(connections.total ?? transport.maxConnections ?? DEFAULT_SDK_CONFIG.transport.maxConnections),
      acquireTimeout: Number(connections.acquireTimeoutMs ?? transport.acquireTimeout ?? DEFAULT_SDK_CONFIG.transport.acquireTimeout),
      keepAlive: Boolean(transport.keepAlive ?? DEFAULT_SDK_CONFIG.transport.keepAlive),
      maxRetries: Number(retry.maxRetries ?? transport.maxRetries ?? DEFAULT_SDK_CONFIG.transport.maxRetries),
      baseDelay: Number(retry.baseDelayMs ?? transport.baseDelay ?? DEFAULT_SDK_CONFIG.transport.baseDelay),
      queueMaxSize: Number(queue.maxSize ?? transport.queueMaxSize ?? DEFAULT_SDK_CONFIG.transport.queueMaxSize),
      criticalReserve: Number(queue.criticalReserve ?? transport.criticalReserve ?? DEFAULT_SDK_CONFIG.transport.criticalReserve),
    },
    sampling: {
      errors: rateToPercent(input?.sampling?.errors, DEFAULT_SDK_CONFIG.sampling.errors),
      traces: rateToPercent(input?.sampling?.traces, DEFAULT_SDK_CONFIG.sampling.traces),
      metrics: rateToPercent(input?.sampling?.metrics, DEFAULT_SDK_CONFIG.sampling.metrics),
      replays: rateToPercent(input?.sampling?.replays, DEFAULT_SDK_CONFIG.sampling.replays),
      profiles: rateToPercent(input?.sampling?.profiles, DEFAULT_SDK_CONFIG.sampling.profiles),
      requests: rateToPercent(input?.sampling?.requests, DEFAULT_SDK_CONFIG.sampling.requests),
    },
    privacy: {
      ...DEFAULT_SDK_CONFIG.privacy,
      enabled: Boolean(pii.enabled ?? DEFAULT_SDK_CONFIG.privacy.enabled),
      maskEmails: Boolean(pii.maskEmails ?? DEFAULT_SDK_CONFIG.privacy.maskEmails),
      maskCreditCards: Boolean(pii.maskCreditCards ?? DEFAULT_SDK_CONFIG.privacy.maskCreditCards),
      maskPhoneNumbers: Boolean(pii.maskPhoneNumbers ?? DEFAULT_SDK_CONFIG.privacy.maskPhoneNumbers),
      body: Boolean(capture.body ?? DEFAULT_SDK_CONFIG.privacy.body),
      query: Boolean(capture.query ?? DEFAULT_SDK_CONFIG.privacy.query),
      cookies: Boolean(capture.cookies ?? DEFAULT_SDK_CONFIG.privacy.cookies),
      headers: Boolean(capture.headers ?? DEFAULT_SDK_CONFIG.privacy.headers),
      response: Boolean(capture.response ?? DEFAULT_SDK_CONFIG.privacy.response),
      scrubFields: Array.isArray(scrubbing.fields) ? scrubbing.fields : (Array.isArray(privacy.scrubFields) ? privacy.scrubFields : DEFAULT_SDK_CONFIG.privacy.scrubFields),
      scrubHeaders: Array.isArray(scrubbing.headers) ? scrubbing.headers : (Array.isArray(privacy.scrubHeaders) ? privacy.scrubHeaders : DEFAULT_SDK_CONFIG.privacy.scrubHeaders),
    },
    instrumentation: {
      http: instrumentationValue('http'),
      https: instrumentationValue('https'),
      fetch: instrumentationValue('fetch'),
      express: instrumentationValue('express'),
      fastify: instrumentationValue('fastify'),
      axios: instrumentationValue('axios'),
      redis: instrumentationValue('redis'),
      bullmq: instrumentationValue('bullmq'),
      prisma: instrumentationValue('prisma'),
      graphql: instrumentationValue('graphql'),
      mongodb: instrumentationValue('mongodb'),
    },
    killswitches: { ...DEFAULT_SDK_CONFIG.killswitches, ...(input?.killswitches ?? {}) },
  };
}

function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 == null || obj2 == null) {
    return false;
  }
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  for (const key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) return false;
  }
  return true;
}

interface RemoteConfigPanelProps {
  initialConfig: any;
  onSave: (payload: any) => void;
}

export function RemoteConfigPanel({ initialConfig, onSave }: RemoteConfigPanelProps) {
  // Merge initialConfig with DEFAULT_SDK_CONFIG to ensure all fields exist
  const baseConfig: SdkConfigState = useMemo(() => {
    return normalizeSdkConfig(initialConfig);
  }, [initialConfig]);

  const [draft, setDraft] = useState<SdkConfigState>(baseConfig);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    setDraft(baseConfig);
  }, [baseConfig]);

  const isDirty = !deepEqual(baseConfig, draft);

  const updateSection = (section: keyof SdkConfigState, key: string, value: any) => {
    setDraft((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [key]: value,
      },
    }));
  };

  const updateRoute = (routeId: string, field: string, value: any) => {
    setDraft((prev) => ({
      ...prev,
      transport: {
        ...prev.transport,
        routes: prev.transport.routes.map(r => r.id === routeId ? { ...r, [field]: value } : r),
      }
    }));
  };

  const handleDiscard = () => {
    setDraft(baseConfig);
  };

  const handleSave = () => {
    onSave(draft);
  };

  const handleExport = () => {
    // Generate safe JSON (omitting sensitive/internal fields per prompt)
    const safePayload = {
      features: draft.features,
      transport: {
        // Redact routes without URLs (though our schema doesn't have URLs, just to be sure)
        routes: draft.transport.routes.map(({ id, ...rest }) => rest),
      },
      sampling: draft.sampling,
      privacy: draft.privacy,
      instrumentation: draft.instrumentation,
      killswitches: draft.killswitches,
      limits: {
        maxPayloadSize: 1048576,
        maxAttributeLength: 4096,
        maxCpuOverheadPercent: 5,
        maxMemoryMb: 256,
        maxQueueSize: 10000,
        maxSpansPerTrace: 2000,
        maxSpanAttributes: 128,
      }
    };
    
    const blob = new Blob([JSON.stringify(safePayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pulse-sdk-config-safe.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExport(false);
  };

  const tabs = [
    {
      id: 'features',
      label: <span className="flex items-center gap-2"><AbstractIcon name="features" /> Features</span>,
      content: <FeaturesTab features={draft.features} onChange={(k, v) => updateSection('features', k, v)} />
    },
    {
      id: 'transport',
      label: <span className="flex items-center gap-2"><AbstractIcon name="transport" /> Transport</span>,
      content: <TransportTab transport={draft.transport} onChange={(k, v) => updateSection('transport', k, v)} onRouteUpdate={updateRoute} />
    },
    {
      id: 'sampling',
      label: <span className="flex items-center gap-2"><AbstractIcon name="sampling" /> Sampling</span>,
      content: <SamplingTab sampling={draft.sampling} onChange={(k, v) => updateSection('sampling', k, v)} />
    },
    {
      id: 'privacy',
      label: <span className="flex items-center gap-2"><AbstractIcon name="privacy" /> Privacy</span>,
      content: <PrivacyTab privacy={draft.privacy} onChange={(k, v) => updateSection('privacy', k, v)} />
    },
    {
      id: 'instrumentation',
      label: <span className="flex items-center gap-2"><AbstractIcon name="instrumentation" /> Instrumentation</span>,
      content: <InstrumentationTab instrumentation={draft.instrumentation} onChange={(k, v) => updateSection('instrumentation', k, v)} />
    },
    {
      id: 'limits',
      label: <span className="flex items-center gap-2"><AbstractIcon name="limits" /> Limits</span>,
      content: <LimitsTab />
    },
    {
      id: 'killswitches',
      label: <span className="flex items-center gap-2"><AbstractIcon name="killswitches" /> Killswitches</span>,
      content: <KillswitchesTab killswitches={draft.killswitches} onChange={(k, v) => updateSection('killswitches', k, v)} />
    }
  ];

  return (
    <div className="relative flex flex-col h-full min-h-[600px]">
      <div className="flex items-center justify-end mb-4">
        <Button variant="outline" onClick={() => setShowExport(true)}>
          <Download className="mr-2 size-4" />
          Export Safe JSON
        </Button>
      </div>

      <div className="flex-1">
        <Tabs tabs={tabs} />
      </div>

      {isDirty && (
        <div className="sticky bottom-4 mt-8 z-[50] mx-auto w-full max-w-2xl rounded-full border border-amber-500/30 bg-[var(--bg1)] px-6 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-amber-500/20 text-[12px] font-bold text-amber-500">
                ⚠️
              </span>
              <span className="text-[14px] font-medium text-[var(--text)]">
                You have unsaved changes
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={handleDiscard}>
                Discard
              </Button>
              <Button onClick={handleSave} className="bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]">
                <Save className="mr-2 size-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {showExport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-semibold text-[var(--text)]">Export Configuration</h2>
              <button onClick={() => setShowExport(false)} className="text-[var(--text3)] hover:text-[var(--text)]">
                <X className="size-5" />
              </button>
            </div>
            <p className="mb-4 text-[13px] text-[var(--text2)]">
              This preview shows the safe payload. It redacts all environment-specific and sensitive internal properties before export.
            </p>
            <pre className="max-h-[400px] overflow-auto rounded-md bg-[var(--bg2)] p-4 text-[12px] text-[var(--text2)] font-mono border border-[var(--border)]">
              {JSON.stringify({
                features: draft.features,
                transport: { routes: draft.transport.routes.map(({ id, ...rest }) => rest) },
                sampling: draft.sampling,
                privacy: draft.privacy,
                instrumentation: draft.instrumentation,
                killswitches: draft.killswitches,
              }, null, 2)}
            </pre>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[11px] italic text-[var(--text3)]">
                🔒 Hidden: projectId, configHash, generatedAt, generatedBy, schemaVersion, all route URLs.
              </p>
              <Button onClick={handleExport} className="bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]">
                <Download className="mr-2 size-4" />
                Download JSON
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
