import { useEffect } from 'react';
import { useSearchParams, Navigate } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { useConfirmAccountUnlock } from '../hooks/useConfirmAccountUnlock';
import {
  AuthCallout,
  AuthFooter,
  AuthHeading,
  AuthLink,
  AuthLinkButton,
  AuthPending,
} from '@/shared/ui/pulse';

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
        <AuthHeading title="This unlock link didn't work" />
        <div className="flex flex-col gap-4">
          <AuthCallout icon={ShieldAlert} tone="danger" role="alert" title="Link invalid or expired">
            Unlock links work once and expire shortly. Request a fresh one to try again.
          </AuthCallout>
          <AuthLinkButton to="/auth/unlock">Request a new link</AuthLinkButton>
        </div>
        <AuthFooter>
          <AuthLink to="/auth/login">Back to sign in</AuthLink>
        </AuthFooter>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="w-full">
        <AuthHeading
          title="Account unlocked"
          description="The lock has been lifted. Sign in to pick up where you left off."
        />
        <AuthLinkButton to="/auth/login">Sign in</AuthLinkButton>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AuthHeading
        title="Unlocking your account"
        description="We're checking the unlock link you opened. This only takes a moment."
      />
      <AuthPending>{isPending ? 'Verifying the unlock link…' : 'Preparing the unlock request…'}</AuthPending>
      <AuthFooter>
        <AuthLink to="/auth/login">Back to sign in</AuthLink>
      </AuthFooter>
    </div>
  );
}
