import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Sentinel theming model — sentinel-design.md §1.
 *
 * The product ships TWO DARK developer themes of one identity:
 *   • indigo (default, flagship) — brand channel = #7c6cf5
 *   • mono   ("Null")           — brand channel = #fafafa
 *
 * There is no light theme and no `prefers-color-scheme` behaviour: both themes
 * are dark, so there is no system light to respect. Readability for
 * sunlight/low-vision is handled by the `prefers-contrast: more` block in
 * index.css, not by a third palette.
 *
 * Theme flips are INSTANT HARD CUTS — transitions are suppressed for one frame
 * while the tokens swap (§9), because a mid-swap colour fade reads as a glitch.
 */

/* ── Types ────────────────────────────────────────────── */
export type SentinelTheme = 'indigo' | 'mono';

/** Legacy values still accepted by setTheme(); they normalise to `indigo`. */
type LegacyTheme = 'dark' | 'light' | 'system';
export type Theme = SentinelTheme | LegacyTheme;

interface ThemeContextValue {
  /** The active Sentinel theme. */
  theme: SentinelTheme;
  /** Set the theme. Legacy values ('dark' | 'light' | 'system') → 'indigo'. */
  setTheme: (theme: Theme) => void;
  /** Flip between the two dark themes. */
  toggleTheme: () => void;
  /**
   * @deprecated Sentinel is dark-only; this always returns 'dark'.
   * Use `theme` ('indigo' | 'mono') instead.
   */
  resolvedTheme: 'dark' | 'light';
}

/* ── Context ───────────────────────────────────────────── */
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const THEME_STORAGE_KEY = 'sentinel-theme';
export const SENTINEL_THEMES: SentinelTheme[] = ['mono'];
export const DEFAULT_THEME: SentinelTheme = 'mono';

export const THEME_META: Record<SentinelTheme, { label: string; swatch: string; description: string }> = {
  indigo: {
    label: 'Indigo',
    swatch: '#7c6cf5',
    description: 'The flagship. Deep blue-charcoal, glowing AI channel.',
  },
  mono: {
    label: 'Mono',
    swatch: '#fafafa',
    description: 'Chrome drained to zinc; the product channel speaks in white.',
  },
};

export function normalizeTheme(_value?: string | null): SentinelTheme {
  return 'mono';
}

/**
 * Apply the theme as a hard cut: set data-theme to mono.
 */
export function applyTheme(_next: SentinelTheme = 'mono') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.setAttribute('data-theme', 'mono');
  document.getElementById('sentinel-root')?.setAttribute('data-theme', 'mono');
  root.style.colorScheme = 'dark';
}

/* ── Provider ──────────────────────────────────────────── */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme] = useState<SentinelTheme>('mono');

  useEffect(() => {
    applyTheme('mono');
  }, []);

  const setTheme = useCallback((_next: Theme) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'mono');
    } catch {
      /* storage disabled */
    }
    applyTheme('mono');
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme('mono');
  }, [setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, resolvedTheme: 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

/* ── Hook ─────────────────────────────────────────────── */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeProvider;
