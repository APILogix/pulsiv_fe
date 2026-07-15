import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Smartphone, Key, Mail, ShieldCheck, MessageSquare, Trash2, Plus, Loader2, Star, Pencil,
  ShieldOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '../../api/auth.api';
import { authQueryKeys } from '../../api/auth.query';
import { useListMFADevices } from '../../hooks/useListMFADevices';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import type { MFADeviceDto, MFAType } from '../../types/auth.types';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AddDeviceDialog } from './AddDeviceDialog';

const TYPE_ICON: Record<MFAType, typeof Smartphone> = {
  totp: Smartphone,
  hardware_key: Key,
  email: Mail,
  sms: MessageSquare,
  backup_codes: ShieldCheck,
};

const TYPE_LABEL: Record<MFAType, string> = {
  totp: 'Authenticator App',
  hardware_key: 'Security Key / Passkey',
  email: 'Email Code',
  sms: 'Text Message',
  backup_codes: 'Backup Codes',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

export function MfaSecurityPanel() {
  const qc = useQueryClient();
  const { data: devices = [], isLoading } = useListMFADevices() as { data: MFADeviceDto[]; isLoading: boolean };
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
  };

  const setPrimary = useMutation({
    mutationFn: (id: string) => authApi.setPrimaryMFADevice(id),
    onSuccess: () => { invalidate(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => authApi.renameMFADevice(id, name),
    onSuccess: () => { invalidate(); setRenameTarget(null); toast.success('Device renamed'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => authApi.removeMFADevice(id, password),
    onSuccess: () => { invalidate(); setRemoveTarget(null); setRemovePassword(''); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const disableMfa = useMutation({
    mutationFn: () => authApi.disableMFA({}),
    onSuccess: () => {
      invalidate();
      setDisableOpen(false);
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

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 w-full max-w-[800px]">
      <div className="mb-2">
        <h1 className="text-[24px] font-semibold text-white mb-2 tracking-[-0.5px]">Two-Factor Authentication</h1>
        <p className="text-[14px] text-[#8A8F98] leading-relaxed">
          Protect your account with an extra verification step. Add an authenticator app, a security key or passkey, or email codes.
        </p>
      </div>

      {/* Status banner */}
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-lg p-6 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-[16px] font-semibold text-white">MFA Status</h3>
          </div>
          <p className="text-[14px] text-[#8A8F98]">
            {mfaEnabled
              ? `Your account is protected. ${verifiedDevices.length} active ${verifiedDevices.length === 1 ? 'method' : 'methods'}.`
              : 'Add a verification method to enable two-factor authentication.'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-[12px] font-semibold uppercase tracking-[0.2em] ${mfaEnabled ? 'text-[#10b981]' : 'text-[#8A8F98]'}`}>
            {mfaEnabled ? 'On' : 'Off'}
          </span>
          <Switch
            checked={mfaEnabled}
            onCheckedChange={handleMfaToggle}
            disabled={mfaBusy}
            aria-label="Toggle multi-factor authentication"
            className={mfaBusy ? 'opacity-60 cursor-not-allowed' : ''}
          />
        </div>
      </div>

      {/* Device list */}
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-[#1f1f1f] flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-semibold text-white">Authentication Devices</h3>
            <p className="text-[13px] text-[#8A8F98] mt-1">Manage your authenticator apps and security keys.</p>
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="px-4 py-2 bg-white text-black text-[13px] font-medium rounded-md hover:bg-[#e8e8e8] transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Add Device
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#10b981]" size={22} /></div>
        ) : devices.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#8A8F98] text-[14px]">
            No devices yet. Add your first verification method to get started.
          </div>
        ) : (
          <div className="flex flex-col">
            {devices.map((d, i) => {
              const Icon = TYPE_ICON[d.type] ?? ShieldCheck;
              return (
                <div key={d.id} className={`px-6 py-5 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] transition-colors ${i !== devices.length - 1 ? 'border-b border-[#1f1f1f]' : ''}`}>
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="w-[48px] h-[48px] rounded-lg bg-[#0c0c0c] border border-[#1f1f1f] flex items-center justify-center text-[#8A8F98] shrink-0">
                      <Icon size={20} className="stroke-[1.5]" />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h4 className="text-[15px] font-medium text-white truncate">{d.name}</h4>
                        {d.is_primary && (
                          <span className="px-2 py-0.5 bg-[#1d4ed8] text-white text-[10px] font-semibold uppercase tracking-wider rounded shrink-0">Default</span>
                        )}
                        {!d.verified && (
                          <span className="px-2 py-0.5 border border-[#a16207] text-[#eab308] text-[10px] font-semibold uppercase tracking-wider rounded shrink-0">Pending</span>
                        )}
                      </div>
                      <p className="text-[13px] text-[#8A8F98] truncate">
                        {TYPE_LABEL[d.type]}{d.display_hint ? ` • ${d.display_hint}` : ''} • Added {formatDate(d.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {d.verified && !d.is_primary && (
                      <button
                        type="button"
                        onClick={() => setPrimary.mutate(d.id)}
                        disabled={setPrimary.isPending}
                        title="Set as default"
                        className="px-3 py-2 border border-[#2a2a2a] bg-[#1a1a1a] text-[#e8e8e8] text-[13px] font-medium rounded-md hover:bg-[#2a2a2a] transition-all flex items-center gap-1.5"
                      >
                        <Star size={14} /> Make Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setRenameTarget(d); setRenameValue(d.name); }}
                      title="Rename"
                      aria-label={`Rename ${d.name}`}
                      className="p-2 border border-[#2a2a2a] bg-[#1a1a1a] text-[#8A8F98] rounded-md hover:text-white hover:bg-[#2a2a2a] transition-all"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoveTarget(d)}
                      title="Remove"
                      aria-label={`Remove ${d.name}`}
                      className="p-2 border border-[#2a2a2a] bg-[#1a1a1a] text-[#8A8F98] rounded-md hover:border-[rgba(239,68,68,0.3)] hover:text-[#ef4444] transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddDeviceDialog open={addOpen} onOpenChange={setAddOpen} onComplete={invalidate} />

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-md bg-[#141414] border-[#1f1f1f] text-white">
          <DialogHeader>
            <DialogTitle>Rename device</DialogTitle>
            <DialogDescription className="text-[#8A8F98]">Give this verification method a recognizable name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <Label htmlFor="rename" className="text-[#8A8F98]">Device name</Label>
            <Input
              id="rename"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              maxLength={255}
              className="bg-[#0c0c0c] border-[#262626] text-white"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setRenameTarget(null)} className="border-[#2a2a2a] bg-transparent text-[#e8e8e8] hover:bg-[#1a1a1a]">Cancel</Button>
            <Button
              onClick={() => renameTarget && rename.mutate({ id: renameTarget.id, name: renameValue.trim() })}
              disabled={rename.isPending || renameValue.trim().length === 0}
              className="bg-[#10b981] text-black font-semibold hover:bg-[#0ea271]"
            >
              {rename.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove dialog (requires password + fresh step-up via interceptor) */}
      <Dialog open={!!removeTarget} onOpenChange={(o) => { if (!o) { setRemoveTarget(null); setRemovePassword(''); } }}>
        <DialogContent className="sm:max-w-md bg-[#141414] border-[#1f1f1f] text-white">
          <DialogHeader>
            <DialogTitle>Remove device</DialogTitle>
            <DialogDescription className="text-[#8A8F98]">
              Remove <span className="text-white font-medium">{removeTarget?.name}</span>? Confirm your password to continue. You may also be asked to verify your identity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <Label htmlFor="remove-pw" className="text-[#8A8F98]">Current password</Label>
            <Input
              id="remove-pw"
              type="password"
              value={removePassword}
              onChange={(e) => setRemovePassword(e.target.value)}
              autoComplete="current-password"
              className="bg-[#0c0c0c] border-[#262626] text-white"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => { setRemoveTarget(null); setRemovePassword(''); }} className="border-[#2a2a2a] bg-transparent text-[#e8e8e8] hover:bg-[#1a1a1a]">Cancel</Button>
            <Button
              onClick={() => removeTarget && remove.mutate({ id: removeTarget.id, password: removePassword })}
              disabled={remove.isPending || removePassword.length === 0}
              className="bg-[#ef4444] text-white font-semibold hover:bg-[#dc2626]"
            >
              {remove.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent className="sm:max-w-md bg-[#141414] border-[#1f1f1f] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff size={18} className="text-[#ef4444]" />
              Disable MFA
            </DialogTitle>
            <DialogDescription className="text-[#8A8F98]">
              This removes MFA protection from your account. You may be asked to verify your identity before the change is accepted.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-[#3a1d1d] bg-[#171111] p-3 text-[13px] leading-relaxed text-[#b78b8b]">
            Your account will be less secure. Re-enable MFA as soon as possible if this is temporary.
          </div>
          <DialogFooter className="pt-4 bg-[#111111] border-[#1f1f1f]">
            <Button variant="outline" onClick={() => setDisableOpen(false)} className="border-[#2a2a2a] bg-transparent text-[#e8e8e8] hover:bg-[#1a1a1a]">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => disableMfa.mutate()}
              disabled={disableMfa.isPending}
            >
              {disableMfa.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable MFA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
