import { Loader2, Monitor } from 'lucide-react';
import { useListSessions } from '../../hooks/useListSessions';
import { useRevokeSession, useRevokeOtherSessions } from '../../hooks/useRevokeSession';
import type { SessionInfo } from '../../types/auth.types';

function relativeTime(iso: string): string {
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

function deviceLabel(s: SessionInfo): string {
  const parts = [s.device_type, s.device_name].filter(Boolean);
  return parts.length ? parts.join(' • ') : 'Unknown device';
}

export function ActiveSessionsPanel() {
  const { data: sessions = [], isLoading } = useListSessions() as { data: SessionInfo[]; isLoading: boolean };
  const revoke = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();

  const hasOthers = sessions.some((s) => !s.is_current);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 w-full max-w-[1200px]">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-semibold text-white mb-2 tracking-[-0.5px]">Active Sessions</h1>
          <p className="text-[14px] text-[#8A8F98] leading-relaxed">Manage the devices currently logged into your account.</p>
        </div>
        <button
          type="button"
          onClick={() => revokeOthers.mutate()}
          disabled={!hasOthers || revokeOthers.isPending}
          className="px-4 py-2 border border-[#ef4444]/20 bg-[#2a1313] text-[#ef4444] text-[13px] font-medium rounded-md hover:bg-[#3f1919] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {revokeOthers.isPending && <Loader2 size={14} className="animate-spin" />}
          Revoke All Others
        </button>
      </div>

      <div className="bg-[#141414] border border-[#1f1f1f] rounded-lg overflow-hidden">
        <div className="grid grid-cols-[2.5fr_2fr_1.5fr_1fr] px-6 py-4 border-b border-[#1f1f1f] text-[13px] font-medium text-[#8A8F98]">
          <div>Device / Browser</div>
          <div>Location &amp; IP</div>
          <div>Status</div>
          <div>Action</div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#10b981]" size={22} /></div>
        ) : sessions.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#8A8F98] text-[14px] flex flex-col items-center gap-2">
            <Monitor size={22} className="opacity-50" />
            No active sessions found.
          </div>
        ) : (
          <div className="flex flex-col">
            {sessions.map((s, i) => (
              <div key={s.id} className={`grid grid-cols-[2.5fr_2fr_1.5fr_1fr] px-6 py-5 items-center hover:bg-[rgba(255,255,255,0.02)] transition-colors ${i !== sessions.length - 1 ? 'border-b border-[#1f1f1f]' : ''}`}>
                <div className="flex flex-col gap-1 min-w-0">
                  <h4 className="text-[14px] font-medium text-white truncate">{deviceLabel(s)}</h4>
                  <p className="text-[12px] text-[#8A8F98]">Last active: {relativeTime(s.last_active_at)}</p>
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-[14px] text-[#e8e8e8] truncate">{s.ip_geo_country || 'Unknown location'}</p>
                  <p className="text-[12px] font-mono text-[#8A8F98] truncate">{s.ip_address}</p>
                </div>
                <div>
                  {s.is_current && (
                    <span className="px-2.5 py-1 bg-[rgba(16,185,129,0.1)] text-[#10b981] text-[11px] font-semibold rounded uppercase tracking-wider">Current Session</span>
                  )}
                </div>
                <div>
                  {s.is_current ? (
                    <span className="px-4 py-1.5 border border-[#2a2a2a] bg-[#1a1a1a] text-[#8A8F98] text-[13px] font-medium rounded-md inline-block">
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => revoke.mutate(s.id)}
                      disabled={revoke.isPending}
                      className="px-4 py-1.5 border border-[#2a2a2a] bg-[#1a1a1a] text-[#e8e8e8] text-[13px] font-medium rounded-md hover:border-[rgba(239,68,68,0.2)] hover:text-[#ef4444] transition-all disabled:opacity-40"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
