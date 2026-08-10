import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { CalendarClock, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import {
  AuthCard,
  AuthFooter,
  AuthHeading,
  AuthLink,
  AuthResult,
  IconChip,
  Notice,
} from '@/shared/ui/pulse';

// This route renders outside AuthLayout, so the shell, backdrop, and wordmark
// live here to stay visually consistent with the rest of auth.
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] w-full bg-[var(--bg)] font-sans text-[var(--text)] antialiased">
      <div className="pulse-grid pulse-aurora pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
      <div className="relative z-10 flex min-h-[100dvh] flex-col p-6 sm:p-10">
        <div className="flex items-center justify-center sm:justify-start">
          <span
            className="font-[family-name:var(--mono)] text-[27px] font-bold tracking-[0.16em] text-[var(--text)]"
            aria-label="Sentinel"
          >
            SENT<span className="text-[var(--brand)]">I</span>NEL
          </span>
        </div>
        <div className="pulse-rise mx-auto my-auto w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}

// One-off: a primary action that navigates instead of submitting.
function PrimaryLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-11 w-full items-center justify-center rounded-[9px] bg-[var(--brand)] text-[13.5px] font-semibold text-[var(--brand-fg)] transition-colors hover:bg-[var(--brand-d)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
    >
      {children}
    </Link>
  );
}

export default function AccountDeletionConfirmPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    authApi.confirmAccountDeletion(token)
      .then((response) => {
        const scheduledAt = response.data?.data?.scheduled_at;
        setMessage(
          scheduledAt
            ? `Account deletion is scheduled for ${new Date(scheduledAt).toLocaleString()}.`
            : 'Account deletion has been scheduled.',
        );
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

  return (
    <AuthShell>
      {status === 'loading' && (
        <div className="w-full">
          <AuthHeading
            eyebrow="Account deletion"
            icon={Trash2}
            tone="red"
            title="Confirming deletion"
            description="We're verifying the confirmation link from your email."
          />
          <AuthCard>
            <div className="flex items-center gap-3">
              <IconChip icon={Trash2} tone="red" size="sm" />
              <p className="flex items-center gap-2 text-[13px] text-[var(--text2)]" role="status" aria-live="polite">
                <Loader2 className="size-3.5 animate-spin text-[var(--red)]" aria-hidden="true" />
                Validating the confirmation token…
              </p>
            </div>
          </AuthCard>
        </div>
      )}

      {status === 'success' && (
        <div className="w-full">
          <AuthResult
            icon={CalendarClock}
            tone="amber"
            title="Deletion scheduled"
            description={message}
            actions={<PrimaryLink to="/auth/login">Back to sign in</PrimaryLink>}
          >
            <Notice tone="amber">
              Signing in again before the scheduled date cancels the deletion and restores your workspace.
            </Notice>
          </AuthResult>
        </div>
      )}

      {status === 'error' && (
        <div className="w-full">
          <AuthResult
            icon={ShieldAlert}
            tone="red"
            title="Confirmation failed"
            description={message}
            actions={<PrimaryLink to="/auth/login">Back to sign in</PrimaryLink>}
          />
          <AuthFooter>
            Need a hand? <AuthLink to="/auth/login">Contact your workspace owner</AuthLink>
          </AuthFooter>
        </div>
      )}
    </AuthShell>
  );
}
