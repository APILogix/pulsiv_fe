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
export const SENTINEL_THEMES: SentinelTheme[] = ['indigo', 'mono'];
export const DEFAULT_THEME: SentinelTheme = 'indigo';

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

export function normalizeTheme(value: string | null | undefined): SentinelTheme {
  return value === 'mono' ? 'mono' : DEFAULT_THEME;
}

function readStoredTheme(): SentinelTheme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Apply the theme as a hard cut: suppress every transition/animation for one
 * frame, swap `data-theme`, then restore.
 */
export function applyTheme(next: SentinelTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.setAttribute('data-theme-flip', '');
  root.setAttribute('data-theme', next);
  // The app shell mirrors the attribute so scoped selectors keep working.
  document.getElementById('sentinel-root')?.setAttribute('data-theme', next);
  root.style.colorScheme = 'dark';

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => root.removeAttribute('data-theme-flip'));
  });
}

/* ── Provider ──────────────────────────────────────────── */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, _setTheme] = useState<SentinelTheme>(readStoredTheme);

  /* Keep the DOM in sync (also covers the very first client render, in case the
     anti-FOUC script in index.html was stripped by a host). */
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  /* Cross-tab sync: a flip in one tab applies everywhere. */
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      _setTheme(normalizeTheme(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    const normalized = normalizeTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch {
      /* storage disabled — the theme still applies for this session */
    }
    _setTheme(normalized);
    applyTheme(normalized);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'indigo' ? 'mono' : 'indigo');
  }, [setTheme, theme]);

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
