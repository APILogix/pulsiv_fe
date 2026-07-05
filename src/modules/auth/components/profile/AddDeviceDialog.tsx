import { useState } from 'react';
import { Smartphone, Key, Mail, ChevronRight, Loader2, Copy, Download, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '../../api/auth.api';
import { enrollPasskey, WebAuthnCeremonyError, webauthnSupported } from '../../services/webauthn.client';
import type { MFASetupDto, TOTPSetupDto } from '../../types/auth.types';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Method = 'totp' | 'email' | 'hardware_key';
type Step = 'choose' | 'configure' | 'totp-verify' | 'email-verify' | 'backup';

const METHOD_META: Record<Method, { icon: typeof Smartphone; title: string; desc: string; defaultName: string }> = {
  totp: { icon: Smartphone, title: 'Authenticator app', desc: 'Google Authenticator, Authy, 1Password, etc.', defaultName: 'Authenticator App' },
  hardware_key: { icon: Key, title: 'Security key or passkey', desc: 'YubiKey, Touch ID, Windows Hello, passkeys.', defaultName: 'Security Key' },
  email: { icon: Mail, title: 'Email code', desc: 'Receive a one-time code by email.', defaultName: 'Email Code' },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function AddDeviceDialog({ open, onOpenChange, onComplete }: Props) {
  const [step, setStep] = useState<Step>('choose');
  const [method, setMethod] = useState<Method>('totp');
  const [deviceName, setDeviceName] = useState('');
  const [busy, setBusy] = useState(false);
  const [setupData, setSetupData] = useState<MFASetupDto | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  function reset() {
    setStep('choose');
    setMethod('totp');
    setDeviceName('');
    setBusy(false);
    setSetupData(null);
    setDeviceId('');
    setCode('');
    setBackupCodes([]);
  }

  function close() {
    onOpenChange(false);
    // Defer reset so the closing animation isn't janky.
    setTimeout(reset, 200);
  }

  function pick(m: Method) {
    if (m === 'hardware_key' && !webauthnSupported()) {
      toast.error('This browser does not support security keys or passkeys.');
      return;
    }
    setMethod(m);
    setDeviceName(METHOD_META[m].defaultName);
    setStep('configure');
  }

  async function startEnrollment() {
    const name = deviceName.trim() || METHOD_META[method].defaultName;
    setBusy(true);
    try {
      if (method === 'hardware_key') {
        const res = await enrollPasskey(name);
        onComplete();
        if (res.backup_codes?.length) {
          setBackupCodes(res.backup_codes);
          setStep('backup');
        } else {
          toast.success('Security key added');
          close();
        }
        return;
      }
      const data = await authApi.setupMFA({ type: method, device_name: name });
      setSetupData(data);
      setDeviceId(data.device_id);
      setStep(method === 'totp' ? 'totp-verify' : 'email-verify');
    } catch (err) {
      const msg = err instanceof WebAuthnCeremonyError ? err.message : getErrorMessage(err);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setBusy(true);
    try {
      await authApi.verifyMFASetup({ device_id: deviceId, code });
      onComplete();
      const codes = setupData?.backup_codes ?? [];
      if (codes.length) {
        setBackupCodes(codes);
        setStep('backup');
      } else {
        toast.success('Device added');
        close();
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function resendEmail() {
    if (!deviceId) return;
    try {
      await authApi.resendEmailMfaOtp(deviceId);
      toast.success('Verification code resent');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function copyCodes() {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast.success('Backup codes copied');
  }

  function downloadCodes() {
    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pulsiv-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  const totpSetup = setupData?.device_type === 'totp' ? (setupData as TOTPSetupDto) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md bg-[#141414] border-[#1f1f1f] text-white">
        {step === 'choose' && (
          <>
            <DialogHeader>
              <DialogTitle>Add a verification method</DialogTitle>
              <DialogDescription className="text-[#8A8F98]">Choose how you want to verify your identity.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 pt-2">
              {(Object.keys(METHOD_META) as Method[]).map((m) => {
                const meta = METHOD_META[m];
                const Icon = meta.icon;
                return (
                  <button
                    key={m}
                    onClick={() => pick(m)}
                    className="w-full flex items-center gap-4 rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] px-4 py-3 text-left hover:border-[#10b981]/40 hover:bg-[#101010] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-md bg-[#141414] border border-[#1f1f1f] flex items-center justify-center text-[#10b981] shrink-0">
                      <Icon size={18} className="stroke-[1.5]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-white">{meta.title}</p>
                      <p className="text-[12px] text-[#8A8F98] truncate">{meta.desc}</p>
                    </div>
                    <ChevronRight size={16} className="text-[#555555] shrink-0" />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 'configure' && (
          <>
            <DialogHeader>
              <DialogTitle>{METHOD_META[method].title}</DialogTitle>
              <DialogDescription className="text-[#8A8F98]">Name this device so you can recognize it later.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 pt-2">
              <Label htmlFor="device-name" className="text-[#8A8F98]">Device name</Label>
              <Input
                id="device-name"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                maxLength={255}
                autoFocus
                className="bg-[#0c0c0c] border-[#262626] text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep('choose')} className="border-[#2a2a2a] bg-transparent text-[#e8e8e8] hover:bg-[#1a1a1a]">Back</Button>
              <Button onClick={startEnrollment} disabled={busy} className="bg-[#10b981] text-black font-semibold hover:bg-[#0ea271]">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {method === 'hardware_key' ? 'Continue with security key' : 'Continue'}
              </Button>
            </div>
          </>
        )}

        {step === 'totp-verify' && totpSetup && (
          <>
            <DialogHeader>
              <DialogTitle>Scan the QR code</DialogTitle>
              <DialogDescription className="text-[#8A8F98]">Scan with your authenticator app, then enter the 6-digit code.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 pt-2">
              <div className="bg-white p-3 rounded-lg">
                <img src={totpSetup.qr_code_url} alt="TOTP QR code" className="w-44 h-44" />
              </div>
              <div className="w-full text-center">
                <p className="text-[12px] text-[#8A8F98] mb-1">Can't scan? Enter this key manually:</p>
                <code className="text-[12px] font-mono text-[#e8e8e8] break-all bg-[#0c0c0c] border border-[#1f1f1f] rounded px-2 py-1 inline-block">{totpSetup.secret}</code>
              </div>
              <div className="w-full space-y-2">
                <Label htmlFor="totp-code" className="text-[#8A8F98]">Verification code</Label>
                <Input
                  id="totp-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  className="h-12 font-mono text-center tracking-[0.3em] text-lg bg-[#0c0c0c] border-[#262626] text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={verifyCode} disabled={busy || code.length !== 6} className="bg-[#10b981] text-black font-semibold hover:bg-[#0ea271]">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verify & enable
              </Button>
            </div>
          </>
        )}

        {step === 'email-verify' && (
          <>
            <DialogHeader>
              <DialogTitle>Check your email</DialogTitle>
              <DialogDescription className="text-[#8A8F98]">We sent a 6-digit code to your email. Enter it below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 pt-2">
              <Label htmlFor="email-code" className="text-[#8A8F98]">Verification code</Label>
              <Input
                id="email-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                autoFocus
                className="h-12 font-mono text-center tracking-[0.3em] text-lg bg-[#0c0c0c] border-[#262626] text-white"
              />
              <button onClick={resendEmail} className="text-[12px] text-[#10b981] hover:text-[#0ea271] transition-colors">Resend code</button>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={verifyCode} disabled={busy || code.length !== 6} className="bg-[#10b981] text-black font-semibold hover:bg-[#0ea271]">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verify & enable
              </Button>
            </div>
          </>
        )}

        {step === 'backup' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#10b981]" /> Save your backup codes</DialogTitle>
              <DialogDescription className="text-[#8A8F98]">
                Store these in a safe place. Each code works once and they won't be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {backupCodes.map((c) => (
                <code key={c} className="text-[13px] font-mono text-[#e8e8e8] bg-[#0c0c0c] border border-[#1f1f1f] rounded px-2 py-1.5 text-center">{c}</code>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={copyCodes} className="flex-1 border-[#2a2a2a] bg-transparent text-[#e8e8e8] hover:bg-[#1a1a1a]"><Copy size={14} className="mr-1.5" /> Copy</Button>
              <Button variant="outline" onClick={downloadCodes} className="flex-1 border-[#2a2a2a] bg-transparent text-[#e8e8e8] hover:bg-[#1a1a1a]"><Download size={14} className="mr-1.5" /> Download</Button>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={close} className="bg-[#10b981] text-black font-semibold hover:bg-[#0ea271]">Done</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
