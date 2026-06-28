/**
 * Pulse theme system — type definitions.
 *
 * The theme system is built around a small set of *semantic* color slots
 * (background hierarchy, text hierarchy, borders, accents, charts, surfaces).
 * Every theme provides a value for each slot expressed as a Tailwind color
 * token string (e.g. "slate-950", "white", "slate-800/50"). The generator in
 * `css-variables.ts` resolves those tokens to hex / rgba and emits CSS custom
 * properties.
 *
 * This data is *static* — it never changes at runtime — which is exactly the
 * kind of data React 19 rules permit to live in Context.
 */

export type ThemeId =
  | 'dark'
  | 'light'
  | 'midnight'
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'lavender'
  | 'monochrome'
  | 'high-contrast'
  | 'terminal';

export type ThemeCategory = 'dark' | 'light' | 'colorful' | 'accessibility' | 'specialty';

/** The semantic color slots every theme must define. Values are Tailwind tokens. */
export interface ThemeColorTokens {
  /* Background hierarchy */
  'bg-app': string;
  'bg-card': string;
  'bg-panel': string;
  'bg-hover': string;
  'bg-active': string;
  /* Text hierarchy */
  'text-primary': string;
  'text-secondary': string;
  'text-tertiary': string;
  'text-muted': string;
  'text-disabled': string;
  /* Border system */
  'border-subtle': string;
  'border-default': string;
  'border-active': string;
  /* Semantic accents */
  'accent-info': string;
  'accent-info-hover': string;
  'accent-success': string;
  'accent-success-hover': string;
  'accent-warning': string;
  'accent-warning-hover': string;
  'accent-error': string;
  'accent-error-hover': string;
  'accent-neutral': string;
  /* Chart palette */
  'chart-1': string;
  'chart-2': string;
  'chart-3': string;
  'chart-4': string;
  'chart-5': string;
  'chart-6': string;
  'chart-7': string;
  'chart-8': string;
}

/** Special surfaces expressed as raw CSS values (box-shadow / rgba background). */
export interface ThemeSurfaces {
  /** box-shadow value */
  elevated: string;
  /** rgba background for overlays (blur handled by component class) */
  overlay: string;
  /** rgba background for glass surfaces */
  glass: string;
}

export interface ThemeMetadata {
  id: ThemeId;
  /** Human-readable display name */
  name: string;
  /** One-line explanation of the theme's purpose */
  description: string;
  /** Lucide icon identifier used by the switcher UI */
  icon: string;
  /** Dark-mode classification — drives `dark` class + chart library dark toggles */
  isDark: boolean;
  /** Functional category for grouping in the switcher */
  category: ThemeCategory;
  /** 3-5 hex colors used for preview swatches */
  previewColors: string[];
}

export interface ThemeConfig extends ThemeMetadata {
  colors: ThemeColorTokens;
  surfaces: ThemeSurfaces;
}
