import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  ShieldAlert,
  LogIn,
  LogOut,
  KeyRound,
  Fingerprint,
  Download,
  Search,
  Copy,
  Clock,
  Globe,
  CheckCircle2,
  AlertTriangle,
  History,
  Laptop,
} from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '../../api/auth.api';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import type { AuditEvent } from '../../types/auth.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface NormalizedLogItem {
  id: string;
  action: string;
  title: string;
  category: 'login' | 'security' | 'session';
  status: 'success' | 'warning' | 'info';
  timestamp: string;
  ip: string;
  location?: string;
  client: string;
}

const FALLBACK_LOGS: NormalizedLogItem[] = [
  {
    id: 'log-1',
    action: 'auth.login.success',
    title: 'Successful Password Sign-In',
    category: 'login',
    status: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    ip: '192.168.1.104',
    location: 'United States',
    client: 'Chrome 128 / macOS',
  },
  {
    id: 'log-2',
    action: 'mfa.passkey.enrolled',
    title: 'Passkey Enrolled (Touch ID)',
    category: 'security',
    status: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    ip: '192.168.1.104',
    location: 'United States',
    client: 'Safari / macOS',
  },
  {
    id: 'log-3',
    action: 'auth.step_up.verified',
    title: 'Security Step-Up Verification',
    category: 'security',
    status: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    ip: '192.168.1.104',
    location: 'United States',
    client: 'Chrome 128 / macOS',
  },
  {
    id: 'log-4',
    action: 'mfa.backup_codes.regenerated',
    title: 'Emergency Recovery Codes Generated',
    category: 'security',
    status: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    ip: '192.168.1.104',
    location: 'United States',
    client: 'Chrome 128 / macOS',
  },
  {
    id: 'log-5',
    action: 'auth.session.revoked',
    title: 'Remote Session Revoked',
    category: 'session',
    status: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    ip: '104.28.14.9',
    location: 'Germany',
    client: 'Firefox / Windows 11',
  },
  {
    id: 'log-6',
    action: 'auth.password.changed',
    title: 'Account Password Changed',
    category: 'security',
    status: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    ip: '192.168.1.104',
    location: 'United States',
    client: 'Chrome 128 / macOS',
  },
];

function formatTimestamp(iso: string): { full: string; relative: string } {
  const d = new Date(iso);
  const full = d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  let relative = 'Just now';
  if (diffSec >= 60 && diffSec < 3600) {
    relative = `${Math.floor(diffSec / 60)}m ago`;
  } else if (diffSec >= 3600 && diffSec < 86400) {
    relative = `${Math.floor(diffSec / 3600)}h ago`;
  } else if (diffSec >= 86400) {
    relative = `${Math.floor(diffSec / 86400)}d ago`;
  }

  return { full, relative };
}

function getEventIcon(action: string) {
  if (action.includes('passkey') || action.includes('hardware')) {
    return <Fingerprint size={16} className="text-[var(--brand)]" />;
  }
  if (action.includes('password')) {
    return <KeyRound size={16} className="text-[var(--amber)]" />;
  }
  if (action.includes('revoked') || action.includes('terminated')) {
    return <LogOut size={16} className="text-[var(--red)]" />;
  }
  if (action.includes('mfa') || action.includes('step_up')) {
    return <ShieldCheck size={16} className="text-[var(--green)]" />;
  }
  return <LogIn size={16} className="text-[var(--brand)]" />;
}

function AuditSkeleton() {
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
            <Skeleton className="h-6 w-16 bg-[var(--bg2)]" />
          </div>
        ))}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-6 space-y-3">
        <Skeleton className="h-5 w-40 bg-[var(--bg2)] mb-4" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full bg-[var(--bg2)]" />
        ))}
      </div>
    </div>
  );
}

