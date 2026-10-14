import { useId } from 'react';

import { Panel, Toggle, fieldMonoClass } from '@/shared/ui/pulse';
import { cn } from '@/lib/utils';

import { SectionBanner, FieldTooltip } from '../components/HelpSystem';
import { NumberField } from '../components/NumberField';
import type { SdkConfigState } from '../schema';
import { BOUNDS, type FieldError } from '../bounds';

interface LimitsTabProps {
  limits: SdkConfigState['limits'];
  onChange: (key: keyof Omit<SdkConfigState['limits'], 'tenantGovernance'>, value: number | 'auto') => void;
  onChangeTenant: (key: keyof SdkConfigState['limits']['tenantGovernance'], value: number | boolean) => void;
  errors: FieldError[];
}

/** Fixed ceiling used when switching away from automatic sizing. */
const DEFAULT_MEMORY_MB = 256;

const ERROR_INPUT = 'border-[var(--red)]/60 hover:border-[var(--red)] focus:border-[var(--red)] focus:ring-[var(--red-bg)]';

export function LimitsTab({ limits, onChange, onChangeTenant, errors }: LimitsTabProps) {
  const errorFor = (path: string) => errors.find((e) => e.path === path)?.message;
  const isAutoMemory = limits.maxMemoryMb === 'auto';
  const memoryBound = BOUNDS['limits.maxMemoryMb'];
  const memoryError = errorFor('limits.maxMemoryMb');
  const memoryId = useId();
  const autoId = useId();
  const tenantEnabled = limits.tenantGovernance.enabled;

  return (
    <div className="flex flex-col gap-6">
      <SectionBanner
        title="Limits"
        definition="Hard boundaries that prevent memory exhaustion and buffer overflows. The backend rejects values outside the allowed ranges."
      >
        Caps for in-memory queues, payload sizes, and per-tenant quotas.
      </SectionBanner>

      <Panel title="In-memory caps" description="Safety buffers the SDK enforces inside each process.">
        <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField
            label="Max spans per trace"
            value={limits.maxSpansPerTrace}
            onChange={(v) => onChange('maxSpansPerTrace', v)}
            bound={BOUNDS['limits.maxSpansPerTrace']}
            error={errorFor('limits.maxSpansPerTrace')}
          />
          <NumberField
            label="Max span attributes"
            value={limits.maxSpanAttributes}
            onChange={(v) => onChange('maxSpanAttributes', v)}
            bound={BOUNDS['limits.maxSpanAttributes']}
            error={errorFor('limits.maxSpanAttributes')}
          />
          <NumberField
            label="Max attribute length"
            value={limits.maxAttributeLength}
            onChange={(v) => onChange('maxAttributeLength', v)}
            bound={BOUNDS['limits.maxAttributeLength']}
            suffix="chars"
            error={errorFor('limits.maxAttributeLength')}
          />
          <NumberField
            label="Max payload size"
            value={limits.maxPayloadSize}
            onChange={(v) => onChange('maxPayloadSize', v)}
            bound={BOUNDS['limits.maxPayloadSize']}
            suffix="bytes"
            error={errorFor('limits.maxPayloadSize')}
          />
          <NumberField
            label="Max in-memory queue"
            value={limits.maxQueueSize}
            onChange={(v) => onChange('maxQueueSize', v)}
            bound={BOUNDS['limits.maxQueueSize']}
            suffix="items"
            error={errorFor('limits.maxQueueSize')}
          />

          {/* Same geometry as a NumberField; the hint row carries the auto switch. */}
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <label htmlFor={memoryId} className="min-w-0 text-[13px] font-medium text-[var(--text2)]">
                Process memory ceiling
                <span className="sr-only"> (MB)</span>
              </label>
              <FieldTooltip
                label="Process memory ceiling"
                definition="Maximum heap memory the SDK telemetry buffers may use before dropping non-critical events."
                recommendation={`Allowed: ${memoryBound.min}–${memoryBound.max} MB, or automatic sizing.`}
              />
            </div>
            <div className="relative">
              <input
                id={memoryId}
                type="number"
                disabled={isAutoMemory}
                value={isAutoMemory ? '' : limits.maxMemoryMb}
                placeholder={isAutoMemory ? 'Auto' : undefined}
                onChange={(e) => onChange('maxMemoryMb', Number(e.target.value))}
                min={memoryBound.min}
                max={memoryBound.max}
                step={1}
                aria-invalid={memoryError ? true : undefined}
                aria-describedby={memoryError ? `${memoryId}-error` : undefined}
                className={cn(fieldMonoClass, 'pr-12 tabular-nums', memoryError && ERROR_INPUT)}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]"
              >
                MB
              </span>
            </div>
            <div className="flex min-h-[18px] items-center gap-2">
              <Toggle
                id={autoId}
                checked={isAutoMemory}
                onChange={(next) => onChange('maxMemoryMb', next ? 'auto' : DEFAULT_MEMORY_MB)}
                label="Auto memory ceiling"
              />
              <label htmlFor={autoId} className="cursor-pointer text-[12px] text-[var(--text2)]">
                Auto
              </label>
              {!isAutoMemory && (
                <span className="ml-auto font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text3)]">
                  {memoryBound.min.toLocaleString()}–{memoryBound.max.toLocaleString()}
                </span>
              )}
            </div>
            {memoryError && (
              <p id={`${memoryId}-error`} role="alert" className="text-[12px] leading-[1.5] text-[var(--red)]">
                {memoryError}
              </p>
            )}
          </div>
        </div>
      </Panel>

      <Panel
        title="Tenant fairness"
        description={
          tenantEnabled
            ? 'Per-tenant quotas so one noisy tenant cannot use up the shared buffers.'
            : 'Off. Turn it on to enforce per-tenant quotas so one noisy tenant cannot use up the shared buffers.'
        }
        actions={
          <Toggle
            checked={tenantEnabled}
            onChange={(next) => onChangeTenant('enabled', next)}
            label="Enforce tenant quotas"
          />
        }
      >
        {/* A disabled fieldset disables every input inside it, including for keyboard users. */}
        <fieldset
          disabled={!tenantEnabled}
          className="m-0 grid min-w-0 gap-x-5 gap-y-5 border-0 p-0 transition-opacity duration-150 disabled:opacity-60 sm:grid-cols-2 lg:grid-cols-4"
        >
          <legend className="sr-only">Tenant quota limits</legend>
          <NumberField
            label="Max tenants tracked"
            value={limits.tenantGovernance.maxTenantsTracked}
            onChange={(v) => onChangeTenant('maxTenantsTracked', v)}
            bound={BOUNDS['tenant.maxTenantsTracked']}
            error={errorFor('limits.tenantGovernance.maxTenantsTracked')}
          />
          <NumberField
            label="Quota per window"
            value={limits.tenantGovernance.quotaPerWindow}
            onChange={(v) => onChangeTenant('quotaPerWindow', v)}
            bound={BOUNDS['tenant.quotaPerWindow']}
            suffix="events"
            error={errorFor('limits.tenantGovernance.quotaPerWindow')}
          />
          <NumberField
            label="Window duration"
            value={limits.tenantGovernance.windowDurationMs}
            onChange={(v) => onChangeTenant('windowDurationMs', v)}
            bound={BOUNDS['tenant.windowDurationMs']}
            suffix="ms"
            error={errorFor('limits.tenantGovernance.windowDurationMs')}
          />
          <NumberField
            label="Critical reserve"
            value={limits.tenantGovernance.criticalReserve}
            onChange={(v) => onChangeTenant('criticalReserve', v)}
            bound={BOUNDS['tenant.criticalReserve']}
            suffix="events"
            error={errorFor('limits.tenantGovernance.criticalReserve')}
          />
        </fieldset>
      </Panel>
    </div>
  );
}
