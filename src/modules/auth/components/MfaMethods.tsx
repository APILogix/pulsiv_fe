/**
 * Shared presentation for second-factor challenges (sign-in MFA, the standalone
 * /auth/login/mfa route, and step-up). Behaviour stays in each caller; this file
 * only owns copy and the method list so the three surfaces cannot drift apart.
 *
 * Visual rules: design/auth/DESIGN.md → "Second factor".
 */
import { ChevronRight, KeyRound, LifeBuoy, Mail, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { LoginMfaMethod, MFAType } from '../types/auth.types';
import { AuthFact } from '@/shared/ui/pulse';

const METHOD_ICON: Record<string, LucideIcon> = {
  totp: Smartphone,
  email: Mail,
  sms: Smartphone,
  hardware_key: KeyRound,
  backup_codes: LifeBuoy,
};

const METHOD_LABEL: Record<string, string> = {
  totp: 'Authenticator app',
  email: 'Email code',
  sms: 'Text message',
  hardware_key: 'Security key',
  backup_codes: 'Backup code',
};

export const METHOD_DESCRIPTION: Record<string, string> = {
  totp: 'Enter the 6-digit code from your authenticator app.',
  email: 'Enter the 6-digit code we just sent to your email.',
  sms: 'Enter the 6-digit code we just sent to your phone.',
  hardware_key: 'Use your security key or passkey to continue.',
  backup_codes: 'Enter one of your single-use recovery codes.',
};

export function methodTitle(type: MFAType | undefined): string {
  return (type && METHOD_LABEL[type]) || 'Verification';
}

export function methodIcon(type: MFAType | undefined): LucideIcon {
  return (type && METHOD_ICON[type]) || KeyRound;
}

export function methodDescription(type: MFAType | undefined): string {
  return (type && METHOD_DESCRIPTION[type]) || 'Confirm your identity to finish signing in.';
}

/** "Verifying with" fact row: the factor the user must reach for. */
export function ActiveMethodFact({
  type,
  name,
  hint,
}: {
  type: MFAType;
  name?: string;
  hint?: string;
}) {
  const Icon = methodIcon(type);
  const label = name || methodTitle(type);
  return (
    <AuthFact
      label="Verifying with"
      value={
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-[var(--text2)]" aria-hidden="true" />
          <span className="truncate">{label}</span>
          {hint && hint !== label && (
            <span className="truncate font-normal text-[var(--text3)]">· {hint}</span>
          )}
        </span>
      }
    />
  );
}

/**
 * Alternative factors as one hairline-divided list. Rows are plain buttons: icon,
 * name, hint, chevron. No per-row cards, no coloured pills.
 */
export function MethodList({
  methods,
  disabled,
  onSelect,
}: {
  methods: LoginMfaMethod[];
  disabled?: boolean;
  onSelect: (method: LoginMfaMethod) => void;
}) {
  return (
    <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius)] border border-[var(--border)]">
      {methods.map((method) => {
        const Icon = methodIcon(method.type);
        const label = method.name || methodTitle(method.type);
        return (
          <li key={method.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(method)}
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors duration-150 hover:bg-[var(--bg2)] focus-visible:bg-[var(--bg2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--text)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Icon className="size-4 shrink-0 text-[var(--text2)]" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="truncate text-[13px] font-medium text-[var(--text)]">{label}</span>
                  {method.is_primary && <span className="shrink-0 text-[12px] text-[var(--text3)]">Primary</span>}
                </span>
                {method.display_hint && method.display_hint !== label && (
                  <span className="mt-0.5 block truncate text-[12px] text-[var(--text3)]">{method.display_hint}</span>
                )}
              </span>
              <ChevronRight className="size-4 shrink-0 text-[var(--text3)]" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
