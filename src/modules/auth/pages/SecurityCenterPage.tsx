import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ChevronRight,
  Download,
  KeyRound,
  Laptop,
  LifeBuoy,
  Lock,
  MailCheck,
  MonitorSmartphone,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { authQueryCache, authQueryKeys } from '../api/auth.query';
import type { UserSecuritySummary } from '../types/auth.types';
import {
  HeroFacts,
  IconChip,
  Notice,
  PageHero,
  Panel,
  Pill,
  Row,
  RowStack,
  SectionHeading,
  SettingRow,
  type HeroFact,
  type SurfaceTone,
} from '@/shared/ui/pulse';
import { Button, CardSkeleton, Timestamp } from '@/shared/observe';

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: SurfaceTone;
}

const ACTIONS: QuickAction[] = [
  {
    title: 'Profile',
    description: 'Name, avatar, locale, and contact visibility.',
    href: '/settings/profile',
    icon: User,
    tone: 'brand',
  },
  {
    title: 'Password',
    description: 'Change your password after fresh verification.',
    href: '/settings/password',
    icon: Lock,
    tone: 'brand',
  },
  {
    title: 'MFA devices',
    description: 'Authenticator apps, email codes, and security keys.',
    href: '/settings/mfa',
    icon: ShieldCheck,
    tone: 'green',
  },
  {
    title: 'Backup codes',
    description: 'Regenerate emergency sign-in codes.',
    href: '/settings/backup-codes',
    icon: KeyRound,
    tone: 'amber',
  },
  {
    title: 'Trusted devices',
    description: 'Review devices trusted for reduced MFA prompts.',
    href: '/settings/trusted-devices',
    icon: Laptop,
    tone: 'blue',
  },
  {
    title: 'MFA recovery',
    description: 'Request recovery when MFA methods are unavailable.',
    href: '/settings/mfa-recovery',
    icon: LifeBuoy,
    tone: 'violet',
  },
  {
    title: 'Privacy export',
    description: 'Download account security and profile data.',
    href: '/settings/privacy',
    icon: Download,
    tone: 'ai',
  },
  {
    title: 'Delete account',
    description: 'Start the email-confirmed deletion process.',
    href: '/settings/privacy',
    icon: Trash2,
    tone: 'red',
  },
];

const SKELETON_SLOTS = ['posture-a', 'posture-b', 'posture-c'];

// One-off: hoverable quick-action link card for the manage grid.
function ActionCard({ action }: { action: QuickAction }) {
  return (
    <Link
      to={action.href}
      className="pulse-edge pulse-lift group flex h-full flex-col gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--bg1)] p-4 transition-colors hover:border-[var(--border2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      <div className="flex items-start justify-between gap-2">
        <IconChip icon={action.icon} tone={action.tone} />
        <ChevronRight className="mt-1 size-4 text-[var(--text3)]" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold text-[var(--text)]">{action.title}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--text2)]">{action.description}</p>
      </div>
    </Link>
  );
}

function heroFacts(summary: UserSecuritySummary): HeroFact[] {
  return [
    {
      label: 'Email',
      value: summary.email_verified ? 'Verified' : 'Unverified',
      tone: summary.email_verified ? 'green' : 'amber',
      icon: MailCheck,
    },
    {
      label: 'MFA',
      value: summary.mfa_enabled ? 'Enabled' : 'Disabled',
      tone: summary.mfa_enabled ? 'green' : 'amber',
      icon: ShieldCheck,
    },
    {
      label: 'Verified factors',
      value: summary.verified_mfa_device_count,
      tone: summary.verified_mfa_device_count > 0 ? 'brand' : 'amber',
      icon: KeyRound,
    },
    {
      label: 'Active sessions',
      value: summary.active_session_count,
      tone: 'ai',
      icon: MonitorSmartphone,
    },
  ];
}

