import { useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useLocation, useNavigation, Link } from 'react-router';
import { CheckCircle2, LogOut, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';

import {
  DropdownMenu as RadixDropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useLogout } from '@/modules/auth/hooks/useLogout';
import { accountApi } from '@/modules/auth/api/account.api';
import { useSearchStore } from '@/modules/search/store/useSearchStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { AvatarButton } from './AvatarButton';
import { avatarDropdownGroups } from './config';
import { MenuDivider } from './MenuDivider';
import { MenuGroup } from './MenuGroup';
import { MenuItem } from './MenuItem';

function AccountMenuContent({
  email,
  displayName,
  avatarUrl,
  loadingPath,
  onSelect,
}: {
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  loadingPath?: string;
  onSelect?: (path?: string) => void;
}) {
  const location = useLocation();
  const logout = useLogout();

  // Load account overview data for 2FA health status badge
  const { data: rawOverview } = useQuery({
    queryKey: ['account-overview'],
    queryFn: accountApi.getOverview,
    staleTime: 60_000,
  });

  const overview = ((rawOverview as any)?.data && (rawOverview as any)?.user === undefined
    ? (rawOverview as any).data
    : rawOverview);

  const mfaEnabled = overview?.mfa_summary?.enabled ?? false;

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[data-avatar-menu-item="true"]'),
    );
    if (items.length === 0) return;

    event.preventDefault();
    const currentIndex = items.findIndex((item) => item === document.activeElement);
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex =
      currentIndex === -1
        ? 0
        : (currentIndex + direction + items.length) % items.length;
    items[nextIndex]?.focus();
  };

  const nameInitial = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase();

  const handleAction = (action: string) => {
    if (action === 'command-palette') {
      useSearchStore.getState().setOpen(true);
    }
  };

  return (
    <div
      className="w-full max-w-[280px] bg-[var(--bg1)] p-2 text-[var(--text)] select-none outline-none"
      onKeyDown={handleMenuKeyDown}
    >
      {/* Identity Card */}
      <div className="mb-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/50 p-2.5">
        <div className="flex items-center gap-2.5">
          <Avatar className="size-9 border border-[var(--border2)] bg-[var(--bg3)] shrink-0">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName || email} className="object-cover" />}
            <AvatarFallback className="bg-[var(--brand-bg)] font-mono text-[11px] font-semibold text-[var(--text)]">
              {nameInitial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[13px] font-semibold text-[var(--text)]">
                {displayName || 'Sentinel Member'}
              </span>
              <span className="inline-flex items-center text-[var(--green)]" title="Verified Account">
                <CheckCircle2 className="size-3 shrink-0" />
              </span>
            </div>
            <div className="truncate font-mono text-[11px] text-[var(--text3)]" title={email}>
              {email}
            </div>
          </div>
        </div>

        {/* Security Health Indicator - Fast Jump */}
        <Link
          to="/account/security/mfa"
          onClick={() => onSelect?.('/account/security/mfa')}
          title="Manage Two-Factor Authentication"
          className="mt-2 flex items-center justify-between border-t border-[var(--border)] pt-2 text-[11px] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border2)] rounded-[2px]"
        >
          <span className="flex items-center gap-1.5 text-[var(--text3)]">
            <ShieldCheck className={clsx('size-3', mfaEnabled ? 'text-[var(--green)]' : 'text-[var(--amber)]')} />
            <span>Account Security</span>
          </span>
          <span
            className={clsx(
              'font-mono text-[10px] font-medium px-1.5 py-0.5 rounded-[4px] border transition-colors',
              mfaEnabled
                ? 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/20'
                : 'bg-[var(--amber-bg)] text-[var(--amber)] border-[var(--amber)]/20',
            )}
          >
            {mfaEnabled ? 'Protected' : 'Standard'}
          </span>
        </Link>
      </div>

      {/* Nav Groups */}
      <div className="flex flex-col gap-1.5">
        {avatarDropdownGroups.map((group, groupIndex) => (
          <div key={group.label}>
            {groupIndex > 0 && <MenuDivider />}
            <MenuGroup label={group.label}>
              {group.items.map((item) => (
                <MenuItem
                  key={item.id}
                  item={item}
                  isActive={location.pathname === item.path}
                  isLoading={loadingPath === item.path}
                  onSelect={() => onSelect?.(item.path)}
                  onAction={handleAction}
                />
              ))}
            </MenuGroup>
          </div>
        ))}
      </div>

      <MenuDivider />

      {/* Sign Out Button */}
      <button
        type="button"
        title="Sign out of Sentinel"
        aria-label="Sign out"
        data-avatar-menu-item="true"
        disabled={logout.isPending}
        onClick={() => {
          logout.mutate();
          onSelect?.();
        }}
        className="mt-1 flex h-8.5 w-full cursor-pointer items-center justify-between rounded-[var(--radius)] px-3 text-left text-[13px] text-[var(--red)] transition-colors duration-150 hover:bg-[var(--red-bg)] focus-visible:bg-[var(--red-bg)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--red)] disabled:pointer-events-none disabled:opacity-60"
      >
        <span className="flex items-center gap-2.5">
          <LogOut className="size-3.5" />
          <span>{logout.isPending ? 'Signing out…' : 'Sign out'}</span>
        </span>
        <kbd className="hidden font-mono text-[10px] text-[var(--red)]/60 sm:inline-block">⌥⇧Q</kbd>
      </button>
    </div>
  );
}

export function DropdownMenu() {
  const { user } = useAuth();
  const location = useLocation();
  const navigation = useNavigation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState<string>();
  const email = user?.email ?? 'User';
  const displayName = user?.full_name ?? null;
  const avatarUrl = user?.avatar_url ?? null;

  const loadingPath = useMemo(
    () => navigation.location?.pathname ?? pendingPath,
    [navigation.location?.pathname, pendingPath],
  );

  useEffect(() => {
    setPendingPath(undefined);
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      <div className="hidden md:block">
        <RadixDropdownMenu>
          <DropdownMenuTrigger asChild>
            <AvatarButton email={email} avatarUrl={avatarUrl} displayName={displayName} />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-[280px] overflow-hidden rounded-[var(--radius-lg)] border-[var(--border2)] bg-[var(--bg1)] p-0 text-[var(--text)] shadow-[var(--shadow-modal)] ring-0 data-[side=bottom]:slide-in-from-top-2 data-open:duration-150"
          >
            <AccountMenuContent
              email={email}
              displayName={displayName}
              avatarUrl={avatarUrl}
              loadingPath={loadingPath}
              onSelect={(path) => setPendingPath(path)}
            />
          </DropdownMenuContent>
        </RadixDropdownMenu>
      </div>

      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <AvatarButton email={email} avatarUrl={avatarUrl} displayName={displayName} />
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[85vh] rounded-t-[var(--radius-lg)] border-[var(--border2)] bg-[var(--bg1)] p-0 text-[var(--text)]"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Account menu</SheetTitle>
              <SheetDescription>Access account overview, profile, and quick actions.</SheetDescription>
            </SheetHeader>
            <AccountMenuContent
              email={email}
              displayName={displayName}
              avatarUrl={avatarUrl}
              loadingPath={loadingPath}
              onSelect={(path) => {
                setPendingPath(path);
                setMobileOpen(false);
              }}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}


