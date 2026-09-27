import { useState } from 'react';
import { SectionBanner, FieldTooltip } from '../components/HelpSystem';
import type { SdkConfigState, SamplingSignal } from '../schema';
import type { FieldError } from '../bounds';
import { Button } from '@/shared/observe';
import { Plus, Trash2, Gauge, Route, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SamplingTabProps {
  sampling: SdkConfigState['sampling'];
  onChange: (key: keyof SdkConfigState['sampling'], value: any) => void;
  errors: FieldError[];
}

interface SignalDef {
  key: SamplingSignal;
  label: string;
  tooltip: string;
  impact: string;
}

const SIGNALS: SignalDef[] = [
  { key: 'errors', label: 'Errors', tooltip: 'Percentage of caught error events shipped.', impact: 'Reducing this may cause rare bugs to be missed.' },
  { key: 'traces', label: 'Traces', tooltip: 'Percentage of requests initiating distributed trace spans.', impact: 'Increasing this increases tracing depth and ingestion egress.' },
  { key: 'spans', label: 'Spans', tooltip: 'Percentage of nested spans retained.', impact: 'Controls the granularity of flamegraphs.' },
  { key: 'requests', label: 'Requests', tooltip: 'Percentage of HTTP request telemetry captured.', impact: 'High request volumes directly scale bandwidth usage.' },
  { key: 'metrics', label: 'Metrics', tooltip: 'Percentage of runtime metrics data points emitted.', impact: 'Controls time-series telemetry frequency.' },
  { key: 'logs', label: 'Logs', tooltip: 'Percentage of log statements sent to centralized storage.', impact: 'High log rates significantly impact network transfer.' },
  { key: 'events', label: 'Events', tooltip: 'Percentage of custom business events tracked.', impact: 'Affects conversion funnels and product analytics.' },
  { key: 'messages', label: 'Messages', tooltip: 'Percentage of asynchronous message queue telemetry retained.', impact: 'Controls broker and queue observability.' },
  { key: 'profiles', label: 'Profiles', tooltip: 'Percentage of requests triggering CPU and memory profiles.', impact: 'CPU profiling adds process overhead; keep <= 20% in production.' },
  { key: 'replays', label: 'Session Replays', tooltip: 'Percentage of user sessions captured visually.', impact: 'High data transfer; recommended 10% - 25%.' },
  { key: 'crons', label: 'Cron Check-ins', tooltip: 'Percentage of scheduled job executions tracked.', impact: 'Keep at 100% to avoid false-positive missed check-in alerts.' },
];

const PRESETS = [0, 10, 25, 50, 100];

export function SamplingTab({ sampling, onChange, errors }: SamplingTabProps) {
  const [newRoutePath, setNewRoutePath] = useState('');
  const errorFor = (key: string) => errors.find((e) => e.path === `sampling.${key}`)?.message;

  const handleGlobalChange = (key: SamplingSignal, value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    onChange(key, clamped);
  };

  const handleRouteChange = (routePath: string, key: SamplingSignal, value: number) => {
    const updatedRoutes = { ...sampling.routes };
    if (!updatedRoutes[routePath]) updatedRoutes[routePath] = {};
    updatedRoutes[routePath][key] = Math.max(0, Math.min(1, value));
    onChange('routes', updatedRoutes);
  };

  const addRouteOverride = () => {
    const trimmed = newRoutePath.trim();
    if (!trimmed || sampling.routes[trimmed]) return;
    const updatedRoutes = { ...sampling.routes };
    updatedRoutes[trimmed] = { traces: 1, errors: 1 };
    onChange('routes', updatedRoutes);
    setNewRoutePath('');
  };

  const removeRouteOverride = (routePath: string) => {
    const updatedRoutes = { ...sampling.routes };
    delete updatedRoutes[routePath];
    onChange('routes', updatedRoutes);
  };

  const renderSamplingControl = (
    label: string,
    percentage: number,
    tooltip: string,
    impact: string,
    onValueChange: (v: number) => void,
    error?: string
  ) => {
    return (
      <div className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[13px] text-[var(--text)]">{label}</span>
            <FieldTooltip definition={tooltip} />
          </div>
          {/* Exact Numeric Input */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              value={percentage}
              onChange={(e) => onValueChange(Number(e.target.value) / 100)}
              className="w-14 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-2 py-0.5 text-right font-mono text-[12px] font-bold text-[var(--brand)] outline-none focus:border-[var(--brand)]"
            />
            <span className="font-mono text-xs text-[var(--text3)]">%</span>
          </div>
        </div>

        {/* Visual Slider */}
        <div className="relative flex items-center py-1">
          <div className="h-2 w-full rounded-full bg-[var(--bg2)] overflow-hidden">
            <div
              className="h-full bg-[var(--brand)] transition-all duration-100"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={percentage}
            onChange={(e) => onValueChange(Number(e.target.value) / 100)}
            className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
            aria-label={`${label} sampling rate`}
          />
        </div>

        {/* Quick Presets & Impact description */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-[var(--text3)] truncate max-w-[240px]" title={impact}>
            {impact}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onValueChange(preset / 100)}
                className={cn(
                  'rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors',
                  percentage === preset
                    ? 'bg-[var(--brand)] font-bold text-[var(--brand-fg)]'
                    : 'bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)]'
                )}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-[11px] font-semibold text-[var(--red)]">{error}</p>}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <SectionBanner
        title="Dynamic Sampling Rate Engine"
        definition="Adjust telemetry sampling percentages in real-time to control network egress and cloud spend without restarting running services."
      >
        Signal retention percentages compiled directly into SDK configuration envelopes.
      </SectionBanner>

      {/* Global Ingestion Rates */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="eyebrow flex items-center gap-1.5 text-[var(--text3)]">
            <Gauge className="size-3 text-[var(--brand)]" /> Global Ingestion Rates
          </h3>
          <span className="font-mono text-[11px] text-[var(--text3)]">11 Telemetry Signals</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {SIGNALS.map((signal) => {
            const rawVal = sampling[signal.key] as number;
            const pct = Math.round(rawVal <= 1 ? rawVal * 100 : rawVal);
            return (
              <div key={signal.key}>
                {renderSamplingControl(
                  signal.label,
                  pct,
                  signal.tooltip,
                  signal.impact,
                  (v) => handleGlobalChange(signal.key, v),
                  errorFor(signal.key)
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Route Path Overrides */}
      <div className="flex flex-col gap-4 border-t border-[var(--border)] pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
          <div>
            <h3 className="eyebrow flex items-center gap-1.5 text-[var(--text3)]">
              <Route className="size-3 text-[var(--blue)]" /> Route Path Sampling Overrides
            </h3>
            <p className="mt-0.5 text-xs text-[var(--text3)]">
              Apply dedicated sampling rates for high-frequency or mission-critical URL patterns.
            </p>
          </div>
        </div>

        {/* Add Route Form */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newRoutePath}
            onChange={(e) => setNewRoutePath(e.target.value)}
            placeholder="e.g. /api/checkout or /healthz"
            className="h-8.5 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg1)] px-3 text-[12.5px] font-mono text-[var(--text)] outline-none focus:border-[var(--brand)]"
          />
          <Button
            type="button"
            variant="ghost"
            onClick={addRouteOverride}
            disabled={!newRoutePath.trim() || !!sampling.routes[newRoutePath.trim()]}
            className="h-8.5 gap-1.5 border border-[var(--border)] bg-[var(--bg2)] px-3 text-xs font-semibold text-[var(--text)] hover:bg-[var(--bg3)]"
          >
            <Plus className="size-3.5" />
            Add Override
          </Button>
        </div>

        {/* Route Overrides List */}
        <div className="flex flex-col gap-4">
          {Object.entries(sampling.routes || {}).map(([routePath, signals]) => (
            <div
              key={routePath}
              className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4.5"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <span className="font-mono text-xs font-bold text-[var(--brand)]">{routePath}</span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeRouteOverride(routePath)}
                  className="h-7 gap-1 px-2 text-xs text-[var(--red)] hover:bg-[var(--red-bg)] hover:text-[var(--red)]"
                >
                  <Trash2 className="size-3" />
                  Remove
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {SIGNALS.slice(0, 4).map((signal) => {
                  const val = signals[signal.key] ?? sampling[signal.key];
                  const pct = Math.round((val as number) * 100);
                  return (
                    <div key={signal.key}>
                      {renderSamplingControl(
                        signal.label,
                        pct,
                        signal.tooltip,
                        signal.impact,
                        (v) => handleRouteChange(routePath, signal.key, v)
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {Object.keys(sampling.routes || {}).length === 0 && (
            <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--bg1)]/40 p-6 text-center text-xs text-[var(--text3)]">
              No specific route overrides defined. All traffic adheres to global ingestion rates above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
