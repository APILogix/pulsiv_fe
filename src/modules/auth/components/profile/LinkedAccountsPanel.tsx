import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { Github, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { authApi } from '../../api/auth.api';
import { authQueryKeys } from '../../api/auth.query';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import type { LinkedIdentity } from '../../types/auth.types';

const PROVIDERS = [
  { id: 'github' as const, label: 'GitHub', icon: Github },
  { id: 'google' as const, label: 'Google', icon: GoogleIcon },
];

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.27c0-.74-.07-1.45-.2-2.13H12v4.03h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.29Z" />
      <path fill="#34A853" d="M12 21.67c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.67Z" />
      <path fill="#FBBC05" d="M6.54 13.75a5.85 5.85 0 0 1 0-3.5V7.72H3.3a9.75 9.75 0 0 0 0 8.56l3.24-2.53Z" />
      <path fill="#EA4335" d="M12 6.22c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.3 14.63 2.33 12 2.33a9.74 9.74 0 0 0-8.7 5.39l3.24 2.53C7.31 7.94 9.46 6.22 12 6.22Z" />
    </svg>
  );
}

export function LinkedAccountsPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: linked = [], isLoading } = useQuery<LinkedIdentity[]>({
    queryKey: authQueryKeys.linkedIdentities,
    queryFn: authApi.listLinkedIdentities,
  });

  const linkMutation = useMutation({
    mutationFn: (provider: 'google' | 'github') => authApi.startIdentityLink(provider),
    onSuccess: ({ authorization_url }) => {
      // Keep the OAuth flow in the current tab. This preserves the normal
      // browser navigation/back-button behavior and avoids opening a second
      // window for account linking.
      window.location.assign(authorization_url);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const unlinkMutation = useMutation({
    mutationFn: (linkId: string) => authApi.unlinkIdentity(linkId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.linkedIdentities });
      toast.success('Account unlinked');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const linkedByProvider = new Map(linked.map((identity) => [identity.provider, identity]));

  useEffect(() => {
    const error = searchParams.get('error');
    const linked = searchParams.get('linked');
    if (error) {
      const message = searchParams.get('message') || `Account linking failed: ${error}`;
      toast.error(message);
    }
    if (linked) {
      void queryClient.invalidateQueries({ queryKey: authQueryKeys.linkedIdentities });
      toast.success('Account linked');
    }
    if (error || linked) setSearchParams({}, { replace: true });
  }, [queryClient, searchParams, setSearchParams]);

  return (
    <div className="flex max-w-[800px] flex-col gap-6">
      <div>
        <h2 className="mb-1 text-[16px] font-semibold text-[var(--text)]">Linked accounts</h2>
        <p className="text-[13px] text-[var(--text2)]">
          Connect a social account for sign-in. Enterprise SSO configuration remains organization-scoped.
        </p>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg1)]">
        {PROVIDERS.map(({ id, label, icon: Icon }, index) => {
          const identity = linkedByProvider.get(id);
          return (
            <div key={id} className={`flex items-center justify-between p-5 ${index < PROVIDERS.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${id === 'google' ? 'bg-[#4285F4]/10' : 'bg-[#f0f6fc]/10'} ${id === 'google' ? 'text-[#4285F4]' : 'text-[#f0f6fc]'}`}><Icon size={18} /></div>
                <div>
                  <div className="text-[13px] font-medium text-[var(--text)]">{label}</div>
                  <div className="mt-0.5 text-[12px] text-[var(--text2)]">
                    {isLoading ? 'Checking…' : identity ? `Connected ${identity.linked_at ? `on ${new Date(identity.linked_at).toLocaleDateString()}` : ''}` : 'Not connected'}
                  </div>
                </div>
              </div>
              {identity ? (
                <Button variant="outline" size="sm" className="h-8 border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-[12px]" disabled={unlinkMutation.isPending} onClick={() => unlinkMutation.mutate(identity.id)}>
                  {unlinkMutation.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />}
                  Unlink
                </Button>
              ) : (
                <Button variant="outline" size="sm" className={`h-8 text-[12px] ${id === 'google' ? 'border-[#4285F4]/40 bg-[#4285F4]/10 text-[#8ab4f8] hover:bg-[#4285F4]/20' : 'border-[#f0f6fc]/30 bg-[#f0f6fc]/10 text-[#f0f6fc] hover:bg-[#f0f6fc]/20'}`} disabled={linkMutation.isPending} onClick={() => linkMutation.mutate(id)}>
                  {linkMutation.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  Connect
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
