import { FieldTooltip } from './HelpSystem';
import type { NumericBound } from '../bounds';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-[13px] text-[var(--text)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] disabled:opacity-50';
const errorInputClass = 'border-red-500/60 focus:border-red-500 focus:ring-red-500/40';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  bound: NumericBound;
  tooltip?: string;
  error?: string;
  suffix?: string;
  className?: string;
}

/** Numeric input pinned to a validator.ts bound, with inline error display. */
export function NumberField({ label, value, onChange, bound, tooltip, error, suffix, className }: NumberFieldProps) {
  return (
    <div className={className}>
      <label className="mb-2 flex items-center font-medium text-[13px] text-[var(--text)]">
        {label}
        {tooltip && <FieldTooltip definition={tooltip} recommendation={`Allowed: ${bound.min}–${bound.max}${bound.integer ? ' (integer)' : ''}`} />}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={bound.min}
          max={bound.max}
          step={bound.integer ? 1 : 'any'}
          className={cn(inputClass, error && errorInputClass, suffix && 'pr-12')}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[var(--text3)]">
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <p className="mt-1 text-[11px] text-red-500">{error}</p>
      ) : (
        <p className="mt-1 text-[11px] text-[var(--text3)]">
          {bound.min.toLocaleString()}–{bound.max.toLocaleString()}
        </p>
      )}
    </div>
  );
}
