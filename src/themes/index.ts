/** Pulse theme system — public API. */

export type {
  ThemeId,
  ThemeCategory,
  ThemeConfig,
  ThemeMetadata,
  ThemeColorTokens,
  ThemeSurfaces,
} from './types';

export {
  THEMES,
  THEME_MAP,
  THEME_IDS,
  DEFAULT_THEME_ID,
  isThemeId,
} from './constants';

export {
  useThemeStore,
  applyThemeToDom,
  getSystemThemeId,
} from './theme-store';

export { ThemeProvider, ThemeContext } from './ThemeContext';
export type { ThemeContextValue } from './ThemeContext';

export { useTheme } from './useTheme';
export type { UseThemeReturn } from './useTheme';

export {
  getTheme,
  isDarkTheme,
  getContrast,
  relativeLuminance,
  getThemesByCategory,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
} from './utils';

export { buildThemeVariables, resolveToken, generateThemesCss, TAILWIND } from './css-variables';

/* UI components */
export { ThemeMenu } from './components/ThemeMenu';
export { ThemeCard } from './components/ThemeCard';
export { ThemePreview } from './components/ThemePreview';
export { ThemeSwitcher } from './components/ThemeSwitcher';
