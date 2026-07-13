import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { completeLogin } from '../services/post-login';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import { Button } from '@/components/ui/button';

export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const callbackError = params.get('error');
  const [error, setError] = useState(() => 
    callbackError ? (params.get('error_description') || params.get('message') || callbackError) : ''
  );

  useEffect(() => {
    if (window.opener && window.opener !== window) {
      window.opener.postMessage({ type: 'pulsiv:identity-link', linked: true }, window.location.origin);
      window.close();
      return;
    }
    if (callbackError) {
      return;
    }

    authApi.refreshSession()
      .then((session) => completeLogin(session, { setAuth, queryClient, navigate }))
      .catch((err) => setError(getErrorMessage(err)));
  }, [callbackError, navigate, params, queryClient, setAuth]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-12 text-white">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
        <div className="rounded-lg border border-[#1f1f1f] bg-[#111111] p-6 text-center">
          {error ? (
            <>
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#ef4444]/10 text-[#ef4444]">
                <AlertTriangle size={22} />
              </div>
              <h1 className="mb-2 text-[22px] font-semibold tracking-normal">Sign-in failed</h1>
              <p className="mb-6 text-[14px] leading-relaxed text-[#8A8F98]">{error}</p>
              <Button onClick={() => navigate('/auth/login', { replace: true })} className="w-full bg-[#10b981] text-black hover:bg-[#0ea271]">
                Back to sign in
              </Button>
            </>
          ) : (
            <>
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#262626] text-[#8A8F98]">
                <Loader2 className="animate-spin" size={22} />
              </div>
              <h1 className="mb-2 text-[22px] font-semibold tracking-normal">Completing sign-in</h1>
              <p className="text-[14px] leading-relaxed text-[#8A8F98]">Please wait while we finish your session.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
