import { useId, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Panel, RowStack, fieldMonoClass } from '@/shared/ui/pulse';
import { Button as UiButton } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { SectionBanner, FieldTooltip } from '../components/HelpSystem';
import type { SdkConfigState, SamplingSignal } from '../schema';
import type { FieldError } from '../bounds';

type SamplingState = SdkConfigState['sampling'];

interface SamplingTabProps {
  sampling: SamplingState;
  onChange: <K extends keyof SamplingState>(key: K, value: SamplingState[K]) => void;
  errors: FieldError[];
}

interface SignalDef {
  key: SamplingSignal;
  label: string;
  tooltip: string;
  impact: string;
}

const SIGNALS: SignalDef[] = [
  { key: 'errors', label: 'Errors', tooltip: 'Percentage of caught error events shipped.', impact: 'Lowering this can hide rare bugs.' },
  { key: 'traces', label: 'Traces', tooltip: 'Percentage of requests that start distributed traces.', impact: 'Higher rates add tracing depth and ingestion egress.' },
  { key: 'spans', label: 'Spans', tooltip: 'Percentage of nested spans retained.', impact: 'Controls the granularity of flame graphs.' },
  { key: 'requests', label: 'Requests', tooltip: 'Percentage of HTTP request telemetry captured.', impact: 'Bandwidth scales directly with request volume.' },
  { key: 'metrics', label: 'Metrics', tooltip: 'Percentage of runtime metric data points emitted.', impact: 'Controls time-series frequency.' },
  { key: 'logs', label: 'Logs', tooltip: 'Percentage of log statements sent to centralized storage.', impact: 'High log rates add significant network transfer.' },
  { key: 'events', label: 'Events', tooltip: 'Percentage of custom business events tracked.', impact: 'Affects conversion funnels and product analytics.' },
  { key: 'messages', label: 'Messages', tooltip: 'Percentage of message queue telemetry retained.', impact: 'Controls broker and queue observability.' },
  { key: 'profiles', label: 'Profiles', tooltip: 'Percentage of requests that trigger CPU and memory profiles.', impact: 'Profiling adds process overhead. Keep at or below 20% in production.' },
  { key: 'replays', label: 'Session replays', tooltip: 'Percentage of user sessions recorded.', impact: 'High data transfer. Recommended: 10–25%.' },
  { key: 'crons', label: 'Cron check-ins', tooltip: 'Percentage of scheduled job executions tracked.', impact: 'Keep at 100% to avoid false missed check-in alerts.' },
];

/** Route overrides edit the signals most often tuned per route. */
const ROUTE_SIGNALS = SIGNALS.slice(0, 4);

/** Tick marks on every slider. */
const PRESETS = [0, 10, 25, 50, 100];

const ERROR_INPUT = 'border-[var(--red)]/60 hover:border-[var(--red)] focus:border-[var(--red)] focus:ring-[var(--red-bg)]';

const clampRate = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

/** Slider plus exact percentage input, both editing a 0–1 rate. */
function RateControl({
  label,
  percent,
  onChange,
  presetsId,
  invalid,
}: {
  label: string;
  percent: number;
  onChange: (rate: number) => void;
  presetsId: string;
  invalid?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        list={presetsId}
        value={percent}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        aria-label={`${label} sampling rate`}
        aria-valuetext={`${percent}%`}
        className="w-full min-w-[120px] cursor-pointer accent-[var(--text)] sm:w-44"
      />
      <div className="relative w-[84px] shrink-0">
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={percent}
          onChange={(event) => onChange(Number(event.target.value) / 100)}
          aria-label={`${label} sampling rate in percent`}
          aria-invalid={invalid ? true : undefined}
          className={cn(fieldMonoClass, 'pr-7 text-right tabular-nums', invalid && ERROR_INPUT)}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]"
        >
          %
        </span>
      </div>
    </div>
  );
}

function SignalRow({
  signal,
  percent,
  onChange,
  presetsId,
  error,
  note,
}: {
  signal: SignalDef;
  percent: number;
  onChange: (rate: number) => void;
  presetsId: string;
  error?: string;
  /** Quiet trailing note on the label line, e.g. that a route inherits the global rate. */
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="text-[13px] font-medium text-[var(--text)]">{signal.label}</span>
          <FieldTooltip label={signal.label} definition={signal.tooltip} />
          {note && <span className="text-[12px] text-[var(--text3)]">· {note}</span>}
        </div>
        <p className="mt-0.5 text-[12px] leading-[1.5] text-[var(--text2)]">{signal.impact}</p>
        {error && (
          <p role="alert" className="mt-1 text-[12px] leading-[1.5] text-[var(--red)]">
            {error}
          </p>
        )}
      </div>
      <RateControl label={signal.label} percent={percent} onChange={onChange} presetsId={presetsId} invalid={Boolean(error)} />
    </div>
  );
}

