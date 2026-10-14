import { useMemo, useState } from 'react';

import { SearchField, ToolbarCount } from '@/modules/projects/components/project-page';
import { Panel, RowStack, Toggle } from '@/shared/ui/pulse';
import { Button as UiButton } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { SectionBanner, FieldTooltip } from '../components/HelpSystem';
import type { SdkConfigState } from '../schema';

interface FeaturesTabProps {
  features: SdkConfigState['features'];
  onChange: (key: keyof SdkConfigState['features'], value: boolean) => void;
}

type FeatureKey = keyof SdkConfigState['features'];

interface FeatureToggleDef {
  key: FeatureKey;
  label: string;
  tooltip: string;
  onDesc: string;
  offDesc: string;
  cost: string;
  sdkReq: string;
  /** The feature this one needs, shown as a note (amber while it is off). */
  requires?: FeatureKey;
  category: 'core' | 'advanced';
}

const ALL_FEATURES: FeatureToggleDef[] = [
  {
    key: 'errors',
    label: 'Error tracking',
    tooltip: 'Captures unhandled exceptions, promise rejections, and manually reported errors with stack traces and breadcrumbs.',
    onDesc: 'Unhandled exceptions and error stack traces are captured.',
    offDesc: 'Errors are not captured by the SDK.',
    cost: '< 0.01% CPU',
    sdkReq: 'All SDKs v1.0+',
    category: 'core',
  },
  {
    key: 'logging',
    label: 'Structured logging',
    tooltip: "Ships your application's structured log entries (info, warn, error, debug) to Pulse for centralized search and alerting.",
    onDesc: 'Structured log events are shipped to Pulse.',
    offDesc: 'Logs are only printed locally to stdout/stderr.',
    cost: '~ 0.1% CPU',
    sdkReq: 'Node/Web/Python v1.2+',
    category: 'core',
  },
  {
    key: 'metrics',
    label: 'Metrics collection',
    tooltip: 'Collects custom counters, gauges, histograms, and system-level metrics (CPU, memory, disk) and ships them to Pulse.',
    onDesc: 'Runtime and custom telemetry metrics are collected.',
    offDesc: 'Metrics collection is disabled.',
    cost: '~ 0.05% CPU',
    sdkReq: 'All SDKs v1.0+',
    category: 'core',
  },
  {
    key: 'tracing',
    label: 'Distributed tracing',
    tooltip: 'Generates trace spans for incoming requests and outgoing calls, enabling latency breakdowns across services.',
    onDesc: 'Distributed traces and spans are generated.',
    offDesc: 'Tracing overhead is eliminated.',
    cost: '~ 0.5% CPU',
    sdkReq: 'All SDKs v1.0+',
    category: 'core',
  },
  {
    key: 'requestCapture',
    label: 'Request capture',
    tooltip: 'Captures HTTP request metadata (method, URL, status code, duration) for every request.',
    onDesc: 'HTTP request metadata is captured.',
    offDesc: 'Requests are untracked.',
    cost: '~ 0.2% CPU',
    sdkReq: 'Node/Python/Go v1.1+',
    category: 'core',
  },
  {
    key: 'profiling',
    label: 'Continuous CPU profiling',
    tooltip: 'Collects CPU and memory profiles of your running process. Adds measurable overhead.',
    onDesc: 'Process CPU and memory profiling is active.',
    offDesc: 'No profiling overhead incurred.',
    cost: '~ 1.8% CPU',
    sdkReq: 'Node/Python/iOS v2.0+',
    requires: 'tracing',
    category: 'advanced',
  },
  {
    key: 'sessionReplay',
    label: 'Session replay',
    tooltip: 'Records and replays user browser sessions (frontend SDK only). Captures DOM mutations and network requests.',
    onDesc: 'Browser DOM mutations and clicks are recorded.',
    offDesc: 'Session replay is disabled.',
    cost: '~ 2.5% CPU',
    sdkReq: 'Web browser SDK v2.0+',
    requires: 'requestCapture',
    category: 'advanced',
  },
  {
    key: 'crons',
    label: 'Cron job monitoring',
    tooltip: 'Tracks scheduled job executions and alerts if a job misses its expected check-in window.',
    onDesc: 'Scheduled cron jobs and recurring tasks are monitored.',
    offDesc: 'Cron executions are untracked.',
    cost: '< 0.01% CPU',
    sdkReq: 'All SDKs v1.4+',
    category: 'advanced',
  },
  {
    key: 'runtimeMetrics',
    label: 'V8 runtime internals',
    tooltip: 'Exposes V8/Node.js internal metrics: heap space usage, compiled code size, external memory.',
    onDesc: 'Engine internals and memory segments are sampled.',
    offDesc: 'Engine internals are omitted.',
    cost: '~ 0.1% CPU',
    sdkReq: 'Node.js / V8 SDKs',
    category: 'advanced',
  },
  {
    key: 'eventLoopMonitoring',
    label: 'Event loop latency tracking',
    tooltip: 'Monitors Node.js event loop lag and reports latency spikes that block asynchronous I/O.',
    onDesc: 'Event loop delay histogram is continuously updated.',
    offDesc: 'Event loop lag is untracked.',
    cost: '~ 0.05% CPU',
    sdkReq: 'Node.js SDK v1.3+',
    category: 'advanced',
  },
  {
    key: 'gcMonitoring',
    label: 'GC pause monitoring',
    tooltip: 'Tracks V8 garbage collection pauses and reports long GC events that may cause latency spikes.',
    onDesc: 'Major and minor GC cycles are logged.',
    offDesc: 'GC pauses are untracked.',
    cost: '~ 0.05% CPU',
    sdkReq: 'Node.js SDK v1.3+',
    requires: 'runtimeMetrics',
    category: 'advanced',
  },
];

