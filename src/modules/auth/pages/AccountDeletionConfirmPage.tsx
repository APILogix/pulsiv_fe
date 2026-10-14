import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { CalendarClock, ShieldAlert } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import {
  AuthCallout,
  AuthHeading,
  AuthLinkButton,
  AuthPending,
} from '@/shared/ui/pulse';

/**
 * Confirms an account-deletion link from email. Rendered inside AuthLayout (see
 * public-routes.tsx) without the guest guard, since the user may still be
 * signed in on this device.
 */
export default function AccountDeletionConfirmPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    authApi.confirmAccountDeletion(token)
      .then((response) => {
        const when = response.data?.data?.scheduled_at;
        setScheduledAt(when ? new Date(when).toLocaleString() : null);
        setStatus('success');
      })
      .catch((error) => {
        setMessage(getErrorMessage(error));
        setStatus('error');
      });
  }, [token]);

  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }

  if (status === 'loading') {
    return (
      <div className="w-full">
        <AuthHeading title="Confirming deletion" description="We're checking the confirmation link from your email." />
        <AuthPending>Validating the confirmation link…</AuthPending>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-full">
        <AuthHeading title="Deletion not confirmed" description="Your account is unchanged." />
        <div className="flex flex-col gap-4">
          <AuthCallout icon={ShieldAlert} tone="danger" role="alert" title="The confirmation link was rejected">
            {message || 'The link is invalid or has expired.'} Request deletion again from account settings to get a
            new link.
          </AuthCallout>
          <AuthLinkButton to="/auth/login" variant="ghost">
            Back to sign in
          </AuthLinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AuthHeading
        title="Deletion scheduled"
        description={
          scheduledAt ? (
            <>
              Your account will be deleted on <span className="text-[var(--text)]">{scheduledAt}</span>.
            </>
          ) : (
            'Your account is scheduled for deletion.'
          )
        }
      />
      <div className="flex flex-col gap-4">
        <AuthCallout icon={CalendarClock} tone="warning" title="Changed your mind?">
          Signing in again before the scheduled date cancels the deletion and restores your workspace.
        </AuthCallout>
        <AuthLinkButton to="/auth/login">Back to sign in</AuthLinkButton>
      </div>
    </div>
  );
}
