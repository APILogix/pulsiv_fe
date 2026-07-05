import { useContext, useSyncExternalStore } from 'react';
import { ThemeContext } from './ThemeContext';
import { useThemeStore } from './theme-store';
import { THEME_MAP, DEFAULT_THEME_ID } from './constants';
import type { ThemeConfig, ThemeId } from './types';

/** Subscribe to the OS color-scheme preference without reading window in render. */
function subscribeSystem(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getSystemSnapshot(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export interface UseThemeReturn {
  /** Active theme id */
  theme: ThemeId;
  /** Full config object for the active theme */
  currentTheme: ThemeConfig;
  /** Change the active theme */
  setTheme: (themeId: ThemeId) => void;
  /** Toggle between dark and light */
  toggleTheme: () => void;
  /** All available theme definitions (static, from context) */
  availableThemes: ThemeConfig[];
  /** Whether the active theme is a dark theme (chart dark-mode toggle) */
  isDark: boolean;
  /** Back-compat: 'dark' | 'light' derived from isDark */
  resolvedTheme: 'dark' | 'light';
  /** Whether the theme currently follows the OS preference */
  followSystem: boolean;
  setFollowSystem: (follow: boolean) => void;
  /** Detected OS dark-mode preference */
  systemPreference: 'dark' | 'light';
}

/**
 * Consume the theme system. Reads the current theme from the Zustand store
 * (selector pattern → minimal re-renders) and the static registry from context.
 */
export function useTheme(): UseThemeReturn {
  const { availableThemes } = useContext(ThemeContext);

  const theme = useThemeStore((s) => s.theme);
  const followSystem = useThemeStore((s) => s.followSystem);
  const setTheme = useThemeStore((s) => s.setTheme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const setFollowSystem = useThemeStore((s) => s.setFollowSystem);

  const systemPreference = useSyncExternalStore(
    subscribeSystem,
    getSystemSnapshot,
    () => 'dark' as const,
  );

  const currentTheme = THEME_MAP[theme] ?? THEME_MAP[DEFAULT_THEME_ID];

  return {
    theme,
    currentTheme,
    setTheme,
    toggleTheme,
    availableThemes,
    isDark: currentTheme.isDark,
    resolvedTheme: currentTheme.isDark ? 'dark' : 'light',
    followSystem,
    setFollowSystem,
    systemPreference,
  };
}

export default useTheme;
