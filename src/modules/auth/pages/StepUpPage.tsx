import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import type { MFAChallenge } from '../types/auth.types';
import { stepUpWithPasskey, WebAuthnCeremonyError } from '../services/webauthn.client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import { Loader2, Mail, KeyRound } from 'lucide-react';

export default function StepUpPage() {
  const navigate = useNavigate();
  const setStepUpFresh = useAuthStore((s) => s.setStepUpFresh);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [challenge, setChallenge] = useState<MFAChallenge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const isPasskey = challenge?.device_type === 'hardware_key';

  const goBack = () => {
    const from = new URLSearchParams(window.location.search).get('from') || '/dashboard';
    navigate(from, { replace: true });
  };

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        const data = await authApi.requestMFAChallenge();
        setChallenge(data);
        setIsLoading(false);
      } catch (err) {
        setError(getErrorMessage(err));
        setIsLoading(false);
      }
    };
    fetchChallenge();
  }, []);

  const handleVerify = async () => {
    if (!challenge) return;
    setError('');
    setIsVerifying(true);
    try {
      await authApi.verifyMFAChallenge({ challenge_id: challenge.challenge_id, code });
      setStepUpFresh(true);
      goBack();
      setIsVerifying(false);
    } catch (err) {
      setError(getErrorMessage(err));
      setIsVerifying(false);
    }
  };

  const handlePasskeyVerify = async () => {
    if (!challenge) return;
    setError('');
    setIsVerifying(true);
    try {
      await stepUpWithPasskey(challenge.challenge_id);
      setStepUpFresh(true);
      goBack();
      setIsVerifying(false);
    } catch (err) {
      setError(err instanceof WebAuthnCeremonyError ? err.message : getErrorMessage(err));
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!challenge || challenge.device_type !== 'email') return;
    setIsResending(true);
    setError('');
    try {
      await authApi.resendEmailMfaOtp(challenge.device_id);
      setIsResending(false);
    } catch (err) {
      setError(getErrorMessage(err));
      setIsResending(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Identity Verification</CardTitle>
        <CardDescription>
          {isPasskey
            ? 'Use your security key or passkey to continue.'
            : challenge?.device_type === 'email'
            ? 'Enter the code sent to your email to continue.'
            : 'Enter a code from your authenticator app to continue.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : isPasskey ? (
          <>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button className="w-full flex items-center justify-center gap-2" onClick={handlePasskeyVerify} disabled={isVerifying}>
              {isVerifying ? <><Loader2 className="h-4 w-4 animate-spin" /> Waiting for security key…</> : <><KeyRound size={16} /> Use security key</>}
            </Button>
          </>
        ) : (
          <>
            {challenge?.device_type === 'email' && (
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="flex items-center gap-2 text-sm">
                  <Mail size={16} /> Email code sent
                </span>
                <Button variant="outline" size="sm" onClick={handleResend} disabled={isResending}>
                  {isResending ? 'Sending...' : 'Resend'}
                </Button>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="code">6-Digit Code</Label>
              <Input id="code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button className="w-full hover:text-primary-foreground" onClick={handleVerify} disabled={!challenge || isVerifying || code.length < 6}>
              {isVerifying ? 'Verifying...' : 'Verify'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
