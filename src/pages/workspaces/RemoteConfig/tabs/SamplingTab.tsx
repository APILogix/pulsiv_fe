import { useState } from 'react';
import { SectionBanner, FieldTooltip } from '../components/HelpSystem';
import type { SdkConfigState, SamplingSignal } from '../schema';
import type { FieldError } from '../bounds';
import { Button, inputClass } from '@/shared/observe';
import { Plus, Trash2 } from 'lucide-react';

interface SamplingTabProps {
  sampling: SdkConfigState['sampling'];
  onChange: (key: keyof SdkConfigState['sampling'], value: any) => void;
  errors: FieldError[];
}

const SIGNALS = [
  { key: 'errors' as const, label: 'Errors', tooltip: 'Percentage of error events sent. Lower only if error volume is overwhelming your quota.' },
  { key: 'traces' as const, label: 'Traces', tooltip: 'Percentage of requests that generate a full trace. Consider 10–50% for high-traffic services.' },
  { key: 'spans' as const, label: 'Spans', tooltip: 'Percentage of individual spans emitted independently of trace aggregation.' },
  { key: 'requests' as const, label: 'Requests', tooltip: 'Percentage of HTTP requests whose metadata is captured.' },
  { key: 'metrics' as const, label: 'Metrics', tooltip: 'Percentage of metric data points sent. Usually keep at 100%.' },
  { key: 'logs' as const, label: 'Logs', tooltip: 'Percentage of log entries shipped to Pulse.' },
  { key: 'events' as const, label: 'Events', tooltip: 'Percentage of custom/captured message events sent.' },
  { key: 'messages' as const, label: 'Messages', tooltip: 'Percentage of message-family events sent.' },
  { key: 'profiles' as const, label: 'Profiles', tooltip: 'Percentage of requests that trigger a CPU/memory profile. Profiling is expensive — keep low.' },
  { key: 'replays' as const, label: 'Session Replays', tooltip: 'Percentage of user sessions recorded. Storage-heavy — 10% is typical for production.' },
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
    updatedRoutes[newRoutePath.trim()] = { traces: 1, errors: 1 }; // Default signals to override
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
      <div>
        <div className="flex items-center gap-4">
          <div className="flex w-[170px] shrink-0 items-center">
            <label className="font-medium text-[14px] text-[var(--text)]">{label}</label>
            <FieldTooltip definition={tooltip} recommendation="Sent to the backend as a rate 0–1." />
          </div>
          <div className="relative flex-1 group">
            <div className="absolute top-1/2 left-0 h-1.5 w-full -translate-y-1/2 rounded-full bg-[var(--bg3)] overflow-hidden">
              <div className="h-full bg-[var(--brand)] transition-all duration-150 ease-out" style={{ width: `${value}%` }} />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={value}
              onChange={(e) => onChangeVal(Number(e.target.value) / 100)}
              className="relative z-10 h-6 w-full cursor-pointer opacity-0"
            />
            <div
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full border-[2px] border-[var(--brand)] bg-[var(--bg1)] shadow-[0_0_8px_rgba(99,102,241,0.4)] transition-all duration-150 ease-out group-hover:scale-110"
              style={{ left: `${value}%` }}
            />
          </div>
          <div className="w-[60px] shrink-0 text-right font-mono text-[14px] font-semibold text-[var(--brand)]">{value}%</div>
        </div>
        {error && <p className="mt-1 pl-[186px] text-[11px] text-red-500">{error}</p>}
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-300 flex flex-col gap-6">
      <SectionBanner
        title="Dynamic Sampling"
        definition="Sampling reduces the volume of data sent by the SDK by randomly dropping a percentage of events. Every signal below is required by the backend contract and always sent as a rate between 0 and 1."
      >
        Adjust data volumes at the edge before they hit the network.
      </SectionBanner>

      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-[var(--text)] uppercase tracking-wide">Global Sampling Rates</h3>
        <div className="flex flex-col gap-6">
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

      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-[var(--text)] uppercase tracking-wide">Route-Specific Sampling Overrides</h3>
        <p className="mb-4 text-[13px] text-[var(--text3)]">Override sampling rates for specific route paths (e.g., <code className="text-xs bg-[var(--bg2)] px-1 py-0.5 rounded">/api/health</code>).</p>

        <div className="flex flex-col gap-6">
          {Object.entries(sampling.routes || {}).map(([routePath, signals]) => (
            <div key={routePath} className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="font-mono text-sm font-semibold text-[var(--text)]">{routePath}</div>
                <Button
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => removeRouteOverride(routePath)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="flex flex-col gap-4 pl-2">
                {SIGNALS.map((signal) => {
                  const val = signals[signal.key];
                  if (val === undefined) return null;
                  return (
                    <Slider
                      key={signal.key}
                      value={Math.round(val * 100)}
                      onChangeVal={(v: number) => handleRouteChange(routePath, signal.key, v)}
                      label={signal.label}
                      tooltip={`Override ${signal.label.toLowerCase()} rate for ${routePath}`}
                      error={errors.find((e) => e.path === `sampling.routes.${routePath}.${signal.key}`)?.message}
                    />
                  );
                })}
                <div className="mt-2 text-[12px] text-[var(--text3)] flex flex-wrap gap-2">
                  <span className="mr-2 pt-1 font-medium">Add override:</span>
                  {SIGNALS.filter(s => signals[s.key] === undefined).map(signal => (
                    <button
                      key={signal.key}
                      onClick={() => handleRouteChange(routePath, signal.key, 1)}
                      className="rounded bg-[var(--bg3)] px-2 py-1 hover:bg-[var(--brand)] hover:text-white transition-colors"
                    >
                      + {signal.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3">
            <input
              placeholder="e.g. /api/health"
              className={inputClass}
              value={newRoutePath}
              onChange={(e) => setNewRoutePath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addRouteOverride()}
            />
            <Button onClick={addRouteOverride} disabled={!newRoutePath.trim()} className="shrink-0 bg-[var(--bg2)] hover:bg-[var(--bg3)] border border-[var(--border)]">
              <Plus className="mr-1.5 size-4" /> Add Route
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
