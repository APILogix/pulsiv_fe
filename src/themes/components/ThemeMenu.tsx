import { useRef, type KeyboardEvent } from 'react';
import { Check, Monitor, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '../useTheme';
import { getThemesByCategory } from '../utils';
import { DEFAULT_THEME_ID } from '../constants';
import type { ThemeId } from '../types';
import { ThemeCard } from './ThemeCard';

interface ThemeMenuProps {
  /** Called after a theme is chosen (e.g. to close a popover) */
  onSelected?: (id: ThemeId) => void;
  /** Live preview callback as the user hovers/focuses entries */
  onPreview?: (id: ThemeId) => void;
  className?: string;
}

// Module-level constant — stable reference (rules.md anti-pattern #4).
const THEME_GROUPS = getThemesByCategory();

/**
 * The theme switcher menu: themes grouped by category with a current-theme
 * checkmark, "follow system" toggle, and "reset to default". Arrow Up/Down
 * move focus between entries; Enter applies (native button behavior).
 */
export function ThemeMenu({ onSelected, onPreview, className }: ThemeMenuProps) {
  const { theme, setTheme, followSystem, setFollowSystem } = useTheme();
  const listRef = useRef<HTMLDivElement>(null);

  const handleSelect = (id: ThemeId) => {
    setTheme(id);
    onSelected?.(id);
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const root = listRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    if (items.length === 0) return;
    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (currentIndex + delta + items.length) % items.length;
    items[nextIndex]?.focus();
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <div
        ref={listRef}
        role="radiogroup"
        aria-label="Color theme"
        onKeyDown={handleListKeyDown}
        className="flex max-h-[min(60vh,520px)] flex-col gap-3 overflow-y-auto p-1"
      >
        {THEME_GROUPS.map((group) => (
          <section key={group.category} className="flex flex-col gap-1.5">
            <h4 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--pulse-text-muted)]">
              {group.label}
            </h4>
            {group.themes.map((t) => (
              <ThemeCard
                key={t.id}
                theme={t}
                isActive={theme === t.id}
                onSelect={handleSelect}
                onPreview={onPreview}
                compact
              />
            ))}
          </section>
        ))}
      </div>

      <div className="mt-2 flex flex-col gap-1 border-t border-[var(--pulse-border-subtle)] pt-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={followSystem}
          onClick={() => setFollowSystem(!followSystem)}
          className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-[13px] text-[var(--pulse-text-secondary)] transition-colors hover:bg-[var(--pulse-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pulse-accent-info)]"
        >
          <span className="flex items-center gap-2">
            <Monitor className="size-4" aria-hidden />
            Follow system preference
          </span>
          <span
            className={cn(
              'flex size-4 items-center justify-center rounded border',
              followSystem
                ? 'border-[var(--pulse-accent-info)] bg-[var(--pulse-accent-info)] text-[var(--pulse-bg-app)]'
                : 'border-[var(--pulse-border-active)]',
            )}
          >
            {followSystem && <Check className="size-3" aria-hidden />}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelect(DEFAULT_THEME_ID)}
          className="flex items-center gap-2 rounded-md px-2 py-2 text-[13px] text-[var(--pulse-text-tertiary)] transition-colors hover:bg-[var(--pulse-bg-hover)] hover:text-[var(--pulse-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pulse-accent-info)]"
        >
          <RotateCcw className="size-4" aria-hidden />
          Reset to Dark
        </button>
      </div>
    </div>
  );
}

export default ThemeMenu;
