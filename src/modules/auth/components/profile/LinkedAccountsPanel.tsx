import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import {
  Github,
  Loader2,
  Trash2,
  CheckCircle2,
  Building2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { authApi } from '../../api/auth.api';
import { authQueryKeys } from '../../api/auth.query';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import type { LinkedIdentity } from '../../types/auth.types';

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

const PROVIDERS = [
  {
    id: 'google' as const,
    label: 'Google',
    description: 'Use your Google account to log into Sentinel without entering a separate password.',
    icon: GoogleIcon,
  },
  {
    id: 'github' as const,
    label: 'GitHub',
    description: 'Connect your developer profile for seamless repository access and developer authentication.',
    icon: Github,
  },
];

function LinkedAccountsSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6 animate-pulse text-left">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 bg-[var(--bg2)]" />
        <Skeleton className="h-4 w-96 bg-[var(--bg2)]" />
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] divide-y divide-[var(--border)]">
        {[1, 2].map((i) => (
          <div key={i} className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full bg-[var(--bg2)]" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 bg-[var(--bg2)]" />
                <Skeleton className="h-3 w-48 bg-[var(--bg2)]" />
              </div>
            </div>
            <Skeleton className="h-8 w-24 bg-[var(--bg2)] rounded-[var(--radius-md)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LinkedAccountsPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedIdentity | null>(null);
  const [linkingProvider, setLinkingProvider] = useState<'google' | 'github' | null>(null);

  const { data: linked = [], isLoading } = useQuery<LinkedIdentity[]>({
    queryKey: authQueryKeys.linkedIdentities,
    queryFn: authApi.listLinkedIdentities,
  });

  const startLinking = (provider: 'google' | 'github') => {
    setLinkingProvider(provider);
    authApi
      .startIdentityLink(provider)
      .then(({ authorization_url }) => {
        window.location.assign(authorization_url);
      })
      .catch((error) => {
        setLinkingProvider(null);
        toast.error(getErrorMessage(error));
      });
  };

  const unlinkMutation = useMutation({
    mutationFn: (linkId: string) => authApi.unlinkIdentity(linkId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.linkedIdentities });
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.securitySummary });
      await queryClient.invalidateQueries({ queryKey: ['account-overview'] });
      setUnlinkTarget(null);
      toast.success('Account unlinked successfully');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const linkedByProvider = new Map(linked.map((identity) => [identity.provider.toLowerCase(), identity]));

  useEffect(() => {
    const error = searchParams.get('error');
    const linkedParam = searchParams.get('linked');
    if (error || linkedParam) {
      if (error) {
        const message = searchParams.get('message') || `Account linking failed: ${error}`;
        toast.error(message);
      }
      if (linkedParam) {
        void queryClient.invalidateQueries({ queryKey: authQueryKeys.linkedIdentities });
        void queryClient.invalidateQueries({ queryKey: ['account-overview'] });
        toast.success('Account linked successfully');
      }
      setSearchParams({}, { replace: true });
    }
  }, [queryClient, searchParams, setSearchParams]);

  if (isLoading) {
    return <LinkedAccountsSkeleton />;
  }

  return (
    <div className="flex w-full flex-col gap-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--text)] tracking-tight">
            Linked Accounts
          </h1>
          <p className="text-[13px] text-[var(--text2)] max-w-2xl leading-relaxed mt-1">
            Connect third-party social accounts to enable fast, single-click sign-in without a password.
          </p>
        </div>
      </div>

      {/* Provider List */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--text)]">
              OAuth Identity Providers
            </h2>
            <p className="text-[12px] text-[var(--text2)] mt-0.5">
              Personal authentication accounts connected to your Sentinel profile.
            </p>
          </div>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {PROVIDERS.map(({ id, label, description, icon: Icon }) => {
            const identity = linkedByProvider.get(id);
            const isConnected = !!identity;

            return (
              <div
                key={id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--bg2)]/30 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--bg2)] border border-[var(--border)] flex items-center justify-center shrink-0">
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-medium text-[var(--text)]">{label}</span>
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
                          <CheckCircle2 size={10} /> Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)]">
                          Not connected
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[var(--text2)] mt-0.5 max-w-lg leading-relaxed">
                      {description}
                    </p>
                    {identity && (
                      <div className="flex items-center gap-2 text-[11px] text-[var(--text3)] mt-1 tabular-nums">
                        <span>Connected on {new Date(identity.linked_at).toLocaleDateString()}</span>
                        {identity.provider_user_id && (
                          <>
                            <span>•</span>
                            <span className="font-mono">ID: {identity.provider_user_id}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {isConnected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUnlinkTarget(identity)}
                      className="h-8 px-3 text-[12px] border-[var(--border)] bg-[var(--bg1)] text-[var(--red)] hover:bg-[var(--red)]/10 hover:border-[var(--red)]/30 font-medium"
                    >
                      <Trash2 size={13} className="mr-1.5" /> Disconnect
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startLinking(id)}
                      disabled={linkingProvider !== null}
                      className="h-8 px-3.5 text-[12px] border-[var(--border)] bg-[var(--bg2)] hover:bg-[var(--bg3)] text-[var(--text)] font-medium flex items-center gap-1.5"
                    >
                      {linkingProvider === id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <ExternalLink size={13} />
                      )}
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enterprise SSO Callout */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 flex items-start gap-3.5">
        <Building2 size={18} className="text-[var(--brand)] shrink-0 mt-0.5" />
        <div className="space-y-1 text-[12px] text-[var(--text2)] leading-relaxed">
          <p className="font-medium text-[var(--text)] text-[13px]">
            Looking for Workplace Single Sign-On (SSO)?
          </p>
          <p>
            Enterprise SSO via SAML 2.0 or OIDC (Okta, Microsoft Azure AD, Google Workspace, OneLogin) is configured at the organization level. Organization administrators can configure and enforce domain SSO in <strong>Organization &gt; SSO</strong>.
          </p>
        </div>
      </div>

      {/* Disconnect Confirmation Modal */}
      <Dialog
        open={!!unlinkTarget}
        onOpenChange={(open) => {
          if (!open) setUnlinkTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md bg-[var(--bg1)] border-[var(--border)] text-[var(--text)]">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[var(--text)] flex items-center gap-2">
              <AlertTriangle size={18} className="text-[var(--amber)]" />
              Disconnect {unlinkTarget?.provider ? unlinkTarget.provider.charAt(0).toUpperCase() + unlinkTarget.provider.slice(1) : 'Account'}?
            </DialogTitle>
            <DialogDescription className="text-[12px] text-[var(--text2)] leading-relaxed">
              You will no longer be able to use this social account to log in to Sentinel. Make sure you have a working password or another authentication method enabled before disconnecting.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setUnlinkTarget(null)}
              className="border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--bg2)] text-[12px]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (unlinkTarget) {
                  unlinkMutation.mutate(unlinkTarget.id);
                }
              }}
              disabled={unlinkMutation.isPending}
              className="bg-[var(--red)] text-white hover:brightness-110 font-medium text-[12px] flex items-center gap-1.5"
            >
              {unlinkMutation.isPending && <Loader2 size={13} className="animate-spin" />}
              Confirm Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
