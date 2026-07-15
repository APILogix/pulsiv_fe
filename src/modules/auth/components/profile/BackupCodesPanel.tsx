import { useState } from 'react';
import { useMutation , useQueryClient} from '@tanstack/react-query';
import { ShieldCheck, Copy, Download, Printer, Loader2, KeyRound, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '../../api/auth.api';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function BackupCodesPanel() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const mfaEnabled = !!user?.mfa_enabled;

  const [promptOpen, setPromptOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);

  const regenerate = useMutation({
    mutationFn: (mfa_code: string) => authApi.regenerateBackupCodes({ mfa_code }),
    onSuccess: (data: { backup_codes: string[] }) => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      setCodes(data.backup_codes);
      setPromptOpen(false);
      setMfaCode('');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function copyCodes() {
    if (!codes) return;
    navigator.clipboard.writeText(codes.join('\n'));
    toast.success('Backup codes copied');
  }

  function downloadCodes() {
    if (!codes) return;
    const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pulsiv-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  function printCodes() {
    if (!codes) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(
      `<pre style="font-family:monospace;font-size:16px;line-height:2">${codes.join('\n')}</pre>`,
    );
    w.document.close();
    w.print();
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 w-full max-w-[800px]">
      <div className="mb-2">
        <h1 className="text-[24px] font-semibold text-white mb-2 tracking-[-0.5px]">Backup Codes</h1>
        <p className="text-[14px] text-[#8A8F98] leading-relaxed">
          Single-use codes to sign in when you can't use your other verification methods. Keep them somewhere safe.
        </p>
      </div>

      {!mfaEnabled ? (
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-lg p-6 flex items-start gap-3">
          <AlertTriangle size={18} className="text-[#eab308] mt-0.5 shrink-0" />
          <div>
            <h3 className="text-[15px] font-semibold text-white mb-1">Enable two-factor authentication first</h3>
            <p className="text-[13px] text-[#8A8F98]">
              Backup codes are generated when you set up your first MFA method. Add one from Security &amp; MFA to get started.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-[#1f1f1f] flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-semibold text-white">Recovery codes</h3>
              <p className="text-[13px] text-[#8A8F98] mt-1">
                Generating a new set invalidates all previous codes.
              </p>
            </div>
            <button type="button"
              onClick={() => { setCodes(null); setMfaCode(''); setPromptOpen(true); }}
              className="px-4 py-2 bg-[#1a1a1a] text-[#e8e8e8] border border-[#2a2a2a] text-[13px] font-medium rounded-md hover:bg-[#2a2a2a] transition-all flex items-center gap-2"
            >
              <KeyRound size={15} /> Generate new codes
            </button>
          </div>

          <div className="p-6">
            {codes ? (
              <>
                <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-lg p-8 mb-4">
                  <div className="grid grid-cols-2 gap-y-3 gap-x-12 max-w-[600px] mx-auto">
                    {codes.map((c) => (
                      <div key={c} className="text-center">
                        <code className="text-[14px] font-mono text-[#e8e8e8] tracking-[2px]">{c}</code>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={copyCodes} className="border-[#2a2a2a] bg-transparent text-[#e8e8e8] hover:bg-[#1a1a1a]"><Copy size={14} className="mr-1.5" /> Copy</Button>
                  <Button variant="outline" onClick={downloadCodes} className="border-[#2a2a2a] bg-transparent text-[#e8e8e8] hover:bg-[#1a1a1a]"><Download size={14} className="mr-1.5" /> Download</Button>
                  <Button variant="outline" onClick={printCodes} className="border-[#2a2a2a] bg-transparent text-[#e8e8e8] hover:bg-[#1a1a1a]"><Printer size={14} className="mr-1.5" /> Print</Button>
                </div>
                <p className="text-[12px] text-[#eab308] mt-4 flex items-center gap-1.5">
                  <AlertTriangle size={13} /> These codes won't be shown again. Save them now.
                </p>
              </>
            ) : (
              <div className="flex items-center gap-3 text-[#8A8F98] text-[14px]">
                <ShieldCheck size={18} className="text-[#10b981]" />
                Your backup codes are stored securely and can't be displayed again. Generate a new set if you've lost them.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MFA code prompt (regenerate also requires a fresh step-up, handled by the 403 interceptor) */}
      <Dialog open={promptOpen} onOpenChange={(o) => { if (!o) { setPromptOpen(false); setMfaCode(''); } }}>
        <DialogContent className="sm:max-w-md bg-[#141414] border-[#1f1f1f] text-white">
          <DialogHeader>
            <DialogTitle>Confirm with a verification code</DialogTitle>
            <DialogDescription className="text-[#8A8F98]">
              Enter a current 6-digit code from your authenticator or email to generate new backup codes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <Label htmlFor="regen-code" className="text-[#8A8F98]">Verification code</Label>
            <Input
              id="regen-code"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              autoFocus
              className="h-12 font-mono text-center tracking-[0.3em] text-lg bg-[#0c0c0c] border-[#262626] text-white"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => { setPromptOpen(false); setMfaCode(''); }} className="border-[#2a2a2a] bg-transparent text-[#e8e8e8] hover:bg-[#1a1a1a]">Cancel</Button>
            <Button
              onClick={() => regenerate.mutate(mfaCode)}
              disabled={regenerate.isPending || mfaCode.length !== 6}
              className="bg-[#10b981] text-black font-semibold hover:bg-[#0ea271]"
            >
              {regenerate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
