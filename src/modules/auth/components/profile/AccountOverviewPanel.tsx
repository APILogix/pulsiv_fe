import { Link } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
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

function HealthBanner({ overview }: { overview: AccountOverview }) {
  const { status, actions_needed, checks } = overview.security_health;
  const secure = status === 'secure';
  const critical = status === 'critical';
  const Icon = secure ? ShieldCheck : critical ? ShieldAlert : AlertTriangle;
  const tone = secure
    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
    : critical
      ? 'border-red-500/20 bg-red-500/10 text-red-400'
      : 'border-amber-500/20 bg-amber-500/10 text-amber-400';

  const actions = [
    !checks.email_verified && { label: 'Verify email', href: '/account/profile' },
    !checks.mfa_enabled && { label: 'Enable MFA', href: '/account/security/mfa' },
    checks.backup_codes_remaining <= 0 && { label: 'Regenerate backup codes', href: '/account/security/recovery-codes' },
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  return (
    <section className={`rounded-xl border p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] ${tone}`}>
      <div className="flex gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-current/10">
          <Icon className="size-5" />
        </div>
        <div>
          <h1 className="text-[18px] font-semibold text-current">
            {secure ? 'Your account is secure' : critical ? 'Critical security issues' : `${actions_needed} actions needed`}
          </h1>
          <div className="mt-1 text-[13px] text-current/80">
            {secure ? (
              'All security checks passed.'
            ) : (
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {actions.map((action) => (
                  <Link key={action.label} to={action.href} className="font-medium hover:underline">
                    {action.label} -&gt;
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  href,
  cta,
  warning,
  chips,
}: {
  icon: typeof Shield;
  label: string;
  value: string;
  href?: string;
  cta?: string;
  warning?: 'amber' | 'red';
  chips?: string[];
}) {
  return (
    <div className="group rounded-xl border border-border/80 bg-card/80 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card">
      <div className="mb-3 flex items-center justify-between">
        <Icon className="size-5 text-muted-foreground" />
        {href && cta ? (
          <Link to={href} className="text-[12px] font-medium text-primary hover:underline">
            {cta} -&gt;
          </Link>
        ) : null}
      </div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-[16px] font-semibold ${warning === 'red' ? 'text-red-400' : warning === 'amber' ? 'text-amber-400' : 'text-foreground'}`}>
        {value}
      </div>
      {chips?.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {chips.map((chip) => (
            <Badge key={chip} variant="outline" className="border-border text-[10px] uppercase text-muted-foreground">
              {chip}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AccountOverviewPanel() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['account-overview'],
    queryFn: accountApi.getOverview,
  });
  const signOutAll = useMutation({
    mutationFn: accountApi.signOutAllDevices,
    onSuccess: () => toast.success('Other devices signed out.'),
    onError: () => toast.error('Could not sign out other devices.'),
  });
  const exportData = useMutation({
    mutationFn: () => accountApi.exportData({}),
    onSuccess: () => toast.success('Data export queued.'),
    onError: () => toast.error('Could not queue data export.'),
  });

  if (isLoading || !overview) {
    return <div className="text-[14px] text-muted-foreground">Loading account overview...</div>;
  }

  const user = overview.user;
  const backupRemaining = overview.backup_codes?.remaining ?? overview.security_health.checks.backup_codes_remaining;
  const trustedCount = overview.trusted_devices?.count ?? (overview.security_health.checks.has_trusted_devices ? 1 : 0);
  const passkeyCount = overview.passkeys?.count ?? overview.mfa_summary.methods.filter((m) => m.method === 'security_key').length;
  const avatarStyle = { backgroundColor: colorForId(user.id) };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-[linear-gradient(135deg,var(--bg1),var(--bg2)_58%,var(--brand-bg))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_70%_20%,var(--brand-bg),transparent_48%),radial-gradient(circle_at_30%_90%,var(--blue-bg),transparent_42%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="flex min-w-0 flex-col justify-between gap-8">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[12px] font-medium text-primary">
                <ShieldCheck className="size-3.5" />
                Personal security dashboard
              </div>
              <h1 className="max-w-[760px] text-[34px] font-semibold leading-tight tracking-normal text-foreground md:text-[44px]">
                Account control center
              </h1>
              <p className="mt-3 max-w-[620px] text-[15px] leading-7 text-muted-foreground">
                Review identity, recovery coverage, trusted access, and recent account activity from one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild><Link to="/account/profile"><User className="size-4" />Edit profile</Link></Button>
              <Button variant="outline" asChild><Link to="/account/security/mfa"><Shield className="size-4" />{overview.mfa_summary.enabled ? 'Manage MFA' : 'Enable MFA'}</Link></Button>
              <Button variant="ghost" onClick={() => exportData.mutate()} disabled={exportData.isPending}><ArrowUpRight className="size-4" />Export data</Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-background/50 p-5 backdrop-blur">
            <div className="flex items-center gap-4">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="size-20 rounded-2xl object-cover" />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-2xl text-[26px] font-semibold text-white" style={avatarStyle}>
                  {initialsForName(user.display_name)}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-[22px] font-semibold text-foreground">{user.display_name}</div>
                <div className="mt-1 truncate text-[13px] text-muted-foreground">{user.email}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="bg-emerald-500/10 text-emerald-400"><CheckCircle2 className="size-3" />Verified</Badge>
                  <Badge variant="outline" className="border-border text-muted-foreground">Free</Badge>
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <div className="text-[11px] uppercase text-muted-foreground">Sessions</div>
                <div className="mt-1 text-[20px] font-semibold">{overview.sessions.active_count}</div>
              </div>
              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <div className="text-[11px] uppercase text-muted-foreground">Codes</div>
                <div className={`mt-1 text-[20px] font-semibold ${backupRemaining === 0 ? 'text-red-400' : ''}`}>{backupRemaining}</div>
              </div>
              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <div className="text-[11px] uppercase text-muted-foreground">Devices</div>
                <div className="mt-1 text-[20px] font-semibold">{trustedCount}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="flex min-w-0 flex-col gap-6">
          <HealthBanner overview={overview} />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            <StatusCard icon={ShieldCheck} label="Email" value="Verified" />
            <StatusCard
              icon={Shield}
              label="MFA"
              value={overview.mfa_summary.enabled ? 'Enabled' : 'Disabled'}
              href="/account/security/mfa"
              cta={overview.mfa_summary.enabled ? 'Manage' : 'Enable'}
              warning={overview.mfa_summary.enabled ? undefined : 'amber'}
              chips={overview.mfa_summary.methods.map((m) => m.method)}
            />
            <StatusCard icon={Monitor} label="Sessions" value={`${overview.sessions.active_count} active`} href="/account/activity/active-sessions" cta="Review" />
            <StatusCard icon={KeySquare} label="Backup Codes" value={`${backupRemaining} remaining`} href="/account/security/recovery-codes" cta="Manage" warning={backupRemaining === 0 ? 'red' : backupRemaining < 3 ? 'amber' : undefined} />
            <StatusCard icon={Smartphone} label="Trusted Devices" value={`${trustedCount} trusted`} href="/account/activity/active-sessions" cta="Review" />
            <StatusCard icon={Fingerprint} label="Passkeys" value={`${passkeyCount} configured`} href="/account/security/passkeys" cta="Manage" />
          </section>
        </div>

        <section className="rounded-2xl border border-border bg-card/80 shadow-[0_18px_55px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[15px] font-semibold text-foreground">Recent Activity</h2>
          <Link to="/account/activity/login-history" className="text-[12px] font-medium text-primary hover:underline">View all -&gt;</Link>
        </div>
        <div className="divide-y divide-border">
          {overview.recent_activity.length === 0 ? (
            <div className="flex items-center gap-3 px-4 py-6 text-[13px] text-muted-foreground">
              <History className="size-4" />
              No recent activity
            </div>
          ) : overview.recent_activity.map((item, index) => {
            const Icon = eventIcon(item.event_type);
            return (
              <div key={`${item.event_type}-${item.created_at}-${index}`} className="flex items-center gap-3 px-4 py-3">
                <Icon className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium text-foreground">{item.description || item.event_type}</div>
                  <div className="truncate text-[12px] text-muted-foreground">{[item.location, item.ip_address].filter(Boolean).join(' / ')}</div>
                </div>
                <div className="text-[12px] text-muted-foreground">{relativeTime(item.created_at)}</div>
              </div>
            );
          })}
        </div>
        </section>
      </div>

      <section className="flex flex-wrap gap-2">
        <Button variant="ghost" asChild><Link to="/account/security/password"><Lock className="size-4" />Change password</Link></Button>
        <Button variant={overview.mfa_summary.enabled ? 'outline' : 'default'} asChild><Link to="/account/security/mfa"><Shield className="size-4" />{overview.mfa_summary.enabled ? 'Manage MFA' : 'Enable MFA'}</Link></Button>
        <Button variant="ghost" onClick={() => signOutAll.mutate()} disabled={signOutAll.isPending}><Monitor className="size-4" />Sign out all devices</Button>
        <Button variant="ghost" onClick={() => exportData.mutate()} disabled={exportData.isPending}><User className="size-4" />Download my data</Button>
      </section>
    </div>
  );
}
