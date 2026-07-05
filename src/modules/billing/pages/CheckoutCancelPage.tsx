import { useNavigate } from 'react-router';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CheckoutCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-[440px] space-y-6 rounded-[10px] border border-border bg-[var(--bg1)] p-8 shadow-2xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--red-bg)] text-[var(--red)]">
          <XCircle size={32} />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Checkout Cancelled
          </h1>
          <p className="text-[var(--text2)]">
            Your payment process was cancelled. You have not been charged.
          </p>
        </div>

        <div className="flex gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="w-full">
            Go to Dashboard
          </Button>
          <Button onClick={() => navigate('/settings/billing')} className="w-full">
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
