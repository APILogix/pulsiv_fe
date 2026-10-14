import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell,
  BellOff,
  Siren,
  Rocket,
  AlertTriangle,
  CheckCheck,
  Check,
  Sparkles,
  ShieldAlert,
  Info,
  X,
  ArrowRight,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Tone = 'red' | 'amber' | 'green' | 'blue' | 'violet' | 'ai';
type CategoryFilter = 'all' | 'incidents' | 'deploys' | 'system';

interface NotificationItem {
  id: string;
  category: 'Incident' | 'SLO' | 'Deploy' | 'AI Insight' | 'Security' | 'System';
  filterCategory: 'incidents' | 'deploys' | 'system';
  title: string;
  description: string;
  service?: string;
  metric?: string;
  time: string;
  unread: boolean;
  icon: LucideIcon;
  tone: Tone;
  to?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    category: 'Incident',
    filterCategory: 'incidents',
    title: 'Elevated 500 errors on payment API',
    description: 'Error rate crossed 2.4% threshold (0.5% SLO limit) on critical checkout pipeline.',
    service: 'payment-service',
    metric: '2.4% err',
    time: '2m ago',
    unread: true,
    icon: Siren,
    tone: 'red',
    to: '/alerts',
  },
  {
    id: 'notif-2',
    category: 'AI Insight',
    filterCategory: 'incidents',
    title: 'Anomaly: P95 latency spike detected',
    description: 'Autonomous root cause model isolated connection pool exhaustion in redis-cluster.',
    service: 'checkout-api',
    metric: '1.42s p95',
    time: '14m ago',
    unread: true,
    icon: Sparkles,
    tone: 'ai',
    to: '/ai',
  },
  {
    id: 'notif-3',
    category: 'SLO',
    filterCategory: 'incidents',
    title: 'Availability error budget burning fast',
    description: 'Burn rate 4.8x detected on auth endpoints; 12% 30-day budget remaining.',
    service: 'auth-service',
    metric: '4.8x burn',
    time: '35m ago',
    unread: true,
    icon: AlertTriangle,
    tone: 'amber',
    to: '/services',
  },
  {
    id: 'notif-4',
    category: 'Deploy',
    filterCategory: 'deploys',
    title: 'Production rollout completed',
    description: 'api-gateway v2.4.1 deployment finished. 100% traffic shifted with zero regression.',
    service: 'api-gateway',
    metric: 'v2.4.1',
    time: '1h ago',
    unread: false,
    icon: Rocket,
    tone: 'green',
    to: '/dashboards/releases',
  },
  {
    id: 'notif-5',
    category: 'Security',
    filterCategory: 'system',
    title: 'New session from unfamiliar location',
    description: 'Successful authentication from Frankfurt, Germany (104.28.14.9 / Firefox).',
    service: 'iam-service',
    metric: '104.28.14.9',
    time: '3h ago',
    unread: false,
    icon: ShieldAlert,
    tone: 'violet',
    to: '/account/activity/active-sessions',
  },
  {
    id: 'notif-6',
    category: 'System',
    filterCategory: 'system',
    title: 'Data retention policy updated',
    description: 'Traces and spans retention window adjusted to 30 days per compliance requirements.',
    service: 'storage',
    metric: '30d TTL',
    time: '1d ago',
    unread: false,
    icon: Info,
    tone: 'blue',
    to: '/developer/data-retention',
  },
];

