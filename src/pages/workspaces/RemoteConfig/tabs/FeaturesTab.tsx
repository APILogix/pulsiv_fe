import { Switch } from '@/components/ui/switch';
import { SectionBanner, FieldTooltip } from '../components/HelpSystem';
import type { SdkConfigState } from '../schema';
import { cn } from '@/lib/utils';
import { Zap, Cpu, Layers } from 'lucide-react';

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
}

const CORE_FEATURES: FeatureToggleDef[] = [
  {
    key: 'errors',
    label: 'Error Tracking',
    tooltip: 'Captures unhandled exceptions, unhandled promise rejections, and manually reported errors with stack traces and breadcrumbs.',
    onDesc: 'Unhandled exceptions are captured and sent to Pulse.',
    offDesc: 'Errors are silently ignored.',
    cost: '< 0.01% CPU',
    sdkReq: 'All SDKs v1.0+',
  },
  {
    key: 'logging',
    label: 'Structured Logging',
    tooltip: "Ships your application's structured log entries (info, warn, error, debug) to Pulse for centralized search and alerting.",
    onDesc: 'Application logs are shipped to Pulse.',
    offDesc: 'Logs are only printed locally.',
    cost: '~ 0.1% CPU',
    sdkReq: 'Node/Web/Python v1.2+',
  },
  {
    key: 'metrics',
    label: 'Metrics Collection',
    tooltip: 'Collects custom counters, gauges, histograms, and system-level metrics (CPU, memory, disk) and ships them to Pulse.',
    onDesc: 'System and custom metrics are collected.',
    offDesc: 'Metrics collection is disabled.',
    cost: '~ 0.05% CPU',
    sdkReq: 'All SDKs v1.0+',
  },
  {
    key: 'tracing',
    label: 'Distributed Tracing',
    tooltip: 'Generates trace spans for incoming requests and outgoing calls, enabling latency breakdowns across services.',
    onDesc: 'Distributed traces and spans are generated.',
    offDesc: 'Tracing overhead is eliminated.',
    cost: '~ 0.5% CPU',
    sdkReq: 'All SDKs v1.0+',
  },
  {
    key: 'requestCapture',
    label: 'Request Capture',
    tooltip: 'Captures HTTP request metadata (method, URL, status code, duration) for every request.',
    onDesc: 'HTTP request metadata is captured.',
    offDesc: 'Requests are untracked.',
    cost: '~ 0.2% CPU',
    sdkReq: 'Node/Python/Go v1.1+',
  },
];

const ADVANCED_FEATURES: FeatureToggleDef[] = [
  {
    key: 'profiling',
    label: 'Continuous CPU Profiling',
    tooltip: 'Collects CPU and memory profiles of your running process. Adds measurable overhead.',
    onDesc: 'CPU/Memory profiles are collected.',
    offDesc: 'No profiling overhead.',
    cost: '~ 1.8% CPU',
    sdkReq: 'Node/Python/iOS v2.0+',
    dependency: 'Requires Distributed Tracing',
  },
  {
    key: 'sessionReplay',
    label: 'Session Replay',
    tooltip: 'Records and replays user browser sessions (frontend SDK only). Captures DOM mutations and network requests.',
    onDesc: 'Browser sessions are recorded.',
    offDesc: 'Session replay is disabled.',
    cost: '~ 2.5% CPU',
    sdkReq: 'Web Browser SDK v2.0+',
    dependency: 'Requires Request Capture',
  },
  {
    key: 'crons',
    label: 'Cron Job Monitoring',
    tooltip: 'Tracks scheduled job executions and alerts if a job misses its expected check-in window.',
    onDesc: 'Scheduled jobs are monitored.',
    offDesc: 'Cron executions are untracked.',
    cost: '< 0.01% CPU',
    sdkReq: 'All SDKs v1.4+',
  },
  {
    key: 'gcMonitoring',
    label: 'GC Pause Monitoring',
    tooltip: 'Tracks V8 garbage collection pauses and reports long GC events that may cause latency spikes.',
    onDesc: 'Garbage collection events are tracked.',
    offDesc: 'GC monitoring is disabled.',
    cost: '~ 0.05% CPU',
    sdkReq: 'Node.js SDK v1.3+',
    dependency: 'Requires Runtime Metrics',
  },
  {
    key: 'runtimeMetrics',
    label: 'V8 Runtime Metrics',
    tooltip: 'Exposes V8/Node.js internal metrics: heap space usage, compiled code size, external memory.',
    onDesc: 'V8 runtime metrics are exposed.',
    offDesc: 'Runtime metrics are hidden.',
    cost: '~ 0.1% CPU',
    sdkReq: 'Node.js / V8 SDKs',
  },
  {
    key: 'eventLoopMonitoring',
    label: 'Event Loop Lag',
    tooltip: 'Measures event loop lag — the delay between when a callback is scheduled and when it runs.',
    onDesc: 'Event loop lag is measured.',
    offDesc: 'Event loop monitoring is disabled.',
    cost: '~ 0.02% CPU',
    sdkReq: 'Node.js / JS SDKs',
  },
];

