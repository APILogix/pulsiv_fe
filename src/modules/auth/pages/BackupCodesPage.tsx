import { Navigate, useLocation } from 'react-router';
import { useLoginBackupCode } from '../hooks/useLoginBackupCode';
import { BackupCodeChallenge } from '../components/LoginBackupCodeForm';
import { AuthFooter, AuthLink } from '@/shared/ui/pulse';

export default function BackupCodesPage() {
  const location = useLocation();
  const challengeId: string = location.state?.challengeId || '';
  const { mutate: loginBackupCode, isPending } = useLoginBackupCode();

  // Without a challenge there is nothing to answer; the server would reject it.
  if (!challengeId) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="w-full">
      <BackupCodeChallenge challengeId={challengeId} loginBackupCode={loginBackupCode} isPending={isPending} />
      <AuthFooter>
        Have your authenticator? <AuthLink to="/auth/login">Back to sign in</AuthLink>
      </AuthFooter>
    </div>
  );
}
