import { useState } from 'react';
import {
  Monitor,
  Smartphone,
  Laptop,
  Globe,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Trash2,
  Copy,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useListSessions } from '../../hooks/useListSessions';
import { useRevokeSession, useRevokeOtherSessions } from '../../hooks/useRevokeSession';
import type { SessionInfo } from '../../types/auth.types';
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

function relativeTime(iso: string): string {
  if (!iso) return 'Unknown';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function getDeviceIcon(nameOrType: string | null) {
  const str = (nameOrType || '').toLowerCase();
  if (str.includes('mobile') || str.includes('phone') || str.includes('ios') || str.includes('android')) {
    return <Smartphone size={18} />;
  }
  if (str.includes('mac') || str.includes('laptop') || str.includes('windows') || str.includes('linux')) {
    return <Laptop size={18} />;
  }
  return <Monitor size={18} />;
}

function ActiveSessionsSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6 animate-pulse text-left">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 bg-[var(--bg2)]" />
        <Skeleton className="h-4 w-96 bg-[var(--bg2)]" />
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-6 space-y-4">
        <Skeleton className="h-5 w-44 bg-[var(--bg2)]" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full bg-[var(--bg2)]" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-48 bg-[var(--bg2)]" />
            <Skeleton className="h-3 w-64 bg-[var(--bg2)]" />
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-6 space-y-3">
        <Skeleton className="h-5 w-36 bg-[var(--bg2)] mb-2" />
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full bg-[var(--bg2)]" />
        ))}
      </div>
    </div>
  );
}

