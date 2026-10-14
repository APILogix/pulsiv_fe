import { useEffect, useState, useActionState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, UserPlus } from 'lucide-react';
import { orgApi } from '../api/org.api';
import { bootstrapService } from '@/modules/bootstrap';
import { apiErrorMessage } from '@/infrastructure/api-client/api-error';
import { orgQueryKeys } from '../hooks/useOrganizations';
import type { InvitationValidation } from '../types/org.types';
import { useAuthStore } from '@/modules/auth/store/auth.store';
import { AuthCardSkeleton } from '@/shared/skeletons';
import {
  AuthButton,
  AuthCallout,
  AuthFact,
  AuthFooter,
  AuthHeading,
  AuthLinkButton,
  AuthSubmit,
  AuthTextButton,
} from '@/shared/ui/pulse';

/** Server message from a normalized ApiError (it has no axios `response`);
 *  shown inline on this page, so the global toast is skipped. */
const apiMessage = apiErrorMessage;

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase().replace(/_/g, ' ');
}

/**
 * Invitation landing. Rendered inside AuthLayout without the guest guard: both
 * signed-in and signed-out visitors arrive here from the invite email.
 */
export default function AcceptInviteLandingPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const signupParam = searchParams.get('signup');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Cached query instead of a mount-time effect: one request per token, and
  // revisiting the link (back button) does not re-validate.
  const validation = useQuery({
    queryKey: ['invitation-validate', token],
    queryFn: () => orgApi.validateInvitation(token!),
    enabled: Boolean(token),
    retry: false,
    staleTime: 60_000,
  });
  const invitation: InvitationValidation | null = validation.data ?? null;
  const error = !token
    ? 'This link is missing its invitation token.'
    : validation.isError
      ? apiMessage(validation.error) || 'This invitation is invalid or has expired.'
      : null;
  const isValidating = validation.isLoading;
  const [isDeclining, setIsDeclining] = useState(false);
  const [declineError, setDeclineError] = useState<string | null>(null);

  useEffect(() => {
    if (signupParam === '1' && !isAuthenticated) {
      navigate(`/auth/register?inviteToken=${token || ''}`);
    }
  }, [signupParam, isAuthenticated, navigate, token]);

  const [state, submitAction] = useActionState(
    async (_prevState: { success: boolean; error: string | null }, _formData: FormData) => {
      try {
        if (!token) return { success: false, error: 'Missing invitation token.' };

        await orgApi.acceptInvitation(token);

        // The org switcher prefers the bootstrap snapshot over the org list
        // query, so invalidating the query alone never showed the new org.
        await bootstrapService.refreshBootstrap().catch(() => undefined);
        queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });

        return { success: true, error: null };
      } catch (err) {
        return { success: false, error: apiMessage(err) || 'Failed to accept the invitation.' };
      }
    },
    { success: false, error: null }
  );

  useEffect(() => {
    if (state.success) {
      navigate('/dashboard');
    }
  }, [state.success, navigate]);

  async function decline() {
    if (!invitation) return;
    setIsDeclining(true);
    setDeclineError(null);
    try {
      await orgApi.declineInvitation(invitation.id);
      queryClient.removeQueries({ queryKey: ['invitation-validate', token] });
      navigate('/dashboard');
    } catch (err) {
      setDeclineError(apiMessage(err) || 'Failed to decline the invitation.');
      setIsDeclining(false);
    }
  }

  if (isValidating) {
    return <AuthCardSkeleton />;
  }

  if (error || !invitation) {
    return (
      <div className="w-full">
        <AuthHeading
          title="This invitation can't be used"
          description="Ask the person who invited you to send a new one."
        />
        <div className="flex flex-col gap-4">
          <AuthCallout icon={ShieldAlert} tone="danger" role="alert" title="Invitation not valid">
            {error ?? 'This invitation is invalid or has expired.'}
          </AuthCallout>
          <AuthLinkButton to={isAuthenticated ? '/dashboard' : '/auth/login'} variant="ghost">
            {isAuthenticated ? 'Go to dashboard' : 'Back to sign in'}
          </AuthLinkButton>
        </div>
      </div>
    );
  }

  const orgName = invitation.orgName || 'this organization';
  const actionError = state.error || declineError;

  return (
    <div className="w-full">
      <AuthHeading
        title={`Join ${orgName}`}
        description={`You've been invited to this Sentinel workspace with the ${formatRole(invitation.role)} role.`}
      />

      <div className="flex flex-col gap-4">
        <AuthFact label="Invitation for" value={invitation.email} />
        <AuthFact
          label="Role"
          value={formatRole(invitation.role)}
          action={
            invitation.expiresAt ? (
              <span className="text-[12px] text-[var(--text3)]">
                Expires {new Date(invitation.expiresAt).toLocaleDateString()}
              </span>
            ) : undefined
          }
        />

        {!invitation.accountExists && (
          <AuthCallout icon={UserPlus} title="Create an account first">
            There's no Sentinel account for <span className="text-[var(--text)]">{invitation.email}</span> yet. Create
            one with this address, then accept.
          </AuthCallout>
        )}

        {actionError && (
          <AuthCallout icon={ShieldAlert} tone="danger" role="alert" title="Something went wrong">
            {actionError}
          </AuthCallout>
        )}

        {invitation.accountExists ? (
          isAuthenticated ? (
            <form action={submitAction}>
              <AuthSubmit pendingLabel="Accepting…">Accept invitation</AuthSubmit>
            </form>
          ) : (
            <AuthLinkButton to="/auth/login">Sign in to accept</AuthLinkButton>
          )
        ) : (
          <AuthButton type="button" onClick={() => navigate(`/auth/register?inviteToken=${token || ''}`)}>
            Create account
          </AuthButton>
        )}
      </div>

      <AuthFooter>
        Not expecting this?{' '}
        <AuthTextButton onClick={decline} disabled={isDeclining}>
          {isDeclining ? 'Declining…' : 'Decline invitation'}
        </AuthTextButton>
      </AuthFooter>
    </div>
  );
}
