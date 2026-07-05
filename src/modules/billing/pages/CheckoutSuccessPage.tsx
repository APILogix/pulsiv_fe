import { useNavigate, useSearchParams } from 'react-router';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const navigate = useNavigate();

  // In a real app, we might verify the session_id with the backend here
  // or refetch the user's billing status.

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-[440px] space-y-6 rounded-[10px] border border-border bg-[var(--bg1)] p-8 shadow-2xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--green-bg)] text-[var(--green)]">
          <CheckCircle2 size={32} />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Payment Successful!
          </h1>
          <p className="text-[var(--text2)]">
            Thank you for your purchase. Your subscription has been activated.
          </p>
          {sessionId && (
            <p className="text-xs text-[var(--text3)] font-mono mt-2">
              Order ID: {sessionId.slice(0, 12)}...
            </p>
          )}
        </div>

        <Button onClick={() => navigate('/dashboard')} className="w-full">
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