const TONE_BADGE: Record<Tone, { ring: string; text: string; bg: string; dot: string }> = {
  red: {
    ring: 'border-[var(--red)]/30',
    text: 'text-[var(--red)]',
    bg: 'bg-[var(--red-bg)]',
    dot: 'bg-[var(--red)]',
  },
  amber: {
    ring: 'border-[var(--amber)]/30',
    text: 'text-[var(--amber)]',
    bg: 'bg-[var(--amber-bg)]',
    dot: 'bg-[var(--amber)]',
  },
  green: {
    ring: 'border-[var(--green)]/30',
    text: 'text-[var(--green)]',
    bg: 'bg-[var(--green-bg)]',
    dot: 'bg-[var(--green)]',
  },
  blue: {
    ring: 'border-[var(--blue)]/30',
    text: 'text-[var(--blue)]',
    bg: 'bg-[var(--blue-bg)]',
    dot: 'bg-[var(--blue)]',
  },
  violet: {
    ring: 'border-[var(--violet)]/30',
    text: 'text-[var(--violet)]',
    bg: 'bg-[var(--violet-bg)]',
    dot: 'bg-[var(--violet)]',
  },
  ai: {
    ring: 'border-[var(--ai)]/30',
    text: 'text-[var(--ai)]',
    bg: 'bg-[var(--ai-bg)]',
    dot: 'bg-[var(--ai)]',
  },
};

