import { useState, useMemo } from 'react';
import { Switch } from '@/components/ui/switch';
import { SectionBanner, FieldTooltip } from '../components/HelpSystem';
import type { SdkConfigState } from '../schema';
import { cn } from '@/lib/utils';
import { Zap, ChevronDown, Search, X } from 'lucide-react';

interface FeaturesTabProps {
  features: SdkConfigState['features'];
  onChange: (key: keyof SdkConfigState['features'], value: boolean) => void;
}

interface FeatureToggleDef {
  key: keyof SdkConfigState['features'];
  label: string;
  tooltip: string;
  onDesc: string;
  offDesc: string;
  cost: string;
  sdkReq: string;
  dependency?: string;
  category: 'core' | 'advanced';
}

const ALL_FEATURES: FeatureToggleDef[] = [
  {
    key: 'errors',
    label: 'Error Tracking',
    tooltip: 'Captures unhandled exceptions, promise rejections, and manually reported errors with stack traces and breadcrumbs.',
    onDesc: 'Unhandled exceptions and error stack traces are captured.',
    offDesc: 'Errors are not captured by the SDK.',
    cost: '< 0.01% CPU',
    sdkReq: 'All SDKs v1.0+',
    category: 'core',
  },
  {
    key: 'logging',
    label: 'Structured Logging',
    tooltip: "Ships your application's structured log entries (info, warn, error, debug) to Pulse for centralized search and alerting.",
    onDesc: 'Structured log events are shipped to Pulse.',
    offDesc: 'Logs are only printed locally to stdout/stderr.',
    cost: '~ 0.1% CPU',
    sdkReq: 'Node/Web/Python v1.2+',
    category: 'core',
  },
  {
    key: 'metrics',
    label: 'Metrics Collection',
    tooltip: 'Collects custom counters, gauges, histograms, and system-level metrics (CPU, memory, disk) and ships them to Pulse.',
    onDesc: 'Runtime and custom telemetry metrics are collected.',
    offDesc: 'Metrics collection is disabled.',
    cost: '~ 0.05% CPU',
    sdkReq: 'All SDKs v1.0+',
    category: 'core',
  },
  {
    key: 'tracing',
    label: 'Distributed Tracing',
    tooltip: 'Generates trace spans for incoming requests and outgoing calls, enabling latency breakdowns across services.',
    onDesc: 'Distributed traces and spans are generated.',
    offDesc: 'Tracing overhead is eliminated.',
    cost: '~ 0.5% CPU',
    sdkReq: 'All SDKs v1.0+',
    category: 'core',
  },
  {
    key: 'requestCapture',
    label: 'Request Capture',
    tooltip: 'Captures HTTP request metadata (method, URL, status code, duration) for every request.',
    onDesc: 'HTTP request metadata is captured.',
    offDesc: 'Requests are untracked.',
    cost: '~ 0.2% CPU',
    sdkReq: 'Node/Python/Go v1.1+',
    category: 'core',
  },
  {
    key: 'profiling',
    label: 'Continuous CPU Profiling',
    tooltip: 'Collects CPU and memory profiles of your running process. Adds measurable overhead.',
    onDesc: 'Process CPU/Memory profiling is active.',
    offDesc: 'No profiling overhead incurred.',
    cost: '~ 1.8% CPU',
    sdkReq: 'Node/Python/iOS v2.0+',
    dependency: 'Requires Distributed Tracing',
    category: 'advanced',
  },
  {
    key: 'sessionReplay',
    label: 'Session Replay',
    tooltip: 'Records and replays user browser sessions (frontend SDK only). Captures DOM mutations and network requests.',
    onDesc: 'Browser DOM mutations and clicks are recorded.',
    offDesc: 'Session replay is disabled.',
    cost: '~ 2.5% CPU',
    sdkReq: 'Web Browser SDK v2.0+',
    dependency: 'Requires Request Capture',
    category: 'advanced',
  },
  {
    key: 'crons',
    label: 'Cron Job Monitoring',
    tooltip: 'Tracks scheduled job executions and alerts if a job misses its expected check-in window.',
    onDesc: 'Scheduled cron jobs and recurring tasks are monitored.',
    offDesc: 'Cron executions are untracked.',
    cost: '< 0.01% CPU',
    sdkReq: 'All SDKs v1.4+',
    category: 'advanced',
  },
  {
    key: 'runtimeMetrics',
    label: 'V8 Runtime Internals',
    tooltip: 'Exposes V8/Node.js internal metrics: heap space usage, compiled code size, external memory.',
    onDesc: 'Engine internals and memory segments are sampled.',
    offDesc: 'Engine internals are omitted.',
    cost: '~ 0.1% CPU',
    sdkReq: 'Node.js / V8 SDKs',
    category: 'advanced',
  },
  {
    key: 'eventLoopMonitoring',
    label: 'Event Loop Latency Tracking',
    tooltip: 'Monitors Node.js event loop lag and reports latency spikes that block asynchronous I/O.',
    onDesc: 'Event loop delay histogram is continuously updated.',
    offDesc: 'Event loop lag is untracked.',
    cost: '~ 0.05% CPU',
    sdkReq: 'Node.js SDK v1.3+',
    category: 'advanced',
  },
  {
    key: 'gcMonitoring',
    label: 'GC Pause Monitoring',
    tooltip: 'Tracks V8 garbage collection pauses and reports long GC events that may cause latency spikes.',
    onDesc: 'Major and minor GC cycles are logged.',
    offDesc: 'GC pauses are untracked.',
    cost: '~ 0.05% CPU',
    sdkReq: 'Node.js SDK v1.3+',
    dependency: 'Requires Runtime Metrics',
    category: 'advanced',
  },
];

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
        f.tooltip.toLowerCase().includes(q)
    );
  }, [filter]);

  const coreList = filteredFeatures.filter((f) => f.category === 'core');
  const advancedList = filteredFeatures.filter((f) => f.category === 'advanced');

  const renderCard = (def: FeatureToggleDef) => {
    const isEnabled = features[def.key];
    return (
      <div
        key={def.key}
        className={cn(
          'flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[var(--radius-lg)] border p-4.5 transition-all',
          isEnabled
            ? 'border-[var(--border2)] bg-[var(--bg1)] shadow-xs'
            : 'border-[var(--border)] bg-[var(--bg1)]/60 opacity-80'
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[13.5px] text-[var(--text)]">{def.label}</span>
            <FieldTooltip definition={def.tooltip} />
            {def.dependency && (
              <span className="rounded-full bg-[var(--amber-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--amber)]">
                {def.dependency}
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] text-[var(--text3)]">
            {isEnabled ? def.onDesc : def.offDesc}
          </p>
          <div className="mt-2.5 flex items-center gap-3 text-[11px] text-[var(--text3)] font-mono">
            <span className="rounded bg-[var(--bg2)] px-2 py-0.5 border border-[var(--border)]">
              Overhead: <strong className="text-[var(--text)]">{def.cost}</strong>
            </span>
            <span className="truncate">{def.sdkReq}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
          <span
            className={cn(
              'font-mono text-[11px] font-bold uppercase tracking-wider',
              isEnabled ? 'text-[var(--brand)]' : 'text-[var(--text3)]'
            )}
          >
            {isEnabled ? 'Enabled' : 'Disabled'}
          </span>
          <Switch
            checked={isEnabled}
            onCheckedChange={(val) => onChange(def.key, val)}
            aria-label={`Toggle ${def.label}`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <SectionBanner
        title="Telemetry Feature Flags"
        definition="Selectively activate telemetry engines without modifying code. Settings take effect upon SDK cache refresh."
      >
        Primary capture switches for errors, logs, traces, and metrics.
      </SectionBanner>

      {/* Filter Bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text3)]" />
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter telemetry features..."
          className="h-8.5 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg1)] pl-9 pr-8 text-[12.5px] text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--brand)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)]"
        />
        {filter && (
          <button
            type="button"
            onClick={() => setFilter('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text)]"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Core Features */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="eyebrow flex items-center gap-1.5 text-[var(--text3)]">
            <Zap className="size-3 text-[var(--brand)]" /> Core Telemetry Capabilities
          </h3>
          <span className="font-mono text-[11px] text-[var(--text3)]">
            {coreList.filter((f) => features[f.key]).length} of {coreList.length} Active
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {coreList.map(renderCard)}
        </div>
      </div>

      {/* Advanced Features (Progressive Disclosure) */}
      {advancedList.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/60 px-4 py-2.5 text-left text-xs font-semibold text-[var(--text)] hover:bg-[var(--bg2)] transition-colors"
          >
            <span>
              Advanced Telemetry & Profiling ({advancedList.length} options)
            </span>
            <ChevronDown
              className={cn('size-4 text-[var(--text3)] transition-transform duration-200', showAdvanced && 'rotate-180')}
            />
          </button>

          {(showAdvanced || filter) && (
            <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
              {advancedList.map(renderCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
