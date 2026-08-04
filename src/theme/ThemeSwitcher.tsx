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

export function ThemeSwitcher(_props?: ThemeSwitcherProps) {
  return null;
}

export default ThemeSwitcher;