export default function SecurityCenterPage() {
  const { data: summary, isLoading } = useQuery<UserSecuritySummary>({
    queryKey: authQueryKeys.securitySummary,
    queryFn: authApi.getUserSecuritySummary,
    staleTime: authQueryCache.securityStateStaleMs,
    gcTime: authQueryCache.gcMs,
  });

  const facts = summary ? heroFacts(summary) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Account security"
        title="Security center"
        description="Review the security state of your account and manage sensitive settings."
        icon={ShieldCheck}
      >
        {facts && <HeroFacts facts={facts} />}
      </PageHero>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SKELETON_SLOTS.map((slot) => (
            <CardSkeleton key={slot} />
          ))}
        </div>
      ) : summary ? (
        <Panel
          title="Security posture"
          description="Signals recorded for your account across sign-in, factors, and sessions."
          icon={ShieldCheck}
          tone="brand"
          bodyClassName="p-0"
        >
          <RowStack>
            <Row>
              <SettingRow
                label="Email verification"
                description="A verified address is required for recovery and security notifications."
              >
                {summary.email_verified ? (
                  <Pill tone="green" dot>
                    Verified
                  </Pill>
                ) : (
                  <Pill tone="amber" dot>
                    Action needed
                  </Pill>
                )}
              </SettingRow>
            </Row>
            <Row>
              <SettingRow
                label="Multi-factor authentication"
                description={
                  summary.mfa_enabled
                    ? `${summary.verified_mfa_device_count} verified factor${summary.verified_mfa_device_count === 1 ? '' : 's'} protecting sign-in.`
                    : 'Add an authenticator app or security key to protect sign-in.'
                }
              >
                {summary.mfa_enabled ? (
                  <Pill tone="green" dot>
                    Protected
                  </Pill>
                ) : (
                  <Pill tone="amber" dot>
                    Enable MFA
                  </Pill>
                )}
              </SettingRow>
            </Row>
            <Row>
              <SettingRow
                label="Active sessions"
                description="Devices currently holding a valid session for this account."
              >
                <span className="font-[family-name:var(--display)] text-[15px] font-semibold tabular-nums text-[var(--text)]">
                  {summary.active_session_count}
                </span>
                <Link to="/settings/sessions">
                  <Button variant="secondary">Review</Button>
                </Link>
              </SettingRow>
            </Row>
            <Row>
              <SettingRow label="Account status" description="Lock state applied by security policy or failed sign-in attempts.">
                {summary.account_locked ? (
                  <Pill tone="red" dot>
                    Locked
                  </Pill>
                ) : (
                  <Pill tone="green" dot>
                    {summary.status}
                  </Pill>
                )}
              </SettingRow>
            </Row>
            <Row>
              <SettingRow label="Last sign-in" description="Most recent successful authentication for this account.">
                {summary.last_login_at ? (
                  <Timestamp value={summary.last_login_at} />
                ) : (
                  <span className="text-[13px] text-[var(--text3)]">No sign-in recorded</span>
                )}
              </SettingRow>
            </Row>
            <Row>
              <SettingRow label="Last password change" description="Rotate your password if you suspect it was exposed.">
                {summary.last_password_change ? (
                  <Timestamp value={summary.last_password_change} />
                ) : (
                  <span className="text-[13px] text-[var(--text3)]">Never changed</span>
                )}
              </SettingRow>
            </Row>
          </RowStack>
        </Panel>
      ) : null}

      <div className="flex flex-col gap-4">
        <SectionHeading title="Manage" description="Account and security settings grouped by what they control." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ACTIONS.map((action) => (
            <ActionCard key={action.title} action={action} />
          ))}
        </div>
      </div>

      <Notice
        tone="blue"
        icon={Activity}
        title="Recent security activity"
        action={
          <Link to="/account/activity/login-history">
            <Button variant="secondary">Open audit logs</Button>
          </Link>
        }
      >
        Sign-in attempts, factor changes, and session revocations are recorded in your personal audit log.
      </Notice>
    </div>
  );
}
