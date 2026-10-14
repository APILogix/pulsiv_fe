import { Link } from 'react-router';
import { ExternalLink, Loader2 } from 'lucide-react';
import clsx from 'clsx';

import type { AvatarDropdownItem } from './config';

interface MenuItemProps {
  item: AvatarDropdownItem;
  isActive?: boolean;
  isLoading?: boolean;
  onSelect?: () => void;
  onAction?: (action: string) => void;
}

export function MenuItem({
  item,
  isActive = false,
  isLoading = false,
  onSelect,
  onAction,
}: MenuItemProps) {
  const Icon = item.icon;

  const baseClassName = clsx(
    'group relative flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-[var(--radius)] px-3 text-[13px] outline-none transition-colors duration-150',
    isActive
      ? 'bg-[var(--bg2)] font-medium text-[var(--text)] shadow-xs'
      : 'font-normal text-[var(--text2)] hover:bg-[var(--bg2)] hover:text-[var(--text)] focus-visible:bg-[var(--bg2)] focus-visible:text-[var(--text)] focus-visible:ring-1 focus-visible:ring-[var(--border2)]',
  );

  const innerContent = (
    <>
      <span
        className={clsx(
          'absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full transition-opacity',
          isActive ? 'bg-[var(--brand)] opacity-100' : 'bg-transparent opacity-0 group-hover:bg-[var(--text3)] group-hover:opacity-40',
        )}
      />
      <div
        className={clsx(
          'flex size-5.5 shrink-0 items-center justify-center rounded-[4px] transition-colors',
          isActive
            ? 'bg-[var(--brand-bg)] text-[var(--brand)]'
            : 'text-[var(--text3)] group-hover:bg-[var(--bg3)] group-hover:text-[var(--text)]',
        )}
      >
        <Icon className="size-3.5" />
      </div>

      <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>

      {item.shortcut && (
        <kbd className="font-mono text-[10px] text-[var(--text3)] group-hover:text-[var(--text2)] transition-colors">
          {item.shortcut}
        </kbd>
      )}

      {item.action === 'external-link' && (
        <ExternalLink className="size-3 text-[var(--text3)] group-hover:text-[var(--text2)] transition-colors shrink-0" />
      )}

      {isLoading && (
        <Loader2 className="size-3.5 shrink-0 animate-spin text-[var(--brand)]" aria-hidden="true" />
      )}
    </>
  );

  if (item.action === 'command-palette') {
    return (
      <button
        type="button"
        aria-label={item.ariaLabel}
        data-avatar-menu-item="true"
        onClick={() => {
          onAction?.('command-palette');
          onSelect?.();
        }}
        className={baseClassName}
      >
        {innerContent}
      </button>
    );
  }

  if (item.action === 'external-link' && item.externalUrl) {
    return (
      <a
        href={item.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={item.ariaLabel}
        data-avatar-menu-item="true"
        onClick={onSelect}
        className={baseClassName}
      >
        {innerContent}
      </a>
    );
  }

  return (
    <Link
      to={item.path || '#'}
      aria-label={item.ariaLabel}
      aria-current={isActive ? 'page' : undefined}
      data-avatar-menu-item="true"
      onClick={onSelect}
      className={baseClassName}
    >
      {innerContent}
    </Link>
  );
}


