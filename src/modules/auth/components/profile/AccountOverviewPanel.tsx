import { useMemo } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Download,
  Fingerprint,
  History,
  KeySquare,
  Lock,
  LogIn,
  Monitor,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { accountApi, type AccountOverview } from '../../api/account.api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { colorForId, initialsForName } from './account-avatar';

function relativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(delta / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function eventIcon(type: string) {
  if (type.includes('failed')) return AlertTriangle;
  if (type.includes('password')) return Lock;
  if (type.includes('mfa')) return Shield;
  if (type.includes('device')) return Smartphone;
  return LogIn;
}

function AccountOverviewSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-8 w-60 bg-[var(--bg2)]" />
        <Skeleton className="h-4 w-96 bg-[var(--bg2)]" />
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full bg-[var(--bg2)]" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-44 bg-[var(--bg2)]" />
              <Skeleton className="h-4 w-56 bg-[var(--bg2)]" />
              <Skeleton className="h-4 w-32 bg-[var(--bg2)]" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 bg-[var(--bg2)]" />
            <Skeleton className="h-9 w-28 bg-[var(--bg2)]" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4">
            <Skeleton className="h-4 w-24 bg-[var(--bg2)] mb-3" />
            <Skeleton className="h-6 w-32 bg-[var(--bg2)] mb-2" />
            <Skeleton className="h-3 w-40 bg-[var(--bg2)]" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
          <Skeleton className="h-5 w-40 bg-[var(--bg2)] mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full bg-[var(--bg2)]" />
            ))}
          </div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5">
          <Skeleton className="h-5 w-36 bg-[var(--bg2)] mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full bg-[var(--bg2)]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AccountOverviewPanel() {
  const { data: rawOverview, isLoading } = useQuery({
    queryKey: ['account-overview'],
    queryFn: accountApi.getOverview,
  });

  const overview = useMemo(() => {
    if (!rawOverview) return undefined;
    return ((rawOverview as any)?.data && (rawOverview as any)?.success !== undefined
      ? (rawOverview as any).data
      : rawOverview) as AccountOverview;
  }, [rawOverview]);

  const signOutAll = useMutation({
    mutationFn: accountApi.signOutAllDevices,
    onSuccess: () => toast.success('Other devices signed out.'),
    onError: () => toast.error('Could not sign out other devices.'),
  });

  const exportData = useMutation({
    mutationFn: () => accountApi.exportData({}),
    onSuccess: () => toast.success('Personal data export archive queued for download.'),
    onError: () => toast.error('Could not queue data export.'),
  });

  if (isLoading || !overview || !overview.user) {
    return <AccountOverviewSkeleton />;
  }

  const user = overview.user;
  const rawChecks = overview.security_health?.checks as Partial<AccountOverview['security_health']['checks']> | undefined;
  const checks = {
    email_verified: Boolean(rawChecks?.email_verified ?? user?.email_verified),
    mfa_enabled: Boolean(rawChecks?.mfa_enabled ?? overview.mfa_summary?.enabled),
    backup_codes_remaining: Number(rawChecks?.backup_codes_remaining ?? overview.backup_codes?.remaining ?? 0),
    has_trusted_devices: Boolean(rawChecks?.has_trusted_devices ?? ((overview.trusted_devices?.count ?? 0) > 0)),
    has_recovery_method: Boolean(rawChecks?.has_recovery_method ?? ((overview.backup_codes?.remaining ?? 0) > 0)),
  };

  const backupRemaining = overview.backup_codes?.remaining ?? checks.backup_codes_remaining;
  const trustedCount = overview.trusted_devices?.count ?? (checks.has_trusted_devices ? 1 : 0);
  const mfaMethods = overview.mfa_summary?.methods ?? [];
  const passkeyCount = overview.passkeys?.count ?? mfaMethods.filter((m) => m?.method === 'security_key').length;
  const mfaEnabled = overview.mfa_summary?.enabled ?? checks.mfa_enabled ?? false;
  const avatarStyle = { backgroundColor: colorForId(user?.id || '') };

  const health = {
    status: overview.security_health?.status ?? 'secure',
    actions_needed: overview.security_health?.actions_needed ?? 0,
    checks,
  };
  const isFullySecure = health.status === 'secure';

  const pendingActions = [
    !checks.email_verified && { label: 'Verify your email address', href: '/account/profile' },
    !checks.mfa_enabled && { label: 'Enable two-factor authentication (2FA)', href: '/account/security/mfa' },
    backupRemaining <= 0 && { label: 'Regenerate recovery codes', href: '/account/security/recovery-codes' },
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  const activeSessionsCount = overview.sessions?.active_count ?? 1;
  const recentActivity = overview.recent_activity ?? [];

  return (
    <div className="flex w-full flex-col gap-6 text-left">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--text)] sm:text-[28px]">
          Account Overview
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text2)]">
          Manage your personal credentials, identity, security posture, and active sessions across Sentinel.
        </p>
      </div>

      {/* Identity & Posture Banner */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.display_name}
                width={64}
                height={64}
                loading="lazy"
                decoding="async"
                className="size-16 rounded-full border-2 border-[var(--border2)] object-cover sm:size-18"
              />
            ) : (
              <div
                className="flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-[var(--border2)] text-[22px] font-semibold text-white sm:size-18 sm:text-[24px]"
                style={avatarStyle}
              >
                {initialsForName(user.display_name)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-[18px] font-semibold text-[var(--text)] sm:text-[20px]">
                  {user.display_name}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--green)]/20 bg-[var(--green-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--green)]">
                  <CheckCircle2 className="size-3" />
                  Verified
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--bg2)] px-2 py-0.5 font-mono text-[11px] text-[var(--text3)]">
                  Personal Account
                </span>
              </div>
              <div className="mt-1 truncate font-mono text-[12px] text-[var(--text3)]" title={user.email}>
                {user.email}
              </div>
              <div className="mt-2 flex items-center gap-4 text-[12px] text-[var(--text3)]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-[var(--green)]" />
                  {isFullySecure ? 'Security posture: High' : `${health.actions_needed} action needed`}
                </span>
                <span>•</span>
                <span className="font-mono">{user.timezone}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button asChild variant="outline" className="border-[var(--border2)] bg-[var(--bg2)] text-[var(--text)] hover:bg-[var(--bg3)] hover:text-white">
              <Link to="/account/profile">
                <User className="mr-1.5 size-3.5" />
                Edit profile
              </Link>
            </Button>
            <Button asChild className="bg-[var(--brand)] text-[var(--brand-fg)] hover:opacity-90">
              <Link to="/account/security/mfa">
                <Shield className="mr-1.5 size-3.5" />
                {mfaEnabled ? 'Manage 2FA' : 'Enable 2FA'}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              title="Export personal data archive"
              disabled={exportData.isPending}
              onClick={() => exportData.mutate()}
              className="border-[var(--border2)] bg-[var(--bg2)] text-[var(--text2)] hover:text-[var(--text)]"
            >
              <Download className="size-4" />
            </Button>
          </div>
        </div>

        {/* Security Health Alert Notice if actions are needed */}
        {!isFullySecure && pendingActions.length > 0 && (
          <div className="mt-5 rounded-[var(--radius)] border border-[var(--amber)]/25 bg-[var(--amber-bg)] p-3.5 text-[13px] text-[var(--amber)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-medium">Recommended security enhancements:</span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {pendingActions.map((action) => (
                    <Link
                      key={action.label}
                      to={action.href}
                      className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--amber)]/30 bg-[var(--bg1)] px-2.5 py-1 text-[12px] font-medium text-[var(--text)] transition-colors hover:border-[var(--amber)] hover:text-[var(--amber)]"
                    >
                      <span>{action.label}</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Four Core Pillars Metric Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Pillar 1: Password */}
        <div className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-all duration-150 hover:border-[var(--border2)] hover:bg-[var(--bg2)]/40">
          <div className="flex items-center justify-between">
            <span className="flex size-7 items-center justify-center rounded-[var(--radius)] bg-[var(--bg2)] text-[var(--text3)] group-hover:text-[var(--text)]">
              <Lock className="size-3.5" />
            </span>
            <Link
              to="/account/security/password"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text3)] transition-colors hover:text-[var(--text)]"
            >
              <span>Update</span>
              <ArrowRight className="size-2.5" />
            </Link>
          </div>
          <div className="mt-3 text-[15px] font-semibold text-[var(--text)]">
            Password Protected
          </div>
          <p className="mt-1 text-[12px] text-[var(--text3)]">
            Strong hash stored securely
          </p>
        </div>

        {/* Pillar 2: MFA */}
        <div className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-all duration-150 hover:border-[var(--border2)] hover:bg-[var(--bg2)]/40">
          <div className="flex items-center justify-between">
            <span className="flex size-7 items-center justify-center rounded-[var(--radius)] bg-[var(--bg2)] text-[var(--text3)] group-hover:text-[var(--text)]">
              <ShieldCheck className="size-3.5" />
            </span>
            <Link
              to="/account/security/mfa"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text3)] transition-colors hover:text-[var(--text)]"
            >
              <span>Configure</span>
              <ArrowRight className="size-2.5" />
            </Link>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[15px] font-semibold text-[var(--text)]">Two-Factor Auth</span>
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${mfaEnabled ? 'text-[var(--green)]' : 'text-[var(--amber)]'}`}>
              <span className={`size-1.5 rounded-full ${mfaEnabled ? 'bg-[var(--green)]' : 'bg-[var(--amber)]'}`} />
              {mfaEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-[var(--text3)]">
            {mfaMethods.length > 0
              ? `${mfaMethods.length} active verification method(s)`
              : 'Add an authenticator app'}
          </p>
        </div>

        {/* Pillar 3: Passkeys */}
        <div className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-all duration-150 hover:border-[var(--border2)] hover:bg-[var(--bg2)]/40">
          <div className="flex items-center justify-between">
            <span className="flex size-7 items-center justify-center rounded-[var(--radius)] bg-[var(--bg2)] text-[var(--text3)] group-hover:text-[var(--text)]">
              <Fingerprint className="size-3.5" />
            </span>
            <Link
              to="/account/security/passkeys"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text3)] transition-colors hover:text-[var(--text)]"
            >
              <span>Manage</span>
              <ArrowRight className="size-2.5" />
            </Link>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[15px] font-semibold text-[var(--text)]">Passkeys / FIDO2</span>
            <span className="font-mono text-[12px] font-medium text-[var(--text)] tabular-nums">{passkeyCount} registered</span>
          </div>
          <p className="mt-1 text-[12px] text-[var(--text3)]">
            Biometric & hardware keys
          </p>
        </div>

        {/* Pillar 4: Recovery Codes */}
        <div className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-all duration-150 hover:border-[var(--border2)] hover:bg-[var(--bg2)]/40">
          <div className="flex items-center justify-between">
            <span className="flex size-7 items-center justify-center rounded-[var(--radius)] bg-[var(--bg2)] text-[var(--text3)] group-hover:text-[var(--text)]">
              <KeySquare className="size-3.5" />
            </span>
            <Link
              to="/account/security/recovery-codes"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text3)] transition-colors hover:text-[var(--text)]"
            >
              <span>View</span>
              <ArrowRight className="size-2.5" />
            </Link>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[15px] font-semibold text-[var(--text)]">Recovery Codes</span>
            <span className={`font-mono text-[12px] font-semibold tabular-nums ${backupRemaining === 0 ? 'text-[var(--red)]' : backupRemaining < 3 ? 'text-[var(--amber)]' : 'text-[var(--text)]'}`}>
              {backupRemaining} left
            </span>
          </div>
          <p className="mt-1 text-[12px] text-[var(--text3)]">
            Single-use backup access codes
          </p>
        </div>
      </section>

      {/* Split Section: Active Devices vs Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Active Sessions Overview */}
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5">
            <div className="flex items-center gap-2">
              <Monitor className="size-4 text-[var(--text3)]" />
              <h2 className="text-[14px] font-semibold text-[var(--text)]">
                Active Devices & Sessions
              </h2>
            </div>
            <Link
              to="/account/activity/active-sessions"
              className="text-[12px] font-medium text-[var(--text2)] transition-colors hover:text-[var(--text)]"
            >
              Manage ({activeSessionsCount}) →
            </Link>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)]/50 p-3.5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-[var(--green-bg)] text-[var(--green)]">
                  <Monitor className="size-4.5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-[var(--text)]">Current Session</span>
                    <span className="rounded-full bg-[var(--green-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--green)]">
                      Active Now
                    </span>
                  </div>
                  <div className="text-[12px] text-[var(--text3)]">
                    Protected browser session with valid token
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[12px] text-[var(--text3)]">
                {activeSessionsCount} device(s) currently signed in
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOutAll.mutate()}
                disabled={signOutAll.isPending}
                className="h-8 text-[12px] text-[var(--red)] hover:bg-[var(--red-bg)] hover:text-[var(--red)]"
              >
                Sign out other devices
              </Button>
            </div>
          </div>
        </section>

        {/* Recent Security Activity Timeline */}
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5">
            <div className="flex items-center gap-2">
              <History className="size-4 text-[var(--text3)]" />
              <h2 className="text-[14px] font-semibold text-[var(--text)]">
                Recent Activity
              </h2>
            </div>
            <Link
              to="/account/activity/login-history"
              className="text-[12px] font-medium text-[var(--text2)] transition-colors hover:text-[var(--text)]"
            >
              Full log →
            </Link>
          </div>

          <div className="mt-3 divide-y divide-[var(--border)]">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-[13px] text-[var(--text3)]">
                <Clock className="size-5 mb-2 opacity-50" />
                No recent security activity recorded
              </div>
            ) : (
              recentActivity.slice(0, 4).map((item, index) => {
                const Icon = eventIcon(item.event_type);
                return (
                  <div
                    key={`${item.event_type}-${item.created_at}-${index}`}
                    className="flex items-center gap-3 py-3 text-[13px]"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--bg2)] text-[var(--text3)]">
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-[var(--text)]">
                        {item.description || item.event_type}
                      </div>
                      <div className="truncate font-mono text-[11px] text-[var(--text3)]">
                        {[item.location, item.ip_address].filter(Boolean).join(' • ')}
                      </div>
                    </div>
                    <div className="shrink-0 font-mono text-[11px] text-[var(--text3)]">
                      {relativeTime(item.created_at)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Quick Access Footer Bar */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] px-5 py-4">
        <div className="text-[13px] text-[var(--text2)]">
          Need an archive of your account telemetry, audits, and profile data?
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData.mutate()}
            disabled={exportData.isPending}
            className="border-[var(--border2)] bg-[var(--bg2)] text-[12px] text-[var(--text)] hover:bg-[var(--bg3)]"
          >
            <Download className="mr-1.5 size-3.5" />
            {exportData.isPending ? 'Preparing export…' : 'Export account data'}
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-[var(--border2)] bg-[var(--bg2)] text-[12px] text-[var(--text)] hover:bg-[var(--bg3)]"
          >
            <Link to="/account/connected/linked-accounts">
              Linked services
              <ArrowRight className="ml-1.5 size-3" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

