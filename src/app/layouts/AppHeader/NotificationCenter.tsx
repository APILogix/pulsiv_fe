import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell, BellOff, Siren, Rocket, AlertTriangle, UserPlus, Info, CheckCheck,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Tone = 'red' | 'amber' | 'green' | 'blue' | 'violet';

interface NotificationItem {
  id: string;
  category: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  icon: LucideIcon;
  tone: Tone;
  to?: string;
}

// Module-level constant — stable reference (rules.md anti-pattern #4).
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    category: 'Incident',
    title: 'Elevated 500 errors on payment API',
    description: 'Error rate crossed 2% threshold for payment-service.',
    time: '2m ago',
    unread: true,
    icon: Siren,
    tone: 'red',
    to: '/alerts',
  },
  {
    id: 'n2',
    category: 'Alert',
    title: 'P95 latency spike — user-service',
    description: 'Latency reached 1.4s, above the 1s SLO.',
    time: '18m ago',
    unread: true,
    icon: AlertTriangle,
    tone: 'amber',
    to: '/observability/latency',
  },
  {
    id: 'n3',
    category: 'Deploy',
    title: 'Deployment succeeded',
    description: 'api-gateway v2.4.1 rolled out to production.',
    time: '1h ago',
    unread: true,
    icon: Rocket,
    tone: 'green',
    to: '/dashboards/releases',
  },
  {
    id: 'n4',
    category: 'Team',
    title: 'New team member joined',
    description: 'Priya Anand accepted the invitation to your org.',
    time: '3h ago',
    unread: false,
    icon: UserPlus,
    tone: 'violet',
    to: '/admin/members',
  },
  {
    id: 'n5',
    category: 'System',
    title: 'Data retention policy updated',
    description: 'Traces are now retained for 30 days.',
    time: '1d ago',
    unread: false,
    icon: Info,
    tone: 'blue',
    to: '/settings/data-retention',
  },
];

const TONE_RING: Record<Tone, string> = {
  red: 'bg-[var(--red-bg)] text-[var(--red)]',
  amber: 'bg-[var(--amber-bg)] text-[var(--amber)]',
  green: 'bg-[var(--green-bg)] text-[var(--green)]',
  blue: 'bg-[var(--blue-bg)] text-[var(--blue)]',
  violet: 'bg-[var(--violet-bg)] text-[var(--violet)]',
};

const TONE_DOT: Record<Tone, string> = {
  red: 'bg-[var(--red)]',
  amber: 'bg-[var(--amber)]',
  green: 'bg-[var(--green)]',
  blue: 'bg-[var(--blue)]',
  violet: 'bg-[var(--violet)]',
};

export function NotificationCenter() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const unreadCount = items.filter((n) => n.unread).length;

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
  const open = (n: NotificationItem) => {
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
    if (n.to) navigate(n.to);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          className="relative text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg2)] focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--red)] px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-[var(--bg)]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[380px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg1)] p-0 text-[var(--text)] shadow-[0_16px_48px_rgba(0,0,0,0.45)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--text)]">Notifications</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[var(--brand-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--brand)]">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-[12px] text-[var(--text2)] transition-colors hover:text-[var(--brand)]"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <BellOff className="size-6 text-[var(--text3)]" />
            <p className="text-[13px] text-[var(--text2)]">You're all caught up</p>
            <p className="text-[12px] text-[var(--text3)]">New alerts and incidents will appear here.</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto py-1">
            {items.map((n) => {
              const Icon = n.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => open(n)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg2)]',
                    n.unread && 'bg-[var(--bg2)]/40',
                  )}
                >
                  <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', TONE_RING[n.tone])}>
                    <Icon className="size-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                        {n.category}
                      </span>
                      <span className="text-[11px] text-[var(--text3)]">· {n.time}</span>
                    </span>
                    <span className={cn('mt-0.5 block truncate text-[13px]', n.unread ? 'font-semibold text-[var(--text)]' : 'font-medium text-[var(--text2)]')}>
                      {n.title}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-[var(--text3)] line-clamp-2">
                      {n.description}
                    </span>
                  </span>

                  {n.unread && <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', TONE_DOT[n.tone])} />}
                </button>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-[var(--border)] p-2">
          <button
            onClick={() => navigate('/alerts')}
            className="w-full rounded-lg py-2 text-center text-[13px] font-medium text-[var(--brand)] transition-colors hover:bg-[var(--bg2)]"
          >
            View all notifications
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
