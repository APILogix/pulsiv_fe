import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function getInitials(email?: string | null) {
  if (!email) return 'U';
  return email.slice(0, 2).toUpperCase();
}

interface AvatarButtonProps extends ComponentPropsWithoutRef<'button'> {
  email?: string | null;
  avatarUrl?: string | null;
  displayName?: string | null;
}

export const AvatarButton = forwardRef<HTMLButtonElement, AvatarButtonProps>(
  ({ email, avatarUrl, displayName, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={clsx(
          'group relative inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full p-0 transition-all duration-150',
          'outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
          className,
        )}
        aria-label="Open account menu"
        {...props}
      >
        <Avatar className="size-8.5 rounded-full border border-[var(--border2)] bg-[var(--bg2)] transition-transform duration-150 group-hover:scale-105 group-hover:border-[var(--text2)]">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName || email || 'User'} className="object-cover" />}
          <AvatarFallback className="bg-[var(--brand-bg)] font-mono text-[11px] font-semibold text-[var(--text)]">
            {displayName ? displayName.slice(0, 2).toUpperCase() : getInitials(email)}
          </AvatarFallback>
        </Avatar>
        <span
          className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-[var(--bg)] bg-[var(--green)] ring-1 ring-black/40"
          aria-hidden="true"
        />
      </button>
    );
  },
);

AvatarButton.displayName = 'AvatarButton';

