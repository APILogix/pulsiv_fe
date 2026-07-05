import {
  Moon,
  Sun,
  MoonStar,
  Waves,
  TreePine,
  Sunset,
  Flower2,
  Contrast,
  Eye,
  Terminal,
  Palette,
  type LucideIcon,
} from 'lucide-react';

/** Maps a theme's `icon` identifier to a Lucide component. */
export const THEME_ICONS: Record<string, LucideIcon> = {
  Moon,
  Sun,
  MoonStar,
  Waves,
  TreePine,
  Sunset,
  Flower2,
  Contrast,
  Eye,
  Terminal,
  Palette,
};

export function getThemeIcon(icon: string): LucideIcon {
  return THEME_ICONS[icon] ?? Palette;
}
