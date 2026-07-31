import { SectionBanner, FieldTooltip } from '../components/HelpSystem';
import { NumberField } from '../components/NumberField';
import type { SdkConfigState } from '../schema';
import { BOUNDS, type FieldError } from '../bounds';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface LimitsTabProps {
  limits: SdkConfigState['limits'];
  onChange: (key: keyof Omit<SdkConfigState['limits'], 'tenantGovernance'>, value: number | 'auto') => void;
  onChangeTenant: (key: keyof SdkConfigState['limits']['tenantGovernance'], value: number | boolean) => void;
  errors: FieldError[];
}

export function LimitsTab({ limits, onChange, onChangeTenant, errors }: LimitsTabProps) {
  const errorFor = (path: string) => errors.find((e) => e.path === path)?.message;
  const isAutoMemory = limits.maxMemoryMb === 'auto';

  return (
    <div className="animate-in fade-in duration-300">
      <SectionBanner title="Limits" type="warning">
        These caps protect your application from resource exhaustion and the ingestion pipeline from abuse. They are fully
        editable within the ranges shown, but the backend rejects any value outside its documented bounds.
      </SectionBanner>

      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h3 className="font-semibold text-[var(--text)]">Resource Caps</h3>
        </div>
        <div className="grid gap-6 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField
            label="Max Spans / Trace"
            value={limits.maxSpansPerTrace}
            onChange={(v) => onChange('maxSpansPerTrace', v)}
            bound={BOUNDS['limits.maxSpansPerTrace']}
            tooltip="Maximum spans a single trace may contain before extras are dropped."
            error={errorFor('limits.maxSpansPerTrace')}
          />
          <NumberField
            label="Max Span Attributes"
            value={limits.maxSpanAttributes}
            onChange={(v) => onChange('maxSpanAttributes', v)}
            bound={BOUNDS['limits.maxSpanAttributes']}
            tooltip="Maximum custom attributes attachable to a single span."
            error={errorFor('limits.maxSpanAttributes')}
          />
          <NumberField
            label="Max Attribute Length"
            value={limits.maxAttributeLength}
            onChange={(v) => onChange('maxAttributeLength', v)}
            bound={BOUNDS['limits.maxAttributeLength']}
            tooltip="Maximum character length for any single attribute value. Longer values are truncated."
            suffix="chars"
            error={errorFor('limits.maxAttributeLength')}
          />
          <NumberField
            label="Max Payload Size"
            value={limits.maxPayloadSize}
            onChange={(v) => onChange('maxPayloadSize', v)}
            bound={BOUNDS['limits.maxPayloadSize']}
            tooltip="Maximum size in bytes for a single ingestion payload. Prevents memory-exhaustion attacks."
            suffix="bytes"
            error={errorFor('limits.maxPayloadSize')}
          />
          <NumberField
            label="Max Queue Size"
            value={limits.maxQueueSize}
            onChange={(v) => onChange('maxQueueSize', v)}
            bound={BOUNDS['limits.maxQueueSize']}
            tooltip="Maximum events buffered in memory before sending. Must be ≤ Transport → Queue max size."
            error={errorFor('limits.maxQueueSize')}
          />
          <div>
            <label className="mb-2 flex items-center font-medium text-[13px] text-[var(--text)]">
              Max Memory
              <FieldTooltip definition="Memory ceiling for the SDK's internal buffers. Use 'auto' to let the SDK size itself based on available system memory, or pin an explicit MB value." />
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onChange('maxMemoryMb', isAutoMemory ? 256 : 'auto')}
                className={cn(
                  'flex h-[34px] shrink-0 items-center rounded-[8px] border px-3 text-[13px] font-medium transition-colors',
                  isAutoMemory
                    ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                    : 'border-[var(--border)] bg-[var(--bg2)] text-[var(--text2)] hover:border-[var(--input)]',
                )}
              >
                Auto
              </button>
              <input
                type="number"
                disabled={isAutoMemory}
                value={isAutoMemory ? '' : limits.maxMemoryMb}
                placeholder={isAutoMemory ? 'auto' : undefined}
                onChange={(e) => onChange('maxMemoryMb', Number(e.target.value))}
                min={BOUNDS['limits.maxMemoryMb'].min}
                max={BOUNDS['limits.maxMemoryMb'].max}
                className="w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-[13px] text-[var(--text)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] disabled:opacity-40"
              />
              <span className="shrink-0 text-[12px] text-[var(--text3)]">MB</span>
            </div>
            {errorFor('limits.maxMemoryMb') ? (
              <p className="mt-1 text-[11px] text-red-500">{errorFor('limits.maxMemoryMb')}</p>
            ) : (
              <p className="mt-1 text-[11px] text-[var(--text3)]">
                {isAutoMemory ? "'auto' or " : ''}
                {BOUNDS['limits.maxMemoryMb'].min}–{BOUNDS['limits.maxMemoryMb'].max} MB
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center">
            <h3 className="font-semibold text-[var(--text)]">Tenant Governance</h3>
            <FieldTooltip definition="Per-tenant fairness controls for multi-tenant deployments. When enabled, the SDK tracks per-tenant usage against a rolling quota window." />
          </div>
          <Switch checked={limits.tenantGovernance.enabled} onCheckedChange={(val) => onChangeTenant('enabled', val)} />
        </div>
        <div className={cn('grid gap-6 p-5 sm:grid-cols-2 lg:grid-cols-4 transition-opacity', !limits.tenantGovernance.enabled && 'opacity-50 pointer-events-none')}>
          <NumberField
            label="Max Tenants Tracked"
            value={limits.tenantGovernance.maxTenantsTracked}
            onChange={(v) => onChangeTenant('maxTenantsTracked', v)}
            bound={BOUNDS['tenant.maxTenantsTracked']}
            tooltip="Upper bound on distinct tenant identifiers tracked in memory."
            error={errorFor('limits.tenantGovernance.maxTenantsTracked')}
          />
          <NumberField
            label="Quota / Window"
            value={limits.tenantGovernance.quotaPerWindow}
            onChange={(v) => onChangeTenant('quotaPerWindow', v)}
            bound={BOUNDS['tenant.quotaPerWindow']}
            tooltip="Maximum events a single tenant may emit within one window."
            error={errorFor('limits.tenantGovernance.quotaPerWindow')}
          />
          <NumberField
            label="Window Duration"
            value={limits.tenantGovernance.windowDurationMs}
            onChange={(v) => onChangeTenant('windowDurationMs', v)}
            bound={BOUNDS['tenant.windowDurationMs']}
            tooltip="Length of the rolling quota window."
            suffix="ms"
            error={errorFor('limits.tenantGovernance.windowDurationMs')}
          />
          <NumberField
            label="Critical Reserve"
            value={limits.tenantGovernance.criticalReserve}
            onChange={(v) => onChangeTenant('criticalReserve', v)}
            bound={BOUNDS['tenant.criticalReserve']}
            tooltip="Slots reserved for critical-priority tenants. Must be ≤ Quota / Window."
            error={errorFor('limits.tenantGovernance.criticalReserve')}
          />
        </div>
      </div>
    </div>
  );
}