const LABEL_BY_KEY = new Map(ALL_FEATURES.map((feature) => [feature.key, feature.label]));

function FeatureRow({
  def,
  features,
  onChange,
}: {
  def: FeatureToggleDef;
  features: SdkConfigState['features'];
  onChange: FeaturesTabProps['onChange'];
}) {
  const isEnabled = features[def.key];
  const requiredLabel = def.requires ? LABEL_BY_KEY.get(def.requires) : undefined;
  const unmet = Boolean(def.requires && isEnabled && !features[def.requires]);

  return (
    <div className="flex items-start justify-between gap-6 px-5 py-3.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="text-[13px] font-medium text-[var(--text)]">{def.label}</span>
          <FieldTooltip label={def.label} definition={def.tooltip} />
          {requiredLabel && (
            <span className={cn('text-[12px]', unmet ? 'text-[var(--amber)]' : 'text-[var(--text3)]')}>
              · Requires {requiredLabel.toLowerCase()}
              {unmet && ', which is off'}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[12px] leading-[1.5] text-[var(--text2)]">{isEnabled ? def.onDesc : def.offDesc}</p>
        <p className="mt-1 font-[family-name:var(--mono)] text-[11.5px] text-[var(--text3)]">
          Overhead {def.cost} · {def.sdkReq}
        </p>
      </div>
      <div className="pt-0.5">
        <Toggle checked={isEnabled} onChange={(value) => onChange(def.key, value)} label={def.label} />
      </div>
    </div>
  );
}

export function FeaturesTab({ features, onChange }: FeaturesTabProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filter, setFilter] = useState('');

  const filteredFeatures = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return ALL_FEATURES;
    return ALL_FEATURES.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.onDesc.toLowerCase().includes(q) ||
        f.tooltip.toLowerCase().includes(q),
    );
  }, [filter]);

  const coreList = filteredFeatures.filter((f) => f.category === 'core');
  const advancedList = filteredFeatures.filter((f) => f.category === 'advanced');
  const advancedOpen = showAdvanced || Boolean(filter.trim());
  const countOn = (list: FeatureToggleDef[]) => list.filter((f) => features[f.key]).length;

  return (
    <div className="flex flex-col gap-6">
      <SectionBanner
        title="Features"
        definition="Selectively activate telemetry engines without modifying code. Settings take effect upon SDK cache refresh."
      >
        Primary capture switches for errors, logs, traces, and metrics.
      </SectionBanner>

      <div className="flex flex-wrap items-center gap-2">
        <SearchField value={filter} onChange={setFilter} placeholder="Filter features" label="Filter telemetry features" />
        <ToolbarCount>
          {countOn(ALL_FEATURES)} of {ALL_FEATURES.length} on
        </ToolbarCount>
      </div>

      {filteredFeatures.length === 0 && (
        <p className="text-[13px] text-[var(--text3)]">No features match “{filter.trim()}”.</p>
      )}

      {coreList.length > 0 && (
        <Panel
          title="Core telemetry"
          description={`${countOn(coreList)} of ${coreList.length} on.`}
          bodyClassName="p-0"
        >
          <RowStack>
            {coreList.map((def) => (
              <FeatureRow key={def.key} def={def} features={features} onChange={onChange} />
            ))}
          </RowStack>
        </Panel>
      )}

      {advancedList.length > 0 && (
        <Panel
          title="Advanced telemetry and profiling"
          description={`${countOn(advancedList)} of ${advancedList.length} on. These add measurable overhead.`}
          actions={
            filter.trim() ? undefined : (
              <UiButton
                variant="outline"
                size="sm"
                aria-expanded={advancedOpen}
                onClick={() => setShowAdvanced((current) => !current)}
              >
                {advancedOpen ? 'Hide options' : `Show ${advancedList.length} options`}
              </UiButton>
            )
          }
          bodyClassName="p-0"
        >
          {advancedOpen ? (
            <RowStack>
              {advancedList.map((def) => (
                <FeatureRow key={def.key} def={def} features={features} onChange={onChange} />
              ))}
            </RowStack>
          ) : undefined}
        </Panel>
      )}
    </div>
  );
}
