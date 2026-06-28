import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getThemeIcon } from './theme-icons';
import type { ThemeConfig } from '../types';

interface ThemeCardProps {
  theme: ThemeConfig;
  isActive: boolean;
  onSelect: (id: ThemeConfig['id']) => void;
  onPreview?: (id: ThemeConfig['id']) => void;
  /** Compact variant for dropdown menus */
  compact?: boolean;
}

/**
 * A single selectable theme entry: icon + name + description + preview
 * swatches + active checkmark. Used by both the dropdown menu (compact) and
 * the settings grid (full).
 */
export function ThemeCard({ theme, isActive, onSelect, onPreview, compact = false }: ThemeCardProps) {
  const Icon = getThemeIcon(theme.icon);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isActive}
      onClick={() => onSelect(theme.id)}
      onMouseEnter={onPreview ? () => onPreview(theme.id) : undefined}
      onFocus={onPreview ? () => onPreview(theme.id) : undefined}
      className={cn(
        'group flex w-full items-start gap-3 rounded-lg border text-left transition-all',
        'hover:scale-[1.01] hover:bg-[var(--pulse-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pulse-accent-info)]',
        compact ? 'p-2.5' : 'p-3.5',
        isActive
          ? 'border-[var(--pulse-accent-info)] bg-[var(--pulse-bg-hover)]'
          : 'border-[var(--pulse-border-default)] bg-transparent',
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md border border-[var(--pulse-border-subtle)]',
          compact ? 'size-8' : 'size-10',
        )}
        style={{ backgroundColor: theme.previewColors[1], color: theme.previewColors[2] }}
      >
        <Icon className={compact ? 'size-4' : 'size-5'} strokeWidth={1.75} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'truncate font-medium text-[var(--pulse-text-primary)]',
              compact ? 'text-[13px]' : 'text-sm',
            )}
          >
            {theme.name}
          </span>
          {isActive && (
            <Check className="size-4 shrink-0 text-[var(--pulse-accent-info)]" aria-hidden />
          )}
        </span>

        {!compact && (
          <span className="mt-0.5 block text-xs leading-snug text-[var(--pulse-text-tertiary)]">
            {theme.description}
          </span>
        )}

        <span className="mt-2 flex items-center gap-1" aria-hidden>
          {theme.previewColors.map((color, i) => (
            <span
              key={`${theme.id}-swatch-${color}-${i}`}
              className="size-3 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: color }}
            />
          ))}
        </span>
      </span>
    </button>
  );
}

export default ThemeCard;
