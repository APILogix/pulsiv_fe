import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { LynkTraceLogo } from '@/shared/components/LynkTraceLogo';

import { orgApi } from '../api/org.api';
import { orgQueryKeys, useOrganizations } from '../hooks/useOrganizations';
import { useOrganizationCreation } from '../hooks/useOrganizationCreation';
import { useOrgStore } from '../store/org.store';
import { bootstrapService, type BootstrapOwnedOrganization } from '@/modules/bootstrap';
import { useLogout } from '@/modules/auth/hooks/useLogout';
import { markOrganizationSetup } from '@/modules/auth/services/post-login-setup-flag';
import { useDebounce } from '@/shared/hooks/useDebounce';
import {
  AuthButton,
  AuthCallout,
  AuthFact,
  AuthField,
  AuthHeading,
  AuthLink,
  AuthLinkButton,
  AuthNote,
  AuthPending,
  AuthTextButton,
  authTextActionClass,
  fieldInputClass,
} from '@/shared/ui/pulse';
import { cn } from '@/lib/utils';

// Same auth input geometry (design/auth/DESIGN.md): 44px, 14px text.
const INPUT = cn(fieldInputClass, 'h-11 text-[14px]');

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Prefer the backend's `{ error: { message } }` envelope over the transport message. */
function errorMessage(error: unknown): string {
  const data = (error as { response?: { data?: { error?: unknown; message?: unknown } } })?.response?.data;
  if (data?.error && typeof data.error === 'object') {
    const message = (data.error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  if (typeof data?.error === 'string' && data.error) return data.error;
  if (typeof data?.message === 'string' && data.message) return data.message;
  if (error instanceof Error && error.message) return error.message;
  return 'The request failed. Check your connection and try again.';
}

function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <LynkTraceLogo size={24} variant="badge" />
      <span className="inline-flex items-baseline gap-1.5">
        <span className="text-[17px] font-bold tracking-[-0.02em] text-[var(--text)]">Lynk<span className="font-medium text-[var(--text2)]">Trace</span></span>
        <span className="text-[11px] font-mono text-[var(--text3)] uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] bg-[var(--bg2)] border border-[var(--border)]">Console</span>
      </span>
    </span>
  );
}

