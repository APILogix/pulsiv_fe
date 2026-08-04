import { SectionBanner, FieldTooltip } from '../components/HelpSystem';
import { NumberField } from '../components/NumberField';
import type { SdkConfigState } from '../schema';
import { BOUNDS, type FieldError } from '../bounds';
import { Switch } from '@/components/ui/switch';
import { Sliders, Building2, Cpu } from 'lucide-react';
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <SectionBanner title="Resource Limits & Governance Caps" type="warning">
        Hard boundaries preventing memory exhaustion or ingestion overflow. Values outside documented client limits will be rejected during server compilation.
      </SectionBanner>

      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] shadow-md p-5 flex flex-col gap-4">
        <h3 className="font-bold text-[14px] text-[var(--text)] flex items-center gap-2 border-b border-[var(--border)] pb-3">
          <Sliders className="size-4 text-[var(--brand)]" /> Telemetry Resource Caps
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField
            label="Max Spans / Trace"
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
            label="Max Memory Queue Size"
            value={limits.maxQueueSize}
            onChange={(v) => onChange('maxQueueSize', v)}
            bound={BOUNDS['limits.maxQueueSize']}
            error={errorFor('limits.maxQueueSize')}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-[var(--text3)] uppercase tracking-wider">Memory Ceiling</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange('maxMemoryMb', isAutoMemory ? 256 : 'auto')}
                className={cn(
                  'h-[34px] rounded-lg border px-3 text-[12px] font-bold transition-all',
                  isAutoMemory
                    ? 'border-[var(--brand)] bg-[var(--brand)]/15 text-[var(--brand)]'
                    : 'border-[var(--border)] bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)]'
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
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 font-mono text-[13px] text-[var(--text)] outline-none focus:border-[var(--brand)] disabled:opacity-40"
              />
              <span className="text-[12px] font-mono text-[var(--text3)]">MB</span>
            </div>
            {errorFor('limits.maxMemoryMb') && (
              <p className="text-[11px] text-red-400 font-semibold">{errorFor('limits.maxMemoryMb')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg1)] shadow-md p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h3 className="font-bold text-[14px] text-[var(--text)] flex items-center gap-2">
            <Building2 className="size-4 text-sky-400" /> Multi-Tenant Fairness Governance
          </h3>
          <Switch checked={limits.tenantGovernance.enabled} onCheckedChange={(val) => onChangeTenant('enabled', val)} />
        </div>

        <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4 transition-opacity', !limits.tenantGovernance.enabled && 'opacity-50 pointer-events-none')}>
          <NumberField
            label="Max Tenants Tracked"
            value={limits.tenantGovernance.maxTenantsTracked}
            onChange={(v) => onChangeTenant('maxTenantsTracked', v)}
            bound={BOUNDS['tenant.maxTenantsTracked']}
            error={errorFor('limits.tenantGovernance.maxTenantsTracked')}
          />
          <NumberField
            label="Quota / Window"
            value={limits.tenantGovernance.quotaPerWindow}
            onChange={(v) => onChangeTenant('quotaPerWindow', v)}
            bound={BOUNDS['tenant.quotaPerWindow']}
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
            error={errorFor('limits.tenantGovernance.criticalReserve')}
          />
        </div>
      </div>
    </div>
  );
}
