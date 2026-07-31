import { useCallback } from 'react';
import type { KeyboardEvent } from 'react';

import { cn } from '@/lib/utils';

import { SENTINEL_THEMES, THEME_META, useTheme } from './ThemeProvider';
import type { SentinelTheme } from './ThemeProvider';

/**
 * Theme switcher — sentinel-design.md §1.
 *
 * A segmented two-swatch control: 14px circular swatches (indigo dot / white
 * dot) in a pill container; the active swatch gets a 2px ring in its own
 * colour. Swaps are instant hard cuts (the provider suppresses transitions for
 * one frame), so no crossfade is applied here.
 *
 * `variant="swatches"` — topbar / marketing navbar.
 * `variant="cards"`    — user settings (adds label + description per theme).
 */

interface ThemeSwitcherProps {
  variant?: 'swatches' | 'cards';
  className?: string;
}

export function ThemeSwitcher({ variant = 'swatches', className }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();

  const move = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const index = SENTINEL_THEMES.indexOf(theme);
      const next = event.key === 'ArrowRight' ? index + 1 : index - 1;
      setTheme(SENTINEL_THEMES[(next + SENTINEL_THEMES.length) % SENTINEL_THEMES.length]);
    },
    [setTheme, theme],
  );

  if (variant === 'cards') {
    return (
      <div
        role="radiogroup"
        aria-label="Theme"
        onKeyDown={move}
        className={cn('grid gap-3 sm:grid-cols-2', className)}
      >
        {SENTINEL_THEMES.map((name) => (
          <ThemeCard key={name} name={name} active={theme === name} onSelect={setTheme} />
        ))}
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      onKeyDown={move}
      className={cn(
        'relative inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg2)] p-1 shadow-inner',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute left-1 top-1 h-6 w-6 rounded-full bg-[var(--bg)] shadow-md ring-1 ring-[var(--border)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform: theme === 'indigo' ? 'translateX(0)' : 'translateX(100%)',
        }}
        aria-hidden="true"
      />
      {SENTINEL_THEMES.map((name) => (
        <ThemeSwatch key={name} name={name} active={theme === name} onSelect={setTheme} />
      ))}
    </div>
  );
}

function ThemeSwatch({
  name,
  active,
  onSelect,
}: {
  name: SentinelTheme;
  active: boolean;
  onSelect: (theme: SentinelTheme) => void;
}) {
  const meta = THEME_META[name];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={`${meta.label} theme`}
      title={`${meta.label} — ${meta.description}`}
      tabIndex={active ? 0 : -1}
      onClick={() => onSelect(name)}
      className="relative z-10 flex size-6 items-center justify-center rounded-full transition-colors hover:bg-[color-mix(in_srgb,var(--text)_5%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg2)]"
    >
      <span
        aria-hidden="true"
        className="block size-[12px] rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          background: meta.swatch,
          boxShadow: active ? `0 0 0 2px var(--bg), 0 0 0 4px ${meta.swatch}` : 'none',
          opacity: active ? 1 : 0.4,
          transform: active ? 'scale(1)' : 'scale(0.85)',
        }}
      />
    </button>
  );
}

function ThemeCard({
  name,
  active,
  onSelect,
}: {
  name: SentinelTheme;
  active: boolean;
  onSelect: (theme: SentinelTheme) => void;
}) {
  const meta = THEME_META[name];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      tabIndex={active ? 0 : -1}
      onClick={() => onSelect(name)}
      className={cn(
        'flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]',
        active
          ? 'border-[var(--brand)] bg-[var(--brand-bg)]'
          : 'border-[var(--border)] bg-[var(--bg1)] hover:border-[var(--border2)]',
      )}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 block size-[14px] shrink-0 rounded-full"
        style={{
          background: meta.swatch,
          boxShadow: active ? `0 0 0 2px var(--bg1), 0 0 0 4px ${meta.swatch}` : 'none',
        }}
      />
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[var(--text)]">{meta.label}</span>
          {name === 'indigo' && (
            <span className="rounded-full bg-[var(--bg2)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.09em] text-[var(--text3)]">
              default
            </span>
          )}
          {active && (
            <span className="font-mono text-[9px] uppercase tracking-[0.09em] text-[var(--brand)]">
              active
            </span>
          )}
        </span>
        <span className="mt-1 block text-[12px] leading-[1.5] text-[var(--text2)]">
          {meta.description}
        </span>
      </span>
    </button>
  );
}

export default ThemeSwitcher;
