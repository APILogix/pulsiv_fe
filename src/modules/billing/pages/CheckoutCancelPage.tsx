import { useNavigate } from 'react-router';
import { CircleSlash } from 'lucide-react';

import { AuthButton, AuthCard, AuthResult, Notice } from '@/shared/ui/pulse';

export default function CheckoutCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[var(--bg)] p-4">
      <div className="pulse-grid pulse-aurora pointer-events-none absolute inset-0" aria-hidden="true" />

      <main className="pulse-rise relative z-10 w-full max-w-[440px]">
        <AuthCard>
          <AuthResult
            icon={CircleSlash}
            tone="amber"
            title="Checkout cancelled"
            description="You were not charged. Your organization stays on its current plan."
            actions={
              <>
                <AuthButton type="button" onClick={() => navigate('/billing')}>
                  Back to plan and subscription
                </AuthButton>
                <AuthButton type="button" variant="ghost" onClick={() => navigate('/dashboard')}>
                  Go to dashboard
                </AuthButton>
              </>
            }
          >
            <Notice tone="neutral">
              Nothing changed on this organization. Start checkout again whenever you are ready.
            </Notice>
          </AuthResult>
        </AuthCard>
      </main>
    </div>
  );
}
