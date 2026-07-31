import React from "react";

/**
 * Toggle — sentinel-design.md §7.
 * Pill track: --bg3 off → var(--brand) on. The knob consumes var(--brand-fg)
 * so Mono gets a dark knob on a white track. Engaged glow: 0 0 10px
 * var(--brand-glow).
 *
 * Killswitch toggles break the brand rule on purpose (`tone="danger"`): they
 * are operational truth, so on = --red with a red glow, in both themes.
 */
export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** `danger` marks killswitch/operational toggles (§7). */
  tone?: 'brand' | 'danger';
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, tone = 'brand', disabled, ...props }, ref) => {
    const on = tone === 'danger'
      ? { track: 'var(--red)', glow: 'rgba(239,68,68,0.45)', knob: '#ffffff' }
      : { track: 'var(--brand)', glow: 'var(--brand-glow)', knob: 'var(--brand-fg)' };

    return (
      <label
        className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className || ''}`}
      >
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          ref={ref}
          {...props}
        />
        <span
          aria-hidden="true"
          className="relative block h-5 w-9 rounded-full transition-colors duration-150 ease-out peer-focus-visible:ring-3 peer-focus-visible:ring-[var(--brand-bg)]"
          style={{
            background: checked ? on.track : 'var(--bg3)',
            boxShadow: checked ? `0 0 10px ${on.glow}` : 'none',
          }}
        >
          <span
            className="absolute top-[2px] left-[2px] block size-4 rounded-full transition-transform duration-150 ease-out"
            style={{
              background: checked ? on.knob : 'var(--text3)',
              transform: checked ? 'translateX(16px)' : 'translateX(0)',
            }}
          />
        </span>
      </label>
    );
  }
);
Switch.displayName = "Switch";
