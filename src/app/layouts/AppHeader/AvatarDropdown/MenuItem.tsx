import { Link } from 'react-router';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

import type { AvatarMenuItem } from './config';

interface MenuItemProps {
  item: AvatarMenuItem;
  isActive: boolean;
  isLoading: boolean;
  onSelect?: () => void;
}

export function MenuItem({ item, isActive, isLoading, onSelect }: MenuItemProps) {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      aria-label={item.ariaLabel}
      aria-current={isActive ? 'page' : undefined}
      data-avatar-menu-item="true"
      onClick={onSelect}
      className={clsx(
        'group relative flex h-8 cursor-pointer items-center gap-3 rounded-md px-3 text-[13px] outline-none transition-colors duration-100',
        isActive
          ? 'bg-[var(--brand-bg)] font-medium text-[var(--text)]'
          : 'font-normal text-[var(--text3)] hover:bg-[var(--brand-bg)] hover:text-[var(--text)] focus-visible:bg-[var(--brand-bg)] focus-visible:text-[var(--text)]',
      )}
    >
      <span
        className={clsx(
          'absolute left-0 top-1 bottom-1 w-[2px] rounded-r-full transition-opacity',
          isActive ? 'bg-[var(--brand)] opacity-100' : 'bg-[var(--brand)] opacity-0 group-hover:opacity-60',
        )}
      />
      <Icon className={clsx('size-4 shrink-0', isActive ? 'text-[var(--brand)]' : 'text-[var(--text3)] group-hover:text-[var(--text2)]')} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {isLoading && <Loader2 className="size-3.5 shrink-0 animate-spin text-[var(--brand)]" aria-hidden="true" />}
    </Link>
  );
}
