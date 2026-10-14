import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Fingerprint,
  History,
  KeySquare,
  Link2,
  Lock,
  Monitor,
  Shield,
  ShieldCheck,
  Terminal,
  User,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* 1. Account Settings Navigation (Authoritative for Settings Sidebar)       */
/* -------------------------------------------------------------------------- */

export interface AccountNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  ariaLabel: string;
  description?: string;
  badgeKey?: 'mfa' | 'sessions' | 'passkeys' | 'recovery';
}

export interface AccountNavGroup {
  label: string;
  description?: string;
  items: AccountNavItem[];
}

/**
 * Full master navigation schema for the Account Settings layout sidebar.
 * Covers all security, sessions, credentials, and profile sub-routes.
 */
export const accountNavGroups: AccountNavGroup[] = [
  {
    label: 'ACCOUNT',
    description: 'Personal details and security posture',
    items: [
      {
        label: 'Overview',
        path: '/account/overview',
        icon: Shield,
        ariaLabel: 'Open account overview',
        description: 'Account health, quick actions, and status',
      },
      {
        label: 'Profile',
        path: '/account/profile',
        icon: User,
        ariaLabel: 'Open profile settings',
        description: 'Avatar, name, email, and preferences',
      },
    ],
  },
  {
    label: 'SECURITY & ACCESS',
    description: 'Credentials and authentication methods',
    items: [
      {
        label: 'Password',
        path: '/account/security/password',
        icon: Lock,
        ariaLabel: 'Open password settings',
        description: 'Update password and authentication credentials',
      },
      {
        label: 'MFA',
        path: '/account/security/mfa',
        icon: ShieldCheck,
        ariaLabel: 'Open multi-factor authentication settings',
        description: 'Authenticator apps, security keys, and SMS',
        badgeKey: 'mfa',
      },
      {
        label: 'Passkeys',
        path: '/account/security/passkeys',
        icon: Fingerprint,
        ariaLabel: 'Open passkeys settings',
        description: 'FIDO2 biometric sign-in credentials',
        badgeKey: 'passkeys',
      },
      {
        label: 'Recovery codes',
        path: '/account/security/recovery-codes',
        icon: KeySquare,
        ariaLabel: 'Open recovery codes settings',
        description: 'Emergency one-time access codes',
        badgeKey: 'recovery',
      },
    ],
  },
  {
    label: 'ACTIVITY & SESSIONS',
    description: 'Device tracking and audit trail',
    items: [
      {
        label: 'Active sessions',
        path: '/account/activity/active-sessions',
        icon: Monitor,
        ariaLabel: 'Open active sessions settings',
        description: 'Devices and locations currently signed in',
        badgeKey: 'sessions',
      },
      {
        label: 'Login history',
        path: '/account/activity/login-history',
        icon: History,
        ariaLabel: 'Open login history settings',
        description: 'Security audit trail and recent activity log',
      },
    ],
  },
  {
    label: 'CONNECTED SERVICES',
    description: 'Third-party integrations and identity providers',
    items: [
      {
        label: 'Linked accounts',
        path: '/account/connected/linked-accounts',
        icon: Link2,
        ariaLabel: 'Open linked accounts settings',
        description: 'Social logins and federated identity',
      },
    ],
  },
];

// Backwards-compatible aliases for existing consumers (e.g. SettingsLayout.tsx)
export type AvatarMenuItem = AccountNavItem;
export type AvatarMenuGroup = AccountNavGroup;
export const avatarMenuGroups = accountNavGroups;

export function findAvatarMenuItem(pathname: string) {
  for (const group of accountNavGroups) {
    const item = group.items.find((menuItem) => menuItem.path === pathname);
    if (item) return { group, item };
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* 2. Distilled Avatar Dropdown Links (High-Level Global Identity Menu)        */
/* -------------------------------------------------------------------------- */

export interface AvatarDropdownItem {
  id: string;
  label: string;
  path?: string;
  icon: LucideIcon;
  ariaLabel: string;
  description?: string;
  action?: 'command-palette' | 'external-link';
  externalUrl?: string;
  shortcut?: string;
}

export interface AvatarDropdownGroup {
  label: string;
  items: AvatarDropdownItem[];
}

/**
 * Distilled items for the global avatar dropdown in AppHeader.
 * Follows GitHub/Vercel/Linear best practices: concise identity, fast
 * links to settings & profile, command palette quick jump, and sign out.
 */
export const avatarDropdownGroups: AvatarDropdownGroup[] = [
  {
    label: 'ACCOUNT',
    items: [
      {
        id: 'overview',
        label: 'Account overview',
        path: '/account/overview',
        icon: Shield,
        ariaLabel: 'Go to account overview and security health',
        description: 'Security health, MFA & quick actions',
      },
      {
        id: 'profile',
        label: 'Profile & preferences',
        path: '/account/profile',
        icon: User,
        ariaLabel: 'Go to personal profile and details',
        description: 'Display name, email & avatar',
      },
    ],
  },
  {
    label: 'QUICK ACTIONS',
    items: [
      {
        id: 'command-palette',
        label: 'Command palette',
        icon: Terminal,
        ariaLabel: 'Open command palette',
        description: 'Search navigation, tools & actions',
        action: 'command-palette',
        shortcut: '⌘K',
      },
      {
        id: 'documentation',
        label: 'Documentation',
        icon: BookOpen,
        ariaLabel: 'Open documentation in new tab',
        description: 'Guides, APIs & SDK documentation',
        action: 'external-link',
        externalUrl: 'https://docs.sentinel.com',
      },
    ],
  },
];


