/**
 * CSS variable generation per theme.
 *
 * Resolves the Tailwind color tokens declared in `constants.ts` into concrete
 * hex / rgba values, then maps them onto:
 *   1. the new `--pulse-*` semantic variables (the public contract), and
 *   2. the *existing* app variables (`--bg`, `--text`, `--brand`, shadcn
 *      tokens, `--sidebar*`, …) so every component already in the codebase
 *      themes correctly with zero changes.
 *
 * The generated CSS is written to `src/styles/themes.css` (the static, GPU
 * accelerated source of truth). This module is also used at runtime by the
 * theme preview / extensibility helpers — never in a hot render path.
 */

import type { ThemeColorTokens, ThemeConfig } from './types';

/* ── Tailwind default palette (hex) ──────────────────────────────────── */
type Shade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
type Palette = Record<string, Record<Shade, string>>;

export const TAILWIND: Palette = {
  slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' },
  gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827', 950: '#030712' },
  neutral: { 50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4', 400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040', 800: '#262626', 900: '#171717', 950: '#0a0a0a' },
  teal: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a', 950: '#042f2e' },
  green: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d', 950: '#052e16' },
  emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' },
  lime: { 50: '#f7fee7', 100: '#ecfccb', 200: '#d9f99d', 300: '#bef264', 400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f', 800: '#3f6212', 900: '#365314', 950: '#1a2e05' },
  orange: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12', 950: '#431407' },
  amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03' },
  yellow: { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12', 950: '#422006' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },
  purple: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87', 950: '#3b0764' },
  fuchsia: { 50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc', 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75', 950: '#4a044e' },
  pink: { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843', 950: '#500724' },
  rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' },
  red: { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a' },
  cyan: { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63', 950: '#083344' },
  sky: { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e', 950: '#082f49' },
  blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },
  indigo: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81', 950: '#1e1b4b' },
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const int = parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

/** Resolve a Tailwind token ("slate-950", "white", "slate-800/50") to hex or rgba. */
export function resolveToken(token: string): string {
  const [colorPart, alphaPart] = token.split('/');
  let hex: string;

  if (colorPart === 'white') {
    hex = '#ffffff';
  } else if (colorPart === 'black') {
    hex = '#000000';
  } else {
    const [family, shadeStr] = colorPart.split('-');
    const fam = TAILWIND[family];
    const shade = Number(shadeStr) as Shade;
    if (!fam || !fam[shade]) {
      throw new Error(`Unknown Tailwind token: ${token}`);
    }
    hex = fam[shade];
  }

  if (alphaPart) {
    const alpha = Number(alphaPart) / 100;
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

function rgba(token: string, alpha: number): string {
  const [r, g, b] = hexToRgb(resolveToken(token));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Build the complete CSS variable record (pulse-* + bridge) for a theme. */
export function buildThemeVariables(theme: ThemeConfig): Record<string, string> {
  const c: ThemeColorTokens = theme.colors;
  const v = (k: keyof ThemeColorTokens) => resolveToken(c[k]);

  const vars: Record<string, string> = {
    /* ── public --pulse-* contract ─────────────────────────────── */
    '--pulse-bg-app': v('bg-app'),
    '--pulse-bg-card': v('bg-card'),
    '--pulse-bg-panel': v('bg-panel'),
    '--pulse-bg-hover': v('bg-hover'),
    '--pulse-bg-active': v('bg-active'),
    '--pulse-text-primary': v('text-primary'),
    '--pulse-text-secondary': v('text-secondary'),
    '--pulse-text-tertiary': v('text-tertiary'),
    '--pulse-text-muted': v('text-muted'),
    '--pulse-text-disabled': v('text-disabled'),
    '--pulse-border-subtle': v('border-subtle'),
    '--pulse-border-default': v('border-default'),
    '--pulse-border-active': v('border-active'),
    '--pulse-accent-info': v('accent-info'),
    '--pulse-accent-info-hover': v('accent-info-hover'),
    '--pulse-accent-success': v('accent-success'),
    '--pulse-accent-success-hover': v('accent-success-hover'),
    '--pulse-accent-warning': v('accent-warning'),
    '--pulse-accent-warning-hover': v('accent-warning-hover'),
    '--pulse-accent-error': v('accent-error'),
    '--pulse-accent-error-hover': v('accent-error-hover'),
    '--pulse-accent-neutral': v('accent-neutral'),
    '--pulse-chart-1': v('chart-1'),
    '--pulse-chart-2': v('chart-2'),
    '--pulse-chart-3': v('chart-3'),
    '--pulse-chart-4': v('chart-4'),
    '--pulse-chart-5': v('chart-5'),
    '--pulse-chart-6': v('chart-6'),
    '--pulse-chart-7': v('chart-7'),
    '--pulse-chart-8': v('chart-8'),
    '--pulse-surface-elevated': theme.surfaces.elevated,
    '--pulse-surface-overlay': theme.surfaces.overlay,
    '--pulse-surface-glass': theme.surfaces.glass,

    /* ── bridge: design.md tokens used across the existing app ──── */
    '--bg': v('bg-app'),
    '--bg1': v('bg-card'),
    '--bg2': v('bg-panel'),
    '--bg3': v('bg-active'),
    '--bg4': v('border-default'),
    '--text': v('text-primary'),
    '--text2': v('text-secondary'),
    '--text3': v('text-tertiary'),

    /* brand === success accent so the default Dark theme stays identical
       (emerald-400 / emerald-500), and every theme gets a coherent brand. */
    '--brand': v('accent-success'),
    '--brand-d': v('accent-success-hover'),
    '--brand-fg': theme.isDark ? v('bg-app') : '#ffffff',
    '--brand-bg': rgba(c['accent-success'], 0.1),

    '--green': v('accent-success'),
    '--green-d': v('accent-success-hover'),
    '--green-bg': rgba(c['accent-success'], 0.08),
    '--red': v('accent-error'),
    '--red-d': v('accent-error-hover'),
    '--red-bg': rgba(c['accent-error'], 0.08),
    '--amber': v('accent-warning'),
    '--amber-bg': rgba(c['accent-warning'], 0.08),
    '--yellow': v('accent-warning'),
    '--yellow-bg': rgba(c['accent-warning'], 0.08),
    '--blue': v('accent-info'),
    '--blue-bg': rgba(c['accent-info'], 0.1),
    '--violet': v('chart-6'),
    '--violet-bg': rgba(c['chart-6'], 0.1),
    '--get': v('accent-info'),

    '--chart-1': v('chart-1'),
    '--chart-2': v('chart-2'),
    '--chart-3': v('chart-3'),
    '--chart-4': v('chart-4'),
    '--chart-5': v('chart-5'),

    /* ── bridge: shadcn tokens ──────────────────────────────────── */
    '--background': v('bg-app'),
    '--foreground': v('text-primary'),
    '--card': v('bg-card'),
    '--card-foreground': v('text-primary'),
    '--popover': v('bg-card'),
    '--popover-foreground': v('text-primary'),
    '--secondary': v('bg-panel'),
    '--secondary-foreground': v('text-primary'),
    '--muted': v('bg-panel'),
    '--muted-foreground': v('text-tertiary'),
    '--accent': v('bg-active'),
    '--accent-foreground': v('text-primary'),
    '--primary': v('accent-success'),
    '--primary-foreground': theme.isDark ? v('bg-app') : '#ffffff',
    '--destructive': v('accent-error'),
    '--destructive-foreground': '#ffffff',
    '--border': v('border-default'),
    '--input': v('border-active'),
    '--ring': v('accent-info'),

    /* ── bridge: sidebar tokens ─────────────────────────────────── */
    '--sidebar': v('bg-card'),
    '--sidebar-foreground': v('text-primary'),
    '--sidebar-primary': v('accent-success'),
    '--sidebar-primary-foreground': theme.isDark ? v('bg-app') : '#ffffff',
    '--sidebar-accent': v('bg-panel'),
    '--sidebar-accent-foreground': v('text-primary'),
    '--sidebar-border': v('border-default'),
    '--sidebar-ring': v('accent-info'),
  };

  return vars;
}

/** Generate the full themes.css contents for all themes. */
export function generateThemesCss(themes: ThemeConfig[]): string {
  const blocks = themes.map((theme) => {
    const vars = buildThemeVariables(theme);
    const body = Object.entries(vars)
      .map(([k, val]) => `  ${k}: ${val};`)
      .join('\n');
    return `/* ${theme.name} */\n:root[data-theme="${theme.id}"] {\n${body}\n}`;
  });
  return `/*\n * Pulse theme variables — GENERATED by src/themes/css-variables.ts.\n * Do not edit by hand; edit src/themes/constants.ts and regenerate.\n *\n * \`:root[data-theme="X"]\` selectors are used so theme variables out-weigh the\n * legacy \`.dark\` / \`:root\` blocks in index.css regardless of import order.\n */\n\n${blocks.join('\n\n')}\n`;
}
