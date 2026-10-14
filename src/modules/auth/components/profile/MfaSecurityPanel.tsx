import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Smartphone,
  Key,
  Mail,
  ShieldCheck,
  MessageSquare,
  Trash2,
  Plus,
  Loader2,
  Star,
  Pencil,
  ShieldOff,
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

import { authApi } from '../../api/auth.api';
import { authQueryKeys } from '../../api/auth.query';
import { useListMFADevices } from '../../hooks/useListMFADevices';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import type { MFADeviceDto, MFAType } from '../../types/auth.types';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { AddDeviceDialog } from './AddDeviceDialog';

const TYPE_ICON: Record<MFAType, typeof Smartphone> = {
  totp: Smartphone,
  hardware_key: Key,
  email: Mail,
  sms: MessageSquare,
  backup_codes: ShieldCheck,
};

const TYPE_LABEL: Record<MFAType, string> = {
  totp: 'Authenticator App (TOTP)',
  hardware_key: 'Security Key / Passkey',
  email: 'Email One-Time Code',
  sms: 'SMS Verification',
  backup_codes: 'Backup Recovery Codes',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function MfaSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6 animate-pulse text-left">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 bg-[var(--bg2)]" />
        <Skeleton className="h-4 w-96 bg-[var(--bg2)]" />
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 bg-[var(--bg2)]" />
            <Skeleton className="h-4 w-80 bg-[var(--bg2)]" />
          </div>
          <Skeleton className="h-6 w-12 rounded-full bg-[var(--bg2)]" />
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-6">
        <Skeleton className="h-5 w-48 bg-[var(--bg2)] mb-4" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full bg-[var(--bg2)]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MfaSecurityPanel() {
  const qc = useQueryClient();
  const { data: devices = [], isLoading } = useListMFADevices() as {
    data: MFADeviceDto[];
    isLoading: boolean;
  };
  const { data: user } = useCurrentUser();

  const [addOpen, setAddOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<MFADeviceDto | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [removeTarget, setRemoveTarget] = useState<MFADeviceDto | null>(null);
  const [removePassword, setRemovePassword] = useState('');
  const [disableOpen, setDisableOpen] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: authQueryKeys.mfaDevices });
    qc.invalidateQueries({ queryKey: authQueryKeys.currentUser });
    qc.invalidateQueries({ queryKey: authQueryKeys.securitySummary });
    qc.invalidateQueries({ queryKey: ['account-overview'] });
  };

  const setPrimary = useMutation({
    mutationFn: (id: string) => authApi.setPrimaryMFADevice(id),
    onSuccess: () => {
      invalidate();
      toast.success('Primary MFA method updated');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      authApi.renameMFADevice(id, name),
    onSuccess: () => {
      invalidate();
      setRenameTarget(null);
      toast.success('Device renamed');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      authApi.removeMFADevice(id, password),
    onSuccess: () => {
      invalidate();
      setRemoveTarget(null);
      setRemovePassword('');
      toast.success('MFA method removed');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const disableMfa = useMutation({
    mutationFn: () => authApi.disableMFA({}),
    onSuccess: () => {
      invalidate();
      setDisableOpen(false);
      toast.success('Two-factor authentication disabled');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const mfaEnabled = !!user?.mfa_enabled;
  const verifiedDevices = devices.filter((d) => d.verified);
  const mfaBusy = disableMfa.isPending;

  function handleMfaToggle(nextChecked: boolean) {
    if (mfaBusy) return;
    if (nextChecked) {
      setAddOpen(true);
      return;
    }
    if (mfaEnabled) {
      setDisableOpen(true);
    }
  }

  if (isLoading) {
    return <MfaSkeleton />;
  }

  return (
    <div className="flex w-full flex-col gap-6 text-left">
      {/* Page Header */}
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--text)] sm:text-[28px]">
          Two-Factor Authentication
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text2)]">
          Require a second authentication step when signing in. Use an authenticator app, a hardware security key, or passkeys.
        </p>
      </div>

      {/* Main Status Hero Banner */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                mfaEnabled
                  ? 'bg-[var(--green-bg)] text-[var(--green)]'
                  : 'bg-[var(--amber-bg)] text-[var(--amber)]'
              }`}
            >
              {mfaEnabled ? <ShieldCheck className="size-5" /> : <Shield className="size-5" />}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold text-[var(--text)]">
                  {mfaEnabled ? '2FA Protection Active' : '2FA is Currently Disabled'}
                </h2>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                    mfaEnabled
                      ? 'border border-[var(--green)]/20 bg-[var(--green-bg)] text-[var(--green)]'
                      : 'border border-[var(--amber)]/20 bg-[var(--amber-bg)] text-[var(--amber)]'
                  }`}
                >
                  {mfaEnabled ? 'Protected' : 'Unprotected'}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-[var(--text3)]">
                {mfaEnabled
                  ? `Your account requires a second factor. ${verifiedDevices.length} active verification method(s) configured.`
                  : 'Add an authenticator app or security key to secure your login from unauthorized access.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 sm:self-center">
            <span className="font-mono text-[11px] font-semibold text-[var(--text3)] uppercase">
              {mfaEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <Switch
              checked={mfaEnabled}
              onCheckedChange={handleMfaToggle}
              disabled={mfaBusy}
              aria-label="Toggle multi-factor authentication"
            />
          </div>
        </div>
      </section>

      {/* Methods Catalog / Quick Add Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Method 1: Authenticator App */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-[var(--radius)] bg-[var(--bg2)] text-[var(--text)]">
                <Smartphone className="size-4" />
              </span>
              <span className="rounded-full bg-[var(--green-bg)] px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--green)]">
                Recommended
              </span>
            </div>
            <h3 className="mt-3 text-[14px] font-semibold text-[var(--text)]">Authenticator App</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--text3)]">
              Use Google Authenticator, 1Password, or Authy to generate time-based one-time codes (TOTP).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddOpen(true)}
            className="mt-4 border-[var(--border2)] bg-[var(--bg2)] text-[12px] text-[var(--text)] hover:bg-[var(--bg3)]"
          >
            <Plus className="mr-1.5 size-3.5" />
            Set up app
          </Button>
        </div>

        {/* Method 2: Security Key / Passkey */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-[var(--radius)] bg-[var(--bg2)] text-[var(--text)]">
                <Key className="size-4" />
              </span>
              <span className="rounded-full bg-[var(--brand-bg)] px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--brand)]">
                FIDO2
              </span>
            </div>
            <h3 className="mt-3 text-[14px] font-semibold text-[var(--text)]">Security Key / Passkey</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--text3)]">
              Sign in with biometric hardware, Touch ID, Face ID, or a physical YubiKey token.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddOpen(true)}
            className="mt-4 border-[var(--border2)] bg-[var(--bg2)] text-[12px] text-[var(--text)] hover:bg-[var(--bg3)]"
          >
            <Plus className="mr-1.5 size-3.5" />
            Add security key
          </Button>
        </div>

        {/* Method 3: Email OTP */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-[var(--radius)] bg-[var(--bg2)] text-[var(--text)]">
                <Mail className="size-4" />
              </span>
              <span className="rounded-full bg-[var(--bg2)] px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--text3)]">
                Fallback
              </span>
            </div>
            <h3 className="mt-3 text-[14px] font-semibold text-[var(--text)]">Email Verification</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--text3)]">
              Receive one-time verification tokens sent directly to your verified inbox.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddOpen(true)}
            className="mt-4 border-[var(--border2)] bg-[var(--bg2)] text-[12px] text-[var(--text)] hover:bg-[var(--bg3)]"
          >
            <Plus className="mr-1.5 size-3.5" />
            Configure email
          </Button>
        </div>
      </section>

      {/* Configured Devices List */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] shadow-xs">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--text)]">
              Configured Verification Devices
            </h2>
            <p className="mt-0.5 text-[13px] text-[var(--text3)]">
              Methods available to complete authentication challenges during login.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setAddOpen(true)}
            className="bg-[var(--brand)] text-[var(--brand-fg)] hover:opacity-90 text-[12px]"
          >
            <Plus className="mr-1.5 size-3.5" />
            Add method
          </Button>
        </div>

        {devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-[var(--bg2)] text-[var(--text3)] mb-3">
              <Shield className="size-6 opacity-60" />
            </span>
            <div className="text-[14px] font-medium text-[var(--text)]">No verification methods configured</div>
            <p className="mt-1 max-w-sm text-[12px] text-[var(--text3)]">
              Set up your first authenticator app or security key above to enable multi-factor authentication.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {devices.map((d) => {
              const Icon = TYPE_ICON[d.type] ?? ShieldCheck;
              return (
                <div
                  key={d.id}
                  className="flex flex-col gap-4 p-5 transition-colors hover:bg-[var(--bg2)]/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--border2)] bg-[var(--bg2)] text-[var(--text)]">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[14px] font-medium text-[var(--text)]">
                          {d.name}
                        </span>
                        {d.is_primary && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--brand)]/20 bg-[var(--brand-bg)] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-[var(--brand)]">
                            <Star className="size-2.5 fill-current" />
                            Primary
                          </span>
                        )}
                        {!d.verified && (
                          <span className="rounded-full border border-[var(--amber)]/30 bg-[var(--amber-bg)] px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--amber)]">
                            Pending setup
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-[var(--text3)]">
                        <span>{TYPE_LABEL[d.type]}</span>
                        <span>•</span>
                        <span className="font-mono">Added {formatDate(d.created_at)}</span>
                        {d.display_hint && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[var(--text3)]">{d.display_hint}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {d.verified && !d.is_primary && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimary.mutate(d.id)}
                        disabled={setPrimary.isPending}
                        className="border-[var(--border2)] bg-[var(--bg2)] text-[12px] text-[var(--text2)] hover:text-[var(--text)]"
                      >
                        <Star className="mr-1.5 size-3" />
                        Make Primary
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Rename device"
                      onClick={() => {
                        setRenameTarget(d);
                        setRenameValue(d.name);
                      }}
                      className="size-8 border-[var(--border2)] bg-[var(--bg2)] text-[var(--text2)] hover:text-[var(--text)]"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Remove device"
                      onClick={() => setRemoveTarget(d)}
                      className="size-8 border-[var(--border2)] bg-[var(--bg2)] text-[var(--text3)] hover:border-[var(--red)]/40 hover:text-[var(--red)]"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add Device Dialog Wizard */}
      <AddDeviceDialog open={addOpen} onOpenChange={setAddOpen} onComplete={invalidate} />

      {/* Rename Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-md border-[var(--border2)] bg-[var(--bg1)] text-[var(--text)]">
          <DialogHeader>
            <DialogTitle>Rename Device</DialogTitle>
            <DialogDescription className="text-[var(--text3)]">
              Give this authentication method a recognizable name so you know which device it belongs to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <Label htmlFor="rename" className="text-[13px] text-[var(--text2)]">
              Device Name
            </Label>
            <Input
              id="rename"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              maxLength={255}
              className="border-[var(--border2)] bg-[var(--bg2)] text-[var(--text)] focus-visible:ring-1 focus-visible:ring-[var(--brand)]"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setRenameTarget(null)}
              className="border-[var(--border2)] bg-[var(--bg2)] text-[var(--text)]"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                renameTarget && rename.mutate({ id: renameTarget.id, name: renameValue.trim() })
              }
              disabled={rename.isPending || renameValue.trim().length === 0}
              className="bg-[var(--brand)] text-[var(--brand-fg)] hover:opacity-90"
            >
              {rename.isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Dialog */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={(o) => {
          if (!o) {
            setRemoveTarget(null);
            setRemovePassword('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md border-[var(--border2)] bg-[var(--bg1)] text-[var(--text)]">
          <DialogHeader>
            <DialogTitle>Remove Authentication Method</DialogTitle>
            <DialogDescription className="text-[var(--text3)]">
              Are you sure you want to remove <span className="font-semibold text-[var(--text)]">{removeTarget?.name}</span>? Confirm your account password to proceed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <Label htmlFor="remove-pw" className="text-[13px] text-[var(--text2)]">
              Account Password
            </Label>
            <Input
              id="remove-pw"
              type="password"
              value={removePassword}
              onChange={(e) => setRemovePassword(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
              className="border-[var(--border2)] bg-[var(--bg2)] text-[var(--text)] focus-visible:ring-1 focus-visible:ring-[var(--brand)]"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setRemoveTarget(null);
                setRemovePassword('');
              }}
              className="border-[var(--border2)] bg-[var(--bg2)] text-[var(--text)]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                removeTarget && remove.mutate({ id: removeTarget.id, password: removePassword })
              }
              disabled={remove.isPending || removePassword.length === 0}
            >
              {remove.isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
              Remove method
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Warning Dialog */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent className="sm:max-w-md border-[var(--border2)] bg-[var(--bg1)] text-[var(--text)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--red)]">
              <ShieldOff className="size-5" />
              Disable Two-Factor Authentication?
            </DialogTitle>
            <DialogDescription className="text-[var(--text3)]">
              Disabling multi-factor authentication will remove the secondary verification requirement when logging in to Sentinel.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-[var(--radius)] border border-[var(--red)]/20 bg-[var(--red-bg)] p-3.5 text-[12px] leading-relaxed text-[var(--red)]">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <div>
                Your account security score will decrease. Any configured passkeys and authenticator tokens will be deactivated.
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setDisableOpen(false)}
              className="border-[var(--border2)] bg-[var(--bg2)] text-[var(--text)]"
            >
              Keep 2FA enabled
            </Button>
            <Button
              variant="destructive"
              onClick={() => disableMfa.mutate()}
              disabled={disableMfa.isPending}
            >
              {disableMfa.isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