/** Workspace URL preview under the name field, with the live availability check. */
function WorkspaceUrl({
  slug,
  status,
  onRetry,
}: {
  slug: string;
  status: 'short' | 'checking' | 'available' | 'taken' | 'unknown';
  onRetry: () => void;
}) {
  return (
    <div
      className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg1)] px-3 py-2 text-[12.5px] transition-colors"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[11.5px] font-medium text-[var(--text3)]">URL</span>
        <span className="truncate font-mono font-medium text-[var(--text)]">
          app.pulse.dev/<span className="font-semibold text-emerald-400">{slug}</span>
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {status === 'checking' && (
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--text3)]">
            <Loader2 className="size-3 animate-spin text-emerald-400" aria-hidden="true" />
            Checking…
          </span>
        )}
        {status === 'available' && (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
            <Check className="size-3 stroke-[2.5]" aria-hidden="true" />
            Available
          </span>
        )}
        {status === 'taken' && (
          <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400">
            <AlertTriangle className="size-3" aria-hidden="true" />
            Taken
          </span>
        )}
        {status === 'short' && (
          <span className="text-[11px] text-[var(--text3)]">Min. 2 characters</span>
        )}
        {status === 'unknown' && (
          <span className="text-[11px] text-[var(--text3)]">
            <button type="button" onClick={onRetry} className={cn(authTextActionClass, 'text-[11px]')}>
              Check again
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Shown instead of the form to someone who already owns an organization, so
 * they learn about the one-owned limit before filling anything in. Members of
 * other organizations never see this: only ownership counts.
 */
function OwnerLimitReached({ owned }: { owned: BootstrapOwnedOrganization | null }) {
  const archived = owned?.status === 'archived';

  return (
    <div className="flex flex-col">
      <AuthHeading
        title="You already own an organization"
        description={
          owned
            ? `Each account can own one organization, and you own ${owned.name}${archived ? ', which is archived' : ''}. Being a member of other organizations does not count.`
            : 'Each account can own one organization. Being a member of other organizations does not count.'
        }
      />

      {owned && (
        <AuthFact
          label="Owned organization"
          value={
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="truncate">{owned.name}</span>
              <span className="shrink-0 font-[family-name:var(--mono)] text-[12px] font-normal text-[var(--text3)]">/{owned.slug}</span>
            </span>
          }
          className="mb-6"
        />
      )}

      <p className="text-[14px] leading-[1.6] text-[var(--text2)]">
        To create a new one, transfer ownership of {owned ? owned.name : 'it'} to another member or delete it. Both are in
        its organization settings.
      </p>

      {owned && (
        <div className="mt-6 flex flex-col gap-3">
          <AuthLinkButton to={`/${owned.slug}/dashboard`}>Open {owned.name}</AuthLinkButton>
          <AuthNote>
            Or go to <AuthLink to={`/${owned.slug}/admin/settings`}>organization settings</AuthLink> to transfer ownership.
          </AuthNote>
        </div>
      )}
    </div>
  );
}

export default function CreateOrganizationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setActiveOrgId = useOrgStore((s) => s.setActiveOrgId);
  const setActiveOrgSlug = useOrgStore((s) => s.setActiveOrgSlug);
  const { organizations, activeOrgSlug } = useOrganizations();
  const creation = useOrganizationCreation();
  const logout = useLogout();

  // The persisted snapshot can be minutes old (ownership may have changed in
  // another tab), so re-check eligibility whenever this page opens.
  useEffect(() => {
    void bootstrapService.refreshBootstrap().catch(() => undefined);
  }, []);

  const [orgName, setOrgName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const submittingRef = useRef(false);
  // One key per attempt, so a retried request after a timeout cannot create twice.
  const idempotencyKeyRef = useRef<string | null>(null);

  const ids = { name: useId() };

  // ── Workspace URL ──
  const debouncedName = useDebounce(orgName, 300);
  const liveSlug = slugify(orgName);
  const derivedSlug = slugify(debouncedName);
  const isDebouncing = orgName.trim() !== debouncedName.trim();
  const slugLongEnough = derivedSlug.length >= 2;

  const slugQuery = useQuery({
    queryKey: [...orgQueryKeys.lists(), 'slug-availability', derivedSlug],
    queryFn: () => orgApi.checkSlugAvailability(derivedSlug),
    enabled: slugLongEnough && !isDebouncing,
    staleTime: 30_000,
    retry: false,
  });

  const slugStatus: 'short' | 'checking' | 'available' | 'taken' | 'unknown' = !slugLongEnough && !isDebouncing
    ? 'short'
    : isDebouncing || slugQuery.isFetching
      ? 'checking'
      : slugQuery.isError
        ? 'unknown'
        : slugQuery.data?.available
          ? 'available'
          : slugQuery.data
            ? 'taken'
            : 'checking';

  // When the check itself fails, let the server decide: it appends a number to a taken slug.
  const slugUsable = slugStatus === 'available' || slugStatus === 'unknown';

  const canSubmit = orgName.trim().length > 0 && slugUsable && !creating;

  const submitLabel = creating
    ? 'Creating organization…'
    : slugStatus === 'checking' && orgName.trim()
      ? 'Checking URL…'
      : slugStatus === 'taken'
        ? 'Choose another name'
        : 'Create organization';

  const create = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    idempotencyKeyRef.current ??=
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `org_create_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const idempotencyKey = idempotencyKeyRef.current;

    setCreating(true);
    try {
      const created = await orgApi.createOrganization(
        {
          name: orgName.trim(),
          slug: derivedSlug || undefined,
        },
        { idempotencyKey, silent: true },
      );

      setActiveOrgId(created.id);
      setActiveOrgSlug(created.slug ?? null);
      markOrganizationSetup();
      void queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });

      // Move the session and bootstrap snapshot before entering the new org.
      await bootstrapService.switchOrganization(created.id).catch(() => undefined);
      idempotencyKeyRef.current = null;
      navigate(created.slug ? `/${created.slug}/dashboard` : '/dashboard', { replace: true });
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      submittingRef.current = false;
      setCreating(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    let valid = true;
    if (!orgName.trim()) {
      setNameError('Enter a name for your organization.');
      valid = false;
    } else if (slugStatus === 'taken') {
      setNameError(`/${derivedSlug} is taken. Try a different name.`);
      valid = false;
    }
    if (!valid || !slugUsable) return;

    void create();
  };

  const backTo = activeOrgSlug ?? organizations[0]?.slug ?? null;
  const backName = organizations.find((org) => org.slug === backTo)?.name;

  const ownerLimitReached = !creation.allowed && !creating;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] font-sans text-[var(--text)] antialiased caret-[var(--text)] selection:bg-[var(--text)] selection:text-[var(--bg)]">
      <header className="flex items-center justify-between gap-4 px-6 pt-6 sm:px-10 sm:pt-8">
        <Wordmark />
        {backTo ? (
          <Link to={`/${backTo}/dashboard`} className={authTextActionClass}>
            {backName ? `Back to ${backName}` : 'Back to dashboard'}
          </Link>
        ) : (
          <AuthTextButton onClick={() => logout.mutate()} disabled={logout.isPending}>
            Sign out
          </AuthTextButton>
        )}
      </header>

      <main className="flex flex-1 justify-center px-6 py-12 sm:px-10 sm:py-16">
        <div className="w-full max-w-[560px]">
          {ownerLimitReached ? (
            <OwnerLimitReached owned={creation.ownedOrganization} />
          ) : (
          <>
          <AuthHeading
            title="Create your organization"
            description="An organization holds your projects, members, and billing. You can change any of this later in organization settings."
          />

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5" aria-busy={creating}>
            <fieldset disabled={creating} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
              <legend className="sr-only">Organization details</legend>

              <div className="flex flex-col gap-2">
                <AuthField label="Organization name" htmlFor={ids.name} error={nameError ?? undefined}>
                  <input
                    id={ids.name}
                    name="name"
                    value={orgName}
                    onChange={(event) => {
                      setOrgName(event.target.value);
                      setNameError(null);
                      idempotencyKeyRef.current = null;
                    }}
                    placeholder="Acme"
                    autoComplete="organization"
                    maxLength={255}
                    required
                    autoFocus
                    aria-invalid={nameError ? true : undefined}
                    className={INPUT}
                  />
                </AuthField>
                {liveSlug && <WorkspaceUrl slug={liveSlug} status={slugStatus} onRetry={() => void slugQuery.refetch()} />}
              </div>

            </fieldset>

            {formError && (
              <AuthCallout icon={AlertTriangle} tone="danger" role="alert" title={formError} />
            )}

            <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5">
              <AuthButton type="submit" disabled={!canSubmit} pending={creating}>
                {submitLabel}
              </AuthButton>
              <AuthNote>You can configure settings and invite members later.</AuthNote>
            </div>
          </form>
          </>
          )}
        </div>
      </main>

    </div>
  );
}
