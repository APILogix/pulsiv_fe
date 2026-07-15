import { useState } from 'react';
import { useMutation , useQueryClient} from '@tanstack/react-query';
import { AlertTriangle, Download, FileJson, Loader2, Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '../../api/auth.api';
import type { UserDataExport } from '../../types/auth.types';
import { getErrorMessage } from '@/infrastructure/api-client/error.interceptor';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function downloadJson(data: UserDataExport): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pulsiv-account-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function PrivacyAndDeletionPanel() {
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [deleteRequested, setDeleteRequested] = useState(false);

  const exportData = useMutation({
    mutationFn: authApi.exportUserData,
    onSuccess: (data: UserDataExport) => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      downloadJson(data);
      toast.success('Account export downloaded');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const requestDeletion = useMutation({
    mutationFn: () => authApi.requestAccountDeletion({ reason: reason.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      setDeleteRequested(true);
      toast.success('Deletion confirmation email sent');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <div className="flex w-full max-w-[900px] flex-col gap-6 animate-in fade-in duration-300">
      <div>
        <h1 className="mb-2 text-[24px] font-semibold text-white tracking-normal">Privacy & deletion</h1>
        <p className="text-[14px] leading-relaxed text-[#8A8F98]">
          Export your account data or start the verified account deletion process.
        </p>
      </div>

      <section className="rounded-lg border border-[#1f1f1f] bg-[#141414]">
        <div className="flex items-start justify-between gap-4 border-b border-[#1f1f1f] px-6 py-5">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#262626] bg-[#0c0c0c] text-[#10b981]">
              <FileJson size={18} />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-white">Account data export</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-[#8A8F98]">
                Download your profile, MFA devices, and active session history as JSON.
              </p>
            </div>
          </div>
          <Button
            onClick={() => exportData.mutate()}
            disabled={exportData.isPending}
            className="shrink-0 bg-white text-black hover:bg-[#e8e8e8]"
          >
            {exportData.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export data
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-[#3a1d1d] bg-[#171111]">
        <div className="flex items-start justify-between gap-4 px-6 py-5">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#4b2222] bg-[#2a1313] text-[#ef4444]">
              <Trash2 size={18} />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-white">Delete account</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-[#b78b8b]">
                Deletion starts only after you confirm the email link. Until then, your account remains active.
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            onClick={() => {
              setDeleteOpen(true);
              setDeleteRequested(false);
            }}
            className="shrink-0"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete account
          </Button>
        </div>
      </section>

      <Dialog open={deleteOpen} onOpenChange={(open) => {
        setDeleteOpen(open);
        if (!open) {
          setReason('');
          setDeleteRequested(false);
        }
      }}>
        <DialogContent className="sm:max-w-lg bg-[#141414] border-[#1f1f1f] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {deleteRequested ? <Mail size={18} className="text-[#10b981]" /> : <AlertTriangle size={18} className="text-[#ef4444]" />}
              {deleteRequested ? 'Check your email' : 'Confirm account deletion request'}
            </DialogTitle>
            <DialogDescription className="text-[#8A8F98]">
              {deleteRequested
                ? 'A confirmation link was sent to your email. Your account is not scheduled for deletion until that link is confirmed.'
                : 'This sends a confirmation email. The backend schedules deletion only after the email link is confirmed.'}
            </DialogDescription>
          </DialogHeader>

          {!deleteRequested && (
            <div className="space-y-2">
              <Label htmlFor="deletion-reason" className="text-[#8A8F98]">Reason, optional</Label>
              <Textarea
                id="deletion-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value.slice(0, 500))}
                maxLength={500}
                placeholder="Tell us why you are deleting the account"
                className="min-h-[96px] resize-none bg-[#0c0c0c] border-[#262626] text-white"
              />
              <p className="text-right text-xs text-[#5C5F66]">{reason.length}/500</p>
            </div>
          )}

          <DialogFooter className="bg-[#111111] border-[#1f1f1f]">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              className="border-[#2a2a2a] bg-transparent text-[#e8e8e8] hover:bg-[#1a1a1a]"
            >
              {deleteRequested ? 'Close' : 'Cancel'}
            </Button>
            {!deleteRequested && (
              <Button
                variant="destructive"
                onClick={() => requestDeletion.mutate()}
                disabled={requestDeletion.isPending}
              >
                {requestDeletion.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send confirmation email
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