export function NotificationCenter() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const unreadCount = useMemo(() => items.filter((n) => n.unread).length, [items]);
  const hasCriticalIncident = useMemo(
    () => items.some((n) => n.unread && n.tone === 'red'),
    [items]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (unreadOnly && !item.unread) return false;
      if (filter !== 'all' && item.filterCategory !== filter) return false;
      return true;
    });
  }, [items, filter, unreadOnly]);

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
    toast.success('All notifications marked as read');
  };

  const toggleReadStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n))
    );
  };

  const dismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems((prev) => prev.filter((n) => n.id !== id));
    toast.success('Notification dismissed');
  };

  const openNotification = (n: NotificationItem) => {
    setItems((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x))
    );
    if (n.to) navigate(n.to);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          className="relative size-8 md:size-8.5 rounded-[var(--radius)] flex items-center justify-center text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border2)] cursor-pointer"
        >
          <Bell className="size-4.5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 font-mono text-[9px] font-bold leading-none tabular-nums text-white ring-2 ring-[var(--bg1)] shadow-sm',
                hasCriticalIncident ? 'bg-[var(--red)]' : 'bg-[var(--brand-fg,#222)]'
              )}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {hasCriticalIncident && (
            <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-[var(--red)]/40 animate-ping pointer-events-none" />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[420px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-0 text-[var(--text)] shadow-[var(--shadow-modal)] focus:outline-none"
      >
        {/* Top Header Card */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 bg-[var(--bg)]/40">
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-semibold text-[var(--text)] tracking-tight">
              Notifications
            </h2>
            {unreadCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/20 px-2 py-0.5 font-mono text-[10px] font-medium tabular-nums">
                {unreadCount} unread
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20 px-2 py-0.5 text-[10px] font-medium">
                <Check size={10} /> All caught up
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                title="Mark all as read"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text2)] hover:text-[var(--text)] transition-colors cursor-pointer py-1 px-1.5 rounded hover:bg-[var(--bg2)]"
              >
                <CheckCheck className="size-3.5" />
                <span>Mark all read</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setUnreadOnly((prev) => !prev)}
              title={unreadOnly ? 'Showing unread only' : 'Showing all'}
              className={cn(
                'text-[11px] font-medium px-2 py-0.5 rounded-[var(--radius-sm)] border transition-all cursor-pointer',
                unreadOnly
                  ? 'border-[var(--brand)]/40 bg-[var(--brand)]/10 text-[var(--brand)]'
                  : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg2)]'
              )}
            >
              Unread
            </button>
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border)] bg-[var(--bg1)] overflow-x-auto text-[11px] font-medium">
          {(
            [
              { id: 'all', label: 'All', count: items.length },
              {
                id: 'incidents',
                label: 'Incidents & Alerts',
                count: items.filter((n) => n.filterCategory === 'incidents').length,
              },
              {
                id: 'deploys',
                label: 'Deployments',
                count: items.filter((n) => n.filterCategory === 'deploys').length,
              },
              {
                id: 'system',
                label: 'System & Security',
                count: items.filter((n) => n.filterCategory === 'system').length,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                'px-2.5 py-1 rounded-[var(--radius-sm)] transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer',
                filter === tab.id
                  ? 'bg-[var(--bg3)] text-[var(--text)] font-semibold shadow-xs'
                  : 'text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg2)]'
              )}
            >
              <span>{tab.label}</span>
              <span className="font-mono text-[9px] tabular-nums opacity-60">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Notifications Scroll List */}
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-12 text-center">
            <div className="size-10 rounded-full bg-[var(--bg2)] border border-[var(--border)] flex items-center justify-center text-[var(--text3)]">
              <BellOff className="size-5" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[var(--text)]">
                {unreadOnly ? 'No unread notifications' : 'No notifications in this filter'}
              </p>
              <p className="text-[11px] text-[var(--text3)] mt-0.5 max-w-xs">
                {unreadOnly
                  ? "You've reviewed all recent telemetry and system updates."
                  : 'New incident alerts, SLO warnings, and deployments will appear here.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[var(--border)] divide-dashed">
            {filteredItems.map((n) => {
              const Icon = n.icon;
              const toneTokens = TONE_BADGE[n.tone];

              return (
                <div
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className={cn(
                    'group relative flex items-start gap-3 px-4 py-3.5 text-left transition-colors cursor-pointer',
                    n.unread
                      ? 'bg-[var(--bg2)]/30 hover:bg-[var(--bg2)]/60'
                      : 'hover:bg-[var(--bg2)]/40'
                  )}
                >
                  {/* Category Tone Icon */}
                  <div
                    className={cn(
                      'size-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 border mt-0.5 transition-transform group-hover:scale-105',
                      toneTokens.bg,
                      toneTokens.text,
                      toneTokens.ring
                    )}
                  >
                    <Icon className="size-4" />
                  </div>

                  {/* Body Content */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={cn(
                            'text-[10px] font-semibold uppercase tracking-wider',
                            toneTokens.text
                          )}
                        >
                          {n.category}
                        </span>

                        {n.service && (
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[var(--bg2)] text-[var(--text3)] border border-[var(--border)]">
                            {n.service}
                          </span>
                        )}

                        {n.metric && (
                          <span className="font-mono text-[10px] font-medium text-[var(--text2)] tabular-nums">
                            • {n.metric}
                          </span>
                        )}
                      </div>

                      <span className="font-mono text-[11px] text-[var(--text3)] shrink-0 tabular-nums">
                        {n.time}
                      </span>
                    </div>

                    <h4
                      className={cn(
                        'text-[13px] leading-snug line-clamp-1',
                        n.unread
                          ? 'font-semibold text-[var(--text)]'
                          : 'font-medium text-[var(--text2)]'
                      )}
                    >
                      {n.title}
                    </h4>

                    <p className="text-[12px] leading-relaxed text-[var(--text3)] line-clamp-2">
                      {n.description}
                    </p>

                    {/* Quick Inline Actions visible on hover */}
                    <div className="pt-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {n.to && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--brand)] group-hover:underline">
                            <span>Investigate</span>
                            <ArrowRight className="size-2.5 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => toggleReadStatus(n.id, e)}
                          title={n.unread ? 'Mark as read' : 'Mark as unread'}
                          className="p-1 rounded text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
                        >
                          {n.unread ? <Check className="size-3" /> : <Bell className="size-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => dismissNotification(n.id, e)}
                          title="Dismiss notification"
                          className="p-1 rounded text-[var(--text3)] hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Unread beacon dot */}
                  {n.unread && (
                    <span
                      className={cn(
                        'size-1.5 rounded-full shrink-0 mt-2',
                        toneTokens.dot
                      )}
                      aria-label="Unread"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Navigation Bar */}
        <div className="border-t border-[var(--border)] px-4 py-2.5 bg-[var(--bg)]/60 flex items-center justify-between gap-3 text-[12px]">
          <button
            type="button"
            onClick={() => navigate('/settings/webhooks')}
            className="flex items-center gap-1.5 text-[var(--text3)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="size-3.5" />
            <span>Notification channels</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/alerts')}
            className="flex items-center gap-1 font-medium text-[var(--brand)] hover:brightness-110 transition-colors cursor-pointer"
          >
            <span>Alerts &amp; incidents</span>
            <ArrowRight className="size-3" />
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
