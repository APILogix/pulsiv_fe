import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Copy,
  Download,
  Printer,
  Loader2,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '../../api/auth.api';
import { authQueryKeys } from '../../api/auth.query';
import { useCurrentUser } from '../../hooks/useCurrentUser';
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

export function BackupCodesPanel() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useCurrentUser();
  const mfaEnabled = !!user?.mfa_enabled;

  const [promptOpen, setPromptOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const regenerate = useMutation({
    mutationFn: (mfa_code: string) => authApi.regenerateBackupCodes({ mfa_code }),
    onSuccess: (data: { backup_codes: string[] }) => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.securitySummary });
      queryClient.invalidateQueries({ queryKey: ['account-overview'] });
      setCodes(data.backup_codes);
      setPromptOpen(false);
      setMfaCode('');
      toast.success('New backup codes generated');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function copyAllCodes() {
    if (!codes) return;
    navigator.clipboard.writeText(codes.join('\n'));
    toast.success('All backup recovery codes copied to clipboard');
  }

  function copySingleCode(code: string, index: number) {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
    toast.success(`Copied code: ${code}`);
  }

  function downloadCodes() {
    if (!codes) return;
    const timestamp = new Date().toISOString().split('T')[0];
    const fileText = [
      '========================================',
      '        SENTINEL RECOVERY CODES         ',
      '========================================',
      `Account: ${user?.email ?? 'User'}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'Keep these codes safe and confidential. Each code can',
      'be used only once to bypass 2FA in an emergency.',
      '',
      ...codes.map((c, i) => `[${String(i + 1).padStart(2, '0')}] ${c}`),
      '========================================',
    ].join('\n');

    const blob = new Blob([fileText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel-recovery-codes-${timestamp}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Recovery codes downloaded');
  }

  function printCodes() {
    if (!codes) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sentinel Recovery Codes</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; }
            h2 { margin-bottom: 4px; font-size: 20px; }
            p { font-size: 13px; color: #555; margin-top: 0; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 24px 0; }
            .code-box { font-family: monospace; font-size: 15px; letter-spacing: 2px; border: 1px solid #ccc; padding: 10px 14px; border-radius: 4px; background: #f9f9f9; }
            .warning { font-size: 12px; color: #b45309; padding: 12px; border: 1px solid #fde68a; background: #fffbeb; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h2>Sentinel Emergency Recovery Codes</h2>
          <p>Account: <strong>${user?.email ?? 'User'}</strong> | Generated: ${new Date().toLocaleDateString()}</p>
          <div class="grid">
            ${codes.map((c, i) => `<div class="code-box">${String(i + 1).padStart(2, '0')}. ${c}</div>`).join('')}
          </div>
          <div class="warning">
            Keep this document in a safe or offline storage. Each code is single-use and bypasses two-factor authentication.
          </div>
        </body>
      </html>
    `);
    w.document.close();
    w.print();
  }

  return (
    <div className="flex w-full flex-col gap-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--text)] tracking-tight">
            Recovery Codes
          </h1>
          <p className="text-[13px] text-[var(--text2)] max-w-2xl leading-relaxed mt-1">
            Emergency single-use codes to access your account if your authenticator app or security keys become inaccessible.
          </p>
        </div>

        {mfaEnabled && (
          <Button
            type="button"
            onClick={() => {
              setCodes(null);
              setMfaCode('');
              setPromptOpen(true);
            }}
            className="shrink-0 h-9 px-4 rounded-[var(--radius-md)] bg-[var(--bg1)] hover:bg-[var(--bg2)] text-[var(--text)] border border-[var(--border)] font-medium text-[13px] flex items-center gap-2"
          >
            <KeyRound size={15} className="text-[var(--brand)]" /> Generate New Codes
          </Button>
        )}
      </div>

      {!mfaEnabled ? (
        /* MFA Disabled State */
        <div className="rounded-[var(--radius-lg)] border border-[var(--amber)]/30 bg-[var(--amber)]/5 p-6 flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--amber)]/10 border border-[var(--amber)]/20 flex items-center justify-center text-[var(--amber)] shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="text-[14px] font-semibold text-[var(--text)]">
                Two-Factor Authentication Required
              </h3>
              <p className="text-[12px] text-[var(--text2)] leading-relaxed max-w-lg">
                Emergency recovery codes are generated to safeguard your account against 2FA device loss. Please configure an authenticator app or passkey first.
              </p>
            </div>
          </div>
          <Link
            to="/account/security/mfa"
            className="shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-[var(--radius-md)] bg-[var(--amber)] text-black font-medium text-[13px] hover:brightness-110 transition-all"
          >
            Set Up 2FA <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        /* MFA Enabled State */
        <div className="space-y-6">
          {/* Status & Overview Card */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center text-[var(--green)]">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold text-[var(--text)]">
                      Recovery Keys Configured
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
                      <CheckCircle2 size={10} /> Active
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--text2)] mt-0.5">
                    Hashed and stored securely on your account. Generating a new batch invalidates all previous keys immediately.
                  </p>
                </div>
              </div>
            </div>

            {/* Generated Codes Reveal */}
            {codes ? (
              <div className="space-y-4 pt-3 border-t border-[var(--border)] animate-in fade-in duration-300">
                <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--amber)]/10 border border-[var(--amber)]/25 flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-[var(--amber)] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[var(--text)] leading-relaxed">
                    <strong className="text-[var(--amber)]">Save your codes immediately.</strong> This is the only time these codes will be visible in plaintext. Once you navigate away, you will not be able to view them again.
                  </p>
                </div>

                <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {codes.map((code, index) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => copySingleCode(code, index)}
                        className="group relative flex items-center justify-between p-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg1)] hover:border-[var(--brand)]/40 hover:bg-[var(--bg2)] transition-all cursor-pointer text-left"
                      >
                        <span className="text-[11px] font-mono text-[var(--text3)]">
                          {String(index + 1).padStart(2, '0')}.
                        </span>
                        <code className="text-[14px] font-mono font-medium tracking-[2.5px] text-[var(--text)]">
                          {code}
                        </code>
                        <span className="text-[11px] text-[var(--text3)] group-hover:text-[var(--text)] opacity-0 group-hover:opacity-100 transition-opacity">
                          {copiedIndex === index ? 'Copied!' : 'Copy'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bulk Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyAllCodes}
                    className="h-8 px-3 text-[12px] border-[var(--border)] bg-[var(--bg1)] text-[var(--text)] hover:bg-[var(--bg2)]"
                  >
                    <Copy size={13} className="mr-1.5" /> Copy All Codes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadCodes}
                    className="h-8 px-3 text-[12px] border-[var(--border)] bg-[var(--bg1)] text-[var(--text)] hover:bg-[var(--bg2)]"
                  >
                    <Download size={13} className="mr-1.5" /> Download (.txt)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={printCodes}
                    className="h-8 px-3 text-[12px] border-[var(--border)] bg-[var(--bg1)] text-[var(--text)] hover:bg-[var(--bg2)]"
                  >
                    <Printer size={13} className="mr-1.5" /> Print
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-2 text-[12px] text-[var(--text2)] leading-relaxed">
                If you suspect your previous recovery codes were compromised or lost, generate a new set above.
              </div>
            )}
          </div>

          {/* Educational Callout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 space-y-2">
              <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--text)]">
                <Lock size={15} className="text-[var(--brand)]" /> Single-Use Token
              </div>
              <p className="text-[12px] text-[var(--text2)] leading-relaxed">
                Each recovery code can only be used once. As soon as you log in with a code, that specific code is burned and cannot be reused.
              </p>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 space-y-2">
              <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--text)]">
                <FileText size={15} className="text-[var(--green)]" /> Recommended Storage
              </div>
              <p className="text-[12px] text-[var(--text2)] leading-relaxed">
                Store printed codes in a secure lockbox or encrypted inside a password manager like 1Password, Bitwarden, or Apple Keychain.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Verification Prompt Dialog */}
      <Dialog
        open={promptOpen}
        onOpenChange={(o) => {
          if (!o) {
            setPromptOpen(false);
            setMfaCode('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-[var(--bg1)] border-[var(--border)] text-[var(--text)]">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[var(--text)] flex items-center gap-2">
              <KeyRound size={17} className="text-[var(--brand)]" /> Confirm Identity
            </DialogTitle>
            <DialogDescription className="text-[12px] text-[var(--text2)] leading-relaxed">
              Generating new recovery codes replaces any previously issued codes. Enter a 6-digit verification code from your authenticator app to authorize.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Label htmlFor="regen-code" className="text-[12px] text-[var(--text2)] font-medium">
              6-Digit Authenticator Code
            </Label>
            <Input
              id="regen-code"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              autoFocus
              className="h-11 font-mono text-center tracking-[0.35em] text-[18px] bg-[var(--bg)] border-[var(--border)] text-[var(--text)] focus-visible:ring-1 focus-visible:ring-[var(--brand)]"
            />
          </div>

          <DialogFooter className="pt-3 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setPromptOpen(false);
                setMfaCode('');
              }}
              className="border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--bg2)] text-[12px]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => regenerate.mutate(mfaCode)}
              disabled={regenerate.isPending || mfaCode.length !== 6}
              className="bg-[var(--brand)] text-[var(--brand-fg,#000)] hover:brightness-110 font-medium text-[12px] flex items-center gap-2"
            >
              {regenerate.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Generate Codes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
