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
}

export const AvatarButton = forwardRef<HTMLButtonElement, AvatarButtonProps>(
  ({ email, avatarUrl, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      className={clsx(
        'inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full p-0 text-[var(--text2)] outline-none transition-colors hover:bg-[var(--bg2)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--brand)]',
        className,
      )}
      aria-label="Open account menu"
      {...props}
    >
      <Avatar className="size-8 border border-[var(--border)] bg-[var(--bg2)]">
        {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
        <AvatarFallback className="bg-[var(--brand-bg)] font-mono text-[11px] font-semibold text-[var(--text)]">
          {getInitials(email)}
        </AvatarFallback>
      </Avatar>
    </button>
  );
  },
);

AvatarButton.displayName = 'AvatarButton';
