/**
 * SocialProviders — the single source of truth for passwordless provider UI.
 *
 * ## Which providers exist
 *
 * Exactly two: Google and GitHub. This mirrors the backend, where
 * `identity-link.config.ts` declares:
 *
 *     export type LinkableProvider = 'google' | 'github';
 *     const LINKABLE: LinkableProvider[] = ['google', 'github'];
 *
 * Microsoft is deliberately absent. `POST /auth/login/social/microsoft` is
 * rejected by `isLinkableProvider()` with a 400, and no Microsoft passport
 * strategy is ever registered — only Google and GitHub are wired in
 * `passport-social.service.ts`. The backend's validation *message* mentions
 * Microsoft, but that string is stale and does not reflect the accepted set.
 * Rendering a Microsoft button would ship a guaranteed dead end, so we don't.
 *
 * ## Runtime availability vs. compile-time support
 *
 * A provider being *supported* is not the same as being *configured*: the
 * backend only registers a strategy when its client id and secret are present in
 * the environment. `GET /auth/sso/discovery` reports the live set as
 * `configured_link_providers`, which is why callers pass `available` here rather
 * than assuming both work.
 */
import { Github } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OAuthButton } from '@/shared/ui/pulse';

/** Providers the platform can actually authenticate. Matches the backend union. */
export const SOCIAL_PROVIDERS = ['google', 'github'] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

/**
 * Google's mark keeps its own brand palette. These are third-party asset
 * colours mandated by Google's brand guidelines, not theme tokens — the one
 * sanctioned exception to the mono palette.
 */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.25-.95 2.3-2 3.01l3.23 2.5c1.88-1.73 2.97-4.27 2.97-7.3 0-.71-.06-1.39-.18-2.04H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.61-2.44l-3.23-2.5c-.9.6-2.05.95-3.38.95-2.6 0-4.81-1.75-5.6-4.1l-3.34 2.58A9.99 9.99 0 0 0 12 22z"
      />
      <path
        fill="#4A90E2"
        d="M6.4 13.9A6 6 0 0 1 6.09 12c0-.66.11-1.3.31-1.9L3.06 7.52A10 10 0 0 0 2 12c0 1.61.38 3.14 1.06 4.48l3.34-2.58z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.98c1.47 0 2.79.5 3.83 1.48l2.87-2.87C16.95 2.96 14.7 2 12 2 8.08 2 4.7 4.24 3.06 7.52l3.34 2.58c.79-2.35 3-4.12 5.6-4.12z"
      />
    </svg>
  );
}

/** GitHub's mark is monochrome, so it inherits the current text colour. */
function GithubIcon() {
  return <Github className="size-[18px]" aria-hidden="true" />;
}

const PROVIDER_META: Record<SocialProvider, { label: string; icon: React.ReactNode }> = {
  google: { label: 'Google', icon: <GoogleIcon /> },
  github: { label: 'GitHub', icon: <GithubIcon /> },
};

export function socialProviderLabel(provider: SocialProvider): string {
  return PROVIDER_META[provider].label;
}

export function SocialProviderButtons({
  onSelect,
  pendingProvider,
  disabled,
  available = SOCIAL_PROVIDERS,
  linked,
  verb = 'Continue with',
  className,
}: {
  onSelect: (provider: SocialProvider) => void;
  /** Leading copy on each button — "Continue with" on sign-in, "Sign up with" on register. */
  verb?: string;
  /** Provider currently redirecting, if any. */
  pendingProvider?: SocialProvider | null;
  disabled?: boolean;
  /**
   * Providers the deployment has credentials for
   * (`configured_link_providers` from SSO discovery). Defaults to all supported
   * providers for the pre-discovery state, where the live set is not yet known.
   */
  available?: readonly SocialProvider[];
  /**
   * Providers this account has already used (`linked_social_providers`). Shown
   * as a hint so a returning user picks the same one instead of creating a
   * second identity for the same address.
   */
  linked?: readonly SocialProvider[];
  className?: string;
}) {
  const visible = SOCIAL_PROVIDERS.filter((provider) => available.includes(provider));
  if (visible.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {visible.map((provider) => {
        const isLinked = linked?.includes(provider) ?? false;
        return (
          <div key={provider} className="relative">
            <OAuthButton
              icon={PROVIDER_META[provider].icon}
              onClick={() => onSelect(provider)}
              disabled={disabled || (pendingProvider != null && pendingProvider !== provider)}
              pending={pendingProvider === provider}
            >
              {verb} {PROVIDER_META[provider].label}
            </OAuthButton>
            {isLinked && pendingProvider !== provider && (
              <span
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] font-medium uppercase tracking-[0.09em] text-[var(--text3)]"
                aria-label={`You have signed in with ${PROVIDER_META[provider].label} before`}
              >
                Used before
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
