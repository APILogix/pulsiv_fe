import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Fingerprint,
  Plus,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Pencil,
  Star,
  Loader2,
  Smartphone,
  Laptop,
  AlertCircle,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '../../api/auth.api';
import { authQueryKeys } from '../../api/auth.query';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useListMFADevices } from '../../hooks/useListMFADevices';
import { enrollPasskey, webauthnSupported, WebAuthnCeremonyError } from '../../services/webauthn.client';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import type { MFADeviceDto } from '../../types/auth.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function PasskeysSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6 animate-pulse text-left">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 bg-[var(--bg2)]" />
        <Skeleton className="h-4 w-96 bg-[var(--bg2)]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-4 space-y-2">
            <Skeleton className="h-4 w-28 bg-[var(--bg2)]" />
            <Skeleton className="h-3 w-40 bg-[var(--bg2)]" />
          </div>
        ))}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-6 space-y-4">
        <Skeleton className="h-5 w-48 bg-[var(--bg2)]" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full bg-[var(--bg2)]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PasskeysPanel() {
  const qc = useQueryClient();
  const { data: devices = [], isLoading } = useListMFADevices() as {
    data: MFADeviceDto[];
    isLoading: boolean;
  };
  const { data: user } = useCurrentUser();

  const isWebAuthnSupported = webauthnSupported();

  // Dialog states
  const [addOpen, setAddOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

  const [renameTarget, setRenameTarget] = useState<MFADeviceDto | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [removeTarget, setRemoveTarget] = useState<MFADeviceDto | null>(null);
  const [removePassword, setRemovePassword] = useState('');

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
      toast.success('Primary passkey updated');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      authApi.renameMFADevice(id, name),
    onSuccess: () => {
      invalidate();
      setRenameTarget(null);
      setRenameValue('');
      toast.success('Passkey renamed');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: ({ id, pwd }: { id: string; pwd?: string }) =>
      authApi.removeMFADevice(id, pwd),
    onSuccess: () => {
      invalidate();
      setRemoveTarget(null);
      setRemovePassword('');
      toast.success('Passkey removed');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Filter for passkeys / hardware keys
  const passkeys = devices.filter((d) => d.type === 'hardware_key');

  const handleRegisterPasskey = async () => {
    const trimmed = deviceName.trim();
    if (!trimmed) {
      toast.error('Please enter a name for your passkey or security key');
      return;
    }

    setRegistering(true);
    try {
      const res = await enrollPasskey(trimmed);
      invalidate();
      if (res.backup_codes && res.backup_codes.length > 0) {
        setNewBackupCodes(res.backup_codes);
      } else {
        setAddOpen(false);
        setDeviceName('');
      }
      toast.success('Passkey successfully registered and verified');
    } catch (err: unknown) {
      if (err instanceof WebAuthnCeremonyError) {
        toast.error(err.message);
      } else {
        toast.error(getErrorMessage(err));
      }
    } finally {
      setRegistering(false);
    }
  };

  if (isLoading) {
    return <PasskeysSkeleton />;
  }

  return (
    <div className="flex w-full flex-col gap-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-[20px] font-semibold text-[var(--text)] tracking-tight">
              Passkeys &amp; Security Keys
            </h1>
            {isWebAuthnSupported ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
                <CheckCircle2 size={11} /> Supported
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--amber)]/10 text-[var(--amber)] border border-[var(--amber)]/20">
                <AlertCircle size={11} /> Unsupported Browser
              </span>
            )}
          </div>
          <p className="text-[13px] text-[var(--text2)] max-w-2xl leading-relaxed">
            Sign in cryptographically with Touch ID, Face ID, Windows Hello, or physical FIDO2 keys.
            Passkeys replace passwords and are completely immune to phishing attacks.
          </p>
        </div>

        <Button
          onClick={() => {
            setDeviceName(
              typeof navigator !== 'undefined' && navigator.userAgent.includes('Macintosh')
                ? 'MacBook Touch ID'
                : typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows')
                ? 'Windows Hello'
                : 'My Security Key'
            );
            setNewBackupCodes(null);
            setAddOpen(true);
          }}
          disabled={!isWebAuthnSupported}
          className="shrink-0 h-9 px-4 rounded-[var(--radius-md)] bg-[var(--brand)] text-[var(--brand-fg,#000)] hover:brightness-110 font-medium text-[13px] shadow-sm flex items-center gap-2"
        >
          <Plus size={15} /> Add Passkey
        </Button>
      </div>

      {/* Feature Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] space-y-1">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--text)]">
            <ShieldCheck size={16} className="text-[var(--green)]" />
            Phishing Resistant
          </div>
          <p className="text-[12px] text-[var(--text2)] leading-relaxed">
            Bound uniquely to this domain. Attackers cannot trick you into sending credentials elsewhere.
          </p>
        </div>

        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] space-y-1">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--text)]">
            <Fingerprint size={16} className="text-[var(--brand)]" />
            Instant Biometric
          </div>
          <p className="text-[12px] text-[var(--text2)] leading-relaxed">
            Unlock in one touch using your device sensor without typing passwords or waiting for SMS codes.
          </p>
        </div>

        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] space-y-1">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--text)]">
            <KeyRound size={16} className="text-[var(--text2)]" />
            FIDO2 &amp; WebAuthn
          </div>
          <p className="text-[12px] text-[var(--text2)] leading-relaxed">
            Syncs via Apple Keychain, Google Password Manager, 1Password, or standalone YubiKeys.
          </p>
        </div>
      </div>

      {/* Registered Passkeys Section */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--text)]">
              Enrolled Passkeys &amp; Keys ({passkeys.length})
            </h2>
            <p className="text-[12px] text-[var(--text2)] mt-0.5">
              Authenticators registered for biometric and hardware sign-in.
            </p>
          </div>
        </div>

        {passkeys.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[var(--bg2)] border border-[var(--border)] flex items-center justify-center mb-3 text-[var(--text2)]">
              <Fingerprint size={22} />
            </div>
            <h3 className="text-[14px] font-semibold text-[var(--text)] mb-1">
              No passkeys registered yet
            </h3>
            <p className="text-[12px] text-[var(--text2)] max-w-sm mb-4 leading-relaxed">
              Register a passkey to sign in effortlessly using Touch ID, Windows Hello, or your security key.
            </p>
            <Button
              onClick={() => {
                setDeviceName('My Security Key');
                setNewBackupCodes(null);
                setAddOpen(true);
              }}
              disabled={!isWebAuthnSupported}
              className="h-8 px-3 rounded-[var(--radius-md)] bg-[var(--bg2)] hover:bg-[var(--bg3)] text-[var(--text)] border border-[var(--border)] text-[12px] font-medium"
            >
              <Plus size={13} className="mr-1.5" /> Register Passkey
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {passkeys.map((device) => {
              const isMac = device.name.toLowerCase().includes('mac') || device.name.toLowerCase().includes('apple');
              const isWin = device.name.toLowerCase().includes('win');
              const isPhone = device.name.toLowerCase().includes('phone') || device.name.toLowerCase().includes('ios') || device.name.toLowerCase().includes('android');

              return (
                <div
                  key={device.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--bg2)]/40 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--bg2)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] shrink-0">
                      {isPhone ? (
                        <Smartphone size={18} />
                      ) : isMac || isWin ? (
                        <Laptop size={18} />
                      ) : (
                        <Fingerprint size={18} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-[var(--text)] truncate">
                          {device.name}
                        </span>
                        {device.is_primary && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/30">
                            <Star size={10} className="fill-current" /> Primary
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
                          <CheckCircle2 size={10} /> Active
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[var(--text3)] mt-1 tabular-nums">
                        <span>Added {formatDate(device.created_at)}</span>
                        <span>•</span>
                        <span>Last used {formatDate(device.last_used_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    {!device.is_primary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPrimary.mutate(device.id)}
                        disabled={setPrimary.isPending}
                        className="h-8 px-2.5 text-[12px] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]"
                      >
                        Make Primary
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRenameTarget(device);
                        setRenameValue(device.name);
                      }}
                      className="h-8 px-2.5 text-[12px] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]"
                    >
                      <Pencil size={13} className="mr-1.5" /> Rename
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRemoveTarget(device);
                        setRemovePassword('');
                      }}
                      className="h-8 px-2.5 text-[12px] text-[var(--red)] hover:text-[var(--red)] hover:bg-[var(--red)]/10"
                    >
                      <Trash2 size={13} className="mr-1.5" /> Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security Guidance Note */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 flex items-start gap-3">
        <HelpCircle size={18} className="text-[var(--brand)] shrink-0 mt-0.5" />
        <div className="space-y-1 text-[12px] text-[var(--text2)] leading-relaxed">
          <p className="font-medium text-[var(--text)] text-[13px]">
            Recommended Passkey Best Practices
          </p>
          <p>
            We recommend enrolling at least two passkeys (for example, Touch ID on your laptop and a backup security key or phone) or keeping your emergency backup recovery codes safe to prevent account lockout.
          </p>
        </div>
      </div>

      {/* Add Passkey Modal */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          if (!registering) {
            setAddOpen(open);
            if (!open) {
              setNewBackupCodes(null);
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-[var(--bg1)] border-[var(--border)] text-[var(--text)]">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[var(--text)] flex items-center gap-2">
              <Fingerprint size={18} className="text-[var(--brand)]" />
              {newBackupCodes ? 'Passkey Enrolled — Save Backup Codes' : 'Register New Passkey'}
            </DialogTitle>
            <DialogDescription className="text-[12px] text-[var(--text2)] leading-relaxed">
              {newBackupCodes
                ? 'Your passkey is verified. As this is your first registered authenticator, please save these recovery codes in a secure location.'
                : 'Provide a nickname for this device, then confirm the prompt when your browser requests Touch ID, Windows Hello, or your security key.'}
            </DialogDescription>
          </DialogHeader>

          {newBackupCodes ? (
            <div className="space-y-4 pt-2">
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] p-4">
                <div className="grid grid-cols-2 gap-2 font-mono text-[13px] text-center tracking-wider text-[var(--text)]">
                  {newBackupCodes.map((code) => (
                    <span key={code} className="p-1 rounded bg-[var(--bg2)]/60">
                      {code}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-[var(--amber)] flex items-center gap-1.5">
                <AlertCircle size={13} /> These codes will only be shown once.
              </p>
              <DialogFooter className="pt-2">
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(newBackupCodes.join('\n'));
                    toast.success('Backup codes copied');
                    setAddOpen(false);
                    setNewBackupCodes(null);
                  }}
                  className="w-full bg-[var(--brand)] text-[var(--brand-fg,#000)] hover:brightness-110 font-medium text-[13px]"
                >
                  Copy Codes &amp; Finish
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="passkey-name" className="text-[12px] text-[var(--text2)] font-medium">
                  Passkey Nickname
                </Label>
                <Input
                  id="passkey-name"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g. MacBook Pro Touch ID"
                  disabled={registering}
                  className="h-9 text-[13px] bg-[var(--bg)] border-[var(--border)] text-[var(--text)] focus-visible:ring-1 focus-visible:ring-[var(--brand)]"
                />
              </div>

              {registering && (
                <div className="p-4 rounded-[var(--radius-md)] border border-[var(--brand)]/30 bg-[var(--brand)]/5 flex items-center gap-3">
                  <div className="relative">
                    <Fingerprint size={24} className="text-[var(--brand)] animate-pulse" />
                  </div>
                  <div className="text-[12px]">
                    <p className="font-medium text-[var(--text)]">Touch your sensor or insert key</p>
                    <p className="text-[var(--text2)]">Follow the prompt shown by your browser or operating system…</p>
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2 gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setAddOpen(false)}
                  disabled={registering}
                  className="border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--bg2)] text-[12px]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRegisterPasskey}
                  disabled={registering || !deviceName.trim()}
                  className="bg-[var(--brand)] text-[var(--brand-fg,#000)] hover:brightness-110 font-medium text-[12px] flex items-center gap-2"
                >
                  {registering && <Loader2 size={13} className="animate-spin" />}
                  {registering ? 'Waiting for Authenticator…' : 'Start Registration'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRenameTarget(null);
            setRenameValue('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-[var(--bg1)] border-[var(--border)] text-[var(--text)]">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[var(--text)]">
              Rename Passkey
            </DialogTitle>
            <DialogDescription className="text-[12px] text-[var(--text2)]">
              Choose a recognizable name for this passkey or security key.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Label htmlFor="rename-input" className="text-[12px] text-[var(--text2)]">
              Device Name
            </Label>
            <Input
              id="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="h-9 text-[13px] bg-[var(--bg)] border-[var(--border)] text-[var(--text)]"
            />
          </div>
          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setRenameTarget(null)}
              className="border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--bg2)] text-[12px]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (renameTarget && renameValue.trim()) {
                  rename.mutate({ id: renameTarget.id, name: renameValue.trim() });
                }
              }}
              disabled={rename.isPending || !renameValue.trim()}
              className="bg-[var(--brand)] text-[var(--brand-fg,#000)] hover:brightness-110 font-medium text-[12px]"
            >
              {rename.isPending && <Loader2 size={13} className="mr-1.5 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Dialog */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveTarget(null);
            setRemovePassword('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-[var(--bg1)] border-[var(--border)] text-[var(--text)]">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[var(--text)] flex items-center gap-2">
              <Trash2 size={16} className="text-[var(--red)]" /> Remove Passkey
            </DialogTitle>
            <DialogDescription className="text-[12px] text-[var(--text2)] leading-relaxed">
              Are you sure you want to remove <span className="font-semibold text-[var(--text)]">{removeTarget?.name}</span>? You will no longer be able to use it to authenticate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Label htmlFor="remove-password" className="text-[12px] text-[var(--text2)] flex items-center gap-1.5">
              <Lock size={12} /> Confirm with Current Password
            </Label>
            <Input
              id="remove-password"
              type="password"
              value={removePassword}
              onChange={(e) => setRemovePassword(e.target.value)}
              placeholder="••••••••••••"
              className="h-9 text-[13px] bg-[var(--bg)] border-[var(--border)] text-[var(--text)]"
            />
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setRemoveTarget(null)}
              className="border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--bg2)] text-[12px]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (removeTarget) {
                  remove.mutate({ id: removeTarget.id, pwd: removePassword || undefined });
                }
              }}
              disabled={remove.isPending}
              className="bg-[var(--red)] text-white hover:brightness-110 font-medium text-[12px]"
            >
              {remove.isPending && <Loader2 size={13} className="mr-1.5 animate-spin" />}
              Remove Passkey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
