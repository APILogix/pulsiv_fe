/** Theme utility helpers (contrast, classification, grouping). */

import { THEME_MAP, THEMES } from './constants';
import type { ThemeCategory, ThemeConfig, ThemeId } from './types';

export function getTheme(id: ThemeId): ThemeConfig {
  return THEME_MAP[id];
}

export function isDarkTheme(id: ThemeId): boolean {
  return THEME_MAP[id]?.isDark ?? true;
}

/** Relative luminance of a hex color per WCAG 2.1. */
export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function getContrast(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export const CATEGORY_ORDER: ThemeCategory[] = [
  'dark',
  'colorful',
  'specialty',
  'light',
  'accessibility',
];

export const CATEGORY_LABEL: Record<ThemeCategory, string> = {
  dark: 'Dark Themes',
  colorful: 'Colorful',
  specialty: 'Specialty',
  light: 'Light Themes',
  accessibility: 'Accessibility',
};

/** Group themes by category in a stable, display-friendly order. */
export function getThemesByCategory(): { category: ThemeCategory; label: string; themes: ThemeConfig[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABEL[category],
    themes: THEMES.filter((t) => t.category === category),
  })).filter((group) => group.themes.length > 0);
}