export function ActiveSessionsPanel() {
  const { data: sessions = [], isLoading } = useListSessions() as {
    data: SessionInfo[];
    isLoading: boolean;
  };
  const revoke = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();

  const [confirmRevokeOthersOpen, setConfirmRevokeOthersOpen] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const currentSession = sessions.find((s) => s.is_current);
  const otherSessions = sessions.filter((s) => !s.is_current);

  const copyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    toast.success(`Copied IP: ${ip}`);
    setTimeout(() => setCopiedIp(null), 1500);
  };

  if (isLoading) {
    return <ActiveSessionsSkeleton />;
  }

  return (
    <div className="flex w-full flex-col gap-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-semibold text-[var(--text)] tracking-tight">
              Active Sessions
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)] tabular-nums">
              {sessions.length} {sessions.length === 1 ? 'device' : 'devices'}
            </span>
          </div>
          <p className="text-[13px] text-[var(--text2)] max-w-2xl leading-relaxed mt-1">
            Review and manage devices and browser sessions currently authenticated with your account credentials.
          </p>
        </div>

        {otherSessions.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmRevokeOthersOpen(true)}
            className="shrink-0 h-9 px-3.5 rounded-[var(--radius-md)] border-[var(--red)]/30 text-[var(--red)] hover:bg-[var(--red)]/10 font-medium text-[12px] flex items-center gap-2"
          >
            <ShieldAlert size={14} /> Revoke Other Sessions ({otherSessions.length})
          </Button>
        )}
      </div>

      {/* Current Session Hero Card */}
      {currentSession && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--green)]/30 bg-[var(--bg1)] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center text-[var(--green)] shrink-0">
                {getDeviceIcon(currentSession.device_type || currentSession.device_name)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[15px] font-semibold text-[var(--text)] truncate">
                    {currentSession.device_name || currentSession.device_type || 'Current Device'}
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30 tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-ping" />
                    THIS DEVICE
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[12px] text-[var(--text2)] mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Globe size={13} className="text-[var(--text3)]" />
                    {currentSession.ip_geo_country || 'Local network'}
                  </span>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => copyIp(currentSession.ip_address)}
                    className="flex items-center gap-1 font-mono text-[11px] text-[var(--text2)] hover:text-[var(--text)] transition-colors"
                  >
                    <span>{currentSession.ip_address}</span>
                    <Copy size={11} className="text-[var(--text3)]" />
                  </button>
                  <span>•</span>
                  <span className="flex items-center gap-1 tabular-nums text-[var(--text3)]">
                    <Clock size={12} />
                    Active now
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-[var(--radius-md)] text-[12px] font-medium bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)]">
                <CheckCircle2 size={13} className="text-[var(--green)]" /> Active session
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Other Sessions List */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--text)]">
              Other Active Devices ({otherSessions.length})
            </h2>
            <p className="text-[12px] text-[var(--text2)] mt-0.5">
              Sessions that will remain active until signed out or expired.
            </p>
          </div>
        </div>

        {otherSessions.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[var(--bg2)] border border-[var(--border)] flex items-center justify-center mb-3 text-[var(--green)]">
              <ShieldCheck size={22} />
            </div>
            <h3 className="text-[14px] font-semibold text-[var(--text)] mb-1">
              No other active sessions
            </h3>
            <p className="text-[12px] text-[var(--text2)] max-w-sm leading-relaxed">
              Your account is currently only signed in on this device. No other browsers or applications hold active authentication tokens.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {otherSessions.map((s) => (
              <div
                key={s.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--bg2)]/40 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--bg2)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] shrink-0">
                    {getDeviceIcon(s.device_type || s.device_name)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[13px] font-medium text-[var(--text)] truncate">
                      {s.device_name || s.device_type || 'Unknown device'}
                    </h4>
                    <div className="flex items-center gap-3 text-[12px] text-[var(--text2)] mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Globe size={13} className="text-[var(--text3)]" />
                        {s.ip_geo_country || 'Unknown location'}
                      </span>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => copyIp(s.ip_address)}
                        className="flex items-center gap-1 font-mono text-[11px] text-[var(--text2)] hover:text-[var(--text)] transition-colors"
                      >
                        <span>{s.ip_address}</span>
                        <Copy size={11} className="text-[var(--text3)]" />
                      </button>
                      <span>•</span>
                      <span className="tabular-nums text-[var(--text3)]">
                        Last active {relativeTime(s.last_active_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revoke.mutate(s.id)}
                    disabled={revoke.isPending}
                    className="h-8 px-2.5 text-[12px] text-[var(--red)] hover:text-[var(--red)] hover:bg-[var(--red)]/10"
                  >
                    {revoke.isPending ? (
                      <Loader2 size={13} className="mr-1.5 animate-spin" />
                    ) : (
                      <Trash2 size={13} className="mr-1.5" />
                    )}
                    Revoke Access
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Tip Banner */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 flex items-start gap-3">
        <AlertTriangle size={18} className="text-[var(--amber)] shrink-0 mt-0.5" />
        <div className="space-y-1 text-[12px] text-[var(--text2)] leading-relaxed">
          <p className="font-medium text-[var(--text)] text-[13px]">
            Recognize these devices?
          </p>
          <p>
            If you see any location or browser you don't recognize, revoke it immediately and change your account password to ensure your data stays secure.
          </p>
        </div>
      </div>

      {/* Confirmation Dialog for Revoke All Others */}
      <Dialog
        open={confirmRevokeOthersOpen}
        onOpenChange={(o) => setConfirmRevokeOthersOpen(o)}
      >
        <DialogContent className="sm:max-w-md bg-[var(--bg1)] border-[var(--border)] text-[var(--text)]">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[var(--text)] flex items-center gap-2">
              <ShieldAlert size={18} className="text-[var(--red)]" /> Sign Out Other Sessions?
            </DialogTitle>
            <DialogDescription className="text-[12px] text-[var(--text2)] leading-relaxed">
              This will immediately invalidate authentication tokens on all {otherSessions.length} other devices and browsers. You will remain signed in only on this current browser.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmRevokeOthersOpen(false)}
              className="border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--bg2)] text-[12px]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                revokeOthers.mutate(undefined, {
                  onSuccess: () => {
                    setConfirmRevokeOthersOpen(false);
                    toast.success('All other sessions signed out');
                  },
                });
              }}
              disabled={revokeOthers.isPending}
              className="bg-[var(--red)] text-white hover:brightness-110 font-medium text-[12px] flex items-center gap-1.5"
            >
              {revokeOthers.isPending && <Loader2 size={13} className="animate-spin" />}
              Sign Out All Others
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
