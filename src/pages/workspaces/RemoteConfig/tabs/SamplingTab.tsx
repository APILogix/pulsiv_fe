import { useState } from 'react';
import { SectionBanner, FieldTooltip } from '../components/HelpSystem';
import type { SdkConfigState, SamplingSignal } from '../schema';
import type { FieldError } from '../bounds';
import { Button } from '@/shared/observe';
import { Plus, Trash2, Gauge, Route } from 'lucide-react';

const inputClass =
  'w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-[13px] text-[var(--text)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] font-mono';

interface SamplingTabProps {
  sampling: SdkConfigState['sampling'];
  onChange: (key: keyof SdkConfigState['sampling'], value: any) => void;
  errors: FieldError[];
}

const SIGNALS = [
  { key: 'errors' as const, label: 'Errors', tooltip: 'Percentage of error events sent.' },
  { key: 'traces' as const, label: 'Traces', tooltip: 'Percentage of requests generating full trace trees.' },
  { key: 'spans' as const, label: 'Spans', tooltip: 'Percentage of individual spans emitted.' },
  { key: 'requests' as const, label: 'Requests', tooltip: 'Percentage of HTTP request metadata captured.' },
  { key: 'metrics' as const, label: 'Metrics', tooltip: 'Percentage of metric data points sent.' },
  { key: 'logs' as const, label: 'Logs', tooltip: 'Percentage of log entries shipped.' },
  { key: 'events' as const, label: 'Events', tooltip: 'Percentage of custom events sent.' },
  { key: 'messages' as const, label: 'Messages', tooltip: 'Percentage of message events sent.' },
  { key: 'profiles' as const, label: 'Profiles', tooltip: 'Percentage of requests triggering CPU profiles.' },
  { key: 'replays' as const, label: 'Session Replays', tooltip: 'Percentage of user sessions recorded.' },
  { key: 'crons' as const, label: 'Cron Check-ins', tooltip: 'Percentage of scheduled job check-ins sampled.' },
];

export function SamplingTab({ sampling, onChange, errors }: SamplingTabProps) {
  const errorFor = (key: string) => errors.find((e) => e.path === `sampling.${key}`)?.message;
  const [newRoutePath, setNewRoutePath] = useState('');

  const handleGlobalChange = (key: SamplingSignal, value: number) => {
    onChange(key, value);
  };

  const handleRouteChange = (routePath: string, key: SamplingSignal, value: number) => {
    const updatedRoutes = { ...sampling.routes };
    if (!updatedRoutes[routePath]) updatedRoutes[routePath] = {};
    updatedRoutes[routePath][key] = value;
    onChange('routes', updatedRoutes);
  };

  const addRouteOverride = () => {
    if (!newRoutePath.trim() || sampling.routes[newRoutePath.trim()]) return;
    const updatedRoutes = { ...sampling.routes };
    updatedRoutes[newRoutePath.trim()] = { traces: 1, errors: 1 };
    onChange('routes', updatedRoutes);
    setNewRoutePath('');
  };

  const removeRouteOverride = (routePath: string) => {
    const updatedRoutes = { ...sampling.routes };
    delete updatedRoutes[routePath];
    onChange('routes', updatedRoutes);
  };

  const Slider = ({ value, onChangeVal, label, tooltip, error }: any) => {
    return (
      <div className="flex flex-col gap-1 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg2)]/40 p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="font-bold text-[13px] text-[var(--text)]">{label}</label>
            <FieldTooltip definition={tooltip} recommendation="Rate sent to SDK between 0 and 1." />
          </div>
          <div className="font-mono text-[14px] font-extrabold text-[var(--brand)]">{value}%</div>
        </div>

        <div className="relative flex items-center mt-1">
          <div className="h-2 w-full rounded-full bg-[var(--bg3)] overflow-hidden">
            <div className="h-full bg-[var(--brand)] transition-all duration-150" style={{ width: `${value}%` }} />
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={value}
            onChange={(e) => onChangeVal(Number(e.target.value) / 100)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        {error && <p className="text-[11px] text-[var(--red)] font-semibold">{error}</p>}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <SectionBanner
        title="Dynamic Sampling Engine"
        definition="Adjust telemetry sampling rates in real-time to control ingestion volume and optimize cloud spend without redeploying code."
      >
        Edge sampling controls for all telemetry types.
      </SectionBanner>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text3)] flex items-center gap-2">
            <Gauge className="size-3.5 text-[var(--brand)]" /> Global Ingestion Rates
          </h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SIGNALS.map((signal) => (
            <Slider
              key={signal.key}
              value={Math.round((sampling[signal.key] as number) * 100)}
              onChangeVal={(v: number) => handleGlobalChange(signal.key, v)}
              label={signal.label}
              tooltip={signal.tooltip}
              error={errorFor(signal.key)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 flex flex-col gap-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text3)] flex items-center gap-2">
          <Route className="size-3.5 text-[var(--blue)]" /> Route Path Overrides
        </h3>

        <div className="flex flex-col gap-4">
          {Object.entries(sampling.routes || {}).map(([routePath, signals]) => (
            <div key={routePath} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg2)]/60 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="font-mono text-xs font-bold text-[var(--brand)]">{routePath}</div>
                <Button variant="ghost" className="h-7 px-2 text-xs text-[var(--red)] hover:text-[var(--red)]" onClick={() => removeRouteOverride(routePath)}>
                  <Trash2 className="size-3.5 mr-1" /> Remove
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {SIGNALS.map((signal) => {
                  const val = signals[signal.key];
                  if (val === undefined) return null;
                  return (
                    <Slider
                      key={signal.key}
                      value={Math.round(val * 100)}
                      onChangeVal={(v: number) => handleRouteChange(routePath, signal.key, v)}
                      label={signal.label}
                      tooltip={`Override ${signal.label.toLowerCase()} for ${routePath}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2">
            <input
              placeholder="e.g. /api/v1/checkout"
              className={inputClass}
              value={newRoutePath}
              onChange={(e) => setNewRoutePath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addRouteOverride()}
            />
            <Button onClick={addRouteOverride} disabled={!newRoutePath.trim()} className="shrink-0 text-xs gap-1.5 border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] hover:bg-[var(--bg3)]">
              <Plus className="size-3.5" /> Add Route Override
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