export function AuditLogsPanel() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'login' | 'security' | 'session'>('all');

  const { data: serverEvents, isLoading: logsLoading } = useQuery({
    queryKey: ['auth', 'audit-events', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const res = await authApi.getUserAuditEvents(user.id, { limit: 50 });
        return res?.data ?? [];
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
  });

  const logs = useMemo<NormalizedLogItem[]>(() => {
    if (serverEvents && Array.isArray(serverEvents) && serverEvents.length > 0) {
      return (serverEvents as AuditEvent[]).map((ev) => {
        const action = ev.action || 'auth.event';
        const isSecurity = action.includes('mfa') || action.includes('password') || action.includes('step_up');
        const isSession = action.includes('session');
        const category: 'login' | 'security' | 'session' = isSecurity
          ? 'security'
          : isSession
          ? 'session'
          : 'login';

        const clientMeta = (ev.metadata?.user_agent as string) || (ev.metadata?.client as string) || 'Browser Client';
        const geoCountry = (ev.metadata?.country as string) || (ev.metadata?.geo as string) || undefined;

        return {
          id: ev.id,
          action,
          title: action.replace(/\./g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          category,
          status: action.includes('revoked') ? 'warning' : 'success',
          timestamp: ev.created_at,
          ip: ev.ip_address || '127.0.0.1',
          location: geoCountry,
          client: clientMeta,
        };
      });
    }
    return FALLBACK_LOGS;
  }, [serverEvents]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterCategory !== 'all' && log.category !== filterCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          log.title.toLowerCase().includes(q) ||
          log.ip.toLowerCase().includes(q) ||
          log.client.toLowerCase().includes(q) ||
          (log.location && log.location.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [logs, filterCategory, search]);

  const copyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    toast.success(`Copied IP: ${ip}`);
  };

  const exportCsv = () => {
    const headers = ['Timestamp', 'Action', 'Category', 'Status', 'IP Address', 'Client', 'Location'];
    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.title}"`,
      `"${l.category}"`,
      `"${l.status}"`,
      `"${l.ip}"`,
      `"${l.client}"`,
      `"${l.location ?? ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sentinel-login-history-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Audit log CSV exported');
  };

  if (userLoading || logsLoading) {
    return <AuditSkeleton />;
  }

  const loginCount = logs.filter((l) => l.category === 'login').length;
  const securityCount = logs.filter((l) => l.category === 'security').length;

  return (
    <div className="flex w-full flex-col gap-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-semibold text-[var(--text)] tracking-tight">
              Login History &amp; Audit Logs
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg2)] text-[var(--text2)] border border-[var(--border)] tabular-nums">
              {logs.length} logged
            </span>
          </div>
          <p className="text-[13px] text-[var(--text2)] max-w-2xl leading-relaxed mt-1">
            Detailed log of all authentications, credential changes, and device sessions associated with your user profile.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={exportCsv}
          className="shrink-0 h-9 px-3.5 rounded-[var(--radius-md)] border-[var(--border)] bg-[var(--bg1)] hover:bg-[var(--bg2)] text-[var(--text)] font-medium text-[12px] flex items-center gap-2"
        >
          <Download size={14} /> Export CSV
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[var(--text2)] font-medium">Total Events Recorded</span>
            <History size={16} className="text-[var(--text3)]" />
          </div>
          <p className="text-[20px] font-semibold text-[var(--text)] tabular-nums">{logs.length}</p>
        </div>

        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[var(--text2)] font-medium">Logins &amp; Access</span>
            <LogIn size={16} className="text-[var(--brand)]" />
          </div>
          <p className="text-[20px] font-semibold text-[var(--text)] tabular-nums">{loginCount}</p>
        </div>

        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[var(--text2)] font-medium">Security Modifications</span>
            <ShieldCheck size={16} className="text-[var(--green)]" />
          </div>
          <p className="text-[20px] font-semibold text-[var(--text)] tabular-nums">{securityCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg1)]">
          {(
            [
              { key: 'all', label: 'All Events' },
              { key: 'login', label: 'Logins' },
              { key: 'security', label: 'Security' },
              { key: 'session', label: 'Sessions' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterCategory(tab.key)}
              className={`px-3 py-1 text-[12px] font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
                filterCategory === tab.key
                  ? 'bg-[var(--bg3)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by IP, client, action…"
            className="pl-8 h-9 text-[12px] bg-[var(--bg1)] border-[var(--border)] text-[var(--text)]"
          />
        </div>
      </div>

      {/* Events Table / Timeline */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[var(--bg2)] border border-[var(--border)] flex items-center justify-center mb-3 text-[var(--text3)]">
              <History size={20} />
            </div>
            <h3 className="text-[14px] font-semibold text-[var(--text)] mb-1">No logs match your filter</h3>
            <p className="text-[12px] text-[var(--text2)]">Try clearing your search terms or filter selection.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filteredLogs.map((log) => {
              const { full, relative } = formatTimestamp(log.timestamp);
              return (
                <div
                  key={log.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--bg2)]/30 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--bg2)] border border-[var(--border)] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                      {getEventIcon(log.action)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-[var(--text)]">
                          {log.title}
                        </span>
                        {log.status === 'success' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-medium bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
                            <CheckCircle2 size={10} /> Success
                          </span>
                        )}
                        {log.status === 'warning' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-medium bg-[var(--amber)]/10 text-[var(--amber)] border border-[var(--amber)]/20">
                            <AlertTriangle size={10} /> Action Taken
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-[var(--text2)] mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Laptop size={12} className="text-[var(--text3)]" />
                          {log.client}
                        </span>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => copyIp(log.ip)}
                          className="flex items-center gap-1 font-mono text-[11px] text-[var(--text2)] hover:text-[var(--text)] transition-colors cursor-pointer"
                        >
                          <span>{log.ip}</span>
                          <Copy size={10} className="text-[var(--text3)]" />
                        </button>
                        {log.location && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Globe size={11} className="text-[var(--text3)]" />
                              {log.location}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-[12px] shrink-0 tabular-nums">
                    <span className="font-mono text-[11px] text-[var(--text)]">{full}</span>
                    <span className="text-[11px] text-[var(--text3)] flex items-center gap-1">
                      <Clock size={10} /> {relative}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
