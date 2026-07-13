import { useEffect, useState, useActionState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { orgApi } from '../api/org.api';
import { orgQueryKeys } from '../hooks/useOrganizations';
import { Button } from '@/components/ui/button';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { PulsivLogo } from '@/shared/components/PulsivLogo';
import type { InvitationValidation } from '../types/org.types';

function AcceptButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Accepting...' : 'Accept Invitation'}
    </Button>
  );
}

export default function AcceptInviteLandingPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [invitation, setInvitation] = useState<InvitationValidation | null>(null);
  const [error, setError] = useState<string | null>(token ? null : 'No invitation token provided.');
  const [isValidating, setIsValidating] = useState(!!token);

  useEffect(() => {
    if (!token) {
      return;
    }

    orgApi.validateInvitation(token)
      .then(setInvitation)
      .catch((err) => {
        setError(err?.response?.data?.message || 'Invalid or expired invitation.');
      })
      .finally(() => setIsValidating(false));
  }, [token]);

  const [state, submitAction] = useActionState(
    async (_prevState: any, _formData: FormData) => {
      try {
        if (!token) return { success: false, error: 'Missing token' };
        
        await orgApi.acceptInvitation(token);
        
        // Invalidate organizations so user sees the new org
        queryClient.invalidateQueries({ queryKey: orgQueryKeys.lists() });
        
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.response?.data?.message || 'Failed to accept invitation.' };
      }
    },
    { success: false, error: null }
  );

  useEffect(() => {
    if (state.success) {
      navigate('/dashboard');
    }
  }, [state.success, navigate]);

  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-[440px] space-y-8 rounded-[10px] border border-border bg-[var(--bg1)] p-8 shadow-2xl text-center">
        <div className="flex flex-col items-center space-y-4">
          <PulsivLogo size={40} />
        </div>
        
        {error ? (
          <div className="space-y-4">
            <div className="rounded-md bg-[var(--red-bg)] p-4 text-[var(--red)] border border-[rgba(239,68,68,0.35)]">
              {error}
            </div>
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </div>
        ) : invitation ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
                You've been invited!
              </h1>
              <p className="text-[var(--text2)]">
                You have been invited to join {invitation.orgName || 'this organization'}.
              </p>
            </div>

            <div className="rounded-md border border-border bg-[var(--bg2)] p-4 text-left space-y-1">
              <div className="text-sm font-medium text-[var(--text)]">Role: <span className="font-mono text-xs text-[var(--brand)]">{invitation.role.toUpperCase()}</span></div>
              <div className="text-sm text-[var(--text2)]">Email: {invitation.email}</div>
              <div className="text-sm text-[var(--text2)]">Account status: {invitation.accountExists ? 'Existing account detected' : 'Create an account with this email before accepting.'}</div>
            </div>

            <form action={submitAction} className="space-y-4">
              {state.error && (
                <div className="rounded-md bg-[var(--red-bg)] p-3 text-sm text-[var(--red)] border border-[rgba(239,68,68,0.35)]">
                  {state.error}
                </div>
              )}
              {invitation.accountExists ? <AcceptButton /> : (
                <Button type="button" disabled className="w-full">
                  Create the invited account first
                </Button>
              )}
              
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full text-[var(--text3)] hover:text-[var(--text)]"
                onClick={async () => {
                  try {
                    await orgApi.declineInvitation(invitation.id);
                    navigate('/dashboard');
                  } catch (err) {
                    console.error("Failed to decline", err);
                  }
                }}
              >
                Decline Invitation
              </Button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
