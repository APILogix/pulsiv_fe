import { useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useLocation, useNavigation } from 'react-router';
import { LogOut, Moon, Sun } from 'lucide-react';

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
import { useTheme } from '@/theme';

import { AvatarButton } from './AvatarButton';
import { avatarMenuGroups } from './config';
import { MenuDivider } from './MenuDivider';
import { MenuGroup } from './MenuGroup';
import { MenuItem } from './MenuItem';

function AccountMenuContent({
  email,
  loadingPath,
  onSelect,
}: {
  email: string;
  loadingPath?: string;
  onSelect?: (path?: string) => void;
}) {
  const location = useLocation();
  const logout = useLogout();
  const { resolvedTheme, toggleTheme } = useTheme();
  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLAnchorElement>('[data-avatar-menu-item="true"]'),
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

  return (
    <div
      className="max-h-[600px] overflow-y-auto scroll-smooth bg-[#1a1d27] p-4 text-[#f1f5f9] sidebar-scroll"
      onKeyDown={handleMenuKeyDown}
    >
      <div className="pb-4">
        <div className="text-[13px] font-medium text-[#f1f5f9]">Account settings</div>
        <div className="truncate text-[12px] text-[#94a3b8]">{email}</div>
      </div>

      <div className="flex flex-col gap-3">
        {avatarMenuGroups.map((group, groupIndex) => (
          <div key={group.label}>
            {groupIndex > 0 && <MenuDivider />}
            <MenuGroup label={group.label}>
              {group.items.map((item) => (
                <MenuItem
                  key={item.path}
                  item={item}
                  isActive={location.pathname === item.path}
                  isLoading={loadingPath === item.path}
                  onSelect={() => onSelect?.(item.path)}
                />
              ))}
            </MenuGroup>
          </div>
        ))}
      </div>

      <MenuDivider />
      <button
        type="button"
        title="Toggle appearance"
        aria-label="Toggle appearance"
        onClick={() => {
          toggleTheme();
          onSelect?.();
        }}
        className="flex h-8 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-[14px] text-[#94a3b8] transition-colors duration-100 hover:bg-[rgba(59,130,246,0.10)] hover:text-[#f1f5f9] focus-visible:bg-[rgba(59,130,246,0.10)] focus-visible:text-[#f1f5f9] focus-visible:outline-none"
      >
        {resolvedTheme === 'dark' ? <Sun className="size-4 text-[#64748b]" /> : <Moon className="size-4 text-[#64748b]" />}
        <span>Appearance</span>
      </button>
      <button
        type="button"
        title="Sign out"
        aria-label="Sign out"
        disabled={logout.isPending}
        onClick={() => {
          logout.mutate();
          onSelect?.();
        }}
        className="mt-1 flex h-8 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-[var(--red)] transition-colors duration-100 hover:bg-[rgba(239,68,68,0.08)] focus-visible:bg-[rgba(239,68,68,0.08)] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60"
      >
        <LogOut className="size-4" />
        <span>{logout.isPending ? 'Signing out...' : 'Sign out'}</span>
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
            <AvatarButton email={user?.email} avatarUrl={user?.avatar_url} />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="min-w-[320px] overflow-hidden rounded-lg border-[#2a2d3a] bg-[#1a1d27] p-0 text-[#f1f5f9] shadow-[0_18px_50px_rgba(0,0,0,0.45)] ring-0 data-[side=bottom]:slide-in-from-top-2 data-open:duration-150"
          >
            <AccountMenuContent
              email={email}
              loadingPath={loadingPath}
              onSelect={(path) => setPendingPath(path)}
            />
          </DropdownMenuContent>
        </RadixDropdownMenu>
      </div>

      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <AvatarButton email={user?.email} avatarUrl={user?.avatar_url} />
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[90vh] rounded-t-xl border-[#2a2d3a] bg-[#1a1d27] p-0 text-[#f1f5f9]"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Account settings</SheetTitle>
              <SheetDescription>Navigate account settings pages.</SheetDescription>
            </SheetHeader>
            <AccountMenuContent
              email={email}
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
