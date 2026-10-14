import { useId } from 'react';

import { fieldMonoClass } from '@/shared/ui/pulse';
import { cn } from '@/lib/utils';

import { FieldTooltip } from './HelpSystem';
import type { NumericBound } from '../bounds';

const ERROR_INPUT = 'border-[var(--red)]/60 hover:border-[var(--red)] focus:border-[var(--red)] focus:ring-[var(--red-bg)]';

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
  const inputId = useId();
  const hintId = `${inputId}-hint`;

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div className="flex min-w-0 items-center gap-1.5">
        <label htmlFor={inputId} className="min-w-0 text-[13px] font-medium text-[var(--text2)]">
          {label}
          {/* The visible unit sits inside the input, so name it here for screen readers. */}
          {suffix && <span className="sr-only"> ({suffix})</span>}
        </label>
        {tooltip && (
          <FieldTooltip
            label={label}
            definition={tooltip}
            recommendation={`Allowed: ${bound.min}–${bound.max}${bound.integer ? ' (integer)' : ''}`}
          />
        )}
      </div>
      <div className="relative">
        <input
          id={inputId}
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={bound.min}
          max={bound.max}
          step={bound.integer ? 1 : 'any'}
          aria-invalid={error ? true : undefined}
          aria-describedby={hintId}
          className={cn(fieldMonoClass, 'tabular-nums', suffix && 'pr-16', error && ERROR_INPUT)}
        />
        {suffix && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-[family-name:var(--mono)] text-[12px] text-[var(--text3)]"
          >
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <p id={hintId} role="alert" className="text-[12px] leading-[1.5] text-[var(--red)]">
          {error}
        </p>
      ) : (
        <p id={hintId} className="font-[family-name:var(--mono)] text-[12px] tabular-nums text-[var(--text3)]">
          {bound.min.toLocaleString()}–{bound.max.toLocaleString()}
        </p>
      )}
    </div>
  );
}
