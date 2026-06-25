import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const status = params.get('status');

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#e8e8e8]">
            {status === 'success' ? 'Email verified' : 'Verify your email'}
          </h2>
          <p className="text-sm text-[#999999] mt-1">
            {status === 'success'
              ? 'Your email has been confirmed. You can now sign in.'
              : 'We sent a verification link to your email address.'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#262626] bg-[#111111]/80 backdrop-blur-sm p-6 sm:p-8 space-y-4">
        {status === 'success' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#34d399]/5 border border-[#34d399]/10 text-sm text-[#34d399]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Email successfully verified.
            </div>
            <Link to="/auth/login">
              <Button className="w-full h-10 bg-[#34d399] text-[#04140d] font-semibold hover:bg-[#10b981] transition-colors">
                Sign in to your account
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#6366f1]/5 border border-[#6366f1]/10 text-sm text-[#818cf8]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              Check your inbox and click the verification link.
            </div>
            <p className="text-xs text-[#555555] text-center">
              Didn&apos;t receive the email? Check your spam folder or request a new link.
            </p>
            <Button variant="outline" className="w-full h-10 border-[#262626] bg-transparent text-[#e8e8e8] hover:bg-[#262626]/50 transition-colors">
              Resend Email
            </Button>
          </div>
        )}
      </div>

      <div className="text-center text-sm text-[#555555]">
        <Link to="/auth/login" className="hover:text-[#999999] transition-colors">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
