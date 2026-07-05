import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Download,
  KeyRound,
  Laptop,
  LifeBuoy,
  Lock,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';
import { authApi } from '../api/auth.api';
import { authQueryCache, authQueryKeys } from '../api/auth.query';
import type { UserSecuritySummary } from '../types/auth.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ACTIONS = [
  {
    title: 'Profile',
    description: 'Name, avatar, locale, and contact visibility.',
    href: '/settings/profile',
    icon: User,
  },
  {
    title: 'Password',
    description: 'Change your password after fresh verification.',
    href: '/settings/password',
    icon: Lock,
  },
  {
    title: 'MFA devices',
    description: 'Authenticator apps, email codes, and security keys.',
    href: '/settings/mfa',
    icon: ShieldCheck,
  },
  {
    title: 'Backup codes',
    description: 'Regenerate emergency sign-in codes.',
    href: '/settings/backup-codes',
    icon: KeyRound,
  },
  {
    title: 'Trusted devices',
    description: 'Review devices trusted for reduced MFA prompts.',
    href: '/settings/trusted-devices',
    icon: Laptop,
  },
  {
    title: 'MFA recovery',
    description: 'Request recovery when MFA methods are unavailable.',
    href: '/settings/mfa-recovery',
    icon: LifeBuoy,
  },
  {
    title: 'Privacy export',
    description: 'Download account security and profile data.',
    href: '/settings/privacy',
    icon: Download,
  },
  {
    title: 'Delete account',
    description: 'Start the email-confirmed deletion process.',
    href: '/settings/privacy',
    icon: Trash2,
  },
];

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge className={ok ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[#eab308]/10 text-[#eab308]'}>
      {label}
    </Badge>
  );
}

export default function SecurityCenterPage() {
  const { data: summary, isLoading } = useQuery<UserSecuritySummary>({
    queryKey: authQueryKeys.securitySummary,
    queryFn: authApi.getUserSecuritySummary,
    staleTime: authQueryCache.securityStateStaleMs,
    gcTime: authQueryCache.gcMs,
  });

  return (
    <div className="flex w-full max-w-[1200px] flex-col gap-6">
      <div>
        <h1 className="mb-2 text-[24px] font-semibold text-white tracking-normal">Security center</h1>
        <p className="text-[14px] leading-relaxed text-[#8A8F98]">
          Review the security state of your account and manage sensitive settings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-[#1f1f1f] bg-[#141414]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#8A8F98]">Email</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-[18px] font-semibold text-white">
              {isLoading ? 'Checking' : summary?.email_verified ? 'Verified' : 'Unverified'}
            </span>
            <StatusBadge ok={!!summary?.email_verified} label={summary?.email_verified ? 'OK' : 'Action needed'} />
          </CardContent>
        </Card>

        <Card className="border-[#1f1f1f] bg-[#141414]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#8A8F98]">MFA</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-[18px] font-semibold text-white">
              {isLoading ? 'Checking' : summary?.mfa_enabled ? `${summary.verified_mfa_device_count} methods` : 'Disabled'}
            </span>
            <StatusBadge ok={!!summary?.mfa_enabled} label={summary?.mfa_enabled ? 'Protected' : 'Enable MFA'} />
          </CardContent>
        </Card>

        <Card className="border-[#1f1f1f] bg-[#141414]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#8A8F98]">Sessions</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-[18px] font-semibold text-white">
              {isLoading ? 'Checking' : `${summary?.active_session_count ?? 0} active`}
            </span>
            <Link to="/settings/sessions">
              <Button variant="outline" size="sm" className="border-[#2a2a2a] bg-[#1a1a1a] text-[#e8e8e8]">
                Review
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.title} to={action.href}>
              <Card className="h-full border-[#1f1f1f] bg-[#141414] transition-colors hover:border-[#10b981]/40 hover:bg-[#171717]">
                <CardHeader className="pb-3">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-[#262626] bg-[#0c0c0c] text-[#10b981]">
                    <Icon size={18} />
                  </div>
                  <CardTitle className="text-[15px] text-white">{action.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-[13px] leading-relaxed text-[#8A8F98]">
                  {action.description}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="rounded-lg border border-[#1f1f1f] bg-[#141414] p-4 text-[13px] text-[#8A8F98]">
        <div className="flex items-center gap-2 text-white">
          <Activity size={16} className="text-[#10b981]" />
          Recent security activity is available under My audit logs.
        </div>
      </div>
    </div>
  );
}
