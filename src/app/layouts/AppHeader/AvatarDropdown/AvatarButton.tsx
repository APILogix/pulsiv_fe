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
        'inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full p-0 text-muted-foreground outline-none transition-colors hover:bg-[#2a2d3a] hover:text-[#f1f5f9] focus-visible:ring-1 focus-visible:ring-[#3b82f6]',
        className,
      )}
      aria-label="Open account menu"
      {...props}
    >
      <Avatar className="size-8 border border-[#2a2d3a] bg-[#1a1d27]">
        {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
        <AvatarFallback className="bg-[rgba(59,130,246,0.16)] text-[12px] font-semibold text-[#f1f5f9]">
          {getInitials(email)}
        </AvatarFallback>
      </Avatar>
    </button>
  );
  },
);

AvatarButton.displayName = 'AvatarButton';
