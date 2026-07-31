import { Switch } from '@/components/ui/switch';
import { SectionBanner, FieldTooltip, MicroCopy } from '../components/HelpSystem';
import type { SdkConfigState } from '../schema';
import { cn } from '@/lib/utils';

interface FeaturesTabProps {
  features: SdkConfigState['features'];
  onChange: (key: keyof SdkConfigState['features'], value: boolean) => void;
}

const CORE_FEATURES = [
  {
    key: 'errors' as const,
    label: 'Error Tracking',
    tooltip: 'Captures unhandled exceptions, unhandled promise rejections, and manually reported errors with stack traces and breadcrumbs.',
    onDesc: 'Unhandled exceptions are captured and sent to Pulse.',
    offDesc: 'Errors are silently ignored.',
  },
  {
    key: 'logging' as const,
    label: 'Structured Logging',
    tooltip: "Ships your application's structured log entries (info, warn, error, debug) to Pulse for centralized search and alerting.",
    onDesc: 'Application logs are shipped to Pulse.',
    offDesc: 'Logs are only printed locally.',
  },
  {
    key: 'metrics' as const,
    label: 'Metrics',
    tooltip: 'Collects custom counters, gauges, histograms, and system-level metrics (CPU, memory, disk) and ships them to Pulse.',
    onDesc: 'System and custom metrics are collected.',
    offDesc: 'Metrics collection is disabled.',
  },
  {
    key: 'tracing' as const,
    label: 'Distributed Tracing',
    tooltip: 'Generates trace spans for incoming requests and outgoing calls, enabling latency breakdowns across services.',
    onDesc: 'Distributed traces and spans are generated.',
    offDesc: 'Tracing overhead is eliminated.',
  },
  {
    key: 'requestCapture' as const,
    label: 'Request Capture',
    tooltip: 'Captures HTTP request metadata (method, URL, status code, duration) for every request. Bodies/headers require Privacy capture toggles.',
    onDesc: 'HTTP request metadata is captured.',
    offDesc: 'Requests are untracked.',
  },
];

const ADVANCED_FEATURES = [
  {
    key: 'crons' as const,
    label: 'Cron Monitoring',
    tooltip: 'Tracks scheduled job executions and alerts if a job misses its expected check-in window.',
    onDesc: 'Scheduled jobs are monitored.',
    offDesc: 'Cron executions are untracked.',
  },
  {
    key: 'profiling' as const,
    label: 'Profiling',
    tooltip: 'Collects CPU and memory profiles of your running process. Adds measurable overhead.',
    onDesc: 'CPU/Memory profiles are collected.',
    offDesc: 'No profiling overhead.',
  },
  {
    key: 'gcMonitoring' as const,
    label: 'GC Monitoring',
    tooltip: 'Tracks V8 garbage collection pauses and reports long GC events that may cause latency spikes.',
    onDesc: 'Garbage collection events are tracked.',
    offDesc: 'GC monitoring is disabled.',
  },
  {
    key: 'sessionReplay' as const,
    label: 'Session Replay',
    tooltip: 'Records and replays user browser sessions (frontend SDK only). Captures DOM mutations, network requests, and console logs.',
    onDesc: 'Browser sessions are recorded.',
    offDesc: 'Session replay is disabled.',
  },
  {
    key: 'runtimeMetrics' as const,
    label: 'Runtime Metrics',
    tooltip: 'Exposes V8/Node.js internal metrics: heap space usage, compiled code size, external memory, GC handles.',
    onDesc: 'V8 runtime metrics are exposed.',
    offDesc: 'Runtime metrics are hidden.',
  },
  {
    key: 'eventLoopMonitoring' as const,
    label: 'Event Loop Monitoring',
    tooltip: 'Measures event loop lag — the delay between when a callback is scheduled and when it runs.',
    onDesc: 'Event loop lag is measured.',
    offDesc: 'Event loop monitoring is disabled.',
  },
];

interface FeatureToggleDef {
  key: keyof SdkConfigState['features'];
  label: string;
  tooltip: string;
  onDesc: string;
  offDesc: string;
}

export function FeaturesTab({ features, onChange }: FeaturesTabProps) {
  const renderToggle = ({ key, label, tooltip, onDesc, offDesc }: FeatureToggleDef) => {
    const isActive = features[key];
    return (
      <div key={key} className="flex items-start justify-between py-4">
        <div className="pr-4">
          <div className="flex items-center">
            <span className={cn('mr-2 h-2 w-2 rounded-full', isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500')} />
            <span className="font-medium text-[var(--text)]">{label}</span>
            <FieldTooltip definition={tooltip} />
          </div>
          <MicroCopy active={isActive}>{isActive ? `On: ${onDesc}` : `Off: ${offDesc}`}</MicroCopy>
        </div>
        <Switch checked={isActive} onCheckedChange={(val) => onChange(key, val)} className="mt-1" />
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-300">
      <SectionBanner
        title="Features"
        definition="These toggles control the high-level subsystems of the SDK. Turning a feature off completely unloads its code path, eliminating any performance overhead."
      >
        Enable or disable core observability pillars and advanced diagnostics.
      </SectionBanner>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h3 className="font-semibold text-[var(--text)]">Core Features</h3>
          </div>
          <div className="divide-y divide-[var(--border)] px-5">{CORE_FEATURES.map(renderToggle)}</div>
        </div>

        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h3 className="font-semibold text-[var(--text)]">Advanced Features</h3>
          </div>
          <div className="divide-y divide-[var(--border)] px-5">{ADVANCED_FEATURES.map(renderToggle)}</div>
        </div>
      </div>
    </div>
  );
}
