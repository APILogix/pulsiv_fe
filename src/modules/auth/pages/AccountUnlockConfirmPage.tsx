import { useEffect } from 'react';
import { Link, useSearchParams, Navigate } from 'react-router';
import { CheckCircle2, Loader2, LockKeyhole, ShieldAlert } from 'lucide-react';
import { useConfirmAccountUnlock } from '../hooks/useConfirmAccountUnlock';
import {
  AuthCard,
  AuthFooter,
  AuthHeading,
  AuthLink,
  AuthResult,
  IconChip,
} from '@/shared/ui/pulse';

// One-off: a primary action that navigates instead of submitting.
function PrimaryLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-11 w-full items-center justify-center rounded-[9px] bg-[var(--brand)] text-[13.5px] font-semibold text-[var(--brand-fg)] transition-colors hover:bg-[var(--brand-d)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg1)]"
    >
      {children}
    </Link>
  );
}

export default function AccountUnlockConfirmPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { mutate: confirmUnlock, isPending, isError, isSuccess } = useConfirmAccountUnlock();

  useEffect(() => {
    if (token) {
      confirmUnlock({ token });
    }
  }, [token, confirmUnlock]);

  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }

  if (isError) {
    return (
      <div className="w-full">
        <AuthResult
          icon={ShieldAlert}
          tone="red"
          title="Unlock link not accepted"
          description="This link is invalid or has already expired. Request a fresh unlock link to try again."
          actions={<PrimaryLink to="/auth/unlock">Request a new link</PrimaryLink>}
        />

        <AuthFooter>
          <AuthLink to="/auth/login">Back to sign in</AuthLink>
        </AuthFooter>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="w-full">
        <AuthResult
          icon={CheckCircle2}
          tone="green"
          title="Account unlocked"
          description="The lock has been lifted. Sign in to pick up where you left off."
          actions={<PrimaryLink to="/auth/login">Sign in to your account</PrimaryLink>}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <AuthHeading
        eyebrow="Account defense"
        icon={LockKeyhole}
        tone="amber"
        title="Unlocking your account"
        description="We're validating the unlock link you opened. This only takes a moment."
      />

      <AuthCard>
        <div className="flex items-center gap-3">
          <IconChip icon={LockKeyhole} tone="amber" size="sm" />
          <p className="flex items-center gap-2 text-[13px] text-[var(--text2)]" role="status" aria-live="polite">
            <Loader2 className="size-3.5 animate-spin text-[var(--amber)]" aria-hidden="true" />
            {isPending ? 'Verifying the unlock token…' : 'Preparing the unlock request…'}
          </p>
        </div>
      </AuthCard>

      <AuthFooter>
        <AuthLink to="/auth/login">Back to sign in</AuthLink>
      </AuthFooter>
    </div>
  );
}