export function FeaturesTab({ features, onChange }: FeaturesTabProps) {
  const renderToggleCard = ({ key, label, tooltip, onDesc, offDesc, cost, sdkReq, dependency }: FeatureToggleDef) => {
    const isActive = features[key];
    return (
      <div
        key={key}
        className={cn(
          "flex flex-col justify-between gap-3 rounded-xl border p-4 transition-all duration-200",
          isActive
            ? "border-[var(--brand)]/40 bg-[var(--bg1)] shadow-sm ring-1 ring-[var(--brand)]/20"
            : "border-[var(--border)] bg-[var(--bg2)]/60 hover:border-[var(--border)] hover:bg-[var(--bg1)]"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', isActive ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-slate-500/50')} />
              <h4 className="font-bold text-[14px] text-[var(--text)]">{label}</h4>
              <FieldTooltip definition={tooltip} />
            </div>

            <div className="mt-1 text-[12px] text-[var(--text3)]">
              {isActive ? `On: ${onDesc}` : `Off: ${offDesc}`}
            </div>
          </div>

          <Switch checked={isActive} onCheckedChange={(val) => onChange(key, val)} className="mt-0.5 shrink-0" />
        </div>

        {/* Impact & Compatibility Badges Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border)]/60 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[var(--bg2)] px-2 py-0.5 font-mono text-[var(--text3)] border border-[var(--border)]">
              Overhead: <strong className={cn(cost.includes('1.') || cost.includes('2.') ? 'text-amber-400' : 'text-emerald-400')}>{cost}</strong>
            </span>
            <span className="rounded-md bg-[var(--bg2)] px-2 py-0.5 text-[var(--text3)] border border-[var(--border)]">
              {sdkReq}
            </span>
          </div>

          {dependency && (
            <span className="flex items-center gap-1 text-sky-400 text-[10.5px] font-medium">
              <Layers className="size-3" /> {dependency}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <SectionBanner
        title="Feature Modules & Subsystems"
        definition="Selectively activate or unload SDK subsystems across your fleet. Deactivating a feature completely unloads its hook listeners to eliminate execution overhead."
      >
        Enterprise control of observability features, continuous profiling, and session replays.
      </SectionBanner>

      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text3)] flex items-center gap-2">
          <Zap className="size-3.5 text-[var(--brand)]" /> Core Observability Pillars
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {CORE_FEATURES.map(renderToggleCard)}
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text3)] flex items-center gap-2">
          <Cpu className="size-3.5 text-sky-400" /> Advanced Diagnostics & Profiling
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {ADVANCED_FEATURES.map(renderToggleCard)}
        </div>
      </div>
    </div>
  );
}
