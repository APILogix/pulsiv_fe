import { useEffect } from 'react';
import { Link, useSearchParams, Navigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useConfirmAccountUnlock } from '../hooks/useConfirmAccountUnlock';

export default function AccountUnlockConfirmPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { mutate: confirmUnlock, isPending } = useConfirmAccountUnlock();

  useEffect(() => {
    if (token) {
      confirmUnlock({ token });
    }
  }, [token, confirmUnlock]);

  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#e8e8e8]">
            {isPending ? 'Unlocking account...' : 'Account unlocked'}
          </h2>
          <p className="text-sm text-[#999999] mt-1">
            {isPending ? 'Please wait while we unlock your account.' : 'Your account has been successfully unlocked. You can now sign in.'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#262626] bg-[#111111]/80 backdrop-blur-sm p-6 sm:p-8 space-y-4">
        {isPending ? (
          <div className="flex justify-center py-4">
            <span className="flex items-center gap-2 text-[#999999] text-sm">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round" /></svg>
              Unlocking...
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#34d399]/5 border border-[#34d399]/10 text-sm text-[#34d399]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Account unlocked successfully.
            </div>
            <Link to="/auth/login">
              <Button className="w-full h-10 bg-[#34d399] text-[#04140d] font-semibold hover:bg-[#10b981] transition-colors">
                Sign in to your account
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}