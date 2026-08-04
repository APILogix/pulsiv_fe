import { AbstractIcon } from './HelpSystem';
import { cn } from '@/lib/utils';

export interface ConfigNavItem {
  id: string;
  label: string;
  icon: string;
  /** Number of leaf fields changed within this section, for the badge. */
  changedCount: number;
  danger?: boolean;
}

interface ConfigNavProps {
  items: ConfigNavItem[];
  active: string;
  onSelect: (id: string) => void;
}

/**
 * Vertical settings-style navigation for the editor sections. Replaces the
 * previous horizontal sub-tab row so each section reads like a distinct
 * settings page, with a live badge showing how many fields changed in that
 * section relative to the published revision.
 */
export function ConfigNav({ items, active, onSelect }: ConfigNavProps) {
  return (
    <nav className="flex shrink-0 flex-col gap-0.5 lg:w-[220px]">
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              'group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors',
              isActive
                ? item.danger
                  ? 'bg-red-500/10 text-red-500'
                  : 'bg-[var(--brand)]/10 text-[var(--brand)]'
                : 'text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)]',
            )}
          >
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-[8px] transition-colors',
                isActive ? (item.danger ? 'bg-red-500/15' : 'bg-[var(--brand)]/15') : 'bg-[var(--bg2)] group-hover:bg-[var(--bg3)]',
              )}
            >
              <AbstractIcon name={item.icon} />
            </span>
            <span className="flex-1 truncate">{item.label}</span>
            {item.changedCount > 0 && (
              <span
                className={cn(
                  'flex min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                  item.danger ? 'bg-red-500 text-white' : 'bg-[var(--brand)] text-white',
                )}
              >
                {item.changedCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
