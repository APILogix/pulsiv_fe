import { SectionBanner, FieldTooltip } from '../components/HelpSystem';
import { NumberField } from '../components/NumberField';
import type { SdkConfigState } from '../schema';
import { BOUNDS, type FieldError } from '../bounds';
import { Switch } from '@/components/ui/switch';
import { Sliders, Building2, HardDrive, Shield } from 'lucide-react';
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      <SectionBanner
        title="Resource Caps & Governance Limits"
        definition="Hard boundaries preventing memory exhaustion or ingestion buffer overflows. Values outside valid client ranges will be rejected by the backend validator."
      >
        Guardrails for in-memory queue sizes, payload ceilings, and multi-tenant quotas.
      </SectionBanner>

      {/* Telemetry Resource Caps */}
      <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5">
          <div className="flex items-center gap-2">
            <Sliders className="size-4 text-[var(--brand)]" />
            <h3 className="font-semibold text-[13.5px] text-[var(--text)]">Telemetry In-Memory Caps</h3>
          </div>
          <span className="font-mono text-[10px] text-[var(--text3)] uppercase">Safety Buffers</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField
            label="Max Spans per Trace"
            value={limits.maxSpansPerTrace}
            onChange={(v) => onChange('maxSpansPerTrace', v)}
            bound={BOUNDS['limits.maxSpansPerTrace']}
            error={errorFor('limits.maxSpansPerTrace')}
          />
          <NumberField
            label="Max Span Attributes"
            value={limits.maxSpanAttributes}
            onChange={(v) => onChange('maxSpanAttributes', v)}
            bound={BOUNDS['limits.maxSpanAttributes']}
            error={errorFor('limits.maxSpanAttributes')}
          />
          <NumberField
            label="Max Attribute Length"
            value={limits.maxAttributeLength}
            onChange={(v) => onChange('maxAttributeLength', v)}
            bound={BOUNDS['limits.maxAttributeLength']}
            suffix="chars"
            error={errorFor('limits.maxAttributeLength')}
          />
          <NumberField
            label="Max Payload Size"
            value={limits.maxPayloadSize}
            onChange={(v) => onChange('maxPayloadSize', v)}
            bound={BOUNDS['limits.maxPayloadSize']}
            suffix="bytes"
            error={errorFor('limits.maxPayloadSize')}
          />
          <NumberField
            label="Max In-Memory Queue"
            value={limits.maxQueueSize}
            onChange={(v) => onChange('maxQueueSize', v)}
            bound={BOUNDS['limits.maxQueueSize']}
            suffix="items"
            error={errorFor('limits.maxQueueSize')}
          />

          {/* Memory Ceiling with Auto Toggle */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-semibold text-[var(--text2)]">Process Memory Ceiling</label>
              <FieldTooltip definition="Maximum heap memory the SDK telemetry buffers may occupy before dropping non-critical events." />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange('maxMemoryMb', isAutoMemory ? 256 : 'auto')}
                className={cn(
                  'h-8.5 rounded-[var(--radius)] border px-3 text-[12px] font-bold transition-all',
                  isAutoMemory
                    ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-fg)]'
                    : 'border-[var(--border)] bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)]'
                )}
              >
                Auto
              </button>
              <input
                type="number"
                disabled={isAutoMemory}
                value={isAutoMemory ? '' : limits.maxMemoryMb}
                placeholder={isAutoMemory ? 'Dynamic' : undefined}
                onChange={(e) => onChange('maxMemoryMb', Number(e.target.value))}
                min={BOUNDS['limits.maxMemoryMb'].min}
                max={BOUNDS['limits.maxMemoryMb'].max}
                className="h-8.5 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-3 font-mono text-[12.5px] text-[var(--text)] outline-none focus:border-[var(--brand)] disabled:opacity-40"
              />
              <span className="font-mono text-xs text-[var(--text3)]">MB</span>
            </div>
            {errorFor('limits.maxMemoryMb') && (
              <p className="text-[11px] font-semibold text-[var(--red)]">{errorFor('limits.maxMemoryMb')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Tenant Fairness Governance */}
      <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-[var(--blue)]" />
            <h3 className="font-semibold text-[13.5px] text-[var(--text)]">Multi-Tenant Fairness Governance</h3>
          </div>
          <Switch
            checked={limits.tenantGovernance.enabled}
            onCheckedChange={(val) => onChangeTenant('enabled', val)}
            aria-label="Toggle tenant governance"
          />
        </div>

        <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4 transition-opacity', !limits.tenantGovernance.enabled && 'opacity-40 pointer-events-none')}>
          <NumberField
            label="Max Tenants Tracked"
            value={limits.tenantGovernance.maxTenantsTracked}
            onChange={(v) => onChangeTenant('maxTenantsTracked', v)}
            bound={BOUNDS['tenant.maxTenantsTracked']}
            error={errorFor('limits.tenantGovernance.maxTenantsTracked')}
          />
          <NumberField
            label="Quota per Window"
            value={limits.tenantGovernance.quotaPerWindow}
            onChange={(v) => onChangeTenant('quotaPerWindow', v)}
            bound={BOUNDS['tenant.quotaPerWindow']}
            suffix="events"
            error={errorFor('limits.tenantGovernance.quotaPerWindow')}
          />
          <NumberField
            label="Window Duration"
            value={limits.tenantGovernance.windowDurationMs}
            onChange={(v) => onChangeTenant('windowDurationMs', v)}
            bound={BOUNDS['tenant.windowDurationMs']}
            suffix="ms"
            error={errorFor('limits.tenantGovernance.windowDurationMs')}
          />
          <NumberField
            label="Critical Reserve"
            value={limits.tenantGovernance.criticalReserve}
            onChange={(v) => onChangeTenant('criticalReserve', v)}
            bound={BOUNDS['tenant.criticalReserve']}
            suffix="events"
            error={errorFor('limits.tenantGovernance.criticalReserve')}
          />
        </div>
      </div>
    </div>
  );
}
