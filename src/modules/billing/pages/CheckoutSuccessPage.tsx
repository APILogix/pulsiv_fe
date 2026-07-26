import { useNavigate, useSearchParams } from 'react-router';
import { CheckCircle2 } from 'lucide-react';

import { AuthButton, AuthCard, AuthResult, SecretField } from '@/shared/ui/pulse';

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const navigate = useNavigate();

  // In a real app, we might verify the session_id with the backend here
  // or refetch the user's billing status.

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[var(--bg)] p-4">
      <div className="pulse-grid pulse-aurora pointer-events-none absolute inset-0" aria-hidden="true" />

      <main className="pulse-rise relative z-10 w-full max-w-[440px]">
        <AuthCard>
          <AuthResult
            icon={CheckCircle2}
            tone="green"
            title="Payment complete"
            description="Your subscription is active. New entitlements apply to this organization right away."
            actions={
              <>
                <AuthButton type="button" onClick={() => navigate('/dashboard')}>
                  Go to dashboard
                </AuthButton>
                <AuthButton type="button" variant="ghost" onClick={() => navigate('/billing')}>
                  Review plan and entitlements
                </AuthButton>
              </>
            }
          >
            {sessionId && <SecretField label="Checkout session" value={sessionId} />}
          </AuthResult>
        </AuthCard>
      </main>
    </div>
  );
}
