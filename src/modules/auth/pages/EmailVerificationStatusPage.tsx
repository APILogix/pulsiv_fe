import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, MailCheck, RefreshCw } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { authQueryKeys } from '../api/auth.query';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useResendVerification } from '../hooks/useResendVerification';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EmailVerificationStatusPage() {
  const { data: user } = useCurrentUser();
  const { data: status, isLoading } = useQuery({
    queryKey: [...authQueryKeys.currentUser, 'verification'],
    queryFn: authApi.getEmailVerificationStatus,
  });
  const { mutate: resend, isPending } = useResendVerification();
  const verified = Boolean(status?.verified ?? status?.email_verified ?? user?.email_verified);

  return (
    <div className="flex max-w-[800px] flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text)]">Email verification</h1>
        <p className="mt-1 text-sm text-[var(--text2)]">Manage the verification status of your account email.</p>
      </div>
      <Card className="border-[var(--border)] bg-[var(--bg1)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--text)]">
            {verified ? <CheckCircle2 className="text-emerald-400" size={18} /> : <MailCheck className="text-amber-400" size={18} />}
            {isLoading ? 'Checking status…' : verified ? 'Email verified' : 'Email verification required'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[var(--text2)]">
          <p>{user?.email ?? status?.email ?? 'Your account email'}</p>
          {!verified && (
            <Button onClick={() => user?.email && resend({ email: user.email })} disabled={isPending || !user?.email}>
              <RefreshCw size={16} className="mr-2" />
              {isPending ? 'Sending…' : 'Resend verification email'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
