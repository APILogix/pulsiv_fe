import type { LucideIcon } from 'lucide-react';
import {
  Fingerprint,
  History,
  KeySquare,
  Link2,
  Lock,
  Monitor,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react';

export interface AvatarMenuItem {
  label: string;
  path: string;
  icon: LucideIcon;
  ariaLabel: string;
}

export interface AvatarMenuGroup {
  label: string;
  items: AvatarMenuItem[];
}

export const avatarMenuGroups: AvatarMenuGroup[] = [
  {
    label: 'ACCOUNT',
    items: [
      { label: 'Overview', path: '/account/overview', icon: Shield, ariaLabel: 'Open account overview' },
      { label: 'Profile', path: '/account/profile', icon: User, ariaLabel: 'Open profile settings' },
    ],
  },
  {
    label: 'SECURITY & ACCESS',
    items: [
      { label: 'Password', path: '/account/security/password', icon: Lock, ariaLabel: 'Open password settings' },
      { label: 'MFA', path: '/account/security/mfa', icon: ShieldCheck, ariaLabel: 'Open multi-factor authentication settings' },
      { label: 'Passkeys', path: '/account/security/passkeys', icon: Fingerprint, ariaLabel: 'Open passkeys settings' },
      { label: 'Recovery codes', path: '/account/security/recovery-codes', icon: KeySquare, ariaLabel: 'Open recovery codes settings' },
    ],
  },
  {
    label: 'ACTIVITY & SESSIONS',
    items: [
      { label: 'Active sessions', path: '/account/activity/active-sessions', icon: Monitor, ariaLabel: 'Open active sessions settings' },
      { label: 'Login history', path: '/account/activity/login-history', icon: History, ariaLabel: 'Open login history settings' },
    ],
  },
  {
    label: 'CONNECTED SERVICES',
    items: [
      { label: 'Linked accounts', path: '/account/connected/linked-accounts', icon: Link2, ariaLabel: 'Open linked accounts settings' },
    ],
  },
];

export function findAvatarMenuItem(pathname: string) {
  for (const group of avatarMenuGroups) {
    const item = group.items.find((menuItem) => menuItem.path === pathname);
    if (item) return { group, item };
  }

  return null;
}
