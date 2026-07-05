/**
 * Minimal Zustand store for theme state, persistence and cross-component access.
 *
 * React 19 compliance notes:
 *  - The theme is applied to the DOM at *module load* (see bottom of file),
 *    before React renders — so there is no `useEffect` + `setState` on mount.
 *  - System-preference subscription is wired once at module scope, not inside
 *    a component effect.
 *  - Color changes happen purely via CSS variables on `<html>`, so switching
 *    themes triggers **no** React re-render of the component tree.
 *  - Consumers should select only the slice they need (selector pattern) to
 *    avoid unrelated re-renders.
 */

import { create } from 'zustand';
import { DEFAULT_THEME_ID, THEME_MAP, isThemeId } from './constants';
import type { ThemeId } from './types';

const STORAGE_KEY = 'pulse-theme-v1';

interface PersistedShape {
  theme: ThemeId;
  followSystem: boolean;
}

function readPersisted(): PersistedShape {
  if (typeof window === 'undefined') {
    return { theme: DEFAULT_THEME_ID, followSystem: false };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedShape>;
      return {
        theme: isThemeId(parsed.theme) ? parsed.theme : DEFAULT_THEME_ID,
        followSystem: Boolean(parsed.followSystem),
      };
    }
  } catch {
    /* ignore malformed storage */
  }
  return { theme: DEFAULT_THEME_ID, followSystem: false };
}

function writePersisted(state: PersistedShape): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage may be unavailable (private mode, quota) — non-fatal */
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function getSystemThemeId(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

let transitionTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Apply a theme to the document root. This is the single side-effecting entry
 * point: sets `data-theme`, keeps the legacy `.dark` class + `color-scheme` in
 * sync, and briefly enables color transitions (unless reduced motion).
 */
export function applyThemeToDom(themeId: ThemeId): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const config = THEME_MAP[themeId] ?? THEME_MAP[DEFAULT_THEME_ID];

  if (!prefersReducedMotion()) {
    root.setAttribute('data-theme-transition', '');
    if (transitionTimer) clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => {
      root.removeAttribute('data-theme-transition');
    }, 220);
  }

  root.setAttribute('data-theme', config.id);
  root.classList.toggle('dark', config.isDark);
  root.style.colorScheme = config.isDark ? 'dark' : 'light';
}

interface ThemeStoreState {
  /** current active theme id */
  theme: ThemeId;
  /** whether the active theme follows the OS dark-mode preference */
  followSystem: boolean;
  /** change theme with side effects (DOM + persistence) */
  setTheme: (themeId: ThemeId) => void;
  /** toggle between dark and light */
  toggleTheme: () => void;
  /** opt in/out of following the OS preference */
  setFollowSystem: (follow: boolean) => void;
  /** re-apply the current theme to the DOM (idempotent) */
  initializeTheme: () => void;
}

const persisted = readPersisted();
const initialTheme: ThemeId = persisted.followSystem ? getSystemThemeId() : persisted.theme;

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  theme: initialTheme,
  followSystem: persisted.followSystem,

  setTheme: (themeId) => {
    if (!isThemeId(themeId)) return;
    applyThemeToDom(themeId);
    set({ theme: themeId, followSystem: false });
    writePersisted({ theme: themeId, followSystem: false });
  },

  toggleTheme: () => {
    const current = THEME_MAP[get().theme] ?? THEME_MAP[DEFAULT_THEME_ID];
    get().setTheme(current.isDark ? 'light' : 'dark');
  },

  setFollowSystem: (follow) => {
    const nextTheme = follow ? getSystemThemeId() : get().theme;
    applyThemeToDom(nextTheme);
    set({ followSystem: follow, theme: nextTheme });
    writePersisted({ theme: nextTheme, followSystem: follow });
  },

  initializeTheme: () => {
    applyThemeToDom(get().theme);
  },
}));

/* ── Apply immediately at module load (before first paint / React render) ── */
applyThemeToDom(initialTheme);

/* ── React to OS preference changes once, at module scope ──────────────── */
if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    if (!useThemeStore.getState().followSystem) return;
    const id: ThemeId = mq.matches ? 'dark' : 'light';
    applyThemeToDom(id);
    useThemeStore.setState({ theme: id });
    writePersisted({ theme: id, followSystem: true });
  });
}
