import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import { Button } from '@/components/ui/button';

export default function AccountDeletionConfirmPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    authApi.confirmAccountDeletion(token)
      .then((response) => {
        const scheduledAt = response.data?.data?.scheduled_at;
        setMessage(
          scheduledAt
            ? `Account deletion is scheduled for ${new Date(scheduledAt).toLocaleString()}.`
            : 'Account deletion has been scheduled.',
        );
        setStatus('success');
      })
      .catch((error) => {
        setMessage(getErrorMessage(error));
        setStatus('error');
      });
  }, [token]);

  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-12 text-white">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
        <div className="rounded-lg border border-[#1f1f1f] bg-[#111111] p-6">
          <div className="mb-5 flex justify-center">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${status === 'success' ? 'bg-[#10b981]/10 text-[#10b981]' : status === 'error' ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#262626] text-[#8A8F98]'}`}>
              {status === 'loading' && <Loader2 className="animate-spin" size={22} />}
              {status === 'success' && <CheckCircle2 size={22} />}
              {status === 'error' && <AlertTriangle size={22} />}
            </div>
          </div>
          <h1 className="mb-2 text-center text-[22px] font-semibold tracking-normal">
            {status === 'loading' && 'Confirming deletion'}
            {status === 'success' && 'Deletion scheduled'}
            {status === 'error' && 'Confirmation failed'}
          </h1>
          <p className="text-center text-[14px] leading-relaxed text-[#8A8F98]">
            {status === 'loading' ? 'Please wait while we verify the confirmation link.' : message}
          </p>
          <div className="mt-6">
            <Link to="/auth/login">
              <Button className="w-full bg-[#10b981] text-black hover:bg-[#0ea271]">
                Back to sign in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