export function SamplingTab({ sampling, onChange, errors }: SamplingTabProps) {
  const [newRoutePath, setNewRoutePath] = useState('');
  const presetsId = useId();
  const routeInputId = useId();
  const errorFor = (key: string) => errors.find((e) => e.path === `sampling.${key}`)?.message;

  const routes = sampling.routes ?? {};
  const routeEntries = Object.entries(routes);
  const trimmedPath = newRoutePath.trim();
  const routeExists = Boolean(trimmedPath && routes[trimmedPath]);

  const handleGlobalChange = (key: SamplingSignal, value: number) => onChange(key, clampRate(value));

  // Copy the override being edited too. Mutating it in place would also change
  // the published baseline, so the edit would never show up as a change.
  const handleRouteChange = (routePath: string, key: SamplingSignal, value: number) => {
    onChange('routes', {
      ...routes,
      [routePath]: { ...routes[routePath], [key]: clampRate(value) },
    });
  };

  const addRouteOverride = (event: React.FormEvent) => {
    event.preventDefault();
    if (!trimmedPath || routeExists) return;
    onChange('routes', { ...routes, [trimmedPath]: { traces: 1, errors: 1 } });
    setNewRoutePath('');
  };

  const removeRouteOverride = (routePath: string) => {
    const next = { ...routes };
    delete next[routePath];
    onChange('routes', next);
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionBanner
        title="Sampling"
        definition="Change sampling rates without restarting services, to control network egress and ingestion cost."
      >
        Per-signal rates are compiled into the SDK configuration.
      </SectionBanner>

      <datalist id={presetsId}>
        {PRESETS.map((preset) => (
          <option key={preset} value={preset} label={`${preset}%`} />
        ))}
      </datalist>

      <Panel
        title="Global rates"
        description="Share of each signal the SDK keeps. 100% keeps everything and 0% drops the signal."
        bodyClassName="p-0"
      >
        <RowStack>
          {SIGNALS.map((signal) => {
            const rawVal = sampling[signal.key];
            const percent = Math.round(rawVal <= 1 ? rawVal * 100 : rawVal);
            return (
              <SignalRow
                key={signal.key}
                signal={signal}
                percent={percent}
                onChange={(value) => handleGlobalChange(signal.key, value)}
                presetsId={presetsId}
                error={errorFor(signal.key)}
              />
            );
          })}
        </RowStack>
      </Panel>

      <Panel
        title="Route overrides"
        description="Dedicated rates for high-traffic or critical URL patterns. Other routes use the global rates."
        bodyClassName="p-0"
      >
        <form onSubmit={addRouteOverride} className="flex flex-col gap-1.5 border-b border-[var(--border)] px-5 py-4">
          <label htmlFor={routeInputId} className="text-[13px] font-medium text-[var(--text2)]">
            Route path
          </label>
          <div className="flex gap-2">
            <input
              id={routeInputId}
              type="text"
              value={newRoutePath}
              onChange={(e) => setNewRoutePath(e.target.value)}
              placeholder="/api/checkout"
              autoComplete="off"
              spellCheck={false}
              aria-describedby={routeExists ? `${routeInputId}-note` : undefined}
              className={cn(fieldMonoClass, 'min-w-0 flex-1')}
            />
            <UiButton type="submit" variant="outline" className="h-9" disabled={!trimmedPath || routeExists}>
              <Plus className="size-3.5" aria-hidden="true" />
              Add override
            </UiButton>
          </div>
          {routeExists && (
            <p id={`${routeInputId}-note`} role="status" className="text-[12px] text-[var(--text3)]">
              This route already has an override.
            </p>
          )}
        </form>

        {routeEntries.length === 0 ? (
          <p className="px-5 py-6 text-[13px] leading-[1.6] text-[var(--text2)]">
            No route overrides. All traffic uses the global rates.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {routeEntries.map(([routePath, signals]) => (
              <section key={routePath} aria-label={`Override for ${routePath}`}>
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg2)]/40 px-5 py-2">
                  <code className="min-w-0 truncate font-[family-name:var(--mono)] text-[12.5px] text-[var(--text)]">{routePath}</code>
                  <UiButton
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRouteOverride(routePath)}
                    aria-label={`Remove override for ${routePath}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Remove
                  </UiButton>
                </div>
                <RowStack>
                  {ROUTE_SIGNALS.map((signal) => {
                    const own = signals[signal.key];
                    const value = own ?? sampling[signal.key];
                    return (
                      <SignalRow
                        key={signal.key}
                        signal={signal}
                        percent={Math.round(value * 100)}
                        onChange={(next) => handleRouteChange(routePath, signal.key, next)}
                        presetsId={presetsId}
                        error={errorFor(`routes.${routePath}.${signal.key}`)}
                        note={own === undefined ? 'Uses the global rate' : undefined}
                      />
                    );
                  })}
                </RowStack>
              </section>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
