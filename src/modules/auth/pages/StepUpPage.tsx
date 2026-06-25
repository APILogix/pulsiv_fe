import { useState } from 'react';
import { useNavigate } from 'react-router';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';

export default function StepUpPage() {
  const navigate = useNavigate();
  const setStepUpFresh = useAuthStore((s) => s.setStepUpFresh);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setError('');
    try {
      const challenge = await authApi.requestMFAChallenge();
      await authApi.verifyMFAChallenge({ challenge_id: challenge.challenge_id, code });
      setStepUpFresh(true);
      const from = new URLSearchParams(window.location.search).get('from') || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Identity Verification</CardTitle>
        <CardDescription>Enter a code from your authenticator app to continue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">6-Digit Code</Label>
          <Input id="code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button className="w-full" onClick={handleVerify} disabled={code.length < 6}>Verify</Button>
      </CardContent>
    </Card>
  );
}