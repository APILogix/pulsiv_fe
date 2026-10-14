import { useRef } from 'react';
import { Outlet, useLocation, Link, NavLink } from 'react-router';
import { CheckCircle2, ChevronRight, ShieldCheck, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';

import { findAvatarMenuItem, accountNavGroups } from './AppHeader/AvatarDropdown';
import { RouteBoundary, useScrollRestoration } from '@/shared/motion';

import { useAuth } from '@/modules/auth/hooks/useAuth';
import { accountApi } from '@/modules/auth/api/account.api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function SettingsLayout() {
  const location = useLocation();
  const breadcrumb = findAvatarMenuItem(location.pathname);
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollRestoration(scrollRef);

  const { user } = useAuth();
  const email = user?.email ?? 'user@sentinel.dev';
  const fullName = user?.full_name ?? null;
  const avatarUrl = user?.avatar_url ?? null;
  const initials = fullName
    ? fullName.slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase();

  // Query account overview to populate navigation badges
  const { data: rawOverview } = useQuery({
    queryKey: ['account-overview'],
    queryFn: accountApi.getOverview,
    staleTime: 60_000,
  });

  const overview = ((rawOverview as any)?.data && (rawOverview as any)?.user === undefined
    ? (rawOverview as any).data
    : rawOverview);

  const mfaEnabled = overview?.mfa_summary?.enabled ?? false;
  const sessionsCount = overview?.sessions?.active_count;
  const backupCodesRemaining = overview?.backup_codes?.remaining ?? overview?.security_health?.checks?.backup_codes_remaining;
  const passkeyCount = overview?.passkeys?.count ?? overview?.mfa_summary?.methods?.filter((m: any) => m?.method === 'security_key')?.length;

  return (
    <div ref={scrollRef} className="scroll-region flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 text-left sm:px-6 md:px-8 xl:px-10">
        {/* Top Breadcrumb Bar */}
        {breadcrumb && (
          <nav className="mb-6 flex items-center gap-1.5 text-[12px] text-[var(--text3)]" aria-label="Breadcrumb">
            <Link to="/account/overview" className="cursor-pointer transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:underline">
              Account settings
            </Link>
            <ChevronRight className="size-3 text-[var(--text3)]" aria-hidden="true" />
            <span className="text-[var(--text3)]">
              {breadcrumb.group.label}
            </span>
            <ChevronRight className="size-3 text-[var(--text3)]" aria-hidden="true" />
            <span className="font-medium text-[var(--text)]" aria-current="page">
              {breadcrumb.item.label}
            </span>
          </nav>
        )}

        {/* Mobile / Tablet Horizontal Navigation Rail */}
        <div className="mb-6 flex overflow-x-auto pb-1 scrollbar-none lg:hidden">
          <div className="flex items-center gap-1.5 border-b border-[var(--border)] pb-2">
            {accountNavGroups.flatMap((g) => g.items).map((item) => {
              const isActive = location.pathname === item.path;

              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors',
                    isActive
                      ? 'bg-[var(--brand)] text-[var(--brand-fg)]'
                      : 'bg-[var(--bg2)] text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)]',
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Two-Column Master / Detail Layout */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[280px_minmax(0,1fr)] xl:gap-10">
          {/* Left Column: Account Navigation Sidebar */}
          <aside className="sticky top-6 hidden lg:flex lg:flex-col lg:gap-5">
            {/* Identity Card */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <Avatar className="size-11 border border-[var(--border2)] bg-[var(--bg2)]">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName || email} className="object-cover" />}
                  <AvatarFallback className="bg-[var(--brand-bg)] font-mono text-[13px] font-semibold text-[var(--text)]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[14px] font-semibold text-[var(--text)]">
                      {fullName || 'Sentinel Member'}
                    </span>
                    <CheckCircle2 className="size-3.5 shrink-0 text-[var(--green)]" />
                  </div>
                  <div className="truncate font-mono text-[11px] text-[var(--text3)]" title={email}>
                    {email}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2.5 text-[11px]">
                <span className="flex items-center gap-1.5 text-[var(--text3)]">
                  <ShieldCheck className="size-3 text-[var(--green)]" />
                  <span>Security status</span>
                </span>
                <span className={clsx('font-mono text-[10px] font-medium', mfaEnabled ? 'text-[var(--green)]' : 'text-[var(--amber)]')}>
                  {mfaEnabled ? '2FA Enabled' : 'Standard'}
                </span>
              </div>
            </div>

            {/* Sidebar Navigation */}
            <nav className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-3 shadow-xs" aria-label="Account Settings Navigation">
              <div className="flex flex-col gap-4">
                {accountNavGroups.map((group, groupIdx) => (
                  <div key={group.label}>

                    {groupIdx > 0 && <div className="mb-3 h-px bg-[var(--border)]" role="separator" />}
                    <div className="px-3 mb-1.5 font-mono text-[10px] font-semibold tracking-wider text-[var(--text3)]">
                      {group.label}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {group.items.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;

                        let badge: string | number | undefined;
                        let badgeTone: 'green' | 'amber' | 'neutral' = 'neutral';

                        if (item.badgeKey === 'mfa') {
                          badge = mfaEnabled ? 'Active' : 'Off';
                          badgeTone = mfaEnabled ? 'green' : 'amber';
                        } else if (item.badgeKey === 'sessions' && sessionsCount !== undefined) {
                          badge = `${sessionsCount}`;
                          badgeTone = 'neutral';
                        } else if (item.badgeKey === 'passkeys' && passkeyCount !== undefined && passkeyCount > 0) {
                          badge = passkeyCount;
                          badgeTone = 'green';
                        } else if (item.badgeKey === 'recovery' && backupCodesRemaining !== undefined) {
                          badge = `${backupCodesRemaining}`;
                          badgeTone = backupCodesRemaining === 0 ? 'amber' : 'neutral';
                        }

                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            aria-current={isActive ? 'page' : undefined}
                            className={clsx(
                              'group relative flex h-9 items-center gap-3 rounded-[var(--radius)] px-3 text-[13px] transition-all duration-100',
                              isActive
                                ? 'bg-[var(--bg2)] font-medium text-[var(--text)] shadow-xs'
                                : 'font-normal text-[var(--text2)] hover:bg-[var(--bg2)]/60 hover:text-[var(--text)] focus-visible:bg-[var(--bg2)] focus-visible:text-[var(--text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border2)]',
                            )}
                          >
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

                            <span className="min-w-0 flex-1 truncate">{item.label}</span>

                            {badge !== undefined && (
                              <span
                                className={clsx(
                                  'inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium tracking-tight',
                                  badgeTone === 'green' && 'bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/20',
                                  badgeTone === 'amber' && 'bg-[var(--amber-bg)] text-[var(--amber)] border border-[var(--amber)]/20',
                                  badgeTone === 'neutral' && 'bg-[var(--bg3)] text-[var(--text3)] border border-[var(--border)]',
                                )}
                              >
                                {badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </nav>
          </aside>

          {/* Right Column: Main Content Canvas */}
          <main className="min-w-0 flex-1">
            <RouteBoundary scope="page">
              <Outlet />
            </RouteBoundary>
          </main>
        </div>
      </div>
    </div>
  );
}

